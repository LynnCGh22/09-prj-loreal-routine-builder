/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

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
  `
    )
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

// Load saved theme preference on page load
const savedTheme = localStorage.getItem("theme") || "light";
if (savedTheme === "dark") {
  body.classList.add("dark-mode");
  logo.src = "img/loreal-logo-black-and-white.png"; // Use white logo for dark mode
  themeToggle.textContent = "☀️"; // Show sun icon to let user switch to light mode
} else {
  themeToggle.textContent = "🌙"; // Show moon icon to let user switch to dark mode
}

// Handle theme toggle button click
themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode"); // Toggle the dark-mode class

  // Update the button icon and logo based on the new mode
  if (body.classList.contains("dark-mode")) {
    logo.src = "img/loreal-logo-black-and-white.png"; // Use white logo for dark mode
    themeToggle.textContent = "☀️"; // Show sun icon to let user switch to light mode
    localStorage.setItem("theme", "dark"); // Save preference
  } else {
    logo.src = "img/loreal-logo.png"; // Use black logo for light mode
    themeToggle.textContent = "🌙"; // Show moon icon to let user switch to dark mode
    localStorage.setItem("theme", "light"); // Save preference
  }
});
