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