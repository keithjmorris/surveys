import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { ORG, SURVEYS } from "./surveys-config.js";
import { escapeHtml, renderHeader } from "./shared.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
renderHeader($("header"), "Survey admin");
document.title = `${ORG.name} — Survey admin`;

// ── State ────────────────────────────────────────────────
const cache = {};               // surveyId → array of responses
let current = SURVEYS[0]?.id;

// ── Auth ─────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  $("loginView").style.display = user ? "none" : "block";
  $("dashView").style.display = user ? "block" : "none";
  $("signOutBtn").style.display = user ? "inline-block" : "none";
  if (user) loadAll();
});

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("loginError").style.display = "none";
  $("loginBtn").disabled = true;
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (err) {
    $("loginError").textContent = friendlyAuthError(err.code);
    $("loginError").style.display = "block";
  } finally {
    $("loginBtn").disabled = false;
  }
});

$("signOutBtn").addEventListener("click", () => signOut(auth));

function friendlyAuthError(code) {
  switch (code) {
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential": return "Email or password is incorrect.";
    case "auth/too-many-requests": return "Too many attempts. Please wait a moment and try again.";
    default: return "Sign-in failed. Please try again.";
  }
}

// ── Data ─────────────────────────────────────────────────
async function loadAll() {
  await Promise.all(SURVEYS.map(async s => {
    try {
      const snap = await getDocs(query(collection(db, "surveys", s.id, "responses"), orderBy("submittedAt", "desc")));
      cache[s.id] = snap.docs.map(d => {
        const r = { id: d.id, ...d.data() };
        r._date = r.submittedAt?.toDate ? r.submittedAt.toDate() : null;
        return r;
      });
    } catch (err) {
      console.error(err);
      cache[s.id] = [];
    }
  }));
  renderTabs();
  render();
}

// ── Tabs ─────────────────────────────────────────────────
function renderTabs() {
  $("tabs").innerHTML = SURVEYS.map(s =>
    `<button class="tab ${s.id === current ? "active" : ""}" data-id="${s.id}">
       ${escapeHtml(s.title)}<span class="count">${cache[s.id]?.length ?? 0}</span>
     </button>`).join("");
  $("tabs").querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    current = b.dataset.id;
    clearFilters(false);
    renderTabs();
    render();
  }));
}

// ── Filters ──────────────────────────────────────────────
["fFrom", "fTo", "fTime", "fCtx"].forEach(id => $(id).addEventListener("change", render));
$("clearBtn").addEventListener("click", () => clearFilters(true));
$("refreshBtn").addEventListener("click", loadAll);

function clearFilters(rerender) {
  ["fFrom", "fTo", "fTime", "fCtx"].forEach(id => $(id).value = "");
  if (rerender) render();
}

function filtered() {
  const rows = cache[current] || [];
  const from = $("fFrom").value ? new Date($("fFrom").value + "T00:00:00") : null;
  const to = $("fTo").value ? new Date($("fTo").value + "T23:59:59") : null;
  const t = $("fTime").value;
  const c = $("fCtx").value;
  return rows.filter(r =>
    (!from || (r._date && r._date >= from)) &&
    (!to || (r._date && r._date <= to)) &&
    (!t || r.timeOfDay === t) &&
    (!c || r.context === c));
}

// ── Render ───────────────────────────────────────────────
const fmtDate = d => d ? d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null;

function render() {
  const survey = SURVEYS.find(s => s.id === current);
  if (!survey) return;
  const rows = filtered();

  // Context filter (e.g. Match) — only shown if the survey uses one
  const ctxWrap = $("fCtxWrap");
  if (survey.context) {
    ctxWrap.style.display = "";
    ctxWrap.firstChild.textContent = survey.context.label + " ";
    const chosen = $("fCtx").value;
    const values = [...new Set((cache[current] || []).map(r => r.context).filter(Boolean))].sort();
    $("fCtx").innerHTML = `<option value="">All</option>` +
      values.map(v => `<option ${v === chosen ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
  } else {
    ctxWrap.style.display = "none";
  }

  // Stat cards: responses + average of every star question
  const starQs = survey.questions.filter(q => q.type === "stars");
  $("stats").innerHTML =
    `<div class="stat"><div class="stat-label">Responses</div><div class="stat-value">${rows.length}</div></div>` +
    starQs.map(q => {
      const a = avg(rows.map(r => r[q.id]).filter(v => typeof v === "number"));
      return `<div class="stat"><div class="stat-label">${escapeHtml(shortLabel(q.label))}</div>
              <div class="stat-value">${a === null ? "–" : a.toFixed(1) + " ★"}</div></div>`;
    }).join("");

  // Breakdowns for choice / multi questions
  const choiceQs = survey.questions.filter(q => q.type === "choice" || q.type === "multi");
  $("breakdown").innerHTML = rows.length ? choiceQs.map(q => {
    const counts = Object.fromEntries(q.options.map(o => [o, 0]));
    rows.forEach(r => [].concat(r[q.id] || []).forEach(v => { if (v in counts) counts[v]++; }));
    const max = Math.max(1, ...Object.values(counts));
    return `<div class="stat" style="background:#fff;border:1px solid var(--line);">
      <h4>${escapeHtml(q.label)}</h4>
      ${q.options.map(o => `<div class="bar-row"><span>${escapeHtml(o)}</span><strong style="text-align:right">${counts[o]}</strong>
        <div class="bar-track"><div class="bar-fill" style="width:${(counts[o] / max) * 100}%"></div></div></div>`).join("")}
    </div>`;
  }).join("") : "";

  // Table
  if (!rows.length) {
    $("tableWrap").innerHTML = `<div class="empty">No responses ${cache[current]?.length ? "match these filters" : "yet"}.</div>`;
    return;
  }
  const cols = columns(survey);
  $("tableWrap").innerHTML = `<table>
    <thead><tr>${cols.map(c => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr>${cols.map(c =>
      `<td class="${c.long ? "long" : ""}">${escapeHtml(c.get(r))}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

function shortLabel(label) {
  return label.replace(/^(How (was|did you feel about) (the )?|Overall, how was your )/i, "")
              .replace(/\?$/, "").replace(/^./, c => c.toUpperCase());
}

function columns(survey) {
  const cols = [
    { label: "Submitted", get: r => fmtDate(r._date) },
    { label: "Time of day", get: r => r.timeOfDay || "" }
  ];
  if (survey.context) {
    cols.push({ label: survey.context.label, get: r => r.context || "" });
    cols.push({ label: "Date (from link)", get: r => r.contextDate || "" });
  }
  survey.questions.forEach(q => cols.push({
    label: shortLabel(q.label),
    long: q.type === "text",
    get: r => {
      const v = r[q.id];
      if (Array.isArray(v)) return v.join("; ");
      if (q.type === "stars" && typeof v === "number") return "★".repeat(v);
      return v ?? "";
    }
  }));
  return cols;
}

// ── CSV ──────────────────────────────────────────────────
$("csvBtn").addEventListener("click", () => {
  const survey = SURVEYS.find(s => s.id === current);
  const rows = filtered();
  const cols = columns(survey).map(c => ({
    ...c,
    // plain numbers for stars in the spreadsheet
    get: c.label === "Submitted" ? (r => r._date ? r._date.toISOString() : "")
       : survey.questions.some(q => q.type === "stars" && shortLabel(q.label) === c.label)
         ? (r => r[survey.questions.find(q => shortLabel(q.label) === c.label).id] ?? "")
         : c.get
  }));
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.map(c => esc(c.label)).join(","), ...rows.map(r => cols.map(c => esc(c.get(r))).join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${ORG.name.toLowerCase()}-${survey.id}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});
