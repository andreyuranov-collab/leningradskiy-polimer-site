function showFormMessage() {
  const message = document.getElementById("form-message");
  if (message) {
    message.textContent = "Форма пока в тестовом режиме. На следующем этапе подключим рабочую отправку заявки.";
  }
}

function money(value) {
  const rounded = Math.round(value);
  return new Intl.NumberFormat("ru-RU").format(rounded) + " руб.";
}

function numberValue(id) {
  const element = document.getElementById(id);
  if (!element) return 0;
  const value = parseFloat(String(element.value).replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function setBreakdown(values) {
  const breakdown = document.getElementById("breakdown");
  if (!breakdown) return;

  const rows = breakdown.querySelectorAll("div strong");
  const ordered = [
    values.materialCost,
    values.machineCost,
    values.prepCost,
    values.postCost,
    values.qcCost,
    values.energyCost,
    values.overheadCost,
    values.profit,
    values.vat
  ];

  rows.forEach((row, index) => {
    row.textContent = money(ordered[index] || 0);
  });
}

function calculatePrintCost() {
  const materialPrice = numberValue("materialPrice");
  const partWeight = numberValue("partWeight");
  const supportWeight = numberValue("supportWeight");
  const wasteWeight = numberValue("wasteWeight");
  const printHours = numberValue("printHours");
  const machineRate = numberValue("machineRate");
  const prepMinutes = numberValue("prepMinutes");
  const laborRate = numberValue("laborRate");
  const postMinutes = numberValue("postMinutes");
  const qcMinutes = numberValue("qcMinutes");
  const powerKw = numberValue("powerKw");
  const energyRate = numberValue("energyRate");
  const overheadPercent = numberValue("overheadPercent");
  const profitPercent = numberValue("profitPercent");
  const vatPercent = numberValue("vatPercent");
  const minOrder = numberValue("minOrder");

  const totalWeightGrams = partWeight + supportWeight + wasteWeight;
  const materialCost = (totalWeightGrams / 1000) * materialPrice;
  const machineCost = printHours * machineRate;
  const prepCost = (prepMinutes / 60) * laborRate;
  const postCost = (postMinutes / 60) * laborRate;
  const qcCost = (qcMinutes / 60) * laborRate;
  const energyCost = printHours * powerKw * energyRate;

  const directCost = materialCost + machineCost + prepCost + postCost + qcCost + energyCost;
  const overheadCost = directCost * overheadPercent / 100;
  const baseCost = directCost + overheadCost;
  const profit = baseCost * profitPercent / 100;
  const priceNoVatRaw = baseCost + profit;
  const priceNoVat = Math.max(priceNoVatRaw, minOrder);
  const vat = priceNoVat * vatPercent / 100;
  const priceWithVat = priceNoVat + vat;

  const values = {
    materialCost,
    machineCost,
    prepCost,
    postCost,
    qcCost,
    energyCost,
    overheadCost,
    baseCost,
    profit,
    priceNoVat,
    vat,
    priceWithVat
  };

  document.getElementById("totalPrice").textContent = money(priceWithVat);
  document.getElementById("resultNote").textContent =
    priceNoVatRaw < minOrder
      ? "Применена минимальная стоимость заказа."
      : "Предварительная оценка. Итоговая цена уточняется после проверки модели или G-code.";

  document.getElementById("totalWeight").textContent = totalWeightGrams.toFixed(0) + " г";
  document.getElementById("baseCost").textContent = money(baseCost);
  document.getElementById("priceNoVat").textContent = money(priceNoVat);
  document.getElementById("priceWithVat").textContent = money(priceWithVat);

  setBreakdown(values);
}

function syncMaterialPrice() {
  const select = document.getElementById("material");
  const input = document.getElementById("materialPrice");
  if (!select || !input) return;

  const selected = select.options[select.selectedIndex];
  const price = Number(selected.dataset.price || 0);
  if (price > 0) {
    input.value = price;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const calculateBtn = document.getElementById("calculateBtn");
  const material = document.getElementById("material");
  const resetBtn = document.getElementById("resetBtn");

  if (material) {
    material.addEventListener("change", () => {
      syncMaterialPrice();
      calculatePrintCost();
    });
  }

  if (calculateBtn) {
    calculateBtn.addEventListener("click", calculatePrintCost);
    calculatePrintCost();
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      setTimeout(() => {
        syncMaterialPrice();
        calculatePrintCost();
      }, 0);
    });
  }

  const calcInputs = document.querySelectorAll("#printCalc input, #printCalc select");
  calcInputs.forEach((input) => {
    input.addEventListener("input", calculatePrintCost);
  });
});
