export default {
    async fetch(request, env) {
        const API_KEY = env.GEMINI_API_KEY;
        const PDF_CHUNK_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB chunk size
  
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };
  
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        }
  
        try {
            const { url, prompt } = await request.json();
  
            if (!url || !prompt) {
                return new Response(JSON.stringify({ text: null, error: "Missing URL or prompt" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
  
            // --- Fetch and split PDF ---
            let pdfParts = [];
            try {
                const pdfResponse = await fetch(url);
                if (!pdfResponse.ok) {
                    throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
                }
            
                const arrayBuffer = await pdfResponse.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
            
                let offset = 0;
                while (offset < uint8Array.length) {
                    const chunk = uint8Array.slice(offset, offset + PDF_CHUNK_SIZE_BYTES);
            
                    // **FIXED CODE: Use a for loop to build the string to avoid call stack limits**
                    let binaryString = '';
                    for (let i = 0; i < chunk.length; i++) {
                        binaryString += String.fromCharCode(chunk[i]);
                    }
                    
                    const base64Data = btoa(binaryString);
            
                    pdfParts.push({
                        inlineData: {
                            mimeType: "application/pdf",
                            data: base64Data,
                        },
                    });
                    offset += PDF_CHUNK_SIZE_BYTES;
                }
            } catch (err) {
                return new Response(JSON.stringify({ text: null, error: `Could not process PDF from URL: ${err.message}` }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
  
            // --- Construct a new prompt with the fetched content and the original prompt ---
            const fullPromptParts = [...pdfParts, { text: prompt }];
  
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
            
            const payload = {
                contents: [
                    {
                        parts: fullPromptParts,
                    },
                ],
                generationConfig: {
                    temperature: 0.2,
                },
            };
  
            const geminiResp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
  
            if (!geminiResp.ok) {
                const errText = await geminiResp.text();
                return new Response(`Gemini API error: ${errText}`, {
                    status: geminiResp.status,
                    headers: corsHeaders,
                });
            }
  
            const result = await geminiResp.json();
            const answer = result?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";
  
            return new Response(JSON.stringify({ text: answer }), {
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