# BWFC Surveys

Supporter feedback surveys for BWFC with one admin dashboard covering every survey.

## Stack

- Plain HTML / CSS / JavaScript (no build step)
- Firebase Firestore stores responses, Firebase Authentication protects the admin page
- Deployed on Vercel from this GitHub repository

## Pages

| Address | What it is |
|---|---|
| `/` | List of all surveys |
| `/catering` | Matchday catering survey |
| `/admin` | Admin dashboard (sign-in required) |

## Files

```
surveys/
├── surveys-config.js   ← the surveys and their questions (edit this to add or change surveys)
├── firebase-config.js  ← your Firebase keys
├── index.html          ← survey list
├── survey.html/.js     ← builds whichever survey is requested
├── admin.html/.js      ← dashboard: a tab per survey, stats, filters, CSV
├── shared.js           ← header/crest and helpers
├── style.css           ← BWFC navy and white
├── vercel.json         ← makes /catering etc. work
├── firestore.rules     ← paste into Firebase console → Firestore → Rules
└── crest.png           ← optional: add the club crest here
```

## Setup

1. **Firebase**: create a Firestore database, enable Authentication → Email/Password, add your admin user, register a web app and copy its config into `firebase-config.js`.
2. **Rules**: Firebase console → Firestore → Rules → paste the contents of `firestore.rules` → Publish.
3. **GitHub**: push this folder to the `surveys` repo.
4. **Vercel**: Add New Project → import `surveys` → Deploy (no build settings).

## QR codes

Link to a survey, optionally adding the match and date:

```
https://YOUR-SITE/catering?match=Wigan+Athletic&date=2026-11-07
```

Time of day (Morning / Lunchtime / Afternoon / Evening) is recorded automatically.

## Adding a survey

Add another entry to `SURVEYS` in `surveys-config.js` with a new `id`, push, and it appears at `/<id>` and as a new admin tab. No rule changes needed.

Data is stored at `surveys/<id>/responses` in Firestore.
