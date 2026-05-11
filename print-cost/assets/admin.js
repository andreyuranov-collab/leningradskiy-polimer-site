const CONFIG_KEY = 'lp_print_cost_admin_config_v1';
let db = null;
const $ = (id) => document.getElementById(id);
const num = (v) => Number(String(v ?? 0).replace(',', '.')) || 0;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

async function loadDb(){
  const base = await fetch('./data/defaults.json').then(r => r.json());
  try { db = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null') || base; }
  catch { db = base; }
}
function setRuleInputs(){
  ['electricity_rate','operator_rate','commercial_coef','min_order_fdm','vat_rate'].forEach(k => {
    const el = $('rule_' + k); if(el) el.value = db.rules?.[k] ?? 0;
  });
}
function readRules(){
  db.rules = db.rules || {};
  ['electricity_rate','operator_rate','commercial_coef','min_order_fdm','vat_rate'].forEach(k => db.rules[k] = num($('rule_' + k).value));
}
function renderMaterials(){
  const rows = Object.entries(db.materials || {}).sort((a,b)=>a[0].localeCompare(b[0],'ru')).map(([name, m], i) => `
    <tr data-material="${esc(name)}">
      <td><input data-m-old="${esc(name)}" data-m-field="name" value="${esc(name)}"></td>
      <td><input data-m-old="${esc(name)}" data-m-field="price_rub_kg" type="number" step="0.01" value="${num(m.price_rub_kg)}"></td>
      <td><input data-m-old="${esc(name)}" data-m-field="loss_rate" type="number" step="0.001" value="${num(m.loss_rate)}"></td>
      <td><input data-m-old="${esc(name)}" data-m-field="drying_rub_kg" type="number" step="0.01" value="${num(m.drying_rub_kg)}"></td>
      <td><input data-m-old="${esc(name)}" data-m-field="adhesion_rub_plate" type="number" step="0.01" value="${num(m.adhesion_rub_plate)}"></td>
      <td><button class="button button-secondary" data-remove-material="${esc(name)}" type="button">×</button></td>
    </tr>`).join('');
  $('materialsAdminRows').innerHTML = rows;
  $('materialsAdminRows').querySelectorAll('input').forEach(el => el.addEventListener('input', readTables));
  $('materialsAdminRows').querySelectorAll('[data-remove-material]').forEach(btn => btn.addEventListener('click', () => { delete db.materials[btn.dataset.removeMaterial]; renderMaterials(); }));
}
function renderMachines(){
  const rows = Object.entries(db.machines || {}).sort((a,b)=>a[0].localeCompare(b[0],'ru')).map(([name, m]) => `
    <tr data-machine="${esc(name)}">
      <td><input data-machine-old="${esc(name)}" data-machine-field="name" value="${esc(name)}"></td>
      <td><input data-machine-old="${esc(name)}" data-machine-field="power_kw" type="number" step="0.01" value="${num(m.power_kw)}"></td>
      <td><input data-machine-old="${esc(name)}" data-machine-field="depreciation_rub_hour" type="number" step="0.01" value="${num(m.depreciation_rub_hour)}"></td>
      <td><button class="button button-secondary" data-remove-machine="${esc(name)}" type="button">×</button></td>
    </tr>`).join('');
  $('machinesAdminRows').innerHTML = rows;
  $('machinesAdminRows').querySelectorAll('input').forEach(el => el.addEventListener('input', readTables));
  $('machinesAdminRows').querySelectorAll('[data-remove-machine]').forEach(btn => btn.addEventListener('click', () => { delete db.machines[btn.dataset.removeMachine]; renderMachines(); }));
}
function readTables(){
  const newMaterials = {};
  document.querySelectorAll('#materialsAdminRows tr').forEach(tr => {
    const name = tr.querySelector('[data-m-field="name"]').value.trim();
    if(!name) return;
    newMaterials[name] = {
      price_rub_kg: num(tr.querySelector('[data-m-field="price_rub_kg"]').value),
      loss_rate: num(tr.querySelector('[data-m-field="loss_rate"]').value),
      drying_rub_kg: num(tr.querySelector('[data-m-field="drying_rub_kg"]').value),
      adhesion_rub_plate: num(tr.querySelector('[data-m-field="adhesion_rub_plate"]').value)
    };
  });
  db.materials = newMaterials;
  const newMachines = {};
  document.querySelectorAll('#machinesAdminRows tr').forEach(tr => {
    const name = tr.querySelector('[data-machine-field="name"]').value.trim();
    if(!name) return;
    newMachines[name] = {
      power_kw: num(tr.querySelector('[data-machine-field="power_kw"]').value),
      depreciation_rub_hour: num(tr.querySelector('[data-machine-field="depreciation_rub_hour"]').value)
    };
  });
  db.machines = newMachines;
}
function saveLocal(){
  readRules(); readTables();
  localStorage.setItem(CONFIG_KEY, JSON.stringify(db));
  $('saveStatus').textContent = 'Сохранено в браузере. На этой машине публичный калькулятор будет использовать обновлённые данные.';
}
function downloadJson(){
  readRules(); readTables();
  const blob = new Blob([JSON.stringify(db, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'defaults.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
  $('saveStatus').textContent = 'Файл defaults.json скачан. Для обновления сайта замените им print-cost/data/defaults.json в репозитории.';
}
function login(){
  if($('loginUser').value === 'admin' && $('loginPass').value === 'admin'){
    sessionStorage.setItem('lp_admin_ok','1');
    $('loginCard').classList.add('admin-hidden');
    $('adminPanel').classList.remove('admin-hidden');
  } else {
    $('loginStatus').textContent = 'Неверный логин или пароль.';
  }
}
function logout(){
  sessionStorage.removeItem('lp_admin_ok');
  $('adminPanel').classList.add('admin-hidden');
  $('loginCard').classList.remove('admin-hidden');
}
async function init(){
  await loadDb(); setRuleInputs(); renderMaterials(); renderMachines();
  $('loginBtn').addEventListener('click', login);
  $('loginPass').addEventListener('keydown', e => { if(e.key === 'Enter') login(); });
  $('saveLocal').addEventListener('click', saveLocal);
  $('downloadJson').addEventListener('click', downloadJson);
  $('logoutBtn').addEventListener('click', logout);
  $('resetConfig').addEventListener('click', async () => { localStorage.removeItem(CONFIG_KEY); await loadDb(); setRuleInputs(); renderMaterials(); renderMachines(); $('saveStatus').textContent = 'Локальные правки сброшены.'; });
  $('addMaterial').addEventListener('click', () => { readTables(); db.materials['Новый материал'] = {price_rub_kg:0, loss_rate:0, drying_rub_kg:0, adhesion_rub_plate:0}; renderMaterials(); });
  $('addMachine').addEventListener('click', () => { readTables(); db.machines['Новый станок'] = {power_kw:0, depreciation_rub_hour:0}; renderMachines(); });
  document.querySelectorAll('[id^="rule_"]').forEach(el => el.addEventListener('input', readRules));
  if(sessionStorage.getItem('lp_admin_ok') === '1') login();
}
init().catch(err => { document.body.innerHTML = '<main class="container"><section class="card"><h1>Ошибка запуска</h1><p>'+esc(err.message)+'</p></section></main>'; });
