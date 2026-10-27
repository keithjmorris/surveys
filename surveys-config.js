// ─────────────────────────────────────────────────────────────
//  SURVEYS CONFIG — the only file you need to change to add,
//  remove or edit a survey. Every survey listed here gets:
//    • a public form at  https://YOUR-SITE/<id>
//    • its own tab on the admin dashboard
//
//  Question types:
//    stars   – 1 to 5 star rating
//    choice  – pick one option
//    multi   – tick any number of options
//    text    – comment box
//    short   – single-line answer
//  Add  required: true  to make a question compulsory.
// ─────────────────────────────────────────────────────────────

export const ORG = {
  name: "BWFC",
  fullName: "Bolton Wanderers FC",
  crest: "crest.png",        // optional — drop crest.png into the project folder
  primary: "#263c7e",        // Bolton navy
  accent: "#ffffff"
};

export const SURVEYS = [
  {
    id: "catering",
    title: "Matchday catering",
    intro: "Tell us about the food and drink you had today. It takes about a minute.",
    // Optional extra detail taken from the QR code link, e.g.
    //   /catering?match=Wigan+Athletic&date=2026-11-07
    context: { key: "match", label: "Match" },
    questions: [
      { id: "outlet", label: "Where did you buy your food or drink?", type: "choice",
        options: ["Concourse kiosk", "Bar", "Hospitality lounge", "Fan zone", "Other"] },
      { id: "overall", label: "Overall, how was your experience?", type: "stars", required: true },
      { id: "had", label: "What did you have?", type: "multi",
        options: ["Hot drink", "Soft drink", "Hot food (pie, burger etc.)", "Snacks and sweets", "Other"] },
      { id: "alcohol", label: "Did you buy an alcoholic drink?", type: "choice",
        options: ["Yes", "No"] },
      { id: "choice", label: "How did you feel about the choice of food?", type: "stars" },
      { id: "quality", label: "How was the food and drink?", type: "stars" },
      { id: "value", label: "How was the value for money?", type: "stars" },
      { id: "service", label: "How was the service?", type: "stars" },
      { id: "wait", label: "How long did you wait to be served?", type: "choice",
        options: ["Under 5 minutes", "5–10 minutes", "Over 10 minutes", "Long enough to miss some of the match"] },
      { id: "recommend", label: "Would you buy food or drink here again?", type: "choice",
        options: ["Yes", "Maybe", "No"] },
      { id: "comments", label: "Any comments or suggestions?", type: "text" }
    ]
  }
];

export function getSurvey(id) {
  return SURVEYS.find(s => s.id === id);
}
