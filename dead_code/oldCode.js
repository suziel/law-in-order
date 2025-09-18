export async function getSupremeCourtHtmlViaProxy() 
{
  console.log("in getSupremeCourtHtmlViaProxy");
  const proxyUrl = "https://eo47bzy7w1bgn6r.m.pipedream.net";
  const listUrl = "https://supreme.justia.com/cases/federal/us/year/2025.html";//"https://www.supremecourt.gov/opinions/slipopinion/24"; 
 
  const response = await fetch(`${proxyUrl}?url=${encodeURIComponent(listUrl)}`, { method: "GET" });
 
  console.log(response);

  if (!response.ok) {
    throw new Error("Proxy fetch failed: " + response.status);
  }

  const html = await response.text();
  
  return extractLatestPdfUrl(listUrl, html);;
}


// Velo API Reference: https://www.wix.com/velo/reference/api-overview/introduction
/*
import { insertMockCourtCasePub } from 'public/fetcher_pub.js';
$w.onReady(function () {
  console.log("Page ready");

  $w("#mockButton").onClick(async () => {
    console.log("Button clicked");

    try {
      const result = await insertMockCourtCasePub();
      console.log("Insert result:", result);
    } catch (err) {
      console.error("Insert failed:", err);
    }
  });
});
*/

import { getLatestScotusPdf } from 'public/SCOTUS.js';
import { createMockCourtItem } from 'public/courtUploader';
import { getSupremeCourtHtmlViaProxy } from 'public/scraper';

$w.onReady(() => 
{
  $w("#mockButton").onClick(async () => {
    try {
      const result = await createMockCourtItem();
      console.log("Mock item created:", result);
      $w("#statusText").text = "Mock court item added.";
    } catch (err) {
      console.error("Failed to create mock item:", err);
      $w("#statusText").text = "Error: could not create item.";
    }
  });

  $w("#proxyButton").onClick(async () => 
  {
    try 
    {
      const PdfUrl = await getSupremeCourtHtmlViaProxy();
      console.log("PDF found:", PdfUrl);
      $w("#statusText").text = PdfUrl;
    } catch (err) 
    {
      console.error(err);
      $w("#statusText").text = "Something failed.";
    }
  });

  $w("#getLatestCaseButton").onClick(async () => {
    try {
      // Call backend
      const latestCase = await getLatestScotusPdf();
      
      // Log result
      console.log("Latest case:", latestCase);

      // Show result on page
      $w("#caseTitle").text = latestCase.title;
      $w("#caseDate").text = `Date: ${latestCase.date}`;
      $w("#casePdfLink").text = latestCase.pdfUrl;
      //$w("#casePdfLink").label = "View PDF";

    } catch (err) {
      console.error("Error getting latest case:", err);
      $w("#caseTitle").text = "Error fetching latest case";
      $w("#caseDate").text = "";
      $w("#casePdfLink").text = "";
      //$w("#casePdfLink").link = "";
    }
  });
});



// from scotus_latest:
// ================== CONFIG ==================
const PROXY = "https://fetcher-of-htmls-n-jsons.snupichan282.workers.dev/";
const BASE  = "https://www.supremecourt.gov";
// ============================================

/** Fetch slip-opinion list HTML for a given 2‑digit year (e.g., "24"). */
export async function fetchSlipHtml_viaProxy(year = "24") 
{  
    const listUrl = `${BASE}/opinions/slipopinion/${year}`;
    const url = `${PROXY}?url=${encodeURIComponent(listUrl)}`;
    console.log("url", url);
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    console.log(res);
    if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);

    return (await res.json()).content;
}
      

/** First Monday in October for a given year (local time). */
function firstMondayOfOctober(year) 
{
  const d = new Date(year, 9, 1);             // Oct = 9
  const offset = (1 - d.getDay() + 7) % 7;    // to Monday
  return new Date(year, 9, 1 + offset);
}

/** Current SCOTUS term's two‑digit year (e.g., "24"). */
function currentScotusTermYY() {
  const now = new Date();
  const y = now.getFullYear();
  const termStart = firstMondayOfOctober(y);
  const termYear = (now < termStart) ? (y - 1) : y;
  return String(termYear).slice(-2);
}

/** Convenience: get latest SCOTUS slip PDF (+ title/date) for a given year. */
export async function getLatestSlipPdf(year = "24") 
{
  const html = await fetchSlipHtml_viaProxy(year);
  return extractFirstPdfAnywhere(html)
}

      
const absolutize = (u) => {
    if (!u) return null;
    u = u.replace(/&amp;/g, "&").trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith("//")) return "https:" + u;
    if (u.startsWith("/")) return BASE + u;
    const ret = BASE + "/" + u.replace(/^\.?\//, "");
    
    return ret
  };

export function extractFirstPdfAnywhere(html) 
{
  console.log("extractFirstPdfAnywhere");
    if (typeof html !== "string" || html.length < 50) 
    {
      console.log("Empty HTML");
      throw new Error("Empty HTML");
    }
  
    // Collapse whitespace to make regex simpler
    const norm = html.replace(/\s+/g, " ");
    
    // Collect all anchors with hrefs (case-insensitive, handles ' or ")
    const aRe = /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    const hrefs = [];
    while ((m = aRe.exec(norm)) !== null) {
      const href = m[2];
      const text = m[3].replace(/<[^>]+>/g, "").trim();
      hrefs.push({ href, text });
    }
  
    // 1) Prefer official slip-opinion pattern: /opinions/YYpdf/....pdf
    let cand = hrefs.find(x => /\/opinions\/\d{2}pdf\/[^"'#?]+\.pdf/i.test(x.href));
    if (cand) return absolutize(cand.href);
  
    // 2) Any .pdf href on the page
    cand = hrefs.find(x => /\.pdf(\?|#|$)/i.test(x.href));
    if (cand) return absolutize(cand.href);
  
    // 3) Plain-text absolute SCOTUS PDF anywhere (not necessarily inside <a>)
    const plainAbsRe = new RegExp("(?:https?:\/\/)?(?:www\\.)?supremecourt\\.gov\/[^\"'#\\s<>]*\\.pdf", "i");
    const plainAbs = plainAbsRe.exec(norm);
    if (plainAbs) return absolutize(plainAbs[0]);
  
    // 4) Plain-text slip-opinion relative path (with or without leading slash)
    // CORRECTED REGEX: Using RegExp.exec for a more direct search like Python's re.search
    const bareRelRe = new RegExp("(\/?opinions\/\\d{2}pdf\/[^\"'#\\s<>]+\\.pdf)", "i");
    const bareRel = bareRelRe.exec(norm);
    if (bareRel) return absolutize(bareRel[1]);

    console.log("No PDF link found in page HTML.");
    throw new Error("No PDF link found in page HTML.");
  }

