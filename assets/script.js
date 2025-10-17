// assets/script.js
document.addEventListener("DOMContentLoaded", () => {
  const siteSelect = document.getElementById("siteSelect");
  const modulesContainer = document.getElementById("modulesContainer");
  const addRowBtn = document.getElementById("addRowBtn");
  const submitBtn = document.getElementById("submitBtn");
  const palletInput = document.getElementById("palletInput");
  const engineerName = document.getElementById("engineerName");
  const messageEl = document.getElementById("message");
  const logoInput = document.getElementById("logoInput");
  const logoPreview = document.getElementById("logoPreview");
  const clearRowsBtn = document.getElementById("clearRowsBtn");

  const MAX_ROWS = 10;
  let rowCount = 0;

  // logo preview client-side
  logoInput.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) {
      const url = URL.createObjectURL(f);
      logoPreview.src = url;
      logoPreview.style.display = "inline-block";
    } else {
      logoPreview.style.display = "none";
    }
  });

  // escape
  function escapeHtml(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // Show message
  function showMessage(text, type="info") {
    messageEl.style.display = "block";
    messageEl.className = "message";
    if (type === "success") messageEl.classList.add("success");
    else if (type === "error") messageEl.classList.add("error");
    else messageEl.classList.add("info");
    messageEl.textContent = text;
  }
  function hideMessage() { messageEl.style.display = "none"; }

  // load sites from Apps Script
  async function loadSites() {
    try {
      siteSelect.innerHTML = `<option value="">-- Loading sites --</option>`;
      const res = await fetch(WEB_APP_URL);
      const json = await res.json();
      if (json.error) {
        siteSelect.innerHTML = `<option value="">Error loading sites</option>`;
        showMessage("Failed to load sites: " + json.error, "error");
        return;
      }
      const sites = json.sites || [];
      if (sites.length === 0) {
        siteSelect.innerHTML = `<option value="">No sites found in Sheet</option>`;
        showMessage("No sites found in Sheet1. Add site names in column B (rows 2...).", "error");
      } else {
        siteSelect.innerHTML = `<option value="">-- Select site --</option>` + sites.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
        hideMessage();
      }
    } catch (err) {
      siteSelect.innerHTML = `<option value="">Failed to load sites</option>`;
      showMessage("Failed to load sites: " + err.message, "error");
      console.error("loadSites error:", err);
    }
  }

  // create module row
  function createModuleRow(pref={serial:"", damage:"", dateReceiving:""}) {
    if (rowCount >= MAX_ROWS) return;
    rowCount++;
    const row = document.createElement("div");
    row.className = "module-row";
    row.dataset.row = rowCount;

    const serialInput = document.createElement("input");
    serialInput.type = "text";
    serialInput.placeholder = "Module Serial No.";
    serialInput.value = pref.serial || "";

    const damageInput = document.createElement("input");
    damageInput.type = "text";
    damageInput.placeholder = "Damage Info (e.g., cracked corner)";
    damageInput.value = pref.damage || "";

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = pref.dateReceiving || "";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      const totalRows = modulesContainer.querySelectorAll(".module-row").length;
      if (totalRows > 1) {
        row.remove();
        rowCount--;
        updateAddButton();
      } else {
        showMessage("At least one module row must remain", "error");
      }
    });

    row.appendChild(serialInput);
    row.appendChild(damageInput);
    row.appendChild(dateInput);
    row.appendChild(removeBtn);

    modulesContainer.appendChild(row);
    updateAddButton();
  }

  function updateAddButton() {
    addRowBtn.style.display = (rowCount >= MAX_ROWS) ? "none" : "inline-block";
    const rows = modulesContainer.querySelectorAll(".module-row");
    rows.forEach(r => {
      const btn = r.querySelector(".remove-btn");
      if (rows.length <= 1) btn.style.visibility = "hidden";
      else btn.style.visibility = "visible";
    });
  }

  addRowBtn.addEventListener("click", () => createModuleRow({}));
  clearRowsBtn.addEventListener("click", () => {
    modulesContainer.innerHTML = "";
    rowCount = 0;
    createModuleRow({});
  });

  // submit handler
  submitBtn.addEventListener("click", async () => {
    hideMessage();
    const site = siteSelect.value;
    if (!site) return showMessage("Please select a site", "error");
    const pallet = palletInput.value.trim();
    if (!pallet) return showMessage("Please enter pallet number", "error");
    const engineer = engineerName.value.trim();
    if (!engineer) return showMessage("Please enter site engineer name", "error");

    const moduleRows = Array.from(modulesContainer.querySelectorAll(".module-row"));
    if (moduleRows.length === 0) return showMessage("No module rows found", "error");

    const modules = moduleRows.map(r => {
      const inputs = r.querySelectorAll("input");
      return {
        serial: inputs[0].value.trim(),
        damage: inputs[1].value.trim(),
        dateReceiving: inputs[2].value // '' or yyyy-mm-dd
      };
    });

    if (!modules.some(m => m.serial)) {
      return showMessage("Enter at least one module serial number", "error");
    }

    // disable UI while sending
    submitBtn.disabled = true;
    addRowBtn.disabled = true;
    showMessage("Submitting...", "info");

    try {
      const payload = { site, pallet, modules, engineer };
      const res = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (j.success) {
        showMessage("Data successfully submitted — Add more data", "success");
        // reset but keep site selected
        palletInput.value = "";
        engineerName.value = "";
        modulesContainer.innerHTML = "";
        rowCount = 0;
        createModuleRow({});
      } else {
        showMessage("Submission failed: " + (j.message || JSON.stringify(j)), "error");
        console.error("submit failed:", j);
      }
    } catch (err) {
      showMessage("Submission error: " + err.message, "error");
      console.error("submit error:", err);
    } finally {
      submitBtn.disabled = false;
      addRowBtn.disabled = false;
      updateAddButton();
    }
  });

  // init
  loadSites();
  createModuleRow({});
});
