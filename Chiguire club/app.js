(function () {
  const STORAGE_PRODUCTS = "chiguireClub.products.v1";
  const STORAGE_CART = "chiguireClub.cart.v1";
  const CATEGORIES = ["Gamer", "Geek", "Comida", "Animales", "Retro"];
  const app = document.querySelector("#app");
  const toast = document.querySelector("[data-toast]");
  const adminEntry =
    window.CHIGUIRE_INITIAL_ROUTE === "admin" ||
    /\/admin\/?$/.test(window.location.pathname);

  let products = loadProducts();
  let cart = loadCart();
  let supabaseClient = null;
  let adminAuthReady = !adminEntry;
  let adminSession = null;
  let adminAuthNotice = "";
  let activeStoreFilters = {
    category: "Todos",
    search: "",
    sort: "name",
  };

  function money(value) {
    const rounded = Math.round(Number(value) * 100) / 100;
    return `$${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}`;
  }

  function slugify(text) {
    return text
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function imageFor(name, category) {
    const palette = {
      Gamer: ["#9ed0e6", "#606c38", "#f2cd5d"],
      Geek: ["#f2cd5d", "#5c4033", "#9ed0e6"],
      Comida: ["#f2a7a1", "#c26d3a", "#f2cd5d"],
      Animales: ["#b7d9a8", "#606c38", "#d8c3a5"],
      Retro: ["#d8c3a5", "#a47148", "#9ed0e6"],
    };
    const colors = palette[category] || palette.Geek;
    const safeName = escapeHtml(name.replace(/^Media\s+/i, ""));
    const pattern = patternFor(category, colors);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420">
        <rect width="420" height="420" fill="${colors[0]}"/>
        <path d="M54 74h312v42H54zM54 302h312v42H54z" fill="#fffaf1" stroke="#232323" stroke-width="7"/>
        <g transform="translate(96 42) rotate(-8 120 165)">
          <path d="M95 16h124v218c0 28 23 51 51 51h32c22 0 40 18 40 40v11c0 23-19 42-42 42H212c-64 0-117-52-117-117V16Z" fill="#fffaf1" stroke="#232323" stroke-width="10" stroke-linejoin="round"/>
          <path d="M95 16h124v52H95z" fill="${colors[1]}" stroke="#232323" stroke-width="10"/>
          <path d="M218 232c9 32 33 53 70 53h14c22 0 40 18 40 40v11c0 6-1 12-4 17H206c-35 0-64-29-64-64v-42c21 4 50 0 76-15Z" fill="${colors[2]}" stroke="#232323" stroke-width="10" stroke-linejoin="round"/>
          ${pattern}
        </g>
        <g transform="translate(43 348) rotate(-3)">
          <rect width="238" height="46" rx="8" fill="#232323"/>
          <text x="18" y="32" font-family="Trebuchet MS, Arial, sans-serif" font-size="22" font-weight="900" fill="#fffaf1">${safeName}</text>
        </g>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function patternFor(category, colors) {
    if (category === "Gamer") {
      return `
        <rect x="126" y="104" width="62" height="42" rx="8" fill="#232323"/>
        <circle cx="140" cy="125" r="6" fill="${colors[2]}"/>
        <path d="M159 125h17M167 116v18" stroke="#fffaf1" stroke-width="5" stroke-linecap="round"/>
        <circle cx="179" cy="124" r="5" fill="#fffaf1"/>
        <rect x="126" y="174" width="74" height="18" fill="${colors[1]}"/>
        <rect x="126" y="207" width="36" height="18" fill="${colors[2]}"/>
      `;
    }
    if (category === "Comida") {
      return `
        <path d="M126 112l88 28-68 62Z" fill="${colors[2]}" stroke="#232323" stroke-width="7" stroke-linejoin="round"/>
        <circle cx="158" cy="147" r="8" fill="${colors[1]}"/>
        <circle cx="181" cy="156" r="7" fill="${colors[1]}"/>
        <circle cx="151" cy="172" r="6" fill="${colors[1]}"/>
        <path d="M130 216h83M130 243h57" stroke="${colors[1]}" stroke-width="12" stroke-linecap="round"/>
      `;
    }
    if (category === "Animales") {
      return `
        <path d="M135 104c22-17 52-17 75 0v58h-75v-58Z" fill="${colors[2]}" stroke="#232323" stroke-width="7"/>
        <circle cx="158" cy="129" r="5" fill="#232323"/>
        <circle cx="189" cy="129" r="5" fill="#232323"/>
        <path d="M166 147c8 6 16 6 24 0M139 99l-18-20M206 99l18-20" stroke="#232323" stroke-width="7" stroke-linecap="round"/>
        <path d="M126 211c20 15 54 15 83 0M126 245c20 15 54 15 83 0" stroke="${colors[1]}" stroke-width="10" stroke-linecap="round"/>
      `;
    }
    if (category === "Retro") {
      return `
        <circle cx="159" cy="124" r="28" fill="${colors[2]}" stroke="#232323" stroke-width="7"/>
        <circle cx="199" cy="181" r="19" fill="${colors[1]}" stroke="#232323" stroke-width="7"/>
        <rect x="128" y="218" width="88" height="18" fill="${colors[2]}" stroke="#232323" stroke-width="6"/>
        <rect x="128" y="252" width="58" height="18" fill="${colors[1]}" stroke="#232323" stroke-width="6"/>
      `;
    }
    return `
      <rect x="126" y="104" width="92" height="32" fill="${colors[2]}" stroke="#232323" stroke-width="7"/>
      <path d="M130 173h72M130 204h92M130 235h58" stroke="${colors[1]}" stroke-width="12" stroke-linecap="round"/>
      <text x="132" y="128" font-family="Trebuchet MS, Arial, sans-serif" font-size="20" font-weight="900" fill="#232323">&lt;/&gt;</text>
    `;
  }

  function defaultProducts() {
    const items = [
      {
        id: "media-pizza",
        name: "Media Pizza",
        price: 7,
        category: "Comida",
        size: "Talla única",
        description: "Una media con hambre de viernes, queso imaginario y borde crujiente.",
        featured: true,
      },
      {
        id: "media-pac-man",
        name: "Media Pac-Man",
        price: 8,
        category: "Gamer",
        size: "Talla única",
        description: "Retro, amarilla y lista para perseguir fantasmas en la cola del café.",
        featured: true,
      },
      {
        id: "media-terminal",
        name: "Media Terminal",
        price: 8,
        category: "Geek",
        size: "Talla única",
        description: "Para quienes abren una consola y sienten que el día ya arrancó bien.",
        featured: true,
      },
      {
        id: "media-arepa",
        name: "Media Arepa",
        price: 7,
        category: "Comida",
        size: "Talla única",
        description: "Rellena de buen humor, nostalgia y ganas de repetir.",
        featured: false,
      },
      {
        id: "media-capy",
        name: "Media Chigüire",
        price: 9,
        category: "Animales",
        size: "Talla única",
        description: "La más relajada del lote. Va con todo y no se estresa por nada.",
        featured: true,
      },
      {
        id: "media-vhs",
        name: "Media VHS",
        price: 8,
        category: "Retro",
        size: "Talla única",
        description: "Para quienes todavía aman el ruido visual, los colores grandes y lo analógico.",
        featured: false,
      },
      {
        id: "media-pixel",
        name: "Media Pixel",
        price: 8,
        category: "Gamer",
        size: "Talla única",
        description: "Cuadritos felices para caminar como personaje desbloqueado.",
        featured: false,
      },
      {
        id: "media-debug",
        name: "Media Debug",
        price: 8,
        category: "Geek",
        size: "Talla única",
        description: "No arregla bugs, pero acompaña con estilo mientras aparecen.",
        featured: false,
      },
    ];

    return items.map((item) => ({
      ...item,
      image: imageFor(item.name, item.category),
    }));
  }

  function loadProducts() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_PRODUCTS));
      if (Array.isArray(saved) && saved.length) {
        return saved.map(sanitizeProduct);
      }
    } catch (error) {
      console.warn("No se pudo leer el catálogo", error);
    }

    const seeded = defaultProducts();
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(seeded));
    return seeded;
  }

  function sanitizeProduct(product) {
    const category = CATEGORIES.includes(product.category) ? product.category : "Geek";
    const name = product.name || "Media nueva";
    return {
      id: product.id || `${slugify(name) || "media"}-${Date.now()}`,
      name,
      price: Number(product.price) || 0,
      image: product.image || imageFor(name, category),
      category,
      size: product.size || "Talla única",
      description: product.description || "Media divertida Chigüire Club.",
      featured: Boolean(product.featured),
    };
  }

  function saveProducts() {
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products));
  }

  function loadCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_CART));
      if (saved && typeof saved === "object") {
        return saved;
      }
    } catch (error) {
      console.warn("No se pudo leer el carrito", error);
    }
    return {};
  }

  function saveCart() {
    localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
    updateCartCount();
  }

  function uniqueId(name) {
    const base = slugify(name) || "media";
    let candidate = base;
    let index = 2;
    while (products.some((product) => product.id === candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  function currentRoute() {
    if (adminEntry) {
      return { view: "admin" };
    }

    const raw = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
    if (!raw) {
      return { view: "home" };
    }

    const [path, queryString] = raw.split("?");
    const [view, id] = path.split("/");
    return {
      view: view || "home",
      id,
      query: new URLSearchParams(queryString || ""),
    };
  }

  function linkTo(route) {
    if (!route || route === "home") {
      return adminEntry ? "../index.html#home" : "#home";
    }
    if (route === "admin") {
      return adminEntry ? "./" : "./admin/";
    }
    return adminEntry ? `../index.html#${route}` : `#${route}`;
  }

  function updateCartCount() {
    const count = Object.values(cart).reduce((sum, qty) => sum + Number(qty || 0), 0);
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
      badge.textContent = String(count);
    });
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove("visible");
    }, 2200);
  }

  function addToCart(id, quantity = 1) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    cart[id] = Math.max(1, Number(cart[id] || 0) + quantity);
    saveCart();
    showToast(`${product.name} agregado al carrito`);
  }

  function setCartQuantity(id, quantity) {
    if (quantity <= 0) {
      delete cart[id];
    } else {
      cart[id] = quantity;
    }
    saveCart();
    render();
  }

  function cartItems() {
    const validItems = Object.entries(cart)
      .map(([id, quantity]) => {
        const product = products.find((item) => item.id === id);
        return product ? { product, quantity: Number(quantity) || 1 } : null;
      })
      .filter(Boolean);

    const validIds = new Set(validItems.map((item) => item.product.id));
    Object.keys(cart).forEach((id) => {
      if (!validIds.has(id)) {
        delete cart[id];
      }
    });
    saveCart();
    return validItems;
  }

  function cartTotal(items = cartItems()) {
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }

  function productCard(product) {
    return `
      <article class="product-card">
        <a class="product-media" href="${linkTo(`producto/${product.id}`)}" aria-label="Ver ${escapeHtml(product.name)}">
          <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />
        </a>
        <div class="product-body">
          <div class="product-topline">
            <h3 class="product-title">
              <a href="${linkTo(`producto/${product.id}`)}">${escapeHtml(product.name)}</a>
            </h3>
            <span class="price">${money(product.price)}</span>
          </div>
          <p class="muted">${escapeHtml(product.description)}</p>
          <div class="chip-row">
            <span class="chip">${escapeHtml(product.category)}</span>
            <span class="chip">${escapeHtml(product.size)}</span>
          </div>
          <button class="button full" type="button" data-add="${product.id}">Agregar al carrito</button>
        </div>
      </article>
    `;
  }

  function renderHome() {
    const featured = products.filter((product) => product.featured).slice(0, 4);
    const heroOne = featured[0] || products[0];
    const heroTwo = featured[1] || products[1] || products[0];
    app.innerHTML = `
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-copy">
            <span class="eyebrow">Medias venezolanas</span>
            <h1>CHIGÜIRE CLUB</h1>
            <p class="lead">Medias divertidas, relajadas y geek para salir de lo básico y pedir en dos toques por WhatsApp.</p>
            <div class="hero-actions">
              <a class="button" href="${linkTo("tienda")}">Ver tienda</a>
              <a class="button secondary" href="${linkTo("carrito")}">Ver carrito</a>
            </div>
          </div>
          <div class="hero-art" aria-label="Medias Chigüire Club">
            <img class="hero-sock one" src="${heroOne.image}" alt="${escapeHtml(heroOne.name)}" />
            <img class="hero-sock two" src="${heroTwo.image}" alt="${escapeHtml(heroTwo.name)}" />
            <div class="hero-stamp">Primeros 100 pares</div>
          </div>
        </div>
      </section>

      <div class="page">
        <section class="section">
          <div class="section-header">
            <div>
              <span class="section-kicker">Destacadas</span>
              <h2>Favoritas del club</h2>
            </div>
            <a class="button secondary" href="${linkTo("tienda")}">Todas</a>
          </div>
          <div class="product-grid">${featured.map(productCard).join("")}</div>
        </section>

        <section class="section">
          <div class="section-header">
            <div>
              <span class="section-kicker">Categorías</span>
              <h2>Escoge tu mood</h2>
            </div>
          </div>
          <div class="category-grid">
            ${CATEGORIES.map(categoryTile).join("")}
          </div>
        </section>

        <section class="section">
          <div class="section-header">
            <div>
              <span class="section-kicker">Por qué</span>
              <h2>Hechas para romper el uniforme</h2>
            </div>
          </div>
          <div class="why-grid">
            <article class="why-item">
              <h3>Diseños con personalidad</h3>
              <p>Comida, juegos, cultura geek y guiños venezolanos sin ponerse solemnes.</p>
            </article>
            <article class="why-item">
              <h3>Pedido directo</h3>
              <p>Armas tu carrito y lo envías por WhatsApp para cerrar rápido la compra.</p>
            </article>
            <article class="why-item">
              <h3>Talla única</h3>
              <p>Menos vueltas, más medias. Cada producto muestra su categoría y precio claro.</p>
            </article>
          </div>
        </section>

        <section class="section">
          <div class="section-header">
            <div>
              <span class="section-kicker">FAQ</span>
              <h2>Dudas rápidas</h2>
            </div>
          </div>
          <div class="faq-list">
            <details class="faq-item">
              <summary>¿Cómo hago el pedido?</summary>
              <p>Agrega productos al carrito y envía el resumen por WhatsApp.</p>
            </details>
            <details class="faq-item">
              <summary>¿Hay pago online?</summary>
              <p>Por ahora el pedido se coordina directamente por WhatsApp.</p>
            </details>
            <details class="faq-item">
              <summary>¿El catálogo cambia?</summary>
              <p>Sí, el equipo puede actualizar diseños, precios y categorías cuando entren nuevos modelos.</p>
            </details>
          </div>
        </section>

        <section class="section">
          <div class="section-header">
            <div>
              <span class="section-kicker">Instagram</span>
              <h2>@chiguireclub</h2>
            </div>
          </div>
          <div class="insta-grid">
            ${products.slice(0, 4).map(instaTile).join("")}
          </div>
        </section>
      </div>

      ${footerHtml()}
    `;
  }

  function categoryTile(category) {
    const count = products.filter((product) => product.category === category).length;
    return `
      <a class="category-tile" href="${linkTo(`tienda?category=${encodeURIComponent(category)}`)}">
        <span>${category}</span>
        <span class="category-count">${count}</span>
      </a>
    `;
  }

  function instaTile(product) {
    return `
      <article class="insta-tile">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />
      </article>
    `;
  }

  function renderStore(route) {
    const categoryFromRoute = route.query?.get("category");
    activeStoreFilters.category = CATEGORIES.includes(categoryFromRoute)
      ? categoryFromRoute
      : "Todos";
    app.innerHTML = `
      <div class="page">
        <section class="section">
          <div class="section-header">
            <div>
              <span class="section-kicker">Tienda</span>
              <h1 class="detail-title">Catálogo</h1>
            </div>
          </div>

          <div class="store-controls">
            <label class="field">
              <span>Buscar</span>
              <input class="input" type="search" data-search placeholder="Pizza, retro, geek..." value="${escapeHtml(activeStoreFilters.search)}" />
            </label>
            <label class="field">
              <span>Ordenar</span>
              <select class="select" data-sort>
                <option value="name"${activeStoreFilters.sort === "name" ? " selected" : ""}>Nombre</option>
                <option value="price"${activeStoreFilters.sort === "price" ? " selected" : ""}>Precio menor a mayor</option>
                <option value="price-desc"${activeStoreFilters.sort === "price-desc" ? " selected" : ""}>Precio mayor a menor</option>
              </select>
            </label>
            <div class="filter-zone">
              <div class="fieldset-title">Categoría</div>
              <div class="filter-pills" data-category-filters>
                ${["Todos", ...CATEGORIES].map((category) => `
                  <button class="filter-pill${activeStoreFilters.category === category ? " active" : ""}" type="button" data-category="${category}">
                    ${category}
                  </button>
                `).join("")}
              </div>
            </div>
          </div>

          <p class="result-line" data-result-line></p>
          <div class="product-grid" data-store-grid></div>
        </section>
      </div>
      ${footerHtml()}
    `;

    const grid = app.querySelector("[data-store-grid]");
    const resultLine = app.querySelector("[data-result-line]");
    const searchInput = app.querySelector("[data-search]");
    const sortSelect = app.querySelector("[data-sort]");
    const categoryWrap = app.querySelector("[data-category-filters]");

    function filteredProducts() {
      const search = activeStoreFilters.search.trim().toLowerCase();
      return products
        .filter((product) => {
          const inCategory =
            activeStoreFilters.category === "Todos" ||
            product.category === activeStoreFilters.category;
          const inSearch =
            !search ||
            `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(search);
          return inCategory && inSearch;
        })
        .sort((a, b) => {
          if (activeStoreFilters.sort === "price") return a.price - b.price;
          if (activeStoreFilters.sort === "price-desc") return b.price - a.price;
          return a.name.localeCompare(b.name, "es");
        });
    }

    function drawGrid() {
      const visible = filteredProducts();
      resultLine.textContent = `${visible.length} producto${visible.length === 1 ? "" : "s"}`;
      grid.innerHTML = visible.length
        ? visible.map(productCard).join("")
        : `<div class="empty-state"><h3>No encontramos medias con ese filtro.</h3><a class="button secondary" href="${linkTo("tienda")}">Limpiar filtros</a></div>`;
      categoryWrap.querySelectorAll("[data-category]").forEach((button) => {
        button.classList.toggle("active", button.dataset.category === activeStoreFilters.category);
      });
    }

    searchInput.addEventListener("input", (event) => {
      activeStoreFilters.search = event.target.value;
      drawGrid();
    });
    sortSelect.addEventListener("change", (event) => {
      activeStoreFilters.sort = event.target.value;
      drawGrid();
    });
    categoryWrap.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      activeStoreFilters.category = button.dataset.category;
      drawGrid();
    });

    drawGrid();
  }

  function renderProduct(route) {
    const product = products.find((item) => item.id === route.id);
    if (!product) {
      app.innerHTML = `
        <div class="page">
          <section class="section">
            <div class="empty-state">
              <h1 class="detail-title">Producto no encontrado</h1>
              <a class="button" href="${linkTo("tienda")}">Volver a tienda</a>
            </div>
          </section>
        </div>
        ${footerHtml()}
      `;
      return;
    }

    app.innerHTML = `
      <div class="page">
        <section class="section product-detail">
          <div class="product-detail-media">
            <img src="${product.image}" alt="${escapeHtml(product.name)}" />
          </div>
          <div>
            <span class="section-kicker">${escapeHtml(product.category)}</span>
            <h1 class="detail-title">${escapeHtml(product.name)}</h1>
            <span class="price">${money(product.price)}</span>
            <p class="lead">${escapeHtml(product.description)}</p>
            <div class="detail-meta">
              <div class="meta-card">
                <strong>Talla</strong>
                ${escapeHtml(product.size)}
              </div>
              <div class="meta-card">
                <strong>Categoría</strong>
                ${escapeHtml(product.category)}
              </div>
            </div>
            <div class="hero-actions">
              <button class="button" type="button" data-add="${product.id}">Agregar al carrito</button>
              <a class="button secondary" href="${linkTo("tienda")}">Seguir viendo</a>
            </div>
          </div>
        </section>
      </div>
      ${footerHtml()}
    `;
  }

  function renderCart() {
    const items = cartItems();
    const total = cartTotal(items);

    if (!items.length) {
      app.innerHTML = `
        <div class="page">
          <section class="section">
            <div class="empty-state">
              <span class="section-kicker">Carrito</span>
              <h1 class="detail-title">Todavía no hay medias</h1>
              <a class="button" href="${linkTo("tienda")}">Ir a tienda</a>
            </div>
          </section>
        </div>
        ${footerHtml()}
      `;
      return;
    }

    app.innerHTML = `
      <div class="page">
        <section class="section">
          <div class="section-header">
            <div>
              <span class="section-kicker">Carrito</span>
              <h1 class="detail-title">Tu pedido</h1>
            </div>
          </div>
          <div class="cart-layout">
            <div class="cart-list">
              ${items.map(cartItemHtml).join("")}
            </div>
            <aside class="cart-summary">
              <div class="summary-line">
                <span>Total</span>
                <span>${money(total)}</span>
              </div>
              <button class="button olive full" type="button" data-whatsapp>Enviar pedido por WhatsApp</button>
            </aside>
          </div>
        </section>
      </div>
      ${footerHtml()}
    `;
  }

  function cartItemHtml(item) {
    const subtotal = item.product.price * item.quantity;
    return `
      <article class="cart-item">
        <img src="${item.product.image}" alt="${escapeHtml(item.product.name)}" />
        <div class="cart-item-main">
          <div>
            <h3 class="cart-item-title">${escapeHtml(item.product.name)}</h3>
            <div class="chip-row">
              <span class="chip">${escapeHtml(item.product.category)}</span>
              <span class="chip">${money(subtotal)}</span>
            </div>
          </div>
          <div class="quantity-row" aria-label="Cantidad de ${escapeHtml(item.product.name)}">
            <button class="icon-button" type="button" data-qty="${item.product.id}" data-delta="-1" aria-label="Disminuir cantidad">−</button>
            <strong>${item.quantity}</strong>
            <button class="icon-button" type="button" data-qty="${item.product.id}" data-delta="1" aria-label="Aumentar cantidad">+</button>
            <button class="icon-button remove-button" type="button" data-remove="${item.product.id}" aria-label="Eliminar ${escapeHtml(item.product.name)}">×</button>
          </div>
        </div>
      </article>
    `;
  }

  function whatsappMessage() {
    const items = cartItems();
    const lines = items.map((item) => `* ${item.product.name} x${item.quantity}`);
    return [
      "Hola Chigüire Club.",
      "",
      "Quiero pedir:",
      "",
      ...lines,
      "",
      `Total: ${money(cartTotal(items))}`,
      "",
      "Gracias.",
    ].join("\n");
  }

  function openWhatsapp() {
    const message = encodeURIComponent(whatsappMessage());
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener");
  }

  function supabaseConfig() {
    return window.CHIGUIRE_SUPABASE_CONFIG || {};
  }

  function isSupabaseConfigured() {
    const config = supabaseConfig();
    return Boolean(config.url && config.anonKey);
  }

  async function initSupabaseAuth() {
    if (!adminEntry) return;

    if (!isSupabaseConfigured()) {
      adminAuthReady = true;
      render();
      return;
    }

    if (!window.supabase || !window.supabase.createClient) {
      adminAuthNotice = "No se pudo cargar Supabase. Revisa la conexión o el script CDN.";
      adminAuthReady = true;
      render();
      return;
    }

    try {
      const config = supabaseConfig();
      supabaseClient = window.supabase.createClient(config.url, config.anonKey);
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) {
        adminAuthNotice = error.message;
      }
      adminSession = data?.session || null;
      supabaseClient.auth.onAuthStateChange((_event, session) => {
        adminSession = session;
        adminAuthNotice = "";
        render();
      });
    } catch (error) {
      adminAuthNotice = error.message || "No se pudo iniciar Supabase.";
    } finally {
      adminAuthReady = true;
      render();
    }
  }

  function renderAdminGate() {
    app.innerHTML = `
      <div class="page">
        <section class="section">
          <div class="admin-panel auth-card">
            <span class="section-kicker">Admin</span>
            <h1 class="detail-title">Acceso interno</h1>
            <p class="lead">Configura Supabase para activar el panel de administración.</p>
            <div class="meta-card">
              Edita <strong>supabase-config.js</strong> con el Project URL y la anon public key de Supabase.
            </div>
          </div>
        </section>
      </div>
      ${footerHtml()}
    `;
  }

  function renderAdminLogin() {
    app.innerHTML = `
      <div class="page">
        <section class="section">
          <div class="admin-panel auth-card">
            <span class="section-kicker">Admin</span>
            <h1 class="detail-title">Iniciar sesión</h1>
            ${adminAuthNotice ? `<p class="auth-notice">${escapeHtml(adminAuthNotice)}</p>` : ""}
            <form class="admin-form" data-auth-form>
              <label class="field">
                <span>Email</span>
                <input class="input" name="email" type="email" autocomplete="email" required />
              </label>
              <label class="field">
                <span>Contraseña</span>
                <input class="input" name="password" type="password" autocomplete="current-password" required />
              </label>
              <button class="button full" type="submit">Entrar</button>
            </form>
          </div>
        </section>
      </div>
      ${footerHtml()}
    `;

    bindAdminLogin();
  }

  function renderAdminLoading() {
    app.innerHTML = `
      <div class="page">
        <section class="section">
          <div class="admin-panel auth-card">
            <span class="section-kicker">Admin</span>
            <h1 class="detail-title">Revisando acceso</h1>
            <p class="lead">Un momento.</p>
          </div>
        </section>
      </div>
    `;
  }

  function bindAdminLogin() {
    const form = app.querySelector("[data-auth-form]");
    if (!form || !supabaseClient) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const submit = form.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "Entrando...";

      const { data: authData, error } = await supabaseClient.auth.signInWithPassword({
        email: data.get("email").trim(),
        password: data.get("password"),
      });

      if (error) {
        adminAuthNotice = "Email o contraseña inválidos.";
        renderAdminLogin();
      } else {
        adminSession = authData?.session || null;
        renderAdmin();
        showToast("Sesión iniciada");
      }
    });
  }

  async function signOutAdmin() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    adminSession = null;
    renderAdmin();
  }

  function renderAdmin() {
    if (!adminAuthReady) {
      renderAdminLoading();
      return;
    }

    if (!isSupabaseConfigured()) {
      renderAdminGate();
      return;
    }

    if (!adminSession) {
      renderAdminLogin();
      return;
    }

    app.innerHTML = `
      <div class="page">
        <section class="section">
          <div class="section-header">
            <div>
              <span class="section-kicker">Admin</span>
              <h1 class="detail-title">Catálogo</h1>
            </div>
            <button class="button secondary" type="button" data-admin-signout>Salir</button>
          </div>

          <div class="admin-layout">
            <section class="admin-panel" aria-labelledby="admin-form-title">
              <h2 id="admin-form-title">Producto</h2>
              <form class="admin-form" data-product-form>
                <input type="hidden" name="editingId" />
                <label class="field">
                  <span>Nombre</span>
                  <input class="input" name="name" required maxlength="80" placeholder="Media Pizza" />
                </label>
                <label class="field">
                  <span>Precio</span>
                  <input class="input" name="price" required min="0" step="0.01" type="number" placeholder="7" />
                </label>
                <label class="field">
                  <span>Categoría</span>
                  <select class="select" name="category" required>
                    ${CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join("")}
                  </select>
                </label>
                <label class="field">
                  <span>Talla</span>
                  <input class="input" name="size" required value="Talla única" />
                </label>
                <label class="field">
                  <span>Imagen</span>
                  <input class="input" name="imageUrl" placeholder="URL o data URL" />
                </label>
                <label class="field">
                  <span>Descripción</span>
                  <textarea class="textarea" name="description" required maxlength="180" placeholder="Descripción corta"></textarea>
                </label>
                <label class="checkbox-field">
                  <input type="checkbox" name="featured" />
                  Producto destacado
                </label>
                <div class="form-actions">
                  <button class="button" type="submit">Guardar producto</button>
                  <button class="button secondary" type="button" data-clear-form>Limpiar</button>
                </div>
              </form>
            </section>

            <section class="admin-panel" aria-labelledby="admin-products-title">
              <h2 id="admin-products-title">Productos</h2>
              <div class="admin-products" data-admin-products>
                ${products.map(adminProductHtml).join("")}
              </div>
            </section>
          </div>
        </section>
      </div>
      ${footerHtml()}
    `;

    bindAdminForm();
  }

  function adminProductHtml(product) {
    return `
      <article class="admin-product">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" />
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <div class="chip-row">
            <span class="chip">${money(product.price)}</span>
            <span class="chip">${escapeHtml(product.category)}</span>
            ${product.featured ? `<span class="chip">Destacado</span>` : ""}
          </div>
          <div class="admin-product-actions">
            <button class="button secondary" type="button" data-edit="${product.id}">Editar</button>
            <button class="button" type="button" data-delete="${product.id}">Eliminar</button>
          </div>
        </div>
      </article>
    `;
  }

  function bindAdminForm() {
    const form = app.querySelector("[data-product-form]");
    const clearButton = app.querySelector("[data-clear-form]");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const editingId = data.get("editingId");
      const name = data.get("name").trim();
      const category = data.get("category");
      const image = data.get("imageUrl").trim() || imageFor(name, category);
      const nextProduct = sanitizeProduct({
        id: editingId || uniqueId(name),
        name,
        price: Number(data.get("price")),
        image,
        category,
        size: data.get("size").trim() || "Talla única",
        description: data.get("description").trim(),
        featured: data.get("featured") === "on",
      });

      if (editingId) {
        products = products.map((product) => (product.id === editingId ? nextProduct : product));
        showToast("Producto actualizado");
      } else {
        products = [nextProduct, ...products];
        showToast("Producto agregado");
      }

      saveProducts();
      renderAdmin();
    });

    clearButton.addEventListener("click", () => {
      form.reset();
      form.elements.size.value = "Talla única";
      form.elements.editingId.value = "";
    });
  }

  function fillAdminForm(product) {
    const form = app.querySelector("[data-product-form]");
    form.elements.editingId.value = product.id;
    form.elements.name.value = product.name;
    form.elements.price.value = product.price;
    form.elements.category.value = product.category;
    form.elements.size.value = product.size;
    form.elements.imageUrl.value = product.image;
    form.elements.description.value = product.description;
    form.elements.featured.checked = product.featured;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteProduct(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    const ok = window.confirm(`Eliminar ${product.name}?`);
    if (!ok) return;
    products = products.filter((item) => item.id !== id);
    delete cart[id];
    saveProducts();
    saveCart();
    renderAdmin();
    showToast("Producto eliminado");
  }

  function footerHtml() {
    const footerLinks = adminEntry
      ? `
            <a href="${linkTo("tienda")}">Tienda</a>
            &nbsp;/&nbsp;
            <a href="${linkTo("admin")}">Admin</a>
            &nbsp;/&nbsp;
            <a href="${linkTo("carrito")}">Carrito</a>
          `
      : `
            <a href="${linkTo("tienda")}">Tienda</a>
            &nbsp;/&nbsp;
            <a href="${linkTo("carrito")}">Carrito</a>
          `;

    return `
      <footer class="footer">
        <div class="footer-inner">
          <div class="brand">
            <span class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 64 64" role="img">
                <path d="M15 38c0-13 10-23 24-23 8 0 14 5 14 13 0 14-11 23-25 23-8 0-13-5-13-13Z" />
                <path d="M9 40c0-5 4-9 10-9h6v17h-6c-6 0-10-3-10-8Z" />
                <path d="M43 21h9l5 7-8 3" />
                <path d="M26 47v8M45 41v9" />
                <circle cx="44" cy="28" r="2" />
              </svg>
            </span>
            <span class="brand-text">CHIGÜIRE CLUB</span>
          </div>
          <div>
            ${footerLinks}
          </div>
        </div>
      </footer>
    `;
  }

  function render() {
    const route = currentRoute();
    updateCartCount();

    if (route.view === "tienda") {
      renderStore(route);
      return;
    }
    if (route.view === "producto") {
      renderProduct(route);
      return;
    }
    if (route.view === "carrito") {
      renderCart();
      return;
    }
    if (route.view === "admin") {
      renderAdmin();
      return;
    }
    renderHome();
  }

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add]");
    if (addButton) {
      addToCart(addButton.dataset.add);
      return;
    }

    const qtyButton = event.target.closest("[data-qty]");
    if (qtyButton) {
      const id = qtyButton.dataset.qty;
      const delta = Number(qtyButton.dataset.delta);
      setCartQuantity(id, Number(cart[id] || 0) + delta);
      return;
    }

    const removeButton = event.target.closest("[data-remove]");
    if (removeButton) {
      setCartQuantity(removeButton.dataset.remove, 0);
      return;
    }

    const whatsappButton = event.target.closest("[data-whatsapp]");
    if (whatsappButton) {
      openWhatsapp();
      return;
    }

    const editButton = event.target.closest("[data-edit]");
    if (editButton) {
      const product = products.find((item) => item.id === editButton.dataset.edit);
      if (product) fillAdminForm(product);
      return;
    }

    const deleteButton = event.target.closest("[data-delete]");
    if (deleteButton) {
      deleteProduct(deleteButton.dataset.delete);
      return;
    }

    const signOutButton = event.target.closest("[data-admin-signout]");
    if (signOutButton) {
      signOutAdmin();
    }
  });

  window.addEventListener("hashchange", render);
  render();
  initSupabaseAuth();
})();
