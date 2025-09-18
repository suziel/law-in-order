/*import { getLastSlipPdfUrls } from "public/scotus_latest";
import { getLastBillsPdfUrls } from "public/congress_latest";
import { getLastOrdersPdfUrls } from "public/white_house_latest";*/
import { savePdfFromWorker  } from "backend/pdf-module.web.js";
import { getGeminiResponse } from "public/proxy_calls"
/*
$w.onReady(() => {
  $w("#getLatestCaseButton").onClick(async () => {
    try {
      
      const pdfUrls = await getLastSlipPdfUrls(); //change to 25 sometimes
      console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
      console.log("pdf: ", pdfUrls);
      console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
      
    } catch (e) {
      console.error(e);
      $w("#caseTitle").text = "Failed to fetch latest case";
    }
  });
});
$w.onReady(() => {
  $w("#getLatestBillButton").onClick(async () => {
    try {
      
      const pdfUrls = await getLastBillsPdfUrls();
      console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
      console.log("pdf: ", pdfUrls);
      console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
      
    } catch (e) {
      console.error(e);
      $w("#caseTitle").text = "Failed to fetch latest case";
    }
  });
});
$w.onReady(() => {
  $w("#getLatestOrderButton").onClick(async () => {
    try {
      
      const pdfUrls = await getLastOrdersPdfUrls();
      console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
      console.log("pdf: ", pdfUrls);
      console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
      
    } catch (e) {
      console.error(e);
      $w("#caseTitle").text = "Failed to fetch latest case";
    }
  });
});*/
$w.onReady(() => {
  $w("#LatestCaseToAIButton").onClick(async () => {
    try {
      // + https://f6bbbc4b-12d7-480f-94f2-4a0549fd8c3f.filesusr.com/ugd/9950a0_67ce0937ed69491a91a565c38c023822.pdf
      //const url = "https://f6bbbc4b-12d7-480f-94f2-4a0549fd8c3f.filesusr.com/ugd/9950a0_67ce0937ed69491a91a565c38c023822.pdf";//await savePdfFromWorker();
      //let prompt =  "please summarize this pdf. if you cannot open the link return an error " + url;
      const prompt = "please summerize the attached text," +
               " do not add or assume any information like names, dates or numbers that does not explicitly written in it :" +
               " if for some reasone you have a problem do not return false anwer. instead return an error " +
               "please repeat the prompt to me and then write the summary " ;
      const url = "https://www.supremecourt.gov/opinions/24pdf/606us2r66_6j37.pdf";
                //"https://www.congress.gov/119/bills/hr2808/BILLS-119hr2808enr.pdf";
                //"https://www.whitehouse.gov/presidential-actions/2025/09/restoring-the-united-states-department-of-war/";
      const ai_text = await getGeminiResponse(prompt, url);
      console.log("ai_text:", ai_text);
    } catch (e) {
      console.error(e);
      $w("#caseTitle").text = "Failed to simplify";
    }
  });
});

