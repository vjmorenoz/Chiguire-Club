// ============================================
// CHIGÜIRE CLUB — Inicio
// ============================================

const CATEGORY_ICONS = { Gamer: "🎮", Geek: "🤓", Comida: "🍕", Animales: "🐾", Retro: "📼" };

// ⚠️ Revisa estas respuestas con la información real del negocio antes de publicar
const FAQ_DATA = [
  { q: "¿Cómo hago un pedido?",
    a: "Agrega lo que quieras al carrito y toca \"Enviar pedido por WhatsApp\". Se abre el chat con tu pedido listo; nosotros confirmamos disponibilidad, pago y entrega." },
  { q: "¿Hacen envíos a toda Venezuela?",
    a: "Sí. Enviamos a nivel nacional por empresas de encomienda. El costo depende de tu ciudad y te lo confirmamos por WhatsApp." },
  { q: "¿Qué significa talla única?",
    a: "Nuestras medias son elásticas y se ajustan a la mayoría de los pies de adulto. Si tienes dudas con tu talla, escríbenos antes de pedir." },
  { q: "¿Cuánto tarda el envío?",
    a: "Depende de tu ubicación. Te damos el tiempo estimado al confirmar el pedido." },
  { q: "¿Cómo puedo pagar?",
    a: "Coordinamos el método de pago por WhatsApp al confirmar tu pedido." },
  { q: "¿Cómo lavo mis medias?",
    a: "Lávalas al revés, con agua fría y sin cloro. Así los colores duran mucho más." }
];

let homeStaticRendered = false;

function renderHome() {
  if (!homeStaticRendered) {
    renderHeroGrid();
    renderCategoriesGrid();
    renderFAQ();
    homeStaticRendered = true;
  }
  renderFeaturedProducts();
}

function renderHeroGrid() {
  const grid = document.getElementById("heroEmojiGrid");
  const items = ["👾", "🍕", "📼", "🐱", "CAPY", "💾", "🌮", "🛸", "🦕"];
  grid.innerHTML = items
    .map(e => e === "CAPY"
      ? `<div class="hero-tile hero-tile--capy">${CAPY_SVG}</div>`
      : `<div class="hero-tile">${e}</div>`)
    .join("");
}

function renderFeaturedProducts() {
  const grid = document.getElementById("featuredGrid");
  if (catalogStatus === "error") {
    grid.innerHTML = catalogErrorHTML();
    return;
  }
  const products = getProducts();
  let featured = products.filter(p => p.featured).slice(0, 4);
  if (featured.length === 0) featured = products.slice(0, 4); // nunca dejar la sección vacía
  grid.replaceChildren(...featured.map(renderProductCard));
}

function renderCategoriesGrid() {
  const grid = document.getElementById("categoriesGrid");
  grid.innerHTML = PRODUCT_CATEGORIES.map(cat => `
    <button class="category-card" type="button" data-category="${cat}">
      <span class="category-card-icon">${CATEGORY_ICONS[cat] || "🧦"}</span>
      <span class="category-card-name">${cat}</span>
    </button>
  `).join("");

  grid.addEventListener("click", e => {
    const card = e.target.closest("[data-category]");
    if (!card) return;
    activeCategory = card.dataset.category; // se aplica antes de pintar la tienda
    navigateTo("shop");
  });
}

function renderFAQ() {
  const list = document.getElementById("faqList");
  list.innerHTML = FAQ_DATA.map((item, i) => `
    <div class="faq-item">
      <button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-answer-${i}">
        <span>${escapeHTML(item.q)}</span>
        <span class="faq-chevron" aria-hidden="true">▼</span>
      </button>
      <div class="faq-answer" id="faq-answer-${i}">
        <div class="faq-answer-inner">${escapeHTML(item.a)}</div>
      </div>
    </div>
  `).join("");

  list.addEventListener("click", e => {
    const btn = e.target.closest(".faq-question");
    if (!btn) return;
    const item = btn.parentElement;
    const wasOpen = item.classList.contains("open");

    list.querySelectorAll(".faq-item").forEach(el => {
      el.classList.remove("open");
      el.querySelector(".faq-question").setAttribute("aria-expanded", "false");
      el.querySelector(".faq-answer").style.maxHeight = null;
    });

    if (!wasOpen) {
      const answer = item.querySelector(".faq-answer");
      item.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      answer.style.maxHeight = answer.scrollHeight + "px";
    }
  });
}
