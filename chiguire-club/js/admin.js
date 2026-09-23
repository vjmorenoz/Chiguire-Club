// ============================================
// CHIGÜIRE CLUB — Panel de administración (/admin)
// Productos y pedidos guardados en Supabase.
// Solo entra quien tenga usuario en Supabase Auth y esté en la tabla "admins".
// ============================================

const ORDER_STATUSES = [
  ["nuevo", "🆕 Nuevo"],
  ["confirmado", "👍 Confirmado"],
  ["pagado", "💵 Pagado"],
  ["enviado", "📦 Enviado"],
  ["entregado", "✅ Entregado"],
  ["cancelado", "✖ Cancelado"]
];
const SOLD_STATUSES = ["pagado", "enviado", "entregado"];

let adminProducts = [];
let adminOrders = [];
let adminTab = "products";
let adminVerified = null; // null = sin comprobar, true/false = resultado

const adminRoot = () => document.getElementById("adminRoot");

// ---- Pantalla principal ----

async function renderAdmin() {
  const root = adminRoot();

  if (!SB.enabled()) {
    root.innerHTML = `
      <div class="admin-card admin-notice">
        <h2>Falta conectar Supabase</h2>
        <p>La tienda está en <strong>modo demo</strong>. Para usar el panel, completa <code>supabaseUrl</code> y
        <code>supabaseKey</code> en <code>js/config.js</code>. Los pasos están en <strong>GUIA.md</strong>.</p>
      </div>`;
    return;
  }

  const session = SB.auth.session();
  if (!session) return renderLogin();

  if (adminVerified === null) {
    root.innerHTML = `<div class="admin-loading">Comprobando acceso…</div>`;
    try {
      adminVerified = Boolean(await SB.auth.isAdmin());
    } catch (err) {
      if (err.status === 401) return renderLogin("Tu sesión expiró. Vuelve a entrar.");
      root.innerHTML = `<div class="admin-card admin-notice"><h2>No se pudo conectar</h2><p>${escapeHTML(err.message)}</p>
        <button class="btn-secondary" type="button" data-admin="retry">Reintentar</button></div>`;
      return;
    }
  }

  if (!adminVerified) {
    root.innerHTML = `
      <div class="admin-card admin-notice">
        <h2>Este usuario no es administrador</h2>
        <p>Entraste como <strong>${escapeHTML(session.email)}</strong>, pero no está en la tabla <code>admins</code>.
        Sigue el paso "Darte permisos de admin" de la guía.</p>
        <button class="btn-secondary" type="button" data-admin="logout">Cerrar sesión</button>
      </div>`;
    return;
  }

  root.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-tabs" role="tablist">
        <button class="admin-tab${adminTab === "products" ? " active" : ""}" type="button" role="tab" data-admin="tab" data-tab="products">🧦 Productos</button>
        <button class="admin-tab${adminTab === "orders" ? " active" : ""}" type="button" role="tab" data-admin="tab" data-tab="orders">📋 Pedidos</button>
      </div>
      <div class="admin-user">
        <span>${escapeHTML(session.email)}</span>
        <button class="btn-sm" type="button" data-admin="logout">Salir</button>
      </div>
    </div>
    <div id="adminContent"><div class="admin-loading">Cargando…</div></div>`;

  await loadAdminTab();
}

async function loadAdminTab() {
  try {
    if (adminTab === "products") {
      adminProducts = (await SB.products.listAll()).map(normalizeProduct);
      renderProductsTab();
    } else {
      adminOrders = await SB.orders.list();
      renderOrdersTab();
    }
  } catch (err) {
    handleAdminError(err);
  }
}

function handleAdminError(err) {
  if (err.status === 401) {
    renderLogin("Tu sesión expiró. Vuelve a entrar.");
    return;
  }
  alert(`Error: ${err.message}`);
}

// ---- Login ----

function renderLogin(message = "") {
  adminVerified = null;
  adminRoot().innerHTML = `
    <form class="admin-card admin-login" id="adminLoginForm" novalidate>
      <div class="admin-login-logo">${CAPY_SVG}</div>
      <h2>Entrar al panel</h2>
      ${message ? `<p class="form-error">${escapeHTML(message)}</p>` : ""}
      <div class="form-group">
        <label class="form-label" for="login-email">Correo</label>
        <input id="login-email" class="form-input" type="email" autocomplete="username" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="login-pass">Contraseña</label>
        <input id="login-pass" class="form-input" type="password" autocomplete="current-password" required />
      </div>
      <button class="btn-primary btn-block" type="submit">Entrar</button>
    </form>`;

  const form = document.getElementById("adminLoginForm");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = form.querySelector("#login-email").value.trim();
    const password = form.querySelector("#login-pass").value;
    if (!email || !password) return;

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Entrando…";
    try {
      await SB.auth.signIn(email, password);
      renderAdmin();
    } catch (err) {
      renderLogin(err.status === 400 ? "Correo o contraseña incorrectos." : err.message);
    }
  });
}

// ---- Pestaña: productos ----

function renderProductsTab() {
  const content = document.getElementById("adminContent");
  const visible = adminProducts.filter(p => p.active).length;

  content.innerHTML = `
    <div class="admin-bar">
      <p class="admin-count">${adminProducts.length} productos · ${visible} visibles en la tienda</p>
      <button class="btn-primary" type="button" data-admin="add">+ Agregar producto</button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Foto</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Destacado</th><th>En tienda</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          ${adminProducts.length === 0 ? `<tr><td colspan="7" class="admin-empty">No hay productos. Agrega el primero.</td></tr>` : ""}
          ${adminProducts.map(p => `
            <tr class="${p.active ? "" : "is-hidden"}">
              <td><div class="admin-thumb">${productVisual(p)}</div></td>
              <td>
                <strong>${escapeHTML(p.name)}</strong>
                <div class="admin-desc">${escapeHTML(p.description.slice(0, 60))}${p.description.length > 60 ? "…" : ""}</div>
              </td>
              <td><span class="tag tag--static">${escapeHTML(p.category)}</span></td>
              <td><strong class="admin-price">${formatPrice(p.price)}</strong></td>
              <td class="admin-center">${p.featured ? "⭐" : "—"}</td>
              <td>
                <button class="pill ${p.active ? "pill--on" : "pill--off"}" type="button" data-admin="toggle" data-id="${escapeHTML(p.id)}"
                  title="Mostrar u ocultar en la tienda">${p.active ? "Visible" : "Oculto"}</button>
              </td>
              <td>
                <div class="admin-actions">
                  <button class="btn-sm btn-edit" type="button" data-admin="edit" data-id="${escapeHTML(p.id)}">✏️ Editar</button>
                  <button class="btn-sm btn-delete" type="button" data-admin="delete" data-id="${escapeHTML(p.id)}" title="Borrar" aria-label="Borrar ${escapeHTML(p.name)}">🗑️</button>
                </div>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <p class="admin-hint">💡 Si una media se agota, ocúltala en vez de borrarla: así conservas su foto y sus datos.</p>`;
}

async function afterProductsChange(message) {
  if (message) showToast(message);
  await loadAdminTab();
  refreshCatalog().catch(() => {}); // actualiza también la vista pública
}

async function toggleProduct(id) {
  const product = adminProducts.find(p => p.id === id);
  if (!product) return;
  try {
    await SB.products.update(id, { active: !product.active });
    await afterProductsChange(product.active ? `"${product.name}" oculto` : `"${product.name}" visible`);
  } catch (err) {
    handleAdminError(err);
  }
}

async function deleteProduct(id) {
  const product = adminProducts.find(p => p.id === id);
  if (!product) return;
  if (!confirm(`¿Borrar "${product.name}" para siempre?\n\nSi solo está agotada, mejor usa "Ocultar".`)) return;
  try {
    await SB.products.remove(id);
    await SB.storage.removeByUrl(product.image);
    await afterProductsChange(`"${product.name}" eliminado`);
  } catch (err) {
    handleAdminError(err);
  }
}

// ---- Fotos: redimensionar y comprimir en el navegador antes de subir ----

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function compressImage(file, maxSize = 800) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("El archivo no es una imagen válida.")); };
    img.onload = async () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF"; // fondo blanco para PNG transparentes
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // WebP si el navegador lo soporta; si no, JPEG
      let blob = await canvasToBlob(canvas, "image/webp", 0.8);
      if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", 0.82);
      if (!blob) return reject(new Error("No se pudo procesar la imagen."));
      resolve(blob);
    };
    img.src = url;
  });
}

// ---- Formulario de producto ----

function openAdminForm(id = null) {
  const product = id ? adminProducts.find(p => p.id === id) : null;
  const isNew = !product;
  let imageUrl = product?.image || "";   // URL guardada
  let pendingBlob = null;                // foto nueva aún sin subir
  let previewUrl = null;

  closeAdminForm();
  const overlay = document.createElement("div");
  overlay.className = "admin-form-overlay";
  overlay.id = "adminFormOverlay";
  overlay.innerHTML = `
    <form class="admin-form-box" novalidate>
      <h2 class="admin-form-title">${isNew ? "➕ Nuevo producto" : "✏️ Editar producto"}</h2>

      <div class="form-group">
        <span class="form-label">Foto</span>
        <div class="image-field">
          <div class="image-preview" id="af-preview"></div>
          <div class="image-inputs">
            <label class="btn-sm btn-edit file-label">📷 Subir foto
              <input id="af-file" type="file" accept="image/*" hidden />
            </label>
            <button id="af-image-clear" class="btn-sm" type="button">Quitar foto</button>
            <p class="form-hint">Cuadrada queda mejor. Se comprime sola (~60 KB).</p>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="af-name">Nombre *</label>
          <input id="af-name" class="form-input" type="text" maxlength="80" required placeholder="Media Pac-Man" />
        </div>
        <div class="form-group">
          <label class="form-label" for="af-price">Precio (USD) *</label>
          <input id="af-price" class="form-input" type="number" inputmode="decimal" step="0.01" min="0" required placeholder="8" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="af-category">Categoría *</label>
          <select id="af-category" class="form-select">
            ${PRODUCT_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="af-size">Talla</label>
          <input id="af-size" class="form-input" type="text" placeholder="Talla única" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="af-desc">Descripción</label>
        <textarea id="af-desc" class="form-textarea" maxlength="400" placeholder="Cuenta algo divertido de esta media…"></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="af-emoji">Emoji (si no hay foto)</label>
          <input id="af-emoji" class="form-input" type="text" maxlength="8" placeholder="👾 · vacío = chigüire" />
        </div>
        <div class="form-group form-checks">
          <label class="form-checkbox-row"><input id="af-featured" type="checkbox" /> ⭐ Destacado en el inicio</label>
          <label class="form-checkbox-row"><input id="af-active" type="checkbox" /> 👁 Visible en la tienda</label>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn-secondary" type="button" id="af-cancel">Cancelar</button>
        <button class="btn-primary" type="submit" id="af-submit">${isNew ? "Crear producto" : "Guardar cambios"}</button>
      </div>
    </form>`;

  document.body.appendChild(overlay);
  document.body.classList.add("no-scroll");
  const $ = sel => overlay.querySelector(sel);

  // Valores asignados por propiedad para que las comillas no rompan nada
  $("#af-name").value = product?.name || "";
  $("#af-price").value = product?.price ?? "";
  $("#af-category").value = product?.category || PRODUCT_CATEGORIES[0];
  $("#af-size").value = product?.size || "Talla única";
  $("#af-desc").value = product?.description || "";
  $("#af-emoji").value = product?.emoji || "";
  $("#af-featured").checked = Boolean(product?.featured);
  $("#af-active").checked = product ? product.active : true;

  const refreshPreview = () => {
    const image = previewUrl || imageUrl;
    $("#af-preview").innerHTML = productVisual({ image, emoji: $("#af-emoji").value.trim(), name: "Vista previa" });
  };
  refreshPreview();

  $("#af-file").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      pendingBlob = await compressImage(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(pendingBlob);
      refreshPreview();
    } catch (err) {
      alert(err.message);
    }
  });

  $("#af-image-clear").addEventListener("click", () => {
    pendingBlob = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    imageUrl = "";
    $("#af-file").value = "";
    refreshPreview();
  });

  $("#af-emoji").addEventListener("input", refreshPreview);
  $("#af-cancel").addEventListener("click", closeAdminForm);
  overlay.addEventListener("mousedown", e => { if (e.target === overlay) closeAdminForm(); });

  $("form").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("#af-name").value.trim();
    const price = parseFloat($("#af-price").value);
    if (!name) { alert("El nombre es obligatorio."); $("#af-name").focus(); return; }
    if (isNaN(price) || price < 0) { alert("Precio inválido."); $("#af-price").focus(); return; }

    const submit = $("#af-submit");
    submit.disabled = true;
    submit.textContent = pendingBlob ? "Subiendo foto…" : "Guardando…";

    try {
      let finalImage = imageUrl || null;
      if (pendingBlob) finalImage = await SB.storage.upload(pendingBlob);

      const data = {
        name,
        price: Math.round(price * 100) / 100,
        category: $("#af-category").value,
        size: $("#af-size").value.trim() || "Talla única",
        description: $("#af-desc").value.trim(),
        emoji: $("#af-emoji").value.trim(),
        featured: $("#af-featured").checked,
        active: $("#af-active").checked,
        image: finalImage
      };

      if (isNew) await SB.products.create(data);
      else await SB.products.update(id, data);

      // Si se cambió o quitó la foto, borrar la anterior del almacenamiento
      if (product?.image && product.image !== finalImage) await SB.storage.removeByUrl(product.image);

      closeAdminForm();
      await afterProductsChange(isNew ? `"${name}" creado ✅` : `"${name}" actualizado ✅`);
    } catch (err) {
      submit.disabled = false;
      submit.textContent = isNew ? "Crear producto" : "Guardar cambios";
      handleAdminError(err);
    }
  });

  $("#af-name").focus();
}

function closeAdminForm() {
  const overlay = document.getElementById("adminFormOverlay");
  if (!overlay) return;
  overlay.remove();
  document.body.classList.remove("no-scroll");
}

// ---- Pestaña: pedidos ----

function renderOrdersTab() {
  const content = document.getElementById("adminContent");
  const sold = adminOrders.filter(o => SOLD_STATUSES.includes(o.status));
  const pairsSold = sold.reduce((s, o) => s + (o.pairs || 0), 0);
  const revenue = sold.reduce((s, o) => s + Number(o.total || 0), 0);
  const pending = adminOrders.filter(o => o.status === "nuevo" || o.status === "confirmado").length;
  const goal = CONFIG.goalPairs || 100;
  const pct = Math.min(100, Math.round((pairsSold / goal) * 100));

  const dateFmt = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  content.innerHTML = `
    <div class="admin-stats">
      <div class="stat stat--goal">
        <span class="stat-label">Meta de pares vendidos</span>
        <span class="stat-value">${pairsSold} <small>/ ${goal}</small></span>
        <div class="progress" role="progressbar" aria-valuenow="${pairsSold}" aria-valuemin="0" aria-valuemax="${goal}">
          <span style="width:${pct}%"></span>
        </div>
      </div>
      <div class="stat">
        <span class="stat-label">Pedidos por atender</span>
        <span class="stat-value">${pending}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Ingresos cobrados</span>
        <span class="stat-value">${formatPrice(revenue)}</span>
      </div>
    </div>

    <div class="admin-bar">
      <p class="admin-count">Los pares cuentan para la meta cuando el pedido está <strong>Pagado</strong>, <strong>Enviado</strong> o <strong>Entregado</strong>.</p>
      <button class="btn-secondary" type="button" data-admin="refresh">↻ Actualizar</button>
    </div>

    <div class="order-list">
      ${adminOrders.length === 0 ? `<div class="admin-card admin-empty">Todavía no hay pedidos. ¡El primero está cerca! 🧦</div>` : ""}
      ${adminOrders.map(o => `
        <article class="order-card" data-status="${escapeHTML(o.status)}">
          <div class="order-head">
            <strong class="order-code">${escapeHTML(o.code)}</strong>
            <time>${dateFmt.format(new Date(o.created_at))}</time>
          </div>
          <ul class="order-items">
            ${(o.items || []).map(i => `<li><span>${escapeHTML(i.name)} ×${i.qty}</span><span>${formatPrice(i.price * i.qty)}</span></li>`).join("")}
          </ul>
          <div class="order-foot">
            <span class="order-total">${formatPrice(o.total)} · ${o.pairs} par${o.pairs === 1 ? "" : "es"}</span>
            <select class="form-select order-status" data-order-id="${escapeHTML(o.id)}" aria-label="Estado del pedido ${escapeHTML(o.code)}">
              ${ORDER_STATUSES.map(([v, label]) => `<option value="${v}"${o.status === v ? " selected" : ""}>${label}</option>`).join("")}
            </select>
          </div>
        </article>`).join("")}
    </div>`;
}

async function updateOrderStatus(select) {
  const order = adminOrders.find(o => o.id === select.dataset.orderId);
  if (!order) return;
  const previous = order.status;
  select.disabled = true;
  try {
    await SB.orders.update(order.id, { status: select.value });
    order.status = select.value;
    renderOrdersTab();
    showToast(`${order.code}: ${select.options[select.selectedIndex].text}`);
  } catch (err) {
    select.value = previous;
    select.disabled = false;
    handleAdminError(err);
  }
}

// ---- Eventos ----

function bindAdminControls() {
  const root = adminRoot();

  root.addEventListener("click", async e => {
    const btn = e.target.closest("[data-admin]");
    if (!btn) return;
    const { admin: action, id, tab } = btn.dataset;

    if (action === "logout") {
      await SB.auth.signOut();
      adminVerified = null;
      renderLogin();
    }
    if (action === "retry") { adminVerified = null; renderAdmin(); }
    if (action === "tab" && tab !== adminTab) { adminTab = tab; renderAdmin(); }
    if (action === "add") openAdminForm();
    if (action === "edit") openAdminForm(id);
    if (action === "delete") deleteProduct(id);
    if (action === "toggle") toggleProduct(id);
    if (action === "refresh") loadAdminTab();
  });

  root.addEventListener("change", e => {
    if (e.target.matches(".order-status")) updateOrderStatus(e.target);
  });

  document.addEventListener("keydown", e => { if (e.key === "Escape") closeAdminForm(); });
}
