import { fetch } from "wix-fetch";

// ================== CONFIG ==================
const PAGE_FETCHER = "https://fetcher-of-htmls-n-jsons.snupichan282.workers.dev/";
const AI_GATEWAY = "https://fetcher-of-gemini-responses.snupichan282.workers.dev/";
// ============================================

/** Fetch HTML or JSON for a given URL. */

export async function fetchURL_ViaProxy(targetURL) 
{  
    const url = `${PAGE_FETCHER}?url=${encodeURIComponent(targetURL)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);

    return res;
}

export async function getGeminiResponse(prompt, pdfUrl) {
    try {
        // Send the prompt to the Cloudflare Worker via a POST request
        const response = await fetch(AI_GATEWAY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: pdfUrl,
                prompt: prompt
            })
        });

        console.log("response.ok:", response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error from Cloudflare Worker: ${errorText}`);
        }

        const answer = await response.json();
        console.log("answer:", answer);

        // Return only the text
        return answer.text;

    } catch (err) {
        throw new Error(`Network or fetch error: ${err.message}`);
    }
}

