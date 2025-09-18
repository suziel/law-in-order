// Filename: public/congress_latest.js
import { fetchURL_ViaProxy } from "public/proxy_calls";

/** TODO:
 * chack date of latest in midnight crawler
 * if take all bills from that date
 * Q: should updated be taken? just proven?
*/
/** Useful links:
 * https://api.congress.gov/
 * https://www.congress.gov/help/using-data-offsite * 
*/
// ================== CONFIG ==================
const BASE  = "https://api.congress.gov/v3/bill/";
// ============================================


/** EP: Return array of the last X bills PDF URLs (newest first). */
export async function getLastBillsPdfUrls(limit = 3) {

    const targetURL = `${BASE}`;
    const res = await fetchURL_ViaProxy(targetURL);
    const proxyResponse = await res.json();
    const congressData = JSON.parse(proxyResponse.content);

    //make function to go over bills and return all urls
    // Extract up to limit PDF URLs, converting relative → absolute
    const urls = [];
    for (let i = 0; i < limit; i++) {

        let bill_url = new URL(congressData.bills[i].url);
        bill_url.pathname += "/text";
        const bill_text_url = bill_url.toString();
        const res_bill_text = await fetchURL_ViaProxy(bill_text_url);
        const bill_texts_json = JSON.parse((await res_bill_text.json()).content);
        // assumng here - first is latest, can search "type": "Enrolled Bill" in text versions array.
        const pdf_url = bill_texts_json.textVersions[0].formats.find(txt => txt.type === "PDF");
        urls.push(pdf_url.url);
        // if (date is not the last date) break;
    }
    return urls;
}