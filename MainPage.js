import { getLastSlipPdfUrls } from "public/scotus_latest";
import { getLastBillsTests } from "public/congress_latest";

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
      
      const pdfUrls = await getLastBillsTests();
      console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
      console.log("pdf: ", pdfUrls);
      console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
      
    } catch (e) {
      console.error(e);
      $w("#caseTitle").text = "Failed to fetch latest case";
    }
  });
});
