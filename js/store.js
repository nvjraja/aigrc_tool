// Local-storage backed store. Mirrors the backend API shape.
(function () {
  const KEY = "ai_grc_demo_v1";

  function now() { return new Date().toISOString(); }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

  function seedState() {
    const frameworks = [];
    const controls = [];
    let fwId = 1, ctlId = 1;
    for (const fw of window.FRAMEWORKS_SEED) {
      frameworks.push({
        id: fwId,
        code: fw.code,
        name: fw.name,
        version: fw.version,
        description: fw.description,
      });
      for (const [ref, title, cat, desc] of fw.controls) {
        controls.push({
          id: ctlId++,
          framework_id: fwId,
          ref_code: ref,
          title,
          category: cat,
          description: desc,
        });
      }
      fwId++;
    }
    const policies = window.SEED_POLICIES.map((p, i) => ({
      id: i + 1,
      ...p,
      file_name: null,
      file_mime: null,
      file_size: null,
      file_data: null,
      created_at: now(),
      updated_at: now(),
    }));
    return {
      seq: { system: 1, risk: 1, incident: 1, assessment: 1, policy: policies.length + 1 },
      systems: [],
      risks: [],
      frameworks,
      controls,
      assessments: [],
      incidents: [],
      policies,
    };
  }

  function ensure() {
    let s = load();
    if (!s) { s = seedState(); save(s); }
    return s;
  }

  function reset() {
    localStorage.removeItem(KEY);
    return ensure();
  }

  function nextId(s, k) { s.seq[k] = (s.seq[k] || 0) + 1; return s.seq[k]; }

  // ---------------- AI Systems ----------------
  function listSystems() { return ensure().systems.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)); }

  function createSystem(payload) {
    const s = ensure();
    const item = {
      id: nextId(s, "system"),
      name: payload.name,
      description: payload.description || "",
      owner: payload.owner || "",
      business_unit: payload.business_unit || "",
      lifecycle_stage: payload.lifecycle_stage || "Development",
      purpose: payload.purpose || "",
      data_sources: payload.data_sources || "",
      model_type: payload.model_type || "",
      deployment_env: payload.deployment_env || "",
      risk_classification: payload.risk_classification || "Minimal",
      status: payload.status || "Active",
      created_at: now(),
      updated_at: now(),
    };
    s.systems.push(item);
    save(s);
    return item;
  }

  function updateSystem(id, payload) {
    const s = ensure();
    const item = s.systems.find((x) => x.id === id);
    if (!item) return null;
    Object.assign(item, payload, { updated_at: now() });
    save(s);
    return item;
  }

  function deleteSystem(id) {
    const s = ensure();
    s.systems = s.systems.filter((x) => x.id !== id);
    s.risks = s.risks.filter((x) => x.system_id !== id);
    s.incidents = s.incidents.filter((x) => x.system_id !== id);
    s.assessments = s.assessments.filter((x) => x.system_id !== id);
    save(s);
  }

  // ---------------- Risks ----------------
  function listRisks() {
    return ensure().risks.slice().sort((a, b) => b.inherent_score - a.inherent_score);
  }

  function createRisk(payload) {
    const s = ensure();
    const likelihood = Number(payload.likelihood) || 3;
    const impact = Number(payload.impact) || 3;
    const item = {
      id: nextId(s, "risk"),
      system_id: payload.system_id ? Number(payload.system_id) : null,
      title: payload.title,
      category: payload.category || "",
      description: payload.description || "",
      likelihood,
      impact,
      inherent_score: likelihood * impact,
      residual_score: likelihood * impact,
      mitigation: payload.mitigation || "",
      owner: payload.owner || "",
      status: payload.status || "Open",
      created_at: now(),
      updated_at: now(),
    };
    s.risks.push(item);
    save(s);
    return item;
  }

  function updateRisk(id, payload) {
    const s = ensure();
    const item = s.risks.find((x) => x.id === id);
    if (!item) return null;
    Object.assign(item, payload, { updated_at: now() });
    item.likelihood = Number(item.likelihood) || 1;
    item.impact = Number(item.impact) || 1;
    item.inherent_score = item.likelihood * item.impact;
    item.residual_score =
      item.status === "Mitigated" ? Math.max(1, Math.floor(item.inherent_score / 2)) : item.inherent_score;
    save(s);
    return item;
  }

  function deleteRisk(id) {
    const s = ensure();
    s.risks = s.risks.filter((x) => x.id !== id);
    save(s);
  }

  // ---------------- Frameworks / Controls / Assessments ----------------
  function listFrameworks() { return ensure().frameworks.slice(); }

  function controlsForFramework(code) {
    const s = ensure();
    const fw = s.frameworks.find((f) => f.code === code);
    if (!fw) return [];
    return s.controls
      .filter((c) => c.framework_id === fw.id)
      .sort((a, b) => a.ref_code.localeCompare(b.ref_code, undefined, { numeric: true }))
      .map((c) => {
        const a = s.assessments.find((x) => x.control_id === c.id && x.system_id == null);
        return { ...c, assessment: a || null };
      });
  }

  function upsertAssessment(payload) {
    const s = ensure();
    let a = s.assessments.find(
      (x) => x.control_id === payload.control_id && (x.system_id || null) == (payload.system_id || null)
    );
    if (!a) {
      a = {
        id: nextId(s, "assessment"),
        control_id: payload.control_id,
        system_id: payload.system_id || null,
        status: payload.status || "Not Assessed",
        maturity: Number(payload.maturity) || 0,
        evidence: payload.evidence || "",
        notes: payload.notes || "",
        owner: payload.owner || "",
        updated_at: now(),
      };
      s.assessments.push(a);
    } else {
      Object.assign(a, payload, { updated_at: now() });
      a.maturity = Number(a.maturity) || 0;
    }
    save(s);
    return a;
  }

  // ---------------- Incidents ----------------
  function listIncidents() {
    return ensure().incidents.slice().sort((a, b) => (b.occurred_at || "").localeCompare(a.occurred_at || ""));
  }

  function createIncident(payload) {
    const s = ensure();
    const item = {
      id: nextId(s, "incident"),
      system_id: payload.system_id ? Number(payload.system_id) : null,
      title: payload.title,
      description: payload.description || "",
      severity: payload.severity || "Low",
      status: payload.status || "Open",
      reported_by: payload.reported_by || "",
      occurred_at: payload.occurred_at || now(),
      resolved_at: payload.resolved_at || null,
      root_cause: payload.root_cause || "",
      corrective_action: payload.corrective_action || "",
      created_at: now(),
    };
    s.incidents.push(item);
    save(s);
    return item;
  }

  function updateIncident(id, payload) {
    const s = ensure();
    const item = s.incidents.find((x) => x.id === id);
    if (!item) return null;
    Object.assign(item, payload);
    save(s);
    return item;
  }

  function deleteIncident(id) {
    const s = ensure();
    s.incidents = s.incidents.filter((x) => x.id !== id);
    save(s);
  }

  // ---------------- Policies ----------------
  function listPolicies() { return ensure().policies.slice().sort((a, b) => a.name.localeCompare(b.name)); }

  function createPolicy(payload) {
    const s = ensure();
    const item = {
      id: nextId(s, "policy"),
      name: payload.name,
      version: payload.version || "1.0",
      owner: payload.owner || "",
      category: payload.category || "",
      content: payload.content || "",
      status: payload.status || "Draft",
      file_name: null, file_mime: null, file_size: null, file_data: null,
      created_at: now(),
      updated_at: now(),
    };
    s.policies.push(item);
    save(s);
    return item;
  }

  function updatePolicy(id, payload) {
    const s = ensure();
    const item = s.policies.find((x) => x.id === id);
    if (!item) return null;
    const fileFields = ["file_name", "file_mime", "file_size", "file_data"];
    for (const k of Object.keys(payload)) {
      if (fileFields.includes(k)) continue;
      item[k] = payload[k];
    }
    item.updated_at = now();
    save(s);
    return item;
  }

  function attachPolicyFile(id, fileMeta) {
    const s = ensure();
    const item = s.policies.find((x) => x.id === id);
    if (!item) return null;
    item.file_name = fileMeta.file_name;
    item.file_mime = fileMeta.file_mime;
    item.file_size = fileMeta.file_size;
    item.file_data = fileMeta.file_data; // data URL
    item.updated_at = now();
    save(s);
    return item;
  }

  function removePolicyFile(id) {
    const s = ensure();
    const item = s.policies.find((x) => x.id === id);
    if (!item) return null;
    item.file_name = null;
    item.file_mime = null;
    item.file_size = null;
    item.file_data = null;
    item.updated_at = now();
    save(s);
    return item;
  }

  function deletePolicy(id) {
    const s = ensure();
    s.policies = s.policies.filter((x) => x.id !== id);
    save(s);
  }

  // ---------------- Dashboard ----------------
  function dashboardSummary() {
    const s = ensure();
    const systems_by_risk = {};
    for (const sys of s.systems) {
      const k = sys.risk_classification || "Unspecified";
      systems_by_risk[k] = (systems_by_risk[k] || 0) + 1;
    }
    const risks_by_status = {};
    for (const r of s.risks) {
      const k = r.status || "Unknown";
      risks_by_status[k] = (risks_by_status[k] || 0) + 1;
    }
    const high_risks = s.risks.filter((r) => r.inherent_score >= 15).length;
    const open_incidents = s.incidents.filter((i) => i.status === "Open" || i.status === "Investigating").length;
    const total_policies = s.policies.length;
    const framework_compliance = s.frameworks.map((fw) => {
      const controls = s.controls.filter((c) => c.framework_id === fw.id);
      let implemented = 0, partial = 0, not_implemented = 0, not_assessed = 0, not_applicable = 0;
      for (const c of controls) {
        const a = s.assessments.find((x) => x.control_id === c.id && x.system_id == null);
        const st = a ? a.status : "Not Assessed";
        if (st === "Implemented") implemented++;
        else if (st === "Partial") partial++;
        else if (st === "Not Implemented") not_implemented++;
        else if (st === "Not Applicable") not_applicable++;
        else not_assessed++;
      }
      const applicable = controls.length - not_applicable;
      const compliance_percent =
        applicable > 0 ? Math.round(((implemented + 0.5 * partial) / applicable) * 1000) / 10 : 0;
      return {
        framework_code: fw.code,
        framework_name: fw.name,
        total_controls: controls.length,
        implemented, partial, not_implemented, not_assessed, not_applicable,
        compliance_percent,
      };
    });
    return {
      total_systems: s.systems.length,
      systems_by_risk,
      total_risks: s.risks.length,
      risks_by_status,
      high_risks,
      open_incidents,
      total_policies,
      framework_compliance,
    };
  }

  window.Store = {
    ensure, reset,
    listSystems, createSystem, updateSystem, deleteSystem,
    listRisks, createRisk, updateRisk, deleteRisk,
    listFrameworks, controlsForFramework, upsertAssessment,
    listIncidents, createIncident, updateIncident, deleteIncident,
    listPolicies, createPolicy, updatePolicy, attachPolicyFile, removePolicyFile, deletePolicy,
    dashboardSummary,
  };
})();
