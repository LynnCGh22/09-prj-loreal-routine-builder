/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const body = document.body;
const logo = document.querySelector(".logo");
const themeToggle = document.getElementById("themeToggle");
const productKeywordSearch = document.getElementById("productKeywordSearch");
const useCurrentInfoToggle = document.getElementById("useCurrentInfo");
let cachedProducts = [];
let activeCategoryFilters = [];
let activeKeywordFilter = "";
const SELECTED_PRODUCTS_STORAGE_KEY = "selectedProducts";
let selectedProductNames = new Set();

/* Initialize RTL support - detect and apply RTL settings based on language */
function initializeRTLSupport() {
  const htmlElement = document.documentElement;
  const currentLang = (htmlElement.getAttribute("lang") || "en").split("-")[0];

  // RTL languages: Arabic (ar), Hebrew (he)
  const rtlLanguages = ["ar", "he"];
  const isRTL = rtlLanguages.includes(currentLang);

  // Set direction attribute
  htmlElement.setAttribute("dir", isRTL ? "rtl" : "ltr");

  // Toggle Bootstrap RTL stylesheet
  const bootstrapLtr = document.getElementById("bootstrap-ltr");
  const bootstrapRtl = document.getElementById("bootstrap-rtl");

  if (isRTL) {
    if (bootstrapLtr) bootstrapLtr.disabled = true;
    if (bootstrapRtl) bootstrapRtl.disabled = false;
  } else {
    if (bootstrapLtr) bootstrapLtr.disabled = false;
    if (bootstrapRtl) bootstrapRtl.disabled = true;
  }
}

// Initialize RTL on page load
initializeRTLSupport();

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

/* Turn an AI response into a simple bullet list for easier reading */
function formatResponseAsBullets(responseText) {
  const lines = responseText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length === 0) {
    return "";
  }

  return `<ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;
}

/* Convert markdown links to clickable anchors for citations */
function formatAiResponseWithLinks(responseText) {
  const bulletHtml = formatResponseAsBullets(responseText);

  return bulletHtml.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}

/* Escape text before inserting it into HTML */
function escapeHtml(text) {
  const tempElement = document.createElement("div");
  tempElement.textContent = text;
  return tempElement.innerHTML;
}

/* Save selected products in localStorage so they survive reloads */
function saveSelectedProducts() {
  localStorage.setItem(
    SELECTED_PRODUCTS_STORAGE_KEY,
    JSON.stringify(Array.from(selectedProductNames)),
  );
}

/* Load selected products from localStorage on startup */
function loadSelectedProducts() {
  const raw = localStorage.getItem(SELECTED_PRODUCTS_STORAGE_KEY);

  if (!raw) {
    selectedProductNames = new Set();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      selectedProductNames = new Set(
        parsed.filter((name) => typeof name === "string" && name.trim() !== ""),
      );
    } else {
      selectedProductNames = new Set();
    }
  } catch (error) {
    selectedProductNames = new Set();
  }
}

/* Build the selected-products list from persisted selection state */
function renderSelectedProductsList() {
  const selectedProductsList = document.getElementById("selectedProductsList");

  if (!selectedProductsList) {
    updateGenerateRoutineButtonState();
    return;
  }

  const safeSelectedNames = Array.from(selectedProductNames);

  selectedProductsList.innerHTML = safeSelectedNames.length
    ? `<ul>${safeSelectedNames
        .map((name) => `<li translate="yes">${escapeHtml(name)}</li>`)
        .join("")}</ul>`
    : `<p translate="yes">No products selected yet.</p>`;

  if (document.documentElement.getAttribute("lang") !== "en") {
    const htmlSnapshot = selectedProductsList.innerHTML;

    requestAnimationFrame(() => {
      if (selectedProductsList.isConnected) {
        selectedProductsList.innerHTML = htmlSnapshot;
      }
    });
  }

  updateClearSelectionButtonState();
  updateGenerateRoutineButtonState();
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

/* Normalize search text to keep filtering consistent */
function normalizeSearchText(text) {
  return (text || "").toLowerCase().trim();
}

/* Check whether a product matches the keyword in name, brand, category, or description */
function productMatchesKeyword(product, keyword) {
  if (!keyword) {
    return true;
  }

  const searchableText = normalizeSearchText(
    `${product.name} ${product.brand} ${product.category} ${product.description}`,
  );

  return searchableText.includes(keyword);
}

/* Apply category + keyword filters together and refresh the grid */
async function applyProductFilters(announceChange) {
  const selectedNamesSet = new Set(selectedProductNames);

  try {
    const products = await getProducts();
    const hasCategoryFilter = activeCategoryFilters.length > 0;
    const hasKeywordFilter = activeKeywordFilter !== "";

    if (!hasCategoryFilter && !hasKeywordFilter) {
      productsContainer.innerHTML = `
        <div class="placeholder-message" translate="yes">
          Select one or more categories or type a keyword to view products.
        </div>
      `;
      updateSelectedProducts();
      return;
    }

    const filteredProducts = products.filter((product) => {
      const matchesCategory =
        !hasCategoryFilter || activeCategoryFilters.includes(product.category);
      const matchesKeyword = productMatchesKeyword(
        product,
        activeKeywordFilter,
      );

      return matchesCategory && matchesKeyword;
    });

    if (filteredProducts.length === 0) {
      productsContainer.innerHTML = `
        <div class="placeholder-message" translate="yes">
          No products match your current filters yet.
        </div>
      `;
    } else {
      displayProducts(filteredProducts);

      const cards = productsContainer.querySelectorAll(".product-card");
      cards.forEach((card) => {
        const name = card.querySelector("h3")?.textContent.trim() || "";

        if (selectedNamesSet.has(name)) {
          card.classList.add("selected");
        }
      });
    }

    if (announceChange) {
      const selectedCategoriesLabel = hasCategoryFilter
        ? activeCategoryFilters.join(", ")
        : "All categories";
      const keywordLabel = hasKeywordFilter
        ? activeKeywordFilter
        : "No keyword";

      chatWindow.innerHTML = `
        <p><strong>Filters updated:</strong> ${selectedCategoriesLabel}</p>
        <p><strong>Keyword:</strong> ${keywordLabel}</p>
        <p>Choose products and click Generate Routine.</p>
      `;
    }

    updateSelectedProducts();
  } catch (error) {
    console.error("Error filtering products:", error);
    productsContainer.innerHTML = `
      <div class="placeholder-message" translate="yes">
        Could not load products. Please try again.
      </div>
    `;
    updateSelectedProducts();
  }
}

/* Keep the "Selected Products" section in sync with selected cards */
function updateSelectedProducts() {
  renderSelectedProductsList();
}

window.addEventListener("app-language-changed", async () => {
  await applyProductFilters(false);
});

/* Keep the clear-selection button disabled when there is nothing to clear */
function updateClearSelectionButtonState() {
  if (!clearSelectionButton) {
    return;
  }

  const hasSelectedProducts = selectedProductNames.size > 0;

  clearSelectionButton.disabled = !hasSelectedProducts;
  clearSelectionButton.setAttribute(
    "aria-disabled",
    String(!hasSelectedProducts),
  );
}

/* Enable the Generate Routine button only when at least one product is selected */
function updateGenerateRoutineButtonState() {
  if (!generateRoutineButton) {
    return;
  }

  const hasSelectedProducts = selectedProductNames.size > 0;

  generateRoutineButton.disabled = !hasSelectedProducts;
  generateRoutineButton.setAttribute(
    "aria-disabled",
    String(!hasSelectedProducts),
  );
}

/* Replace with actual Cloudflare Worker URL when deployed */
const API_BASE_URL =
  window.API_BASE_URL || "https://quiet-night-bc46.lchaker921.workers.dev/";

/* Send chat-completion requests through Cloudflare Worker so the API key stays server-side */
async function requestChatCompletion(payload) {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const nonJsonResponse = await response.text();

    if (nonJsonResponse.trim() === "Hello World!") {
      throw new Error(
        "Your Cloudflare Worker is still returning the default Hello World response. Deploy the worker code, then try again.",
      );
    }

    throw new Error(
      `Cloudflare Worker returned a non-JSON response: ${nonJsonResponse}`,
    );
  }

  const data = await response.json();

  if (!response.ok) {
    const apiError = data.error?.message || "Unknown API error";
    throw new Error(apiError);
  }

  return data;
}

/* Handle select/unselect on click and apply visual highlight */
productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card || !productsContainer.contains(card)) {
    return;
  }

  const productName = card.querySelector("h3")?.textContent.trim();
  if (!productName) {
    return;
  }

  card.classList.toggle("selected");

  if (card.classList.contains("selected")) {
    selectedProductNames.add(productName);
  } else {
    selectedProductNames.delete(productName);
  }

  saveSelectedProducts();

  updateSelectedProducts();
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  if (e.target.name !== "categoryFilterOption") {
    return;
  }

  activeCategoryFilters = Array.from(
    categoryFilter.querySelectorAll(
      'input[name="categoryFilterOption"]:checked',
    ),
  ).map((checkbox) => checkbox.value);

  await applyProductFilters(true);
});

if (productKeywordSearch) {
  productKeywordSearch.addEventListener("input", async () => {
    activeKeywordFilter = normalizeSearchText(productKeywordSearch.value);
    await applyProductFilters(false);
  });
}

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

  /* Display the user's question in the chat window */
  chatWindow.innerHTML += `<p><strong>You:</strong> ${userInput}</p>`;
  chatWindow.innerHTML += `<p>Connecting to AI service...</p>`;
  const useCurrentInfo = Boolean(useCurrentInfoToggle?.checked);

  try {
    const data = await requestChatCompletion({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a professional workplace assistant focused on L'Oreal products and beauty routines. Use a clear and practical tone. If asked for current information, include a Sources section with links and short citations. If you cannot verify current details, say that clearly. Politely decline unrelated topics.",
        },
        {
          role: "user",
          content: useCurrentInfo
            ? `${userInput}\n\nUse current-info mode: provide the latest relevant public information when possible, then add a Sources section with markdown links and one-line citation notes.`
            : userInput,
        },
      ],
      max_tokens: 500,
      temperature: 0.2, // Lower temperature for more focused, deterministic responses
      frequency_penalty: 0.2, // Slightly discourage repetition for more varied responses
      presence_penalty: 0.2, // Slightly encourage diversity for more varied responses
    });

    const aiReply = data.choices?.[0]?.message?.content;

    if (!aiReply) {
      chatWindow.innerHTML = `<p>No response received from OpenAI.</p>`;
      return;
    }

    chatWindow.innerHTML += `<div><strong>AI:</strong>${formatAiResponseWithLinks(
      aiReply,
    )}</div>`;
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
    const selectedNames = Array.from(selectedProductNames);

    if (selectedNames.length === 0) {
      alert("Please select at least one product to generate a routine.");
      return;
    }

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

      const data = await requestChatCompletion({
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
      });

      const aiReply = data.choices?.[0]?.message?.content;

      if (!aiReply) {
        chatWindow.innerHTML = `<p>No routine was returned. Please try again.</p>`;
        return;
      }

      chatWindow.innerHTML = `<div>${formatResponseAsBullets(aiReply)}</div>`;
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
      const data = await requestChatCompletion({
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
      });

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

/* Create a button to clear all selected products at once for easier testing and better UX */
const clearSelectionButton = document.getElementById("clearSelection");

if (clearSelectionButton) {
  clearSelectionButton.addEventListener("click", () => {
    const selectedCards = productsContainer.querySelectorAll(
      ".product-card.selected",
    );
    selectedCards.forEach((card) => {
      card.classList.remove("selected");
    });

    selectedProductNames.clear();
    saveSelectedProducts();

    updateSelectedProducts();
  });
}

loadSelectedProducts();
updateClearSelectionButtonState();
updateSelectedProducts();
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
