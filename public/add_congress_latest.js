// Filename: public/add_congress_latest.js
import { fetchURL_ViaProxy, getGeminiResponse } from "public/proxy_calls";
import wixData from 'wix-data';

/** ToDo:
 * chack date of latest in midnight crawler
 * if take all orders from that date
 * Has few days delay
 * assuming BASE API will always give the same set of parameters
 * Q: should updated be taken? just proven?
*/
/** Useful links:
 * https://api.congress.gov/
 * https://www.congress.gov/help/using-data-offsite * 
*/
// ================== CONFIG ==================
const BASE  = "https://api.congress.gov/v3/bill/";
// ============================================

export const PROMPT = "Please summarize the attached text. " +
                      "Do not add or assume any information like names, dates, or numbers that are not explicitly written in it. " +
                      "If you encounter a problem, do not return a false answer—instead return an error. " +
                      "Keep your summary simple so the average person can understand it. " +
                      "Do not use jargon—use everyday language. " +
                      "Your response must contain only the summary, without questions or comments.";

// Fetch latest executive orders JSON
export async function getLatestBillsJson() {
    try {
        const res = await fetchURL_ViaProxy(`${BASE}`);
        const proxyResponse = await res.json();
        const congressData = JSON.parse(proxyResponse.content);
        return congressData.bills;
    } 
    catch (err) {
        console.error("Error fetching latest bills:", err);
        throw new Error("Failed to fetch latest congress bills.");
    }
}

// Build an object for one executive order
export async function createCongressBillObj(bill) {
    try {
        
        console.log("bill url: ", bill.url);
        const bill_json = await fetchURL_ViaProxy(bill.url);

        const billObj = {  
            title: bill_json.title, 
            originChamber: bill_json.originChamber,
            introducedDate: bill_json.introducedDate,
            legislationUrl: bill_json.legislationUrl,
            pdf_url: "",
            summary: ""
        };

        console.log("bill text Versions: ", bill.textVersions);
        if (bill_json.textVersions) {
            const res_bill_text = await fetchURL_ViaProxy(bill_json.textVersions.url);
            const bill_texts_json = JSON.parse((await res_bill_text.json()).content);
            // assumng here - first is latest, can search "type": "Enrolled Bill" in text versions array.
            const pdf_url = bill_texts_json.textVersions[0].formats.find(txt => txt.type === "PDF");
            // if no pdf - throw error
            billObj.pdf_url = pdf_url
            // Get summary from Gemini
            billObj.summary = await getGeminiResponse(`${PROMPT}`, pdf_url);
        }

        return billObj;
    } 
    catch (err) {
        console.error("Error creating ExecOrder object:", err);
        throw new Error(`Failed to create executive order object for: ${execOrder.title}`);
    }
}

// Add multiple executive orders to the Wix collection
export async function addBillToCollection(limit = 5) {    
    try {
        const bills = await getLatestBillsJson();

        // Make sure limit does not exceed available results (max 10 from API)
        const max = Math.min(limit, bills.length);
        const inserted = [];

        // Loop through executive orders
        for (let i = 0; i < max; i++) {
            try {
                const billObj = await createCongressBillObj(bills[i]);
                const res = await wixData.insert("CongressBills", billObj);
                inserted.push(res);
            } 
            catch (innerErr) {
                console.error(`Error inserting congress bill ${i}:`, innerErr);
                // keep going, don’t stop loop
            }
        }

        return { insertedCount: inserted.length, totalRequested: max };
    } 
    catch (err) {
        console.error("Error in addBillToCollection:", err);
        throw new Error("Failed to add congress bills to collection.");
    }
}
