// Filename: public/wh_latest.js
import { fetchURL_ViaProxy } from "public/proxy_calls";

/** TODO:
 * chack date of latest in midnight crawler
 * if take all orders from that date
 * Has few days delay
 * assuming BASE API will always give the same set of parameters
*/
// https://www.federalregister.gov/developers/documentation/api/v1#/
// ================== CONFIG ==================
const BASE  = "https://www.federalregister.gov/api/v1/documents.json?per_page=10&order=newest&conditions[presidential_document_type][]=executive_order";
// ============================================

/** EP: Return array of the last X bills PDF URLs (newest first). */
export async function getLastOrdersPdfUrls(limit = 3) {

    // limit has to be smaller than 10 because of the api
    const targetURL = `${BASE}`;
    const res = await fetchURL_ViaProxy(targetURL);
    const proxyResponse = await res.json();
    const whData = JSON.parse(proxyResponse.content);

    // Extract up to limit PDF URLs
    const urls = [];
    for (let i = 0; i < limit; i++) {

        const order_url = whData.results[i].pdf_url;
        urls.push(order_url);
        // if (date is not the last date) break;
    }
    return urls;
}