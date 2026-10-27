// Shared helpers used by the survey pages and the admin dashboard
import { ORG } from "./surveys-config.js";

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// Header with the crest if crest.png exists, otherwise a "BWFC" roundel
export function renderHeader(el, subtitle) {
  el.innerHTML = `
    <div class="logo-mark" id="logoMark" aria-hidden="true">${escapeHtml(ORG.name)}</div>
    <div>
      <div class="site-name">${escapeHtml(ORG.fullName)}</div>
      <div class="site-sub">${escapeHtml(subtitle)}</div>
    </div>`;
  if (ORG.crest) {
    const img = new Image();
    img.className = "crest";
    img.alt = `${ORG.fullName} crest`;
    img.onload = () => document.getElementById("logoMark")?.replaceWith(img);
    img.src = "/" + ORG.crest;
  }
}

// Morning / Lunchtime / Afternoon / Evening from the hour of submission
export function timeOfDay(date) {
  const h = date.getHours();
  if (h < 12) return "Morning";
  if (h < 14) return "Lunchtime";
  if (h < 17) return "Afternoon";
  return "Evening";
}
