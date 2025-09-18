// Filename: public/scotus_latest.js
import { fetchURL_ViaProxy } from "public/proxy_calls";

/**
 * consider changing to CourtListener api
 * https://www.courtlistener.com/api/rest/v3/search/?court=scotus&api-key=46230782559f3fba496432e1c3d9e21f196f8e3d
 */
// ================== CONFIG ==================
const BASE  = "https://www.supremecourt.gov";
// ============================================

/**
// First Monday in October for a given year (local time). 
function firstMondayOfOctober(year) 
{
  const d = new Date(year, 9, 1);             // Oct = 9
  const offset = (1 - d.getDay() + 7) % 7;    // to Monday
  return new Date(year, 9, 1 + offset);
}

// Current SCOTUS term's two‑digit year (e.g., "24"). 
function currentScotusTermYY() {
  const now = new Date();
  const y = now.getFullYear();
  const termStart = firstMondayOfOctober(y);
  const termYear = (now < termStart) ? (y - 1) : y;
  return String(termYear).slice(-2);
}
*/

export function extractFirst_X_Pdfs(html, limit = 5)
{
    // Normalize whitespace
    const norm = html.replace(/\s+/g, " ");
  
    // Get ALL table rows, keep only rows that contain a slip-opinion style PDF
    const rows = (norm.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []).filter(r =>
      /\/opinions\/\d{2}pdf\/[^"'#?]+\.pdf/i.test(r)
    );
  
    // Extract up to limit PDF URLs, converting relative → absolute
    const urls = [];
    for (const row of rows) {
      const m = row.match(/href\s*=\s*["'](\/opinions\/\d{2}pdf\/[^"'#?]+\.pdf)[^"']*["']/i);
      if (!m) continue;
      const href = m[1];
      const abs = href.startsWith("http") ? href : BASE + href;
      urls.push(abs);
      if (urls.length >= limit) break;
    }
  
    if (!urls.length) throw new Error("No slip-opinion PDFs found on the page.");
    console.log(urls);
    return urls; // array of strings
}


/** EP: Return array of the last X slip-opinion PDF URLs (newest first). */
export async function getLastSlipPdfUrls(limit = 1) {
  // clamp limit to 1..10
  const year = 24;//currentScotusTermYY();
  const targetURL = `${BASE}/opinions/slipopinion/${year}`;
  const res = await fetchURL_ViaProxy(targetURL);
  const html = (await res.json()).content;
  return extractFirst_X_Pdfs(html, limit); // array of strings
}
