function $(selector) {
  return document.querySelector(selector);
}

const participantsEl = $("#participants");
const addParticipantBtn = $("#add-participant");
const totalBoxesEl = $("#total-boxes");
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
const gridContainerEl = $("#grid-container");
const payoutListEl = $("#payout-list");

// Neutral, muted colors per participant (readable on dark theme)
const PARTICIPANT_COLORS = [
  "#94a3b8", "#a8b5a0", "#b5a894", "#a894b5", "#94b5a8",
  "#b594a8", "#a8a894", "#94a8b5", "#b5a8a8", "#a8b594",
  "#b59494", "#9494b5", "#94b594", "#b5b594", "#a89494",
  "#94b5b5", "#b594b5", "#9494a8", "#b5a8b5", "#9ca3af",
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
}

addParticipantBtn.addEventListener("click", () => {
  addParticipantRow();
  recalcTotals();
});

boxPriceEl.addEventListener("input", recalcTotals);
payoutSplitEl.addEventListener("change", () => {
  recalcTotals();
});

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

addParticipantRow("Alice", 25);
addParticipantRow("Bob", 25);
addParticipantRow("Charlie", 25);
addParticipantRow("Dan", 25);
recalcTotals();

