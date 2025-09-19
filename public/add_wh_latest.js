// Filename: public/add_wh_latest.js
import { fetchURL_ViaProxy } from "public/proxyCalls";
import wixData from 'wix-data';

export const BASE  = "https://www.federalregister.gov/api/v1/documents.json?per_page=10&order=newest&conditions[presidential_document_type][]=executive_order";
export const PROMPT = "Please summarize the attached text. " +
                      "Do not add or assume any information like names, dates, or numbers that are not explicitly written in it. " +
                      "If you encounter a problem, do not return a false answer—instead return an error. " +
                      "Keep your summary simple so the average person can understand it. " +
                      "Do not use jargon—use everyday language. " +
                      "Your response must contain only the summary, without questions or comments.";

// Fetch latest executive orders JSON
export async function getLatestOrdersJson() {
    try {
        const res = await fetchURL_ViaProxy(BASE);
        const proxyResponse = await res.json();
        const whData = JSON.parse(proxyResponse.content);
        return whData.results;
    } 
    catch (err) {
        console.error("Error fetching latest orders:", err);
        throw new Error("Failed to fetch latest executive orders.");
    }
}

// Build an object for one executive order
export async function createExecOrderObj(execOrder) {
    try {
        const execOrderObj = {  
            Title: execOrder.title, 
            pdfUrl: execOrder.pdf_url,
            PublicationDate: execOrder.publication_date
        };

        // Get summary from Gemini
        const summaryRes = await getGeminiResponse(PROMPT, execOrderObj.pdfUrl);
        execOrderObj.summary = summaryRes.text;

        return execOrderObj;
    } 
    catch (err) {
        console.error("Error creating ExecOrder object:", err);
        throw new Error(`Failed to create executive order object for: ${execOrder.title}`);
    }
}

// Add multiple executive orders to the Wix collection
export async function addExecOrdersToCollection(limit = 1) {    
    try {
        const latestOrders = await getLatestOrdersJson();

        // Make sure limit does not exceed available results (max 10 from API)
        const max = Math.min(limit, latestOrders.length);
        const inserted = [];

        // Loop through executive orders
        for (let i = 0; i < max; i++) {
            try {
                const execOrderObj = await createExecOrderObj(latestOrders[i]);
                const res = await wixData.insert("ExecOrders", execOrderObj);
                inserted.push(res);
            } 
            catch (innerErr) {
                console.error(`Error inserting order ${i}:`, innerErr);
                // keep going, don’t stop loop
            }
        }

        return { insertedCount: inserted.length, totalRequested: max };
    } 
    catch (err) {
        console.error("Error in addExecOrdersToCollection:", err);
        throw new Error("Failed to add executive orders to collection.");
    }
}
