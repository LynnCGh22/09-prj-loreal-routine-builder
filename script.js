/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const body = document.body;
const logo = document.querySelector(".logo");
const themeToggle = document.getElementById("themeToggle");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `,
    )
    .join("");
}

/* Keep the "Selected Products" section in sync with selected cards */
function updateSelectedProducts() {
  const selectedCards = productsContainer.querySelectorAll(
    ".product-card.selected",
  );
  const selectedNames = Array.from(selectedCards).map(
    (card) => card.querySelector("h3").textContent,
  );
  const selectedProductsSection = document.getElementById("selectedProducts");

  if (!selectedProductsSection) {
    return;
  }

  selectedProductsSection.innerHTML = `
    <h2>Selected Products</h2>
    <ul>
      ${selectedNames.map((name) => `<li>${name}</li>`).join("")}
    </ul>
  `;
}

/* Handle select/unselect on click and apply visual highlight */
productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card || !productsContainer.contains(card)) {
    return;
  }

  card.classList.toggle("selected");

  card.style.border = card.classList.contains("selected")
    ? "2px solid #7f2b33"
    : "1px solid #ccc";
  card.style.backgroundColor = card.classList.contains("selected")
    ? "#E0F0FF"
    : "#fff";

  updateSelectedProducts();
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
      where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
  updateSelectedProducts();
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

/* Apply the selected theme and keep UI elements in sync */
function applyTheme(theme) {
  const isDarkMode = theme === "dark";
  body.classList.toggle("dark-mode", isDarkMode);

  if (logo) {
    logo.src = isDarkMode
      ? "img/loreal-logo-black-and-white (1).png"
      : "img/loreal-logo-png-transparent.png";
  }

  if (themeToggle) {
    themeToggle.textContent = isDarkMode ? "☀️" : "🌙";
    themeToggle.setAttribute(
      "aria-label",
      isDarkMode ? "Switch to light mode" : "Switch to dark mode",
    );
  }
}

// Load saved theme preference on page load
const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

// Handle theme toggle button click
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = body.classList.contains("dark-mode") ? "light" : "dark";
    applyTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  });
}
