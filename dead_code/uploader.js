// Filename: public/courtUploader.js

import { fetch } from 'wix-fetch';
import wixData from 'wix-data';

const MOCK_COURT_TEXT = `
SUPREME COURT OF THE UNITED STATES

Argued March 20, 2025—Decided July 14, 2025

UNITED STATES v. DIGITALCORP, INC.

JUSTICE RAO delivered the opinion of the Court.

This case concerns whether DigitalCorp violated Sections 1 and 2 of the Sherman Antitrust Act by engaging in exclusionary conduct to dominate the cloud infrastructure market...

The Department of Justice brought suit against DigitalCorp in 2024, alleging a pattern of anti-competitive contracts and vertical integration aimed at foreclosing competition...

After an 8-week trial, the jury found in favor of the government...
`;

const openaiKey = "YOUR_OPENAI_API_KEY";  // For production, use Secrets Manager

async function summarizeFields(rawText, sourceUrl) {
  const prompt = `You are given a Supreme Court decision. Extract the following fields and return them as a JSON object with these keys:

- Title
- Participants (array of objects: name + role)
- Trial start date (ISO format if possible)
- Date of verdict (ISO format)
- One sentence summary
- Summary (1–3 paragraphs)
- Verdict (short paragraph)
- Source (use this: ${sourceUrl})

Here is the court document text:
"""${rawText.slice(0, 8000)}"""
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You extract structured legal summaries from court cases." },
        { role: "user", content: prompt }
      ]
    })
  });

  const json = await response.json();
  const structured = JSON.parse(json.choices[0].message.content);
  return structured;
}

export async function createMockCourtItem() 
{
  const sourceUrl = "https://www.supremecourt.gov/opinions/24pdf/606us2r67_d18e.pdf";
  const fields = await summarizeFields(MOCK_COURT_TEXT, sourceUrl);

  const item = {
    title_fld: fields.Title,
    participants: fields.Participants,
    trialStartDate: new Date(fields["Trial start date"] || "2000-01-01"),
    verdictDate: new Date(fields["Date of verdict"] || "2000-01-01"),
    oneSentenceSummary: fields["One sentence summary"],
    summary: fields.Summary,
    verdict: fields.Verdict,
    source: sourceUrl,
    raw: MOCK_COURT_TEXT
  };

  return wixData.insert("CourtCases", item);
}