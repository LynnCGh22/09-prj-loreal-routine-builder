# Project 9: L'Oréal Routine Builder

L’Oréal is expanding what’s possible with AI, and now your chatbot is getting smarter. This week, you’ll upgrade it into a product-aware routine builder.

Users will be able to browse real L’Oréal brand products, select the ones they want, and generate a personalized routine using AI. They can also ask follow-up questions about their routine—just like chatting with a real advisor.

## Cloudflare Worker

The browser app sends OpenAI requests through a Cloudflare Worker so the API key stays server-side.

1. Add your OpenAI key to Cloudflare as a secret named `OPENAI_API_KEY`.
2. Deploy the worker with `wrangler deploy`.
3. Copy the deployed worker URL into [secrets.js](secrets.js).
