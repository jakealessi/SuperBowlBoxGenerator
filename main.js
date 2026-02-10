function $(selector) {
  return document.querySelector(selector);
}

const participantsEl = $("#participants");
const addParticipantBtn = $("#add-participant");
const totalBoxesEl = $("#total-boxes");
const fillRemainingBtn = $("#fill-remaining");
const teamTopEl = $("#team-top");
const teamLeftEl = $("#team-left");
const boxPriceEl = $("#box-price");
const payoutSplitEl = $("#payout-split");
const useVigEl = $("#use-vig");
const vigOptionsEl = $("#vig-options");
const vigPercentEl = $("#vig-percent");
const totalPotEl = $("#total-pot");
const vigAmountEl = $("#vig-amount");
const payoutPoolEl = $("#payout-pool");
const generateGridBtn = $("#generate-grid");
const generateHintEl = $("#generate-hint");
const gridContainerEl = $("#grid-container");
const payoutListEl = $("#payout-list");
const toggleCleanViewBtn = $("#toggle-clean-view");
const customQ1El = $("#custom-q1");
const customQ2El = $("#custom-q2");
const customQ3El = $("#custom-q3");
const customQ4El = $("#custom-q4");
const applyCustomSplitBtn = $("#apply-custom-split");
const customSplitHintEl = $("#custom-split-hint");

const STORAGE_KEYS = {
  config: "sbbox.config.v1",
  grid: "sbbox.grid.v1",
};

let lastConfigString = null;

// Soft, slightly brighter colors per participant (still readable on dark theme)
const PARTICIPANT_COLORS = [
  "#60a5fa", // soft blue
  "#a78bfa", // soft purple
  "#34d399", // emerald
  "#fbbf24", // amber
  "#fb7185", // soft red
  "#22c55e", // green
  "#38bdf8", // cyan
  "#e879f9", // pink
  "#f97316", // orange
  "#4ade80", // light green
  "#2dd4bf", // teal
  "#facc15", // yellow
  "#c4b5fd", // lavender
  "#f472b6", // rose
  "#93c5fd", // light blue
  "#a3e635", // lime
  "#fda4af", // light red
  "#67e8f9", // light cyan
  "#bef264", // lighter lime
  "#ddd6fe", // pale lavender
];

function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

function getColorForName(name, nameToIndex) {
  const idx = nameToIndex.get(name) ?? 0;
  return PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length];
}

function addParticipantRow(name = "", count = 0) {
  const row = document.createElement("div");
  row.className = "participant-row";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Name";
  nameInput.value = name;

  const countInput = document.createElement("input");
  countInput.type = "number";
  countInput.min = "0";
  countInput.max = "100";
  countInput.step = "1";
  countInput.value = count || "";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove";
  removeBtn.textContent = "Remove";

  function onChange() {
    recalcTotals();
  }

  nameInput.addEventListener("input", onChange);
  countInput.addEventListener("input", onChange);
  removeBtn.addEventListener("click", () => {
    row.remove();
    recalcTotals();
  });

  row.appendChild(nameInput);
  row.appendChild(countInput);
  row.appendChild(removeBtn);

  participantsEl.appendChild(row);
}

function getParticipantRowsForSave() {
  const rows = Array.from(participantsEl.querySelectorAll(".participant-row"));
  return rows
    .map((row) => {
      const [nameInput, countInput] = row.querySelectorAll("input");
      const name = (nameInput.value || "").trim();
      const count = parseInt(countInput.value || "0", 10) || 0;
      return { name, count };
    })
    .filter((p) => p.name || p.count);
}

function getParticipants() {
  const rows = Array.from(participantsEl.querySelectorAll(".participant-row"));
  const result = [];
  for (const row of rows) {
    const [nameInput, countInput] = row.querySelectorAll("input");
    const name = nameInput.value.trim();
    const count = parseInt(countInput.value || "0", 10);
    if (!name || !count) continue;
    result.push({ name, count });
  }
  return result;
}

function getConfigForSave() {
  return {
    participants: getParticipantRowsForSave(),
    teamTop: (teamTopEl && teamTopEl.value) || "",
    teamLeft: (teamLeftEl && teamLeftEl.value) || "",
    boxPrice: (boxPriceEl && boxPriceEl.value) || "",
    payoutSplit: (payoutSplitEl && payoutSplitEl.value) || "",
    useVig: !!(useVigEl && useVigEl.checked),
    vigPercent: (vigPercentEl && vigPercentEl.value) || "",
    customSplitInputs: {
      q1: (customQ1El && customQ1El.value) || "",
      q2: (customQ2El && customQ2El.value) || "",
      q3: (customQ3El && customQ3El.value) || "",
      q4: (customQ4El && customQ4El.value) || "",
    },
  };
}

function saveConfigToStorage() {
  const config = getConfigForSave();
  const configString = JSON.stringify(config);

  // If the config changed since last save, invalidate stored grid
  if (lastConfigString && lastConfigString !== configString) {
    localStorage.removeItem(STORAGE_KEYS.grid);
  }
  lastConfigString = configString;

  localStorage.setItem(STORAGE_KEYS.config, configString);
}

function saveGridToStorage(gridState) {
  const payload = {
    configString: lastConfigString || JSON.stringify(getConfigForSave()),
    gridState,
    savedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEYS.grid, JSON.stringify(payload));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEYS.config);
  if (!raw) return false;

  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    return false;
  }

  // Rebuild participant rows
  participantsEl.innerHTML = "";
  const participants = Array.isArray(config.participants) ? config.participants : [];
  if (participants.length) {
    participants.forEach((p) => addParticipantRow(p.name || "", p.count || 0));
  } else {
    addParticipantRow();
  }

  if (teamTopEl) teamTopEl.value = config.teamTop || "";
  if (teamLeftEl) teamLeftEl.value = config.teamLeft || "";
  if (boxPriceEl) boxPriceEl.value = config.boxPrice || "10";

  // Restore payout split (if not found, add as custom)
  if (payoutSplitEl && config.payoutSplit) {
    const existing = Array.from(payoutSplitEl.options).find((o) => o.value === config.payoutSplit);
    if (existing) {
      payoutSplitEl.value = config.payoutSplit;
    } else if (/^\d+(\.\d+)?,\d+(\.\d+)?,\d+(\.\d+)?,\d+(\.\d+)?$/.test(config.payoutSplit)) {
      const [q1, q2, q3, q4] = config.payoutSplit.split(",").map((n) => parseFloat(n));
      const option = document.createElement("option");
      option.value = config.payoutSplit;
      option.textContent = `Custom: Q1 ${q1}% / Q2 ${q2}% / Q3 ${q3}% / Final ${q4}%`;
      option.dataset.custom = "true";
      payoutSplitEl.appendChild(option);
      payoutSplitEl.value = config.payoutSplit;
    }
  }

  if (useVigEl) useVigEl.checked = !!config.useVig;
  if (vigPercentEl) vigPercentEl.value = config.vigPercent || "0";
  if (vigOptionsEl) {
    if (useVigEl && useVigEl.checked) vigOptionsEl.classList.add("visible");
    else vigOptionsEl.classList.remove("visible");
  }

  // Restore custom split input fields (even if not applied)
  if (config.customSplitInputs) {
    if (customQ1El) customQ1El.value = config.customSplitInputs.q1 || "";
    if (customQ2El) customQ2El.value = config.customSplitInputs.q2 || "";
    if (customQ3El) customQ3El.value = config.customSplitInputs.q3 || "";
    if (customQ4El) customQ4El.value = config.customSplitInputs.q4 || "";
  }

  lastConfigString = JSON.stringify(getConfigForSave());
  return true;
}

function recalcTotals() {
  const participants = getParticipants();
  const totalBoxes = participants.reduce((sum, p) => sum + p.count, 0);
  totalBoxesEl.textContent = `${totalBoxes} / 100`;

  const boxPrice = parseFloat(boxPriceEl.value || "0");
  const totalPot = boxPrice * totalBoxes;
  totalPotEl.textContent = formatCurrency(totalPot);

  const useVig = useVigEl.checked;
  let vigAmount = 0;
  if (useVig) {
    const vigPercent = Math.max(0, Math.min(50, parseFloat(vigPercentEl.value || "0")));
    vigAmount = (vigPercent / 100) * totalPot;
  }

  const payoutPool = Math.max(0, totalPot - vigAmount);
  vigAmountEl.textContent = formatCurrency(vigAmount);
  payoutPoolEl.textContent = formatCurrency(payoutPool);

  generateGridBtn.disabled = totalBoxes !== 100 || payoutPool === 0;
  generatePayoutsList(payoutPool);

  // Validation styling & hint
  if (totalBoxes !== 100) {
    totalBoxesEl.classList.add("warning");
  } else {
    totalBoxesEl.classList.remove("warning");
  }

  if (generateHintEl) {
    if (totalBoxes !== 100) {
      generateHintEl.textContent = "Assign exactly 100 boxes to enable generation.";
    } else if (payoutPool === 0) {
      generateHintEl.textContent = "Set a box price above $0.00 to create a payout pool.";
    } else {
      generateHintEl.textContent = "";
    }
  }

  // Persist current state
  try {
    saveConfigToStorage();
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

function applyCustomSplit() {
  if (!customQ1El || !customQ2El || !customQ3El || !customQ4El) return;

  const q1 = parseFloat(customQ1El.value || "0");
  const q2 = parseFloat(customQ2El.value || "0");
  const q3 = parseFloat(customQ3El.value || "0");
  const q4 = parseFloat(customQ4El.value || "0");
  const total = q1 + q2 + q3 + q4;

  if (Number.isNaN(total) || total !== 100) {
    if (customSplitHintEl) {
      customSplitHintEl.textContent = "Custom split must add up to exactly 100%.";
      customSplitHintEl.classList.add("error");
    }
    return;
  }

  const value = `${q1},${q2},${q3},${q4}`;

  // Remove any previous custom option
  const options = Array.from(payoutSplitEl.options);
  options.forEach((opt) => {
    if (opt.dataset && opt.dataset.custom === "true") {
      opt.remove();
    }
  });

  let option = options.find((opt) => opt.value === value);
  if (!option) {
    option = document.createElement("option");
    option.value = value;
    option.textContent = `Custom: Q1 ${q1}% / Q2 ${q2}% / Q3 ${q3}% / Final ${q4}%`;
    option.dataset.custom = "true";
    payoutSplitEl.appendChild(option);
  }

  payoutSplitEl.value = value;

  if (customSplitHintEl) {
    customSplitHintEl.textContent = "Custom split applied.";
    customSplitHintEl.classList.remove("error");
  }

  recalcTotals();
}

function generatePayoutsList(payoutPool) {
  payoutListEl.innerHTML = "";
  const splitValues = payoutSplitEl.value.split(",").map((v) => parseFloat(v));
  const labels = ["Q1", "Q2", "Q3", "Final"];

  splitValues.forEach((percent, idx) => {
    if (percent <= 0) return;
    const amount = (percent / 100) * payoutPool;

    const li = document.createElement("li");
    const labelSpan = document.createElement("span");
    labelSpan.textContent = `${labels[idx]} (${percent}%):`;
    const amountSpan = document.createElement("span");
    amountSpan.textContent = formatCurrency(amount);
    li.appendChild(labelSpan);
    li.appendChild(amountSpan);
    payoutListEl.appendChild(li);
  });
}

function randomShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildBoxAssignments() {
  const participants = getParticipants();
  const totalBoxes = participants.reduce((sum, p) => sum + p.count, 0);
  if (totalBoxes !== 100) {
    alert("You must assign exactly 100 boxes in total.");
    return null;
  }

  const pool = [];
  participants.forEach((p) => {
    for (let i = 0; i < p.count; i++) {
      pool.push(p.name);
    }
  });

  randomShuffle(pool);
  return pool;
}

function generateNumbers() {
  const nums = Array.from({ length: 10 }, (_, i) => i);
  return randomShuffle(nums);
}

function getPayoutSummary(payoutPool) {
  const splitValues = payoutSplitEl.value.split(",").map((v) => parseFloat(v));
  const labels = ["Q1", "Q2", "Q3", "Final"];
  const lines = [];
  splitValues.forEach((percent, idx) => {
    if (percent <= 0) return;
    const amount = (percent / 100) * payoutPool;
    lines.push({ label: `${labels[idx]} (${percent}%)`, amount });
  });
  return lines;
}

function generateGrid() {
  const assignments = buildBoxAssignments();
  if (!assignments) return;

  const participants = getParticipants();
  const nameToIndex = new Map();
  let idx = 0;
  participants.forEach((p) => {
    if (!nameToIndex.has(p.name)) nameToIndex.set(p.name, idx++);
  });

  const topNumbers = generateNumbers();
  const sideNumbers = generateNumbers();
  const teamTop = (teamTopEl && teamTopEl.value.trim()) || "Team (top)";
  const teamLeft = (teamLeftEl && teamLeftEl.value.trim()) || "Team (left)";

  gridContainerEl.innerHTML = "";

  const caption = document.createElement("div");
  caption.className = "grid-caption";
  caption.textContent = "Numbers are randomly shuffled 0–9 for each team.";
  gridContainerEl.appendChild(caption);

  const table = document.createElement("table");
  table.className = "grid";

  const thead = document.createElement("thead");
  const teamTopRow = document.createElement("tr");
  const teamTopCell = document.createElement("th");
  teamTopCell.className = "team-top-label";
  teamTopCell.colSpan = 11;
  teamTopCell.textContent = teamTop;
  teamTopRow.appendChild(teamTopCell);
  thead.appendChild(teamTopRow);

  const headerRow = document.createElement("tr");
  const cornerTh = document.createElement("th");
  cornerTh.className = "team-left-label";
  cornerTh.textContent = teamLeft;
  headerRow.appendChild(cornerTh);

  topNumbers.forEach((n) => {
    const th = document.createElement("th");
    th.className = "top-numbers";
    th.textContent = n;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let assignmentIndex = 0;

  sideNumbers.forEach((sideNum) => {
    const row = document.createElement("tr");

    const labelCell = document.createElement("th");
    labelCell.className = "side-numbers";
    labelCell.textContent = sideNum;
    row.appendChild(labelCell);

    topNumbers.forEach((topNum) => {
      const cell = document.createElement("td");
      cell.className = "square";
      const owner = assignments[assignmentIndex++];
      const bg = owner ? getColorForName(owner, nameToIndex) : "";
      if (bg) {
        cell.style.backgroundColor = bg;
        cell.style.color = "#0f172a";
        cell.style.borderColor = "rgba(15, 23, 42, 0.4)";
      }

      const nameSpan = document.createElement("span");
      nameSpan.textContent = owner || "";

      const metaSpan = document.createElement("span");
      metaSpan.className = "meta";
      metaSpan.textContent = `${topNum}-${sideNum}`;
      if (bg) metaSpan.style.color = "rgba(15, 23, 42, 0.75)";

      cell.appendChild(nameSpan);
      cell.appendChild(metaSpan);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  gridContainerEl.appendChild(table);

  // Summary below grid: payout amount and all info except vig
  const boxPrice = parseFloat(boxPriceEl.value || "0");
  const totalPot = 100 * boxPrice;
  const useVig = useVigEl.checked;
  let vigAmount = 0;
  if (useVig) {
    const vigPercent = Math.max(0, Math.min(50, parseFloat(vigPercentEl.value || "0")));
    vigAmount = (vigPercent / 100) * totalPot;
  }
  const payoutPool = Math.max(0, totalPot - vigAmount);
  const payoutLines = getPayoutSummary(payoutPool);
  const splitLabel = payoutSplitEl.options[payoutSplitEl.selectedIndex].textContent;

  const summary = document.createElement("div");
  summary.className = "grid-summary";
  summary.innerHTML = `
    <div class="grid-summary-row"><span>Box price</span><span>${formatCurrency(boxPrice)}</span></div>
    <div class="grid-summary-row"><span>Total pot</span><span>${formatCurrency(totalPot)}</span></div>
    <div class="grid-summary-row"><span>Payout split</span><span>${splitLabel}</span></div>
    <div class="grid-summary-payouts">
      ${payoutLines.map((l) => `<div class="grid-summary-row"><span>${l.label}</span><span>${formatCurrency(l.amount)}</span></div>`).join("")}
    </div>
  `;
  gridContainerEl.appendChild(summary);

  // Save last generated grid (restorable if config matches)
  try {
    saveGridToStorage({ topNumbers, sideNumbers, assignments, teamTop, teamLeft });
  } catch {
    // ignore storage failures
  }
}

addParticipantBtn.addEventListener("click", () => {
  addParticipantRow();
  recalcTotals();
});

if (fillRemainingBtn) {
  fillRemainingBtn.addEventListener("click", () => {
    const participants = getParticipants();
    if (!participants.length) {
      alert("Add at least one participant before filling remaining boxes.");
      return;
    }

    const totalBoxes = participants.reduce((sum, p) => sum + p.count, 0);
    if (totalBoxes >= 100) {
      alert("There are already 100 (or more) boxes assigned.");
      return;
    }

    const remaining = 100 - totalBoxes;

    // Find the last row with a non-empty name input
    const rows = Array.from(participantsEl.querySelectorAll(".participant-row"));
    for (let i = rows.length - 1; i >= 0; i--) {
      const [nameInput, countInput] = rows[i].querySelectorAll("input");
      if (nameInput.value.trim()) {
        const current = parseInt(countInput.value || "0", 10);
        countInput.value = String(current + remaining);
        break;
      }
    }

    recalcTotals();
  });
}

boxPriceEl.addEventListener("input", recalcTotals);
payoutSplitEl.addEventListener("change", () => {
  recalcTotals();
});

if (teamTopEl) teamTopEl.addEventListener("input", recalcTotals);
if (teamLeftEl) teamLeftEl.addEventListener("input", recalcTotals);

useVigEl.addEventListener("change", () => {
  const enabled = useVigEl.checked;
  if (enabled) {
    vigOptionsEl.classList.add("visible");
  } else {
    vigOptionsEl.classList.remove("visible");
  }
  recalcTotals();
});

vigPercentEl.addEventListener("input", recalcTotals);

generateGridBtn.addEventListener("click", () => {
  if (!confirm("Generate a new grid? This will randomize all box assignments and numbers.")) return;
  generateGrid();
});

if (toggleCleanViewBtn) {
  toggleCleanViewBtn.addEventListener("click", () => {
    document.body.classList.toggle("clean-view");
  });
}

if (applyCustomSplitBtn) {
  applyCustomSplitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    applyCustomSplit();
  });
}

const loaded = loadFromStorage();
if (!loaded) {
  addParticipantRow("Alice", 25);
  addParticipantRow("Bob", 25);
  addParticipantRow("Charlie", 25);
  addParticipantRow("Dan", 25);
}
recalcTotals();

// If a saved grid exists for this config, restore it
try {
  const gridRaw = localStorage.getItem(STORAGE_KEYS.grid);
  if (gridRaw) {
    const payload = JSON.parse(gridRaw);
    if (payload && payload.configString === lastConfigString && payload.gridState) {
      // Re-render using the saved state by temporarily calling generateGrid's renderer path:
      // We'll mimic a generation by injecting the saved numbers/assignments.
      const state = payload.gridState;

      // Build colors map from current participants
      const participants = getParticipants();
      const nameToIndex = new Map();
      let idx = 0;
      participants.forEach((p) => {
        if (!nameToIndex.has(p.name)) nameToIndex.set(p.name, idx++);
      });

      gridContainerEl.innerHTML = "";

      const caption = document.createElement("div");
      caption.className = "grid-caption";
      caption.textContent = "Numbers are randomly shuffled 0–9 for each team.";
      gridContainerEl.appendChild(caption);

      const table = document.createElement("table");
      table.className = "grid";

      const thead = document.createElement("thead");
      const teamTopRow = document.createElement("tr");
      const teamTopCell = document.createElement("th");
      teamTopCell.className = "team-top-label";
      teamTopCell.colSpan = 11;
      teamTopCell.textContent = state.teamTop || ((teamTopEl && teamTopEl.value.trim()) || "Team (top)");
      teamTopRow.appendChild(teamTopCell);
      thead.appendChild(teamTopRow);

      const headerRow = document.createElement("tr");
      const cornerTh = document.createElement("th");
      cornerTh.className = "team-left-label";
      cornerTh.textContent = state.teamLeft || ((teamLeftEl && teamLeftEl.value.trim()) || "Team (left)");
      headerRow.appendChild(cornerTh);

      state.topNumbers.forEach((n) => {
        const th = document.createElement("th");
        th.className = "top-numbers";
        th.textContent = n;
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      let assignmentIndex = 0;

      state.sideNumbers.forEach((sideNum) => {
        const row = document.createElement("tr");

        const labelCell = document.createElement("th");
        labelCell.className = "side-numbers";
        labelCell.textContent = sideNum;
        row.appendChild(labelCell);

        state.topNumbers.forEach((topNum) => {
          const cell = document.createElement("td");
          cell.className = "square";
          const owner = state.assignments[assignmentIndex++];
          const bg = owner ? getColorForName(owner, nameToIndex) : "";
          if (bg) {
            cell.style.backgroundColor = bg;
            cell.style.color = "#0f172a";
            cell.style.borderColor = "rgba(15, 23, 42, 0.4)";
          }

          const nameSpan = document.createElement("span");
          nameSpan.textContent = owner || "";

          const metaSpan = document.createElement("span");
          metaSpan.className = "meta";
          metaSpan.textContent = `${topNum}-${sideNum}`;
          if (bg) metaSpan.style.color = "rgba(15, 23, 42, 0.75)";

          cell.appendChild(nameSpan);
          cell.appendChild(metaSpan);
          row.appendChild(cell);
        });

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      gridContainerEl.appendChild(table);

      // Summary below grid: payout amount and all info except vig
      const boxPrice = parseFloat(boxPriceEl.value || "0");
      const totalPot = 100 * boxPrice;
      const useVig = useVigEl.checked;
      let vigAmount = 0;
      if (useVig) {
        const vigPercent = Math.max(0, Math.min(50, parseFloat(vigPercentEl.value || "0")));
        vigAmount = (vigPercent / 100) * totalPot;
      }
      const payoutPool = Math.max(0, totalPot - vigAmount);
      const payoutLines = getPayoutSummary(payoutPool);
      const splitLabel = payoutSplitEl.options[payoutSplitEl.selectedIndex].textContent;

      const summary = document.createElement("div");
      summary.className = "grid-summary";
      summary.innerHTML = `
        <div class="grid-summary-row"><span>Box price</span><span>${formatCurrency(boxPrice)}</span></div>
        <div class="grid-summary-row"><span>Total pot</span><span>${formatCurrency(totalPot)}</span></div>
        <div class="grid-summary-row"><span>Payout split</span><span>${splitLabel}</span></div>
        <div class="grid-summary-payouts">
          ${payoutLines.map((l) => `<div class="grid-summary-row"><span>${l.label}</span><span>${formatCurrency(l.amount)}</span></div>`).join("")}
        </div>
      `;
      gridContainerEl.appendChild(summary);
    }
  }
} catch {
  // ignore restore failures
}

