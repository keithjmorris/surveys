import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { ORG, getSurvey } from "./surveys-config.js";
import { escapeHtml, renderHeader, timeOfDay } from "./shared.js";

// ── Which survey? ─────────────────────────────────────────
// Live site: /catering   ·   Local testing: survey.html?s=catering
const params = new URLSearchParams(location.search);
const pathId = location.pathname.replace(/^\/|\/$/g, "").replace(/\.html$/, "");
const surveyId = params.get("s") || (pathId && pathId !== "survey" ? pathId : "");
const survey = getSurvey(surveyId);

const form = document.getElementById("surveyForm");
const qWrap = document.getElementById("questions");
const formError = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");

document.getElementById("footer").textContent = `© ${new Date().getFullYear()} ${ORG.fullName}`;

if (!survey) {
  renderHeader(document.getElementById("header"), "Feedback");
  form.innerHTML = `<p class="intro" style="margin:0">Sorry, we couldn't find that survey. Please check the link or QR code.</p>`;
  throw new Error(`Unknown survey: ${surveyId}`);
}

document.title = `${ORG.name} — ${survey.title}`;
renderHeader(document.getElementById("header"), survey.title);
document.getElementById("intro").textContent = survey.intro || "";

// Optional context from the QR link, e.g. ?match=Wigan+Athletic&date=2026-11-07
const ctxValue = survey.context ? (params.get(survey.context.key) || "") : "";
const ctxDate = params.get("date") || "";
if (ctxValue || ctxDate) {
  const bits = [ctxValue, ctxDate && new Date(ctxDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })]
    .filter(Boolean).join(" · ");
  document.getElementById("contextPill").innerHTML =
    `<span class="context-pill">${escapeHtml(survey.context?.label || "")}${survey.context && ctxValue ? ": " : ""}${escapeHtml(bits)}</span>`;
}

// ── Build the questions ──────────────────────────────────
const answers = {};

survey.questions.forEach(q => {
  const box = document.createElement("div");
  box.className = "q";
  const label = `<span class="q-label" id="lbl-${q.id}">${escapeHtml(q.label)}${q.required ? '<span class="req">*</span>' : ""}</span>`;

  if (q.type === "stars") {
    box.innerHTML = label + `<div class="stars" role="radiogroup" aria-labelledby="lbl-${q.id}">
      ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-v="${n}" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`).join("")}
    </div>`;
    const btns = box.querySelectorAll("button");
    btns.forEach(b => b.addEventListener("click", () => {
      const v = Number(b.dataset.v);
      answers[q.id] = v;
      btns.forEach(x => {
        const on = Number(x.dataset.v) <= v;
        x.classList.toggle("on", on);
        x.setAttribute("aria-checked", Number(x.dataset.v) === v ? "true" : "false");
      });
    }));
  } else if (q.type === "choice" || q.type === "multi") {
    const type = q.type === "choice" ? "radio" : "checkbox";
    box.innerHTML = label + `<div class="options">
      ${q.options.map(o => `<label class="option"><input type="${type}" name="${q.id}" value="${escapeHtml(o)}"> ${escapeHtml(o)}</label>`).join("")}
    </div>`;
  } else if (q.type === "text") {
    box.innerHTML = label + `<textarea name="${q.id}" aria-labelledby="lbl-${q.id}" maxlength="2000"></textarea>`;
  } else {
    box.innerHTML = label + `<input type="text" name="${q.id}" aria-labelledby="lbl-${q.id}" maxlength="200">`;
  }
  qWrap.appendChild(box);
});

function collect() {
  const out = {};
  survey.questions.forEach(q => {
    if (q.type === "stars") out[q.id] = answers[q.id] ?? null;
    else if (q.type === "choice") out[q.id] = form.querySelector(`input[name="${q.id}"]:checked`)?.value ?? "";
    else if (q.type === "multi") out[q.id] = [...form.querySelectorAll(`input[name="${q.id}"]:checked`)].map(i => i.value);
    else out[q.id] = (form.querySelector(`[name="${q.id}"]`)?.value || "").trim();
  });
  return out;
}

function isEmpty(v) { return v === null || v === "" || (Array.isArray(v) && v.length === 0); }

// ── Submit ───────────────────────────────────────────────
const db = getFirestore(initializeApp(firebaseConfig));

form.addEventListener("submit", async e => {
  e.preventDefault();
  formError.style.display = "none";
  const data = collect();

  const missing = survey.questions.filter(q => q.required && isEmpty(data[q.id]));
  if (missing.length) {
    formError.textContent = `Please answer: ${missing.map(q => q.label).join(", ")}`;
    formError.style.display = "block";
    formError.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";
  const now = new Date();

  try {
    await addDoc(collection(db, "surveys", survey.id, "responses"), {
      ...data,
      context: ctxValue,
      contextDate: ctxDate,
      timeOfDay: timeOfDay(now),
      submittedAt: serverTimestamp()
    });
    form.style.display = "none";
    const ok = document.getElementById("successMsg");
    ok.innerHTML = `<strong>Thank you!</strong> Your feedback helps us improve ${escapeHtml(survey.title.toLowerCase())} at ${escapeHtml(ORG.name)}.`;
    ok.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error(err);
    formError.textContent = "Sorry, something went wrong sending your feedback. Please try again.";
    formError.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit feedback";
  }
});
