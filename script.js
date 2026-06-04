function showFormMessage() {
  const msg = document.getElementById("form-message");
  if (msg) msg.textContent = "Запрос пока не отправляется: форма работает в тестовом режиме.";
}

function rub(value) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value || 0)) + " ₽";
}
function val(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const n = parseFloat(String(el.value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function setVal(id, value) {
  const el = document.getElementById(id);
  if (el && value !== null && value !== undefined && Number.isFinite(value)) el.value = value;
}

const MATERIALS = {
  PLA: { price: 1200, density: 1.24 },
  PETG: { price: 1500, density: 1.27 },
  ABS: { price: 1600, density: 1.04 },
  TPU: { price: 2200, density: 1.21 },
  PA: { price: 3200, density: 1.14 },
  PC: { price: 3800, density: 1.20 },
  Composite: { price: 4500, density: 1.30 }
};

function secondsFromText(text) {
  const patterns = [
    /;?\s*TIME\s*:\s*(\d+)/i,
    /estimated printing time.*?(\d+)h\s*(\d+)m/i,
    /estimated printing time.*?(\d+)\s*hours?\s*(\d+)\s*minutes?/i,
    /print time.*?(\d+)h\s*(\d+)m/i
  ];
  let m = text.match(patterns[0]);
  if (m) return parseInt(m[1], 10);
  for (let i = 1; i < patterns.length; i++) {
    m = text.match(patterns[i]);
    if (m) return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60;
  }
  return null;
}

function gramsFromComments(text) {
  const patterns = [
    /filament used.*?\[g\]\s*=\s*([\d.,]+)/i,
    /total filament used.*?([\d.,]+)\s*g/i,
    /filament_weight_mg\s*=\s*([\d.,]+)/i,
    /filament weight.*?([\d.,]+)\s*g/i
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      let v = parseFloat(m[1].replace(",", "."));
      if (p.source.includes("filament_weight_mg")) v = v / 1000;
      if (Number.isFinite(v) && v > 0) return v;
    }
  }
  const cm3 = text.match(/filament used.*?\[cm3\]\s*=\s*([\d.,]+)/i);
  if (cm3) {
    const material = document.getElementById("material")?.value || "PLA";
    const density = MATERIALS[material]?.density || 1.24;
    const v = parseFloat(cm3[1].replace(",", "."));
    if (Number.isFinite(v)) return v * density;
  }
  return null;
}

function estimateExtrusionLengthMm(text) {
  const lines = text.split(/\r?\n/);
  let absolute = true;
  let lastE = 0;
  let totalE = 0;

  for (const raw of lines) {
    const line = raw.split(";")[0].trim();
    if (!line) continue;
    if (/\bM82\b/.test(line)) { absolute = true; continue; }
    if (/\bM83\b/.test(line)) { absolute = false; continue; }
    if (/\bG92\b/.test(line) && /\bE[-+]?\d/.test(line)) {
      const m = line.match(/\bE([-+]?\d*\.?\d+)/);
      if (m) lastE = parseFloat(m[1]);
      continue;
    }
    if (!/^(G0|G1)\b/.test(line) || !/\bE[-+]?\d/.test(line)) continue;
    const m = line.match(/\bE([-+]?\d*\.?\d+)/);
    if (!m) continue;
    const e = parseFloat(m[1]);
    if (!Number.isFinite(e)) continue;
    if (absolute) {
      const d = e - lastE;
      if (d > 0 && d < 200) totalE += d;
      lastE = e;
    } else {
      if (e > 0 && e < 200) totalE += e;
    }
  }
  return totalE > 0 ? totalE : null;
}

function gramsFromExtrusion(text) {
  const length = estimateExtrusionLengthMm(text);
  if (!length) return null;
  const diameter = val("filamentDiameter") || 1.75;
  const material = document.getElementById("material")?.value || "PLA";
  const density = MATERIALS[material]?.density || 1.24;
  const radius = diameter / 2;
  const volumeMm3 = Math.PI * radius * radius * length;
  const volumeCm3 = volumeMm3 / 1000;
  return volumeCm3 * density;
}

function parseGcode(text, fileName) {
  const seconds = secondsFromText(text);
  const grams = gramsFromComments(text) ?? gramsFromExtrusion(text);
  if (seconds) setVal("printHours", Math.round((seconds / 3600) * 10) / 10);
  if (grams) setVal("partWeight", Math.round(grams * 10) / 10);

  const info = document.getElementById("fileInfo");
  if (info) {
    const found = [];
    if (grams) found.push(`масса: ${Math.round(grams * 10) / 10} г`);
    if (seconds) found.push(`время: ${Math.round(seconds / 60)} мин`);
    info.textContent = `${fileName}: ${found.length ? found.join(", ") : "параметры не найдены, заполните вручную"}`;
  }
  calculate();
}

function calculate() {
  const material = document.getElementById("material")?.value || "PLA";
  const materialPrice = val("materialPrice");
  const partWeight = val("partWeight");
  const extraWeight = val("extraWeight");
  const printHours = val("printHours");
  const machineRate = val("machineRate");
  const prepMinutes = val("prepMinutes");
  const postMinutes = val("postMinutes");
  const qcMinutes = val("qcMinutes");
  const laborRate = val("laborRate");
  const powerKw = val("powerKw");
  const energyRate = val("energyRate");
  const overhead = val("overheadPercent");
  const profit = val("profitPercent");
  const vat = val("vatPercent");
  const minOrder = val("minOrder");

  const totalWeight = partWeight + extraWeight;
  const materialCost = totalWeight / 1000 * materialPrice;
  const machineCost = printHours * machineRate;
  const prepCost = prepMinutes / 60 * laborRate;
  const postCost = postMinutes / 60 * laborRate;
  const qcCost = qcMinutes / 60 * laborRate;
  const energyCost = printHours * powerKw * energyRate;
  const direct = materialCost + machineCost + prepCost + postCost + qcCost + energyCost;
  const overheadCost = direct * overhead / 100;
  const base = direct + overheadCost;
  const profitCost = base * profit / 100;
  const noVatRaw = base + profitCost;
  const noVat = Math.max(noVatRaw, minOrder);
  const vatCost = noVat * vat / 100;
  const total = noVat + vatCost;

  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set("totalPrice", rub(total));
  set("materialCost", rub(materialCost));
  set("machineCost", rub(machineCost));
  set("prepCost", rub(prepCost));
  set("postCost", rub(postCost));
  set("qcCost", rub(qcCost));
  set("energyCost", rub(energyCost));
  set("overheadCost", rub(overheadCost));
  set("profitCost", rub(profitCost));
  set("vatCost", rub(vatCost));
  set("totalWeight", Math.round(totalWeight * 10) / 10 + " г");
  set("baseCost", rub(base));
  set("priceNoVat", rub(noVat));
  set("resultNote", noVatRaw < minOrder ? "Применена минимальная стоимость заказа." : "Предварительная оценка по введённым параметрам.");
}

document.addEventListener("DOMContentLoaded", () => {
  const material = document.getElementById("material");
  const materialPrice = document.getElementById("materialPrice");
  if (material && materialPrice) {
    material.addEventListener("change", () => {
      materialPrice.value = MATERIALS[material.value]?.price || materialPrice.value;
      calculate();
    });
  }

  const inputs = document.querySelectorAll(".calc-page input, .calc-page select");
  inputs.forEach(i => i.addEventListener("input", calculate));

  const fileInput = document.getElementById("gcodeFile");
  const zone = document.getElementById("uploadZone");
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => parseGcode(String(reader.result || ""), file.name);
    reader.readAsText(file);
  };
  if (fileInput) fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
  if (zone) {
    zone.addEventListener("click", () => fileInput?.click());
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      handleFile(e.dataTransfer.files[0]);
    });
  }
  if (document.getElementById("totalPrice")) calculate();
});
