// This is the standard entry point for a Cloudflare Worker.
export default {
  // The 'env' object is where your secrets are passed in.
  async fetch(request, env) {
    // 1. Get the URL from the request's query parameters.
    const requestUrl = new URL(request.url);
    const targetUrl = requestUrl.searchParams.get("url");

    // 2. Define standard CORS headers for all responses.
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 3. Handle OPTIONS preflight requests.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Methods": "GET",
        },
      });
    }

    // 4. Handle missing URL gracefully.
    if (!targetUrl) {
      const errorResponse = {
        success: false,
        error: "Missing 'url' query parameter.",
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // 5. Conditionally add the API key for the specific URL.
    const url = new URL(targetUrl);
    if (url.hostname.includes("api.congress.gov")) {
      url.searchParams.append("api_key", env.CONGRESS_API_KEY);
    }
    const finalUrl = url.toString();
    console.log("finalUrl: ", finalUrl);

    try {
      // 6. Fetch the content from the target URL.
      // Use the new URL with the API key (if applicable).
      const response = await fetch(finalUrl, {
        method: "GET",
        cf: {
          cacheTtl: 0,
          cacheEverything: false,
        },
      });

      // 7. Handle bad HTTP status codes from the target URL (e.g., 404, 500).
      if (!response.ok) {
        const errorResponse = {
          success: false,
          url: finalUrl,
          status: response.status,
          error: `HTTP error! status: ${response.status}`,
          timestamp: new Date().toISOString(),
        };
        return new Response(JSON.stringify(errorResponse), {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      // 8. Read the content and construct the final JSON response.
      const content = await response.text();
      const jsonResponse = {
        success: true,
        url: finalUrl,
        content: content,
        status: response.status,
        timestamp: new Date().toISOString(),
      };

      // 9. Return the JSON response with CORS headers.
      return new Response(JSON.stringify(jsonResponse), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });

    } catch (error) {
      // 10. Handle any network or other errors.
      const errorResponse = {
        success: false,
        url: finalUrl,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
  },
};

// fetecher of gemini - old:
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // process in chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

export default {
  async fetch(request, env) {
    const API_KEY = env.GEMINI_API_KEY;

    // --- CORS headers ---
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // --- Handle preflight ---
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      const { pdfUrl, prompt } = await request.json();

      if (!pdfUrl) {
        return new Response("Missing pdfUrl", { status: 400, headers: corsHeaders });
      }
      if (!prompt) {
        return new Response("Missing prompt", { status: 400, headers: corsHeaders });
      }

      // --- Fetch the PDF as bytes ---
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        return new Response(`Failed to fetch PDF: ${pdfResponse.statusText}`, {
          status: pdfResponse.status,
          headers: corsHeaders,
        });
      }
      
      const arrayBuffer = await pdfResponse.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);

      // --- Send PDF bytes directly to Gemini ---
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

      const payload = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
      };

      const geminiResp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log(base64Data.slice(0, 500));
      if (!geminiResp.ok) {
        const errText = await geminiResp.text();
        return new Response(`Gemini API error: ${errText}`, {
          status: geminiResp.status,
          headers: corsHeaders,
        });
      }

      const result = await geminiResp.json();
      console.log("status", geminiResp.status);
      console.log(JSON.stringify(result, null, 2));
      const answer =
        result?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response from AI.";

      return new Response(JSON.stringify({ aiResponse: answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(`Internal Server Error: ${err.message}`, {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
