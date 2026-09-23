// ============================================
// CHIGÜIRE CLUB — Router, carrito y arranque
// ============================================

const PAGES = ["home", "shop", "admin"];

function pageFromHash() {
  const hash = window.location.hash.replace("#", "");
  return PAGES.includes(hash) ? hash : "home";
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === `page-${page}`));
  document.querySelectorAll(".nav-links a, .mobile-nav a").forEach(a =>
    a.classList.toggle("active", a.dataset.page === page)
  );
  document.body.dataset.currentPage = page;

  if (page === "home") renderHome();
  if (page === "shop") renderShop();
  if (page === "admin") renderAdmin();

  closeMobileNav();
  closeCart();
  closeProductModal();
  window.scrollTo(0, 0);
}

// Cambia de página sin dejar "#" colgando en la URL
function navigateTo(page) {
  const url = page === "home" ? window.location.pathname + window.location.search : `#${page}`;
  history.pushState(null, "", url);
  showPage(page);
}

window.addEventListener("popstate", () => showPage(pageFromHash()));

document.addEventListener("click", e => {
  const el = e.target.closest("[data-page]");
  if (!el) return;
  e.preventDefault();
  navigateTo(el.dataset.page);
});

// Si el cliente vuelve desde WhatsApp con el botón "atrás", reactivar el botón
window.addEventListener("pageshow", () => {
  const btn = document.getElementById("whatsappBtn");
  if (btn && btn.disabled && btn.dataset.label) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.label;
  }
});

// ---- Menú móvil ----

const menuToggleBtn = document.getElementById("menuToggleBtn");
const mobileNav = document.getElementById("mobileNav");

menuToggleBtn.addEventListener("click", () => {
  const open = mobileNav.classList.toggle("open");
  menuToggleBtn.textContent = open ? "✕" : "☰";
  menuToggleBtn.setAttribute("aria-expanded", String(open));
});

function closeMobileNav() {
  mobileNav.classList.remove("open");
  menuToggleBtn.textContent = "☰";
  menuToggleBtn.setAttribute("aria-expanded", "false");
}

// ---- Panel del carrito ----

const cartPanel = document.getElementById("cartPanel");
const cartOverlay = document.getElementById("cartOverlay");

function openCart() {
  document.querySelector(".toast")?.classList.remove("toast--show");
  renderCartPanel();
  cartPanel.classList.add("open");
  cartOverlay.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeCart() {
  if (!cartPanel.classList.contains("open")) return;
  cartPanel.classList.remove("open");
  cartOverlay.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

// Llamado desde saveCart() en data.js
function onCartChange() {
  if (cartPanel.classList.contains("open")) renderCartPanel();
}

document.getElementById("cartToggleBtn").addEventListener("click", openCart);
document.getElementById("cartCloseBtn").addEventListener("click", closeCart);
document.getElementById("heroCartBtn").addEventListener("click", openCart);
cartOverlay.addEventListener("click", closeCart);

const whatsappBtn = document.getElementById("whatsappBtn");
whatsappBtn.addEventListener("click", () => sendWhatsAppOrder(whatsappBtn));

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  closeProductModal();
  closeCart();
  closeMobileNav();
});

document.getElementById("cartItems").addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === "shop") { navigateTo("shop"); return; }

  const item = getCart().find(i => i.id === id);
  if (!item) return;
  if (action === "inc") updateCartQty(id, item.qty + 1);
  if (action === "dec") updateCartQty(id, item.qty - 1);
  if (action === "del") removeFromCart(id);
});

function renderCartPanel() {
  const cartItemsEl = document.getElementById("cartItems");
  const cartFooter = document.getElementById("cartFooter");
  const lines = getCartLines();

  if (lines.length === 0) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">${CAPY_SVG}</div>
        <p class="cart-empty-title">Tu carrito está vacío</p>
        <p class="cart-empty-text">Agrega unas medias pa' arrancar</p>
        <button class="btn-primary" type="button" data-action="shop">Ir a la tienda →</button>
      </div>`;
    cartFooter.hidden = true;
    return;
  }

  cartFooter.hidden = false;
  document.getElementById("cartTotalAmount").textContent = formatPrice(getCartTotal());

  cartItemsEl.innerHTML = lines.map(({ product, qty }) => {
    const id = escapeHTML(product.id);
    const name = escapeHTML(product.name);
    return `
      <div class="cart-item">
        <div class="cart-item-img">${productVisual(product)}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${name}</div>
          <div class="cart-item-price">${formatPrice(product.price * qty)}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" type="button" data-action="dec" data-id="${id}" aria-label="Quitar uno de ${name}">−</button>
            <span class="qty-val">${qty}</span>
            <button class="qty-btn" type="button" data-action="inc" data-id="${id}" aria-label="Agregar uno de ${name}">+</button>
          </div>
        </div>
        <button class="cart-item-del" type="button" data-action="del" data-id="${id}" aria-label="Eliminar ${name}">✕</button>
      </div>`;
  }).join("");
}

// ---- Arranque ----

function injectBrand() {
  const logos = { icon: CAPY_SVG, lockup: LOGO_LOCKUP_SVG, stacked: LOGO_STACKED_SVG };
  document.querySelectorAll("[data-logo]").forEach(el => (el.innerHTML = logos[el.dataset.logo] || CAPY_SVG));

  document.querySelectorAll("[data-whatsapp-link]").forEach(a => (a.href = `https://wa.me/${CONFIG.whatsappNumber}`));
  document.querySelectorAll("[data-instagram-link]").forEach(a => (a.href = `https://instagram.com/${CONFIG.instagramUser}`));
  document.querySelectorAll("[data-instagram-handle]").forEach(el => (el.textContent = `@${CONFIG.instagramUser}`));
  document.getElementById("demoBanner").hidden = SB.enabled();
}

async function init() {
  injectBrand();
  bindShopControls();
  bindAdminControls();

  // Si el catálogo cambia mientras el cliente navega, se repinta sin mover el scroll
  await loadCatalog(() => {
    const page = pageFromHash();
    if (page === "home") renderFeaturedProducts();
    if (page === "shop") renderShopGrid();
    updateCartBadge();
    onCartChange();
  });

  updateCartBadge();
  showPage(pageFromHash());
}

init();
