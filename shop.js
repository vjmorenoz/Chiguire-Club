// ============================================
// CHIGÜIRE CLUB — Tienda
// ============================================

let activeCategory = "Todas";
let searchQuery = "";
let sortOrder = "default";

// "Chigüire" y "chiguire" deben coincidir en la búsqueda
function normalizeText(str) {
  return String(str ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function renderShop() {
  renderFilterBar();
  renderShopGrid();
}

function setShopFilter(category) {
  activeCategory = category;
  renderFilterBar();
  renderShopGrid();
}

function renderFilterBar() {
  document.getElementById("filterBar").innerHTML = CATEGORIES.map(cat => `
    <button class="filter-btn${activeCategory === cat ? " active" : ""}" type="button"
      data-filter="${cat}" aria-pressed="${activeCategory === cat}">${cat}</button>
  `).join("");
}

function getFilteredProducts() {
  let products = getProducts();

  if (activeCategory !== "Todas") {
    products = products.filter(p => p.category === activeCategory);
  }

  const q = normalizeText(searchQuery.trim());
  if (q) {
    products = products.filter(p => normalizeText(`${p.name} ${p.description} ${p.category}`).includes(q));
  }

  const sorters = {
    "name-asc": (a, b) => a.name.localeCompare(b.name, "es"),
    "name-desc": (a, b) => b.name.localeCompare(a.name, "es"),
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price
  };
  if (sorters[sortOrder]) products.sort(sorters[sortOrder]);

  return products;
}

function renderShopGrid() {
  const grid = document.getElementById("shopGrid");
  const empty = document.getElementById("shopEmpty");
  const count = document.getElementById("productsCount");

  if (catalogStatus === "error") {
    grid.style.display = "block";
    grid.innerHTML = catalogErrorHTML();
    empty.hidden = true;
    count.textContent = "";
    return;
  }

  const products = getFilteredProducts();
  const n = products.length;

  grid.style.display = "";
  grid.replaceChildren(...products.map(renderProductCard));
  empty.hidden = n > 0;
  count.textContent = n ? `${n} producto${n !== 1 ? "s" : ""}` : "";
}

function bindShopControls() {
  document.getElementById("searchInput").addEventListener("input", e => {
    searchQuery = e.target.value;
    renderShopGrid();
  });

  document.getElementById("sortSelect").addEventListener("change", e => {
    sortOrder = e.target.value;
    renderShopGrid();
  });

  document.getElementById("filterBar").addEventListener("click", e => {
    const btn = e.target.closest("[data-filter]");
    if (btn) setShopFilter(btn.dataset.filter);
  });

  document.getElementById("shopResetBtn").addEventListener("click", () => {
    searchQuery = "";
    document.getElementById("searchInput").value = "";
    setShopFilter("Todas");
  });
}
