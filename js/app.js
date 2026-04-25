// Router + bootstrap
(function () {
  const NAV = [
    { hash: "#/dashboard", label: "Dashboard", page: "dashboard" },
    { hash: "#/systems", label: "AI Systems", page: "systems" },
    { hash: "#/risks", label: "Risk Management", page: "risks" },
    { hash: "#/frameworks", label: "Frameworks & Controls", page: "frameworks" },
    { hash: "#/incidents", label: "Incidents", page: "incidents" },
    { hash: "#/policies", label: "Policies", page: "policies" },
  ];

  function renderNav() {
    const nav = document.getElementById("nav");
    const current = location.hash || "#/dashboard";
    nav.innerHTML = NAV.map((n) =>
      `<a href="${n.hash}" class="${current.startsWith(n.hash) ? "active" : ""}">${n.label}</a>`
    ).join("");
  }

  function render() {
    Store.ensure();
    const hash = location.hash || "#/dashboard";
    const match = NAV.find((n) => hash.startsWith(n.hash)) || NAV[0];
    const view = document.getElementById("view");
    const page = window.Pages[match.page]();
    view.innerHTML = page.html;
    if (page.onMount) page.onMount();
    renderNav();
  }

  window.App = { render, refreshNav: renderNav };

  window.addEventListener("hashchange", render);
  document.addEventListener("DOMContentLoaded", () => {
    if (!location.hash) location.hash = "#/dashboard";
    document.getElementById("reset-demo").onclick = () => {
      if (confirm("Reset all demo data back to the seed state?")) { Store.reset(); render(); }
    };
    render();
  });
})();
