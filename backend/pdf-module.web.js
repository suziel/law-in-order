/************
.web.js file
************/

import { Permissions, webMethod } from "wix-web-module";
import { fetch } from "wix-fetch";
import { mediaManager } from "wix-media-backend";
import { Buffer } from "buffer";

// ================== CONFIG ==================
const PDF_FETCHER = "https://fetcher-and-64-converter-of-pfds.snupichan282.workers.dev/";
// ============================================

// Call Cloudflare Worker, get Base64, save to Media Manager
//async
export const savePdfFromWorker = webMethod(
  Permissions.Anyone, 
  async (fileName = "eo2.pdf") => 
{
  console.log("fileName: ", fileName);
  const pdfUrl = "https://www.govinfo.gov/content/pkg/FR-2025-09-09/pdf/2025-17389.pdf";
    const response = await fetch(PDF_FETCHER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfUrl })
  });

  if (!response.ok) {
    throw new Error(`Worker error: ${await response.text()}`);
  }

  const { base64 } = await response.json();
  // Convert Base64 string to Buffer
  const buffer = Buffer.from(base64, "base64");

  // Upload to Wix Media Manager
  const { fileUrl } = await mediaManager.upload(
    "/pdfs/",                               // path
    buffer,                                 // file content
    fileName,                               // file name
    {                                       // options
      mediaOptions: 
      {
        mimeType: "application/pdf",
        mediaType: "document",
      }
    }
  );
  const parts = fileUrl.split('/');
  const fileNamePart = parts[3];
  return `https://f6bbbc4b-12d7-480f-94f2-4a0549fd8c3f.filesusr.com/ugd/${fileNamePart}`;
}
);