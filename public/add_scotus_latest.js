// Filename: public/add_scotus_latest.js
import { fetchURL_ViaProxy, getGeminiResponse } from "public/proxy_calls";
import wixData from 'wix-data';



/**
 * consider changing to CourtListener api
 * https://www.courtlistener.com/api/rest/v3/search/?court=scotus&api-key=46230782559f3fba496432e1c3d9e21f196f8e3d
 */

// ================== CONFIG ==================
const BASE  = "https://www.supremecourt.gov";
const PROMPT = "please read the attached text. simplify the content by giving a newspaper like short one sentence summery and a short summery of the " +    
                    "file without using any jargon. make it clear to an average person without knowledge in " +
                    "the field. do not add any information that is not in the original text. " +
                    "Your response will be in json format with the following fields: "+
                    "1. date " +
                    "2. title." +
                    "3. one_sentence_summary "+
                    "4. short_summary. ";
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

// Build an object for one executive order
export async function createSC_SlipObj(slipPDF) {
    try {
        
        const geminiResponseText = await getGeminiResponse(`${PROMPT}`, slipPDF);
        const cleanJsonString = geminiResponseText.replace(/^```json\s*|```$/g, '').trim();
        const slipJson = JSON.parse(cleanJsonString);
        console.log("slipJsons ", slipJson);
        const slipObj = slipJson;
        slipObj.pdf_url = slipPDF;
        console.log("slipObj: ", slipObj);
        return slipObj;
    } 
    catch (err) {
        console.error("Error creating CourtCase object:", err);
        throw new Error(`Failed to create executive order object for: ${slipPDF}`);
    }
}

// Add multiple executive orders to the Wix collection
export async function addSlipToCollection(limit = 1) {    
    try {
        const slipsPDFs = await getLastSlipPdfUrls(limit);

        // Make sure limit does not exceed available results (max 10 from API)
        const max = slipsPDFs.length; 
        const inserted = [];

        // Loop through executive orders
        for (let i = 0; i < max; i++) {
            try {
                const slipObj = await createSC_SlipObj(slipsPDFs[i]);
                const res = await wixData.insert("CourtCases1", slipObj);
                inserted.push(res);
            } 
            catch (innerErr) {
                console.error(`Error inserting Supreme court case ${i}:`, innerErr);
                // keep going, don’t stop loop
            }
        }

        return { insertedCount: inserted.length, totalRequested:  max};
    } 
    catch (err) {
        console.error("Error in addSlipToCollection:", err);
        throw new Error("Failed to add Supreme court cases to collection.");
    }
}