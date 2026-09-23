// ============================================
// CHIGÜIRE CLUB — Catálogo, carrito y pedidos
// ============================================

const CATEGORIES = ["Todas", "Gamer", "Geek", "Comida", "Animales", "Retro"];
const PRODUCT_CATEGORIES = CATEGORIES.slice(1);

// Catálogo de ejemplo: solo se usa en MODO DEMO (sin Supabase configurado).
// El catálogo real vive en Supabase (tabla "products").
const DEMO_PRODUCTS = [
  ["d1", "Media Pac-Man", 8, "Gamer", true, "👾", "Waka waka waka. El clásico arcade en tus pies, para maratones de gaming o para ser el más cool del salón."],
  ["d2", "Media Pizza", 7, "Comida", true, "🍕", "Porque la pizza es amor. Diseño cheesy (literalmente) para los que viven de rodajas y sueñan con pepperoni."],
  ["d3", "Media Chigüire", 9, "Animales", true, "", "El rey del llano en tus pies. Nuestra mascota y nuestro espíritu animal. 100% chigüiresco."],
  ["d4", "Media Space Invaders", 8, "Gamer", false, "👽", "Defiende tus pies de la invasión alienígena. Pixel art directo desde los 80s a tu gaveta."],
  ["d5", "Media Tacos", 7, "Comida", false, "🌮", "Los martes son de tacos, pero estas medias son para los 7 días de la semana."],
  ["d6", "Media VHS", 8, "Retro", true, "📼", "Rebobina al pasado. Para los que todavía recuerdan el videoclub. Retro cool máximo."],
  ["d7", "Media Cat Neon", 9, "Animales", false, "🐱", "Gatos y neón, la combinación perfecta de internet. Para los que duermen con su gato y viven en Discord."],
  ["d8", "Media Matrix", 8, "Geek", false, "💊", "¿Píldora roja o azul? Con estas medias ya no importa. Wake up, Neo."],
  ["d9", "Media Ramen", 7, "Comida", false, "🍜", "El sustento del estudiante universitario, ahora en formato textil."],
  ["d10", "Media Floppy", 8, "Retro", false, "💾", "3.5 pulgadas de pura nostalgia. 1.44 MB de recuerdos en el corazón."],
  ["d11", "Media Alien", 9, "Geek", false, "🛸", "La verdad está ahí fuera… y también en tus tobillos."],
  ["d12", "Media Dinosaurio", 8, "Animales", false, "🦕", "65 millones de años después, el dinosaurio sigue siendo el rey. Ahora también de tu outfit."]
].map(([id, name, price, category, featured, emoji, description]) => ({
  id, name, price, category, featured, emoji, description,
  image: null, size: "Talla única", active: true
}));

const LS_CART = "chiguire_cart";
const LS_CATALOG = "chiguire_catalog_cache";
const LS_LAST_ORDER = "chiguire_last_order";

let catalogCache = [];
let catalogStatus = "loading"; // demo | live | cached | error

// ---- Utilidades ----

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function formatPrice(n) {
  const num = Number(n) || 0;
  return Number.isInteger(num) ? `$${num}` : `$${num.toFixed(2)}`;
}

function safeGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

// Foto > emoji > chigüire del logo
function productVisual(product) {
  if (product.image) {
    return `<img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async" />`;
  }
  return product.emoji ? `<span class="product-emoji">${escapeHTML(product.emoji)}</span>` : CAPY_SVG;
}

function normalizeProduct(p) {
  return {
    id: String(p.id),
    name: p.name || "",
    price: Number(p.price) || 0,
    image: p.image || null,
    category: p.category || "Geek",
    size: p.size || "Talla única",
    description: p.description || "",
    featured: Boolean(p.featured),
    emoji: p.emoji || "",
    active: p.active !== false
  };
}

// ---- Catálogo ----
// Visitantes nuevos: se espera la respuesta de Supabase.
// Visitantes que vuelven: se muestra la copia guardada al instante y se actualiza por detrás.

async function loadCatalog(onUpdate) {
  if (!SB.enabled()) {
    catalogCache = DEMO_PRODUCTS;
    catalogStatus = "demo";
    sanitizeCart();
    return;
  }

  const cached = safeGet(LS_CATALOG);
  if (Array.isArray(cached) && cached.length) {
    catalogCache = cached;
    catalogStatus = "cached";
    refreshCatalog()
      .then(changed => { if (changed && onUpdate) onUpdate(); })
      .catch(() => { /* seguimos con la copia guardada */ });
    return;
  }

  try {
    await refreshCatalog();
  } catch (err) {
    console.error("No se pudo cargar el catálogo:", err);
    catalogCache = [];
    catalogStatus = "error";
  }
}

async function refreshCatalog() {
  const fresh = (await SB.products.listPublic()).map(normalizeProduct).filter(p => p.active);
  const changed = JSON.stringify(fresh) !== JSON.stringify(catalogCache);
  catalogCache = fresh;
  catalogStatus = "live";
  safeSet(LS_CATALOG, fresh);
  sanitizeCart();
  return changed;
}

function getProducts() {
  return catalogCache.map(p => ({ ...p }));
}

function findProduct(id) {
  return catalogCache.find(p => p.id === id);
}

// ---- Carrito ----

function getCart() {
  const cart = safeGet(LS_CART);
  return Array.isArray(cart) ? cart : [];
}

function saveCart(cart) {
  safeSet(LS_CART, cart);
  updateCartBadge();
  if (typeof onCartChange === "function") onCartChange();
}

// Quita productos que ya no existen o se ocultaron
function sanitizeCart() {
  const cart = getCart();
  const clean = cart.filter(item => findProduct(item.id) && item.qty > 0);
  if (clean.length !== cart.length) safeSet(LS_CART, clean);
}

function addToCart(productId) {
  const product = findProduct(productId);
  if (!product) return;
  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if (existing) existing.qty = Math.min(existing.qty + 1, 50);
  else cart.push({ id: productId, qty: 1 });
  saveCart(cart);
  showToast(`¡${product.name} agregada al carrito! 🧦`);
}

function updateCartQty(productId, qty) {
  let cart = getCart();
  if (qty <= 0) cart = cart.filter(i => i.id !== productId);
  else {
    const item = cart.find(i => i.id === productId);
    if (item) item.qty = Math.min(qty, 50);
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  saveCart(getCart().filter(i => i.id !== productId));
}

function getCartLines() {
  return getCart()
    .map(item => ({ product: findProduct(item.id), qty: item.qty }))
    .filter(line => line.product);
}

function getCartTotal() {
  return getCartLines().reduce((t, l) => t + l.product.price * l.qty, 0);
}

function getCartCount() {
  return getCartLines().reduce((s, l) => s + l.qty, 0);
}

function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll(".cart-badge").forEach(badge => {
    badge.textContent = count;
    badge.hidden = count === 0;
  });
}

// ---- Pedido por WhatsApp ----

function generateOrderCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I para evitar confusiones
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return "CC-" + Array.from(bytes, b => chars[b % chars.length]).join("");
}

function buildWhatsAppMessage(lines, code) {
  return [
    "Hola Chigüire Club.",
    "Quiero pedir:",
    ...lines.map(l => `- ${l.product.name} x${l.qty}`),
    "",
    `Total: ${formatPrice(lines.reduce((t, l) => t + l.product.price * l.qty, 0))}`,
    `Pedido: ${code}`,
    "Gracias."
  ].join("\n");
}

async function sendWhatsAppOrder(button) {
  const lines = getCartLines();
  if (lines.length === 0) {
    showToast("Tu carrito está vacío 🧦");
    return;
  }

  // Si el cliente toca el botón dos veces con el mismo carrito, no se duplica el pedido
  const signature = lines.map(l => `${l.product.id}:${l.qty}`).sort().join("|");
  const last = safeGet(LS_LAST_ORDER);
  let code;

  if (last && last.signature === signature && Date.now() - last.at < 24 * 3600 * 1000) {
    code = last.code;
  } else {
    code = generateOrderCode();
    if (button) {
      button.disabled = true;
      button.dataset.label = button.dataset.label || button.innerHTML;
      button.textContent = "Abriendo WhatsApp…";
      setTimeout(() => { button.disabled = false; button.innerHTML = button.dataset.label; }, 4000);
    }
    if (SB.enabled()) {
      try {
        await SB.orders.create({ code, items: lines.map(l => ({ id: l.product.id, qty: l.qty })) });
      } catch (err) {
        // Nunca bloquear la venta: si falla el registro, igual se abre WhatsApp
        console.warn("No se pudo registrar el pedido:", err.message);
      }
    }
    safeSet(LS_LAST_ORDER, { code, signature, at: Date.now() });
  }

  const text = encodeURIComponent(buildWhatsAppMessage(lines, code));
  // location.href (no window.open): el navegador interno de Instagram bloquea ventanas nuevas
  window.location.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${text}`;
}

// ---- Toast ----

let toastTimer = null;

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => toast.classList.add("toast--show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("toast--show"), 2500);
}

// ---- Tarjeta de producto ----

function renderProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `
    <button class="product-media" type="button" aria-label="Ver detalle de ${escapeHTML(product.name)}">
      ${productVisual(product)}
      <span class="tag">${escapeHTML(product.category)}</span>
    </button>
    <div class="product-info">
      <h3 class="product-name">${escapeHTML(product.name)}</h3>
      <p class="product-size">${escapeHTML(product.size)}</p>
      <div class="product-footer">
        <span class="product-price">${formatPrice(product.price)}</span>
        <button class="btn-add-cart" type="button">+ Carrito</button>
      </div>
    </div>
  `;

  card.querySelector(".product-media").addEventListener("click", () => openProductModal(product.id));
  const addBtn = card.querySelector(".btn-add-cart");
  addBtn.addEventListener("click", () => {
    addToCart(product.id);
    addBtn.classList.remove("btn--pop");
    void addBtn.offsetWidth; // reinicia la animación
    addBtn.classList.add("btn--pop");
  });
  return card;
}

// Mensaje cuando el catálogo no se pudo cargar (sin perder la venta)
function catalogErrorHTML() {
  return `
    <div class="catalog-error">
      <div class="catalog-error-icon">${CAPY_SVG}</div>
      <p class="catalog-error-title">No pudimos cargar el catálogo</p>
      <p>Revisa tu conexión o escríbenos directo y te atendemos.</p>
      <a class="btn-whatsapp" href="https://wa.me/${CONFIG.whatsappNumber}">Escribir por WhatsApp</a>
    </div>`;
}

// ---- Modal de producto ----

function closeProductModal() {
  const overlay = document.querySelector(".modal-overlay");
  if (!overlay) return;
  overlay.remove();
  document.body.classList.remove("no-scroll");
}

function openProductModal(productId) {
  const product = findProduct(productId);
  if (!product) return;
  closeProductModal();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", product.name);
  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" type="button" aria-label="Cerrar">✕</button>
      <div class="modal-inner">
        <div class="modal-media">${productVisual(product)}</div>
        <div class="modal-body">
          <span class="tag tag--static">${escapeHTML(product.category)}</span>
          <h2 class="modal-title">${escapeHTML(product.name)}</h2>
          <p class="modal-desc">${escapeHTML(product.description)}</p>
          <p class="modal-size">📏 ${escapeHTML(product.size)}</p>
          <div class="modal-footer">
            <span class="modal-price">${formatPrice(product.price)}</span>
            <button class="btn-primary modal-add" type="button">+ Agregar al carrito</button>
          </div>
        </div>
      </div>
    </div>
  `;

  overlay.querySelector(".modal-close").addEventListener("click", closeProductModal);
  overlay.querySelector(".modal-add").addEventListener("click", () => {
    addToCart(product.id);
    closeProductModal();
  });
  overlay.addEventListener("click", e => { if (e.target === overlay) closeProductModal(); });

  document.body.appendChild(overlay);
  document.body.classList.add("no-scroll");
  requestAnimationFrame(() => overlay.classList.add("modal--open"));
  overlay.querySelector(".modal-add").focus({ preventScroll: true });
}
