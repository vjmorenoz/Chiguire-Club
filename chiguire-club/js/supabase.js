// ============================================
// CHIGÜIRE CLUB — Cliente ligero de Supabase (sin librerías)
// Habla directo con la API REST de Supabase usando fetch.
// La clave pública va SOLO en el header "apikey"; el token del
// admin (JWT) va en "Authorization" únicamente cuando hay sesión.
// ============================================

const SB = (() => {
  const SESSION_KEY = "chiguire_admin_session";
  const BUCKET = "product-images";

  class SBError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }

  const enabled = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseKey);
  const base = () => CONFIG.supabaseUrl.trim().replace(/\/+$/, "");

  // ---- Sesión del admin ----

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }

  function setSession(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  function saveAuth(data) {
    setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      email: data.user?.email || getSession()?.email || ""
    });
  }

  let refreshing = null;

  async function getAccessToken() {
    const session = getSession();
    if (!session) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;

    // Token vencido: renovarlo una sola vez aunque haya varias peticiones a la vez
    if (!refreshing) {
      refreshing = request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: session.refresh_token }
      })
        .then(data => { saveAuth(data); return data.access_token; })
        .catch(() => { setSession(null); return null; })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  // ---- Petición genérica ----

  async function request(path, options = {}) {
    const { method = "GET", body, headers = {}, auth = false, timeout = 12000 } = options;
    const finalHeaders = { apikey: CONFIG.supabaseKey, ...headers };

    if (auth) {
      const token = await getAccessToken();
      if (!token) throw new SBError("Tu sesión expiró. Vuelve a iniciar sesión.", 401);
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    const isBlob = body instanceof Blob;
    if (body !== undefined && !isBlob && !finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(base() + path, {
        method,
        headers: finalHeaders,
        body: body === undefined ? undefined : isBlob ? body : JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        let message = res.statusText || "Error de conexión";
        try {
          const err = await res.json();
          message = err.message || err.msg || err.error_description || err.error || message;
        } catch { /* sin cuerpo JSON */ }
        throw new SBError(message, res.status);
      }

      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch (err) {
      if (err.name === "AbortError") throw new SBError("La conexión tardó demasiado. Intenta de nuevo.", 0);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- Autenticación ----

  const auth = {
    session: getSession,
    async signIn(email, password) {
      const data = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: { email, password }
      });
      saveAuth(data);
      return data.user;
    },
    async signOut() {
      try { await request("/auth/v1/logout", { method: "POST", auth: true }); } catch { /* ignorar */ }
      setSession(null);
    },
    async isAdmin() {
      return request("/rest/v1/rpc/is_admin", { method: "POST", body: {}, auth: true });
    }
  };

  // ---- Productos ----

  const idFilter = id => `id=eq.${encodeURIComponent(id)}`;

  const products = {
    // Público: la base de datos solo devuelve los visibles (RLS)
    listPublic: () => request("/rest/v1/products?select=*&order=created_at.asc", { timeout: 8000 }),
    // Admin: devuelve todos, incluidos los ocultos
    listAll: () => request("/rest/v1/products?select=*&order=created_at.asc", { auth: true }),
    create: product => request("/rest/v1/products", {
      method: "POST", body: product, auth: true, headers: { Prefer: "return=representation" }
    }),
    update: (id, patch) => request(`/rest/v1/products?${idFilter(id)}`, {
      method: "PATCH", body: patch, auth: true, headers: { Prefer: "return=representation" }
    }),
    remove: id => request(`/rest/v1/products?${idFilter(id)}`, { method: "DELETE", auth: true })
  };

  // ---- Pedidos ----

  const orders = {
    // Cualquier visitante puede CREAR un pedido, pero no leerlos (RLS).
    // El total y los nombres los recalcula la base de datos con los precios reales.
    create: order => request("/rest/v1/orders", {
      method: "POST", body: order, headers: { Prefer: "return=minimal" }, timeout: 4000
    }),
    list: () => request("/rest/v1/orders?select=*&order=created_at.desc&limit=500", { auth: true }),
    update: (id, patch) => request(`/rest/v1/orders?${idFilter(id)}`, {
      method: "PATCH", body: patch, auth: true, headers: { Prefer: "return=minimal" }
    })
  };

  // ---- Fotos (Supabase Storage) ----

  const storage = {
    async upload(blob) {
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const path = `products/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await request(`/storage/v1/object/${BUCKET}/${path}`, {
        method: "POST",
        body: blob,
        auth: true,
        timeout: 30000,
        headers: { "Content-Type": blob.type, "cache-control": "max-age=31536000" }
      });
      return `${base()}/storage/v1/object/public/${BUCKET}/${path}`;
    },
    // Borra la foto solo si está en nuestro bucket (no toca URLs externas)
    async removeByUrl(url) {
      const prefix = `${base()}/storage/v1/object/public/${BUCKET}/`;
      if (!url || !url.startsWith(prefix)) return;
      try {
        await request(`/storage/v1/object/${BUCKET}/${url.slice(prefix.length)}`, { method: "DELETE", auth: true });
      } catch (err) {
        console.warn("No se pudo borrar la foto anterior:", err.message);
      }
    }
  };

  return { enabled, auth, products, orders, storage, SBError };
})();
