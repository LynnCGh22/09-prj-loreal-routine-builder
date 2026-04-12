/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const body = document.body;
const logo = document.querySelector(".logo");
const themeToggle = document.getElementById("themeToggle");
let cachedProducts = [];

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

/* Load products once and reuse them to keep UI updates fast and consistent */
async function getProducts() {
  if (cachedProducts.length > 0) {
    return cachedProducts;
  }

  cachedProducts = await loadProducts();
  return cachedProducts;
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
  const selectedProductsList = document.getElementById("selectedProductsList");

  if (!selectedProductsList) {
    updateGenerateRoutineButtonState();
    return;
  }

  selectedProductsList.innerHTML = selectedNames.length
    ? `<ul>${selectedNames.map((name) => `<li>${name}</li>`).join("")}</ul>`
    : `<p>No products selected yet.</p>`;

  updateGenerateRoutineButtonState();
}

/* Enable the Generate Routine button only when at least one product is selected */
function updateGenerateRoutineButtonState() {
  if (!generateRoutineButton) {
    return;
  }

  const selectedCards = productsContainer.querySelectorAll(
    ".product-card.selected",
  );
  const hasSelectedProducts = selectedCards.length > 0;

  generateRoutineButton.disabled = !hasSelectedProducts;
  generateRoutineButton.setAttribute(
    "aria-disabled",
    String(!hasSelectedProducts),
  );
}

/* Handle select/unselect on click and apply visual highlight */
productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card || !productsContainer.contains(card)) {
    return;
  }

  card.classList.toggle("selected");

  const isSelected = card.classList.contains("selected");
  if (isSelected) {
    card.style.border = "2px solid #7f2b33";
    card.style.backgroundColor = "#E0F0FF";
  } else {
    card.style.border = "";
    card.style.backgroundColor = "";
  }

  updateSelectedProducts();
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  if (e.target.name !== "categoryFilterOption") {
    return;
  }

  const selectedCategories = Array.from(
    categoryFilter.querySelectorAll(
      'input[name="categoryFilterOption"]:checked',
    ),
  ).map((checkbox) => checkbox.value);

  const selectedCategoriesLabel = selectedCategories.length
    ? selectedCategories.join(", ")
    : "None";

  chatWindow.innerHTML = `
    <p><strong>Categories updated:</strong> ${selectedCategoriesLabel}</p>
    <p>Select a product to view details, or choose products and click Generate Routine.</p>
  `;

  try {
    const products = await getProducts();

    if (selectedCategories.length === 0) {
      productsContainer.innerHTML = `
        <div class="placeholder-message">
          Select one or more categories to view products.
        </div>
      `;
      updateSelectedProducts();
      return;
    }

    /* filter() creates a new array containing only products
        where the category matches one of the selected categories */
    const filteredProducts = products.filter((product) =>
      selectedCategories.includes(product.category),
    );

    if (filteredProducts.length === 0) {
      productsContainer.innerHTML = `
        <div class="placeholder-message">
          No products found in this category yet.
        </div>
      `;
    } else {
      displayProducts(filteredProducts);
    }

    updateSelectedProducts();
  } catch (error) {
    console.error("Error filtering products:", error);
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Could not load products. Please try again.
      </div>
    `;
    updateSelectedProducts();
  }
});

/* Display the product description in the chat window when a product card is clicked */
productsContainer.addEventListener("click", async (e) => {
  const card = e.target.closest(".product-card");
  if (!card || !productsContainer.contains(card)) {
    return;
  }

  const productTitle = card.querySelector("h3");
  if (!productTitle) {
    return;
  }

  const productName = productTitle.textContent.trim();
  chatWindow.innerHTML = `<p>Loading product details...</p>`;

  try {
    const products = await getProducts();
    const product = products.find((p) => p.name === productName);

    if (!product) {
      chatWindow.innerHTML = `<p>Sorry, we couldn't find that product's details.</p>`;
      return;
    }

    chatWindow.innerHTML = `
      <h3>${product.name}</h3>
      <p><strong>Brand:</strong> ${product.brand}</p>
      <p><strong>Description:</strong> ${product.description}</p>
    `;
  } catch (error) {
    console.error("Error loading product details:", error);
    chatWindow.innerHTML = `<p>Sorry, there was a problem loading product details. Please try again.</p>`;
  }
});

/* Connect to the OpenAI API and get a response based on user input in the chat form */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInputElement = document.getElementById("userInput");
  const userInput = userInputElement.value.trim();
  if (!userInput) {
    return;
  }

  if (typeof api_key !== "string" || api_key.trim() === "") {
    chatWindow.innerHTML = `<p>OpenAI API key is missing. Check secrets.js.</p>`;
    return;
  }

  chatWindow.innerHTML = `<p>Connecting to OpenAI API...</p>`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a professional workplace assistant. Use a formal, serious tone. Structure responses clearly with concise sections using headings when helpful, and provide direct, practical recommendations. Avoid slang, jokes, emojis, and overly casual or comical phrasing, and do not diverge too far from the topic. Also, politely decline to answer any questions not related to L’Oréal products, routines, recommendations, beauty-related topics, or general beauty advice.",
          },
          {
            role: "user",
            content: userInput,
          },
        ],
        max_tokens: 500,
        temperature: 0.2, // Lower temperature for more focused, deterministic responses
        frequency_penalty: 0.2, // Slightly discourage repetition for more varied responses
        presence_penalty: 0.2, // Slightly encourage diversity for more varied responses
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const apiError = data.error?.message || "Unknown API error";
      throw new Error(apiError);
    }

    const aiReply = data.choices?.[0]?.message?.content;

    if (!aiReply) {
      chatWindow.innerHTML = `<p>No response received from OpenAI.</p>`;
      return;
    }

    chatWindow.innerHTML = `<p>${aiReply}</p>`;
    userInputElement.value = "";
  } catch (error) {
    console.error("OpenAI request failed:", error);
    chatWindow.innerHTML = `<p>Sorry, I couldn't connect to OpenAI. Please check your API key and try again.</p>`;
  }
});

/* Activate the Generate Routine button when the user has selected at least one product and clicks the button */
const generateRoutineButton = document.getElementById("generateRoutine");

if (generateRoutineButton) {
  generateRoutineButton.addEventListener("click", async () => {
    const selectedCards = productsContainer.querySelectorAll(
      ".product-card.selected",
    );
    if (selectedCards.length === 0) {
      alert("Please select at least one product to generate a routine.");
      return;
    }

    if (typeof api_key !== "string" || api_key.trim() === "") {
      chatWindow.innerHTML = `<p>OpenAI API key is missing. Check secrets.js.</p>`;
      return;
    }

    const selectedNames = Array.from(selectedCards).map((card) =>
      card.querySelector("h3").textContent.trim(),
    );

    chatWindow.innerHTML = `<p>Generating your routine...</p>`;
    generateRoutineButton.disabled = true;

    try {
      const products = await getProducts();
      const selectedProducts = products.filter((product) =>
        selectedNames.includes(product.name),
      );

      const productSummary = selectedProducts
        .map(
          (product) =>
            `- ${product.name} (${product.brand}, ${product.category}): ${product.description}`,
        )
        .join("\n");

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${api_key}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are a beginner-friendly beauty advisor. Build a simple routine using only the products provided by the user. Use clear headings and short steps for Morning and Evening. Make sure to stick to a professional tone and avoid slang, jokes, emojis, or overly casual language. Focus on practical advice and direct recommendations based on the products provided. Do not include any products that were not listed by the user, and do not diverge into unrelated topics.",
              },
              {
                role: "user",
                content: `Create a skincare/beauty routine using these selected products:\n${productSummary}\n\nFormat:\n1) Morning\n2) Evening\n3) Quick tips`,
              },
            ],
            max_tokens: 600,
            temperature: 0.2, // Lower temperature for more focused, deterministic responses
            frequency_penalty: 0.2, // Slightly discourage repetition for more varied responses
            presence_penalty: 0.2, // Slightly encourage diversity for more varied responses
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const apiError = data.error?.message || "Unknown API error";
        throw new Error(apiError);
      }

      const aiReply = data.choices?.[0]?.message?.content;

      if (!aiReply) {
        chatWindow.innerHTML = `<p>No routine was returned. Please try again.</p>`;
        return;
      }

      chatWindow.innerHTML = `<p>${aiReply.replace(/\n/g, "<br>")}</p>`;
    } catch (error) {
      console.error("Routine generation failed:", error);
      chatWindow.innerHTML = `<p>Sorry, routine generation failed. Please try again.</p>`;
    } finally {
      updateGenerateRoutineButtonState();
    }
  });

  updateGenerateRoutineButtonState();
}

/* Allow the user to ask follow-up questions about the generated routine or selected products in the chatbox */
const chatInput = document.getElementById("chatInput");
const chatSubmitButton = document.getElementById("chatSubmitButton");

if (chatSubmitButton) {
  chatSubmitButton.addEventListener("click", async () => {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    chatWindow.innerHTML += `<p><strong>You:</strong> ${userMessage}</p>`;
    chatInput.value = "";

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${api_key}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant. Answer the user's questions about the generated skincare routine or selected products. Be sure to maintain a professional tone and provide clear, concise answers. If the question is unrelated to the routine or products, politely decline to answer.",
              },
              {
                role: "user",
                content: userMessage,
              },
            ],
            max_tokens: 300,
            temperature: 0.2, // Lower temperature for more focused, deterministic responses
            frequency_penalty: 0.2, // Slightly discourage repetition for more varied responses
            presence_penalty: 0.2, // Slightly encourage diversity for more varied responses
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const apiError = data.error?.message || "Unknown API error";
        throw new Error(apiError);
      }

      const aiReply = data.choices?.[0]?.message?.content;

      if (!aiReply) {
        chatWindow.innerHTML += `<p><strong>AI:</strong> Sorry, I couldn't understand that.</p>`;
        return;
      }

      chatWindow.innerHTML += `<p><strong>AI:</strong> ${aiReply.replace(/\n/g, "<br>")}</p>`;
    } catch (error) {
      console.error("Chat request failed:", error);
      chatWindow.innerHTML += `<p><strong>AI:</strong> Sorry, I couldn't connect to OpenAI. Please check your API key and try again.</p>`;
    }
  });
}

/* Display the question asked by the user in the chat window and clear the input field */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const userInput = chatInput.value.trim();
  if (!userInput) return;

  chatWindow.innerHTML += `<p><strong>You:</strong> ${userInput}</p>`;
  chatInput.value = "";
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
