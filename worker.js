const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=UTF-8",
};

function createJsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return createJsonResponse(405, {
      error: {
        message: "Only POST requests are allowed.",
      },
    });
  }

  const apiKey = globalThis.OPENAI_API_KEY || "";

  if (!apiKey) {
    return createJsonResponse(500, {
      error: {
        message: "Missing OPENAI_API_KEY secret in Cloudflare Workers.",
      },
    });
  }

  let userInput;

  try {
    userInput = await request.json();
  } catch (error) {
    return createJsonResponse(400, {
      error: {
        message: "Request body must be valid JSON.",
      },
    });
  }

  const requestBody = {
    model: userInput.model || "gpt-4o",
    messages: userInput.messages || [],
    max_tokens: userInput.max_tokens || 500,
    temperature: userInput.temperature ?? 0.2,
    frequency_penalty: userInput.frequency_penalty ?? 0.2,
    presence_penalty: userInput.presence_penalty ?? 0.2,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();

  if (!responseText) {
    return createJsonResponse(502, {
      error: {
        message: "OpenAI returned an empty response.",
      },
    });
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch (error) {
    return createJsonResponse(502, {
      error: {
        message: `OpenAI returned invalid JSON: ${responseText}`,
      },
    });
  }

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: corsHeaders,
  });
}
