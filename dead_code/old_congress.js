// Filename: public/congress_laest.js
import { fetch } from "wix-fetch";

/**
 * CONFIG: set your Pipedream proxy URL here.
 * The proxy injects the ProPublica API key and fetches Congress.gov HTML for us.
 */
const PROXY = "https://fetcher-of-htmls-n-jsons.snupichan282.workers.dev/";

    //const listUrl = "https://api.congress.gov/v3/bill/";
/**
 * Small helper for proxy calls: returns raw text (JSON or HTML).
 * We use GET because we are retrieving content, not sending data.
 */
async function getViaProxy(url) {
  const r = await fetch(`${PROXY}?url=${encodeURIComponent(url)}`, { method: "GET" });
  if (!r.ok) throw new Error(`Proxy fetch failed: ${r.status}`);
  return r.text(); // raw text (JSON string or HTML string)
}

/**
 * 1) Fetch the most recent bills from ProPublica (sorted by date desc).
 *    Returns the *first* bill object.
 */
async function fetchLatestBillFromProPublica() {
  // Simple “recent bills” search endpoint (sorted by date desc)
  // Docs: https://www.propublica.org/datastore/api/propublica-congress-api
  const api = "https://api.propublica.org/congress/v1/bills/search.json?sort=date&order=desc";
  const raw = await getViaProxy(api);

  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error("Could not parse ProPublica JSON"); }

  // ProPublica shape: data.results[0].bills[] (depending on endpoint)
  const buckets = data?.results || [];
  const firstBucket = buckets[0];
  const bills = firstBucket?.bills || [];
  if (!bills.length) throw new Error("No bills returned by ProPublica");

  const bill = bills[0];

  // We want: bill number, title, date, and Congress.gov URL (if present)
  // Different endpoints have slightly different shapes:
  const congressUrl =
    bill.congressdotgov_url || bill.congress_url || bill.url || null;

  return {
    number: bill.number || bill.bill_id || "",
    title: bill.title || bill.short_title || "",
    introducedDate: bill.introduced_date || bill.introduced_on || bill.date || "",
    congressUrl,
    raw: bill,
  };
}

/**
 * 2) Given a Congress.gov bill page URL, download the HTML via proxy and:
 *    - Extract a PDF link if present (href ending with .pdf)
 *    - Extract a plain-text snippet from the main content for preview
 */
async function scrapeCongressBillPage(congressUrl) {
  if (!congressUrl) return { pdfUrl: null, textSnippet: "" };

  const html = await getViaProxy(congressUrl);

  // Collapse whitespace to simplify regex
  const norm = html.replace(/\s+/g, " ");

  // A) Try to find a bill text PDF link on the page
  //    Congress.gov often links to PDFs hosted at govinfo.gov or congress.gov PDFs
  //    We'll look for any anchor href ending .pdf
  const pdfMatch =
    norm.match(/href\s*=\s*["'](https?:\/\/[^"']+\.pdf)(?:[#?][^"']*)?["']/i) ||
    norm.match(/href\s*=\s*["'](\/[^"']+\.pdf)(?:[#?][^"']*)?["']/i);

  const pdfHref = pdfMatch ? pdfMatch[1] : null;
  const pdfUrl = pdfHref
    ? (pdfHref.startsWith("http") ? pdfHref : new URL(pdfHref, congressUrl).toString())
    : null;

  // B) Extract a rough text snippet (not perfect, but gives preview)
  //    We'll grab inside <main> if present; fallback to body.
  let mainHtml = "";
  const mainMatch = norm.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    mainHtml = mainMatch[1];
  } else {
    const bodyMatch = norm.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    mainHtml = bodyMatch ? bodyMatch[1] : norm;
  }

  // Strip tags, decode common HTML entities, compress whitespace
  let text = mainHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  // Keep a small snippet (first ~1000 chars) to avoid massive strings
  const textSnippet = text.slice(0, 1000);

  return { pdfUrl, textSnippet, htmlHead: norm.slice(0, 200) }; // htmlHead helps debugging if needed
}

/**
 * MAIN: One-call helper to:
 *  - Get the *latest* bill metadata from ProPublica
 *  - Scrape its Congress.gov page for PDF and a text snippet
 * Returns a compact object suitable for display or storage.
 */
export async function getLatestBillWithPdfAndText() {
  // 1) Latest bill metadata (fast JSON)
  const bill = await fetchLatestBillFromProPublica();

  // 2) Scrape Congress.gov page (HTML) → extract PDF + text snippet
  const page = await scrapeCongressBillPage(bill.congressUrl);

  return {
    billNumber: bill.number,
    title: bill.title,
    introducedDate: bill.introducedDate,
    congressUrl: bill.congressUrl,
    pdfUrl: page.pdfUrl,
    textSnippet: page.textSnippet,
  };
}
