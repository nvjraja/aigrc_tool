// All page renderers. Each returns HTML for #view and attaches listeners via onMount.
(function () {
  const { esc, openModal, closeModal } = window.UI;

  // ---------------- Dashboard ----------------
  function renderDashboard() {
    const d = Store.dashboardSummary();
    const riskColor = (k) => ({ Unacceptable: "#991b1b", High: "#dc2626", Limited: "#d97706", Minimal: "#16a34a" }[k] || "#64748b");
    const statusColor = (k) => ({ Open: "#dc2626", Mitigated: "#16a34a", Accepted: "#d97706", Closed: "#64748b" }[k] || "#2563eb");

    const riskRows = Object.keys(d.systems_by_risk).length
      ? Object.entries(d.systems_by_risk).map(([k, v]) => `
          <div class="row" style="margin:8px 0;">
            <span style="width:140px">${esc(k)}</span>
            <div class="progress"><div style="width:${(v / d.total_systems) * 100}%;background:${riskColor(k)}"></div></div>
            <span style="width:30px;text-align:right">${v}</span>
          </div>`).join("")
      : `<p class="muted-text">No systems registered.</p>`;

    const statusRows = Object.keys(d.risks_by_status).length
      ? Object.entries(d.risks_by_status).map(([k, v]) => `
          <div class="row" style="margin:8px 0;">
            <span style="width:140px">${esc(k)}</span>
            <div class="progress"><div style="width:${(v / d.total_risks) * 100}%;background:${statusColor(k)}"></div></div>
            <span style="width:30px;text-align:right">${v}</span>
          </div>`).join("")
      : `<p class="muted-text">No risks recorded.</p>`;

    const fwRows = d.framework_compliance.map((f) => `
      <tr>
        <td><strong>${esc(f.framework_name)}</strong></td>
        <td>${f.total_controls}</td>
        <td><span class="badge green">${f.implemented}</span></td>
        <td><span class="badge yellow">${f.partial}</span></td>
        <td><span class="badge red">${f.not_implemented}</span></td>
        <td><span class="badge gray">${f.not_assessed}</span></td>
        <td style="width:220px">
          <div class="row">
            <div class="progress"><div style="width:${f.compliance_percent}%;background:${UI.complianceColor(f.compliance_percent)}"></div></div>
            <span style="width:48px;text-align:right">${f.compliance_percent}%</span>
          </div>
        </td>
      </tr>`).join("");

    return {
      html: `
        <div class="page-header">
          <div><h2>Dashboard</h2><p>Overview of AI governance, risk and compliance posture</p></div>
        </div>
        <div class="grid cols-4" style="margin-bottom:24px">
          ${UI.kpi("AI Systems", d.total_systems, "registered in inventory")}
          ${UI.kpi("Open Risks", d.total_risks, `${d.high_risks} high/critical`)}
          ${UI.kpi("Open Incidents", d.open_incidents, "under investigation")}
          ${UI.kpi("Policies", d.total_policies, "governance documents")}
        </div>
        <div class="grid cols-2" style="margin-bottom:24px">
          <div class="card"><h3 style="margin-top:0">Systems by EU AI Act Classification</h3>${riskRows}</div>
          <div class="card"><h3 style="margin-top:0">Risks by Status</h3>${statusRows}</div>
        </div>
        <div class="card">
          <h3 style="margin-top:0">Framework Compliance</h3>
          <table class="table">
            <thead><tr>
              <th>Framework</th><th>Controls</th><th>Implemented</th><th>Partial</th>
              <th>Not Implemented</th><th>Not Assessed</th><th>Compliance</th>
            </tr></thead>
            <tbody>${fwRows}</tbody>
          </table>
        </div>`,
      onMount() {},
    };
  }

  // ---------------- AI Systems ----------------
  function systemForm(initial) {
    const v = (k, d = "") => esc(initial && initial[k] != null ? initial[k] : d);
    const sel = (k, opts, def) => opts.map((o) =>
      `<option value="${esc(o)}" ${((initial && initial[k]) || def) === o ? "selected" : ""}>${esc(o)}</option>`
    ).join("");
    return `
      <div class="grid cols-2">
        <div class="form-row"><label>Name</label><input id="f-name" value="${v("name")}" /></div>
        <div class="form-row"><label>Owner</label><input id="f-owner" value="${v("owner")}" /></div>
        <div class="form-row"><label>Business Unit</label><input id="f-bu" value="${v("business_unit")}" /></div>
        <div class="form-row"><label>Lifecycle Stage</label>
          <select id="f-ls">${sel("lifecycle_stage", ["Concept","Development","Validation","Deployed","Retired"], "Development")}</select>
        </div>
        <div class="form-row"><label>Model Type</label><input id="f-mt" value="${v("model_type")}" /></div>
        <div class="form-row"><label>Deployment Environment</label><input id="f-de" value="${v("deployment_env")}" /></div>
        <div class="form-row"><label>EU AI Act Risk Classification</label>
          <select id="f-rc">${sel("risk_classification", ["Unacceptable","High","Limited","Minimal"], "Minimal")}</select>
        </div>
        <div class="form-row"><label>Status</label>
          <select id="f-st">${sel("status", ["Active","Paused","Decommissioned"], "Active")}</select>
        </div>
      </div>
      <div class="form-row"><label>Purpose / Intended Use</label><textarea id="f-purpose">${v("purpose")}</textarea></div>
      <div class="form-row"><label>Data Sources</label><textarea id="f-ds">${v("data_sources")}</textarea></div>
      <div class="form-row"><label>Description</label><textarea id="f-desc">${v("description")}</textarea></div>
      <div class="form-actions">
        <button class="btn secondary" id="f-cancel">Cancel</button>
        <button class="btn" id="f-save">Save</button>
      </div>`;
  }

  function openSystemModal(existing, afterSave) {
    openModal(existing ? "Edit AI System" : "Register AI System", systemForm(existing), (body) => {
      body.querySelector("#f-cancel").onclick = closeModal;
      body.querySelector("#f-save").onclick = () => {
        const payload = {
          name: body.querySelector("#f-name").value.trim(),
          owner: body.querySelector("#f-owner").value,
          business_unit: body.querySelector("#f-bu").value,
          lifecycle_stage: body.querySelector("#f-ls").value,
          model_type: body.querySelector("#f-mt").value,
          deployment_env: body.querySelector("#f-de").value,
          risk_classification: body.querySelector("#f-rc").value,
          status: body.querySelector("#f-st").value,
          purpose: body.querySelector("#f-purpose").value,
          data_sources: body.querySelector("#f-ds").value,
          description: body.querySelector("#f-desc").value,
        };
        if (!payload.name) { alert("Name is required"); return; }
        if (existing) Store.updateSystem(existing.id, payload);
        else Store.createSystem(payload);
        closeModal();
        afterSave();
      };
    });
  }

  function renderSystems() {
    const systems = Store.listSystems();
    const rows = systems.length
      ? systems.map((s) => `
          <tr data-id="${s.id}">
            <td><strong>${esc(s.name)}</strong><div class="muted-text">${esc(s.model_type)}</div></td>
            <td>${esc(s.owner) || "—"}</td>
            <td>${esc(s.business_unit) || "—"}</td>
            <td><span class="chip">${esc(s.lifecycle_stage)}</span></td>
            <td><span class="badge ${UI.riskBadge(s.risk_classification)}">${esc(s.risk_classification)}</span></td>
            <td><span class="badge blue">${esc(s.status)}</span></td>
            <td><button class="btn secondary js-del" data-id="${s.id}">Delete</button></td>
          </tr>`).join("")
      : "";
    const body = systems.length
      ? `<table class="table"><thead><tr>
          <th>Name</th><th>Owner</th><th>Business Unit</th><th>Lifecycle</th>
          <th>EU AI Act Risk</th><th>Status</th><th></th>
        </tr></thead><tbody>${rows}</tbody></table>`
      : `<div class="empty">No AI systems registered yet. Click <strong>Register AI System</strong> to start.</div>`;

    return {
      html: `
        <div class="page-header">
          <div><h2>AI Systems Inventory</h2><p>Register and classify AI systems across the organization</p></div>
          <button class="btn" id="new-system">+ Register AI System</button>
        </div>
        ${body}`,
      onMount() {
        document.getElementById("new-system").onclick = () => openSystemModal(null, App.render);
        document.querySelectorAll(".js-del").forEach((b) =>
          b.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = Number(b.dataset.id);
            if (confirm("Delete this AI system and all related records?")) {
              Store.deleteSystem(id); App.render();
            }
          })
        );
        document.querySelectorAll("tr[data-id]").forEach((tr) =>
          tr.addEventListener("click", () => {
            const id = Number(tr.dataset.id);
            const sys = Store.listSystems().find((x) => x.id === id);
            openSystemModal(sys, App.render);
          })
        );
      },
    };
  }

  // ---------------- Risks ----------------
  const RISK_CATEGORIES = ["Bias & Fairness","Privacy","Security","Safety","Ethics","Transparency","Accountability","Performance","Robustness","Compliance"];

  function riskForm(initial, systems) {
    const v = (k, d = "") => esc(initial && initial[k] != null ? initial[k] : d);
    const sel = (k, opts, def) => opts.map((o) =>
      `<option value="${esc(o)}" ${((initial && initial[k]) || def) === o ? "selected" : ""}>${esc(o)}</option>`
    ).join("");
    const sysOpts = `<option value="">— None (enterprise-level) —</option>` +
      systems.map((s) => `<option value="${s.id}" ${initial && initial.system_id == s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("");

    const likelihood = initial ? initial.likelihood : 3;
    const impact = initial ? initial.impact : 3;

    return `
      <div class="form-row"><label>Title</label><input id="f-title" value="${v("title")}" /></div>
      <div class="grid cols-2">
        <div class="form-row"><label>AI System</label><select id="f-sys">${sysOpts}</select></div>
        <div class="form-row"><label>Category</label><select id="f-cat">${sel("category", RISK_CATEGORIES, "Bias & Fairness")}</select></div>
        <div class="form-row"><label>Likelihood (1-5)</label><input id="f-like" type="number" min="1" max="5" value="${likelihood}" /></div>
        <div class="form-row"><label>Impact (1-5)</label><input id="f-imp" type="number" min="1" max="5" value="${impact}" /></div>
        <div class="form-row"><label>Owner</label><input id="f-own" value="${v("owner")}" /></div>
        <div class="form-row"><label>Status</label><select id="f-stat">${sel("status", ["Open","Mitigated","Accepted","Closed"], "Open")}</select></div>
      </div>
      <div class="form-row"><label>Description</label><textarea id="f-desc">${v("description")}</textarea></div>
      <div class="form-row"><label>Mitigation / Treatment</label><textarea id="f-mit">${v("mitigation")}</textarea></div>
      <div class="card" style="background:var(--surface-alt);padding:10px;font-size:13px">
        <strong>Inherent score:</strong> <span id="f-score">${likelihood * impact}</span> (Likelihood × Impact)
      </div>
      <div class="form-actions">
        <button class="btn secondary" id="f-cancel">Cancel</button>
        <button class="btn" id="f-save">Save</button>
      </div>`;
  }

  function openRiskModal(existing, afterSave) {
    const systems = Store.listSystems();
    openModal(existing ? "Edit Risk" : "New Risk", riskForm(existing, systems), (body) => {
      const likeEl = body.querySelector("#f-like"), impEl = body.querySelector("#f-imp"), scoreEl = body.querySelector("#f-score");
      const recalc = () => { scoreEl.textContent = (Number(likeEl.value) || 0) * (Number(impEl.value) || 0); };
      likeEl.oninput = recalc; impEl.oninput = recalc;

      body.querySelector("#f-cancel").onclick = closeModal;
      body.querySelector("#f-save").onclick = () => {
        const payload = {
          title: body.querySelector("#f-title").value.trim(),
          system_id: body.querySelector("#f-sys").value || null,
          category: body.querySelector("#f-cat").value,
          likelihood: Number(body.querySelector("#f-like").value),
          impact: Number(body.querySelector("#f-imp").value),
          owner: body.querySelector("#f-own").value,
          status: body.querySelector("#f-stat").value,
          description: body.querySelector("#f-desc").value,
          mitigation: body.querySelector("#f-mit").value,
        };
        if (!payload.title) { alert("Title is required"); return; }
        if (existing) Store.updateRisk(existing.id, payload);
        else Store.createRisk(payload);
        closeModal();
        afterSave();
      };
    });
  }

  function renderRisks() {
    let filter = "All";
    const systems = Store.listSystems();
    const nameOf = (id) => systems.find((s) => s.id === id)?.name || "—";

    function body() {
      const risks = Store.listRisks().filter((r) => filter === "All" || r.status === filter);
      const total = Store.listRisks().length;
      if (!risks.length) {
        return `<div class="empty">No risks. Click <strong>New Risk</strong> to add one.</div>`;
      }
      const rows = risks.map((r) => `
        <tr data-id="${r.id}">
          <td><strong>${esc(r.title)}</strong></td>
          <td>${esc(nameOf(r.system_id))}</td>
          <td>${esc(r.category)}</td>
          <td>${r.likelihood}</td>
          <td>${r.impact}</td>
          <td><span class="badge ${UI.scoreBadge(r.inherent_score)}">${r.inherent_score}</span></td>
          <td><span class="badge ${UI.scoreBadge(r.residual_score)}">${r.residual_score}</span></td>
          <td>${esc(r.owner) || "—"}</td>
          <td><span class="badge ${UI.riskStatusBadge(r.status)}">${esc(r.status)}</span></td>
          <td><button class="btn secondary js-del" data-id="${r.id}">Delete</button></td>
        </tr>`).join("");
      return `<div style="color:var(--muted);font-size:13px;margin-bottom:8px">Showing ${risks.length} of ${total}</div>
        <table class="table"><thead><tr>
          <th>Title</th><th>System</th><th>Category</th><th>Likelihood</th><th>Impact</th>
          <th>Inherent</th><th>Residual</th><th>Owner</th><th>Status</th><th></th>
        </tr></thead><tbody>${rows}</tbody></table>`;
    }

    return {
      html: `
        <div class="page-header">
          <div><h2>Risk Management</h2><p>Identify, assess, and treat AI risks (aligned to ISO 31000 / NIST AI RMF)</p></div>
          <button class="btn" id="new-risk">+ New Risk</button>
        </div>
        <div class="filter-row">
          <strong>Status:</strong>
          <select id="status-filter">
            ${["All","Open","Mitigated","Accepted","Closed"].map((s) => `<option>${s}</option>`).join("")}
          </select>
        </div>
        <div id="risk-body">${body()}</div>`,
      onMount() {
        const refresh = () => { document.getElementById("risk-body").innerHTML = body(); bind(); };
        const bind = () => {
          document.querySelectorAll(".js-del").forEach((b) =>
            b.addEventListener("click", (e) => {
              e.stopPropagation();
              if (confirm("Delete this risk?")) { Store.deleteRisk(Number(b.dataset.id)); refresh(); App.refreshNav(); }
            })
          );
          document.querySelectorAll("tr[data-id]").forEach((tr) =>
            tr.addEventListener("click", () => {
              const r = Store.listRisks().find((x) => x.id === Number(tr.dataset.id));
              openRiskModal(r, refresh);
            })
          );
        };
        document.getElementById("new-risk").onclick = () => openRiskModal(null, refresh);
        document.getElementById("status-filter").onchange = (e) => { filter = e.target.value; refresh(); };
        bind();
      },
    };
  }

  // ---------------- Frameworks ----------------
  const STATUS_OPTIONS = ["Not Assessed","Not Implemented","Partial","Implemented","Not Applicable"];

  function openAssessModal(control, afterSave) {
    const a = control.assessment || {};
    openModal(`Assess: ${control.ref_code} — ${control.title}`, `
      <p class="muted-text">${esc(control.description)}</p>
      <div class="grid cols-2">
        <div class="form-row"><label>Status</label>
          <select id="a-st">${STATUS_OPTIONS.map((s) => `<option ${s === (a.status || "Not Assessed") ? "selected" : ""}>${s}</option>`).join("")}</select>
        </div>
        <div class="form-row"><label>Maturity (0-5)</label><input id="a-mat" type="number" min="0" max="5" value="${a.maturity || 0}" /></div>
        <div class="form-row"><label>Owner</label><input id="a-own" value="${esc(a.owner || "")}" /></div>
      </div>
      <div class="form-row"><label>Evidence</label><textarea id="a-ev">${esc(a.evidence || "")}</textarea></div>
      <div class="form-row"><label>Notes</label><textarea id="a-nt">${esc(a.notes || "")}</textarea></div>
      <div class="form-actions">
        <button class="btn secondary" id="a-cancel">Cancel</button>
        <button class="btn" id="a-save">Save</button>
      </div>`, (body) => {
      body.querySelector("#a-cancel").onclick = closeModal;
      body.querySelector("#a-save").onclick = () => {
        Store.upsertAssessment({
          control_id: control.id,
          system_id: null,
          status: body.querySelector("#a-st").value,
          maturity: Number(body.querySelector("#a-mat").value),
          owner: body.querySelector("#a-own").value,
          evidence: body.querySelector("#a-ev").value,
          notes: body.querySelector("#a-nt").value,
        });
        closeModal();
        afterSave();
      };
    });
  }

  function renderFrameworks() {
    const frameworks = Store.listFrameworks();
    let activeCode = frameworks[0]?.code;
    let search = "";
    let statusFilter = "All";

    function body() {
      const fw = frameworks.find((f) => f.code === activeCode);
      if (!fw) return "";
      const controls = Store.controlsForFramework(activeCode);
      const stats = controls.reduce((acc, c) => {
        const s = c.assessment?.status || "Not Assessed";
        acc[s] = (acc[s] || 0) + 1; return acc;
      }, {});
      const total = controls.length;
      const applicable = total - (stats["Not Applicable"] || 0);
      const impl = stats["Implemented"] || 0, part = stats["Partial"] || 0;
      const compliance = applicable > 0 ? Math.round(((impl + 0.5 * part) / applicable) * 100) : 0;

      const filtered = controls.filter((c) => {
        const s = c.assessment?.status || "Not Assessed";
        if (statusFilter !== "All" && s !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!c.title.toLowerCase().includes(q) &&
              !c.ref_code.toLowerCase().includes(q) &&
              !(c.category || "").toLowerCase().includes(q)) return false;
        }
        return true;
      });

      const rows = filtered.map((c) => {
        const st = c.assessment?.status || "Not Assessed";
        return `<tr data-id="${c.id}">
          <td><code>${esc(c.ref_code)}</code></td>
          <td><strong>${esc(c.title)}</strong><div class="muted-text">${esc(c.description)}</div></td>
          <td><span class="chip">${esc(c.category)}</span></td>
          <td><span class="badge ${UI.assessBadge(st)}">${esc(st)}</span></td>
          <td>${c.assessment?.maturity ?? 0} / 5</td>
          <td><button class="btn secondary">Assess</button></td>
        </tr>`;
      }).join("");

      return `
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">
            <div style="flex:1">
              <h3 style="margin:0 0 6px">${esc(fw.name)}</h3>
              <p class="muted-text" style="margin:0">${esc(fw.description)}</p>
            </div>
            <div style="text-align:right;min-width:200px">
              <div style="font-size:32px;font-weight:600;color:${UI.complianceColor(compliance)}">${compliance}%</div>
              <div class="muted-text">compliance score</div>
            </div>
          </div>
          <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap">
            <span class="badge green">Implemented: ${stats["Implemented"] || 0}</span>
            <span class="badge yellow">Partial: ${stats["Partial"] || 0}</span>
            <span class="badge red">Not Implemented: ${stats["Not Implemented"] || 0}</span>
            <span class="badge gray">Not Assessed: ${stats["Not Assessed"] || 0}</span>
            <span class="badge blue">Not Applicable: ${stats["Not Applicable"] || 0}</span>
            <span class="badge purple">Total: ${total}</span>
          </div>
        </div>
        <div class="filter-row">
          <input id="fw-search" placeholder="Search by title, ref, or category…" value="${esc(search)}" style="flex:1;min-width:240px" />
          <select id="fw-status">
            <option>All</option>
            ${STATUS_OPTIONS.map((s) => `<option ${s === statusFilter ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <table class="table"><thead><tr>
          <th style="width:90px">Ref</th><th>Control</th><th style="width:180px">Category</th>
          <th style="width:150px">Status</th><th style="width:80px">Maturity</th><th style="width:80px"></th>
        </tr></thead><tbody>${rows}</tbody></table>`;
    }

    const tabs = frameworks.map((f) => `<div class="tab ${f.code === activeCode ? "active" : ""}" data-code="${f.code}">${esc(f.name)}</div>`).join("");

    return {
      html: `
        <div class="page-header">
          <div><h2>Frameworks & Controls</h2><p>Assess compliance against ISO 42001, EU AI Act, and NIST AI RMF</p></div>
        </div>
        <div class="tab-row" id="fw-tabs">${tabs}</div>
        <div id="fw-body">${body()}</div>`,
      onMount() {
        const refreshBody = () => { document.getElementById("fw-body").innerHTML = body(); bindBody(); };
        const refreshTabs = () => {
          document.querySelectorAll("#fw-tabs .tab").forEach((t) =>
            t.classList.toggle("active", t.dataset.code === activeCode)
          );
        };
        document.querySelectorAll("#fw-tabs .tab").forEach((t) =>
          t.addEventListener("click", () => { activeCode = t.dataset.code; refreshTabs(); refreshBody(); })
        );
        const bindBody = () => {
          const sinp = document.getElementById("fw-search");
          if (sinp) sinp.oninput = (e) => { search = e.target.value; refreshBody(); document.getElementById("fw-search").focus(); };
          const ssel = document.getElementById("fw-status");
          if (ssel) ssel.onchange = (e) => { statusFilter = e.target.value; refreshBody(); };
          document.querySelectorAll("tr[data-id]").forEach((tr) =>
            tr.addEventListener("click", () => {
              const controls = Store.controlsForFramework(activeCode);
              const c = controls.find((x) => x.id === Number(tr.dataset.id));
              openAssessModal(c, refreshBody);
            })
          );
        };
        bindBody();
      },
    };
  }

  // ---------------- Incidents ----------------
  function incidentForm(initial, systems) {
    const v = (k, d = "") => esc(initial && initial[k] != null ? initial[k] : d);
    const sel = (k, opts, def) => opts.map((o) =>
      `<option value="${esc(o)}" ${((initial && initial[k]) || def) === o ? "selected" : ""}>${esc(o)}</option>`
    ).join("");
    const sysOpts = `<option value="">— Unspecified —</option>` +
      systems.map((s) => `<option value="${s.id}" ${initial && initial.system_id == s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("");
    return `
      <div class="form-row"><label>Title</label><input id="f-title" value="${v("title")}" /></div>
      <div class="grid cols-2">
        <div class="form-row"><label>AI System</label><select id="f-sys">${sysOpts}</select></div>
        <div class="form-row"><label>Severity</label><select id="f-sev">${sel("severity", ["Low","Medium","High","Critical"], "Low")}</select></div>
        <div class="form-row"><label>Status</label><select id="f-st">${sel("status", ["Open","Investigating","Resolved","Closed"], "Open")}</select></div>
        <div class="form-row"><label>Reported By</label><input id="f-by" value="${v("reported_by")}" /></div>
      </div>
      <div class="form-row"><label>Description</label><textarea id="f-desc">${v("description")}</textarea></div>
      <div class="form-row"><label>Root Cause</label><textarea id="f-rc">${v("root_cause")}</textarea></div>
      <div class="form-row"><label>Corrective Action</label><textarea id="f-ca">${v("corrective_action")}</textarea></div>
      <div class="form-actions">
        <button class="btn secondary" id="f-cancel">Cancel</button>
        <button class="btn" id="f-save">Save</button>
      </div>`;
  }

  function openIncidentModal(existing, afterSave) {
    const systems = Store.listSystems();
    openModal(existing ? "Edit Incident" : "Report Incident", incidentForm(existing, systems), (body) => {
      body.querySelector("#f-cancel").onclick = closeModal;
      body.querySelector("#f-save").onclick = () => {
        const payload = {
          title: body.querySelector("#f-title").value.trim(),
          system_id: body.querySelector("#f-sys").value || null,
          severity: body.querySelector("#f-sev").value,
          status: body.querySelector("#f-st").value,
          reported_by: body.querySelector("#f-by").value,
          description: body.querySelector("#f-desc").value,
          root_cause: body.querySelector("#f-rc").value,
          corrective_action: body.querySelector("#f-ca").value,
        };
        if (!payload.title) { alert("Title is required"); return; }
        if (existing) Store.updateIncident(existing.id, payload);
        else Store.createIncident(payload);
        closeModal();
        afterSave();
      };
    });
  }

  function renderIncidents() {
    const systems = Store.listSystems();
    const nameOf = (id) => systems.find((s) => s.id === id)?.name || "—";
    const items = Store.listIncidents();
    const rows = items.length
      ? items.map((i) => `<tr data-id="${i.id}">
          <td><strong>${esc(i.title)}</strong></td>
          <td>${esc(nameOf(i.system_id))}</td>
          <td><span class="badge ${UI.severityBadge(i.severity)}">${esc(i.severity)}</span></td>
          <td><span class="badge ${UI.incidentStatusBadge(i.status)}">${esc(i.status)}</span></td>
          <td>${esc(i.reported_by) || "—"}</td>
          <td>${i.occurred_at ? new Date(i.occurred_at).toLocaleDateString() : "—"}</td>
          <td><button class="btn secondary js-del" data-id="${i.id}">Delete</button></td>
        </tr>`).join("")
      : "";
    const body = items.length
      ? `<table class="table"><thead><tr>
          <th>Title</th><th>System</th><th>Severity</th><th>Status</th><th>Reported By</th><th>Occurred</th><th></th>
        </tr></thead><tbody>${rows}</tbody></table>`
      : `<div class="empty">No incidents reported.</div>`;
    return {
      html: `
        <div class="page-header">
          <div><h2>AI Incidents</h2><p>Log and investigate AI-related incidents (EU AI Act Art. 73 · NIST MANAGE 4.3)</p></div>
          <button class="btn" id="new-inc">+ Report Incident</button>
        </div>${body}`,
      onMount() {
        document.getElementById("new-inc").onclick = () => openIncidentModal(null, App.render);
        document.querySelectorAll(".js-del").forEach((b) =>
          b.addEventListener("click", (e) => {
            e.stopPropagation();
            if (confirm("Delete this incident?")) { Store.deleteIncident(Number(b.dataset.id)); App.render(); }
          })
        );
        document.querySelectorAll("tr[data-id]").forEach((tr) =>
          tr.addEventListener("click", () => {
            const inc = Store.listIncidents().find((x) => x.id === Number(tr.dataset.id));
            openIncidentModal(inc, App.render);
          })
        );
      },
    };
  }

  // ---------------- Policies (with file upload) ----------------
  function policyForm(initial) {
    const isNew = !initial;
    const v = (k, d = "") => esc(initial && initial[k] != null ? initial[k] : d);
    const sel = (k, opts, def) => opts.map((o) =>
      `<option value="${esc(o)}" ${((initial && initial[k]) || def) === o ? "selected" : ""}>${esc(o)}</option>`
    ).join("");
    const existingFile = !isNew && initial.file_name ? `
      <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px">
        <a href="${esc(initial.file_data)}" download="${esc(initial.file_name)}">📎 ${esc(initial.file_name)}</a>
        <span class="muted-text">${initial.file_size ? Math.round(initial.file_size/1024) + " KB" : ""}</span>
        <button type="button" class="btn secondary" id="f-remove-file" style="padding:4px 10px;font-size:12px">Remove</button>
      </div>` : "";

    return `
      <div class="form-row"><label>Name</label><input id="f-name" value="${v("name")}" /></div>
      <div class="grid cols-2">
        <div class="form-row"><label>Category</label>
          <select id="f-cat">${sel("category", ["Governance","Use","Data","Security","Privacy","Incident","Procurement","Other"], "Governance")}</select>
        </div>
        <div class="form-row"><label>Version</label><input id="f-ver" value="${v("version","1.0")}" /></div>
        <div class="form-row"><label>Owner</label><input id="f-own" value="${v("owner")}" /></div>
        <div class="form-row"><label>Status</label>
          <select id="f-st">${sel("status", ["Draft","Review","Approved","Retired"], "Draft")}</select>
        </div>
      </div>
      <div class="form-row"><label>Content</label><textarea id="f-content" rows="6">${v("content")}</textarea></div>
      <div class="form-row">
        <label>Attachment (PDF / Word)</label>
        ${existingFile}
        <input id="f-file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
        <div id="f-pending" class="muted-text" style="margin-top:6px"></div>
        <div id="f-err" class="error-text"></div>
        <div class="muted-text" style="margin-top:6px;font-size:11px">Accepted: .pdf, .doc, .docx (max 5 MB in this demo)</div>
      </div>
      <div class="form-actions">
        <button class="btn secondary" id="f-cancel">Cancel</button>
        <button class="btn" id="f-save">Save</button>
      </div>`;
  }

  function openPolicyModal(existing, afterSave) {
    openModal(existing ? "Edit Policy" : "New Policy", policyForm(existing), (body) => {
      let pendingFile = null;
      const errEl = body.querySelector("#f-err");
      const pendEl = body.querySelector("#f-pending");

      if (body.querySelector("#f-remove-file")) {
        body.querySelector("#f-remove-file").onclick = () => {
          if (!existing) return;
          if (confirm("Remove the attached file?")) {
            Store.removePolicyFile(existing.id);
            closeModal();
            afterSave();
          }
        };
      }

      body.querySelector("#f-file").addEventListener("change", (e) => {
        errEl.textContent = ""; pendEl.textContent = "";
        const f = e.target.files?.[0];
        if (!f) { pendingFile = null; return; }
        const ext = f.name.toLowerCase().split(".").pop();
        if (!["pdf","doc","docx"].includes(ext)) {
          errEl.textContent = "Only PDF or Word files (.pdf, .doc, .docx) are allowed.";
          e.target.value = ""; pendingFile = null; return;
        }
        if (f.size > 5 * 1024 * 1024) {
          errEl.textContent = "File exceeds 5 MB limit for this demo (localStorage quota).";
          e.target.value = ""; pendingFile = null; return;
        }
        pendingFile = f;
        pendEl.innerHTML = `Selected: <strong>${esc(f.name)}</strong> (${Math.round(f.size/1024)} KB) — will save on Save`;
      });

      body.querySelector("#f-cancel").onclick = closeModal;
      body.querySelector("#f-save").onclick = async () => {
        const payload = {
          name: body.querySelector("#f-name").value.trim(),
          category: body.querySelector("#f-cat").value,
          version: body.querySelector("#f-ver").value,
          owner: body.querySelector("#f-own").value,
          status: body.querySelector("#f-st").value,
          content: body.querySelector("#f-content").value,
        };
        if (!payload.name) { alert("Name is required"); return; }
        const saved = existing ? Store.updatePolicy(existing.id, payload) : Store.createPolicy(payload);

        if (pendingFile) {
          try {
            const dataUrl = await new Promise((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(fr.result);
              fr.onerror = () => reject(fr.error);
              fr.readAsDataURL(pendingFile);
            });
            Store.attachPolicyFile(saved.id, {
              file_name: pendingFile.name,
              file_mime: pendingFile.type || "",
              file_size: pendingFile.size,
              file_data: dataUrl,
            });
          } catch (e) {
            errEl.textContent = "Could not read file: " + (e.message || e);
            return;
          }
        }
        closeModal();
        afterSave();
      };
    });
  }

  function renderPolicies() {
    const items = Store.listPolicies();
    const rows = items.length ? items.map((p) => `
      <tr data-id="${p.id}">
        <td><strong>${esc(p.name)}</strong></td>
        <td><span class="chip">${esc(p.category)}</span></td>
        <td>${esc(p.version)}</td>
        <td>${esc(p.owner) || "—"}</td>
        <td><span class="badge ${UI.policyStatusBadge(p.status)}">${esc(p.status)}</span></td>
        <td>${p.file_name
          ? `<a href="${esc(p.file_data)}" download="${esc(p.file_name)}" onclick="event.stopPropagation()">📎 ${esc(p.file_name)}</a>`
          : `<span class="muted-text">—</span>`}</td>
        <td>${new Date(p.updated_at).toLocaleDateString()}</td>
        <td><button class="btn secondary js-del" data-id="${p.id}">Delete</button></td>
      </tr>`).join("") : "";
    const body = items.length
      ? `<table class="table"><thead><tr>
          <th>Name</th><th>Category</th><th>Version</th><th>Owner</th><th>Status</th>
          <th>Attachment</th><th>Updated</th><th></th>
        </tr></thead><tbody>${rows}</tbody></table>`
      : `<div class="empty">No policies yet.</div>`;
    return {
      html: `
        <div class="page-header">
          <div><h2>AI Policies</h2><p>Governance documents — policies, procedures and standards for AI</p></div>
          <button class="btn" id="new-pol">+ New Policy</button>
        </div>${body}`,
      onMount() {
        document.getElementById("new-pol").onclick = () => openPolicyModal(null, App.render);
        document.querySelectorAll(".js-del").forEach((b) =>
          b.addEventListener("click", (e) => {
            e.stopPropagation();
            if (confirm("Delete this policy?")) { Store.deletePolicy(Number(b.dataset.id)); App.render(); }
          })
        );
        document.querySelectorAll("tr[data-id]").forEach((tr) =>
          tr.addEventListener("click", () => {
            const p = Store.listPolicies().find((x) => x.id === Number(tr.dataset.id));
            openPolicyModal(p, App.render);
          })
        );
      },
    };
  }

  window.Pages = {
    dashboard: renderDashboard,
    systems: renderSystems,
    risks: renderRisks,
    frameworks: renderFrameworks,
    incidents: renderIncidents,
    policies: renderPolicies,
  };
})();
