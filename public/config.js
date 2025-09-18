import { fetch } from "wix-fetch";

// ================== CONFIG ==================
const PROXY = "https://fetcher-of-htmls-n-jsons.snupichan282.workers.dev/";
// ============================================

/** Fetch HTML or JSON for a given URL. */
export async function fetchURL_ViaProxy(targetURL) 
{  
    const url = `${PROXY}?url=${encodeURIComponent(targetURL)}`;

    // ^^
    console.log("url", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);

    return res;
}