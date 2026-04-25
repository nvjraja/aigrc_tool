// Tiny UI helpers: DOM creation, modal, escape helpers.
(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function openModal(title, bodyHTML, onOpen) {
    const root = document.getElementById("modal-root");
    root.innerHTML = `
      <div class="modal-backdrop" id="mb">
        <div class="modal" id="mbox">
          <h3>${esc(title)}</h3>
          <div id="mbody">${bodyHTML}</div>
        </div>
      </div>`;
    const backdrop = document.getElementById("mb");
    backdrop.addEventListener("click", (e) => { if (e.target.id === "mb") closeModal(); });
    if (typeof onOpen === "function") onOpen(document.getElementById("mbody"));
  }

  function closeModal() { document.getElementById("modal-root").innerHTML = ""; }

  function kpi(label, value, sub) {
    return `<div class="card kpi">
      <div class="label">${esc(label)}</div>
      <div class="value">${esc(value)}</div>
      <div class="sub">${esc(sub || "")}</div>
    </div>`;
  }

  function riskBadge(cls) {
    switch (cls) {
      case "Unacceptable":
      case "High": return "red";
      case "Limited": return "yellow";
      case "Minimal": return "green";
      default: return "gray";
    }
  }
  function scoreBadge(s) { return s >= 15 ? "red" : s >= 8 ? "yellow" : "green"; }
  function riskStatusBadge(s) {
    if (s === "Open") return "red";
    if (s === "Mitigated") return "green";
    if (s === "Accepted") return "yellow";
    return "gray";
  }
  function assessBadge(s) {
    if (s === "Implemented") return "green";
    if (s === "Partial") return "yellow";
    if (s === "Not Implemented") return "red";
    if (s === "Not Applicable") return "blue";
    return "gray";
  }
  function severityBadge(s) {
    if (s === "Critical" || s === "High") return "red";
    if (s === "Medium") return "yellow";
    return "green";
  }
  function incidentStatusBadge(s) {
    if (s === "Open") return "red";
    if (s === "Investigating") return "yellow";
    if (s === "Resolved") return "green";
    return "gray";
  }
  function policyStatusBadge(s) {
    if (s === "Approved") return "green";
    if (s === "Review") return "yellow";
    if (s === "Retired") return "gray";
    return "blue";
  }

  function complianceColor(p) {
    if (p >= 80) return "var(--success)";
    if (p >= 50) return "var(--warning)";
    return "var(--danger)";
  }

  window.UI = {
    esc, el, openModal, closeModal, kpi,
    riskBadge, scoreBadge, riskStatusBadge, assessBadge,
    severityBadge, incidentStatusBadge, policyStatusBadge, complianceColor,
  };
})();
