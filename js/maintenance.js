/**
 * 現場用 メンテナンス入力ページ (maintenance.html)
 */

let currentCraneId = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentCraneId = getUrlParam('id');

  if (!currentCraneId) { showPageError('クレーンIDが指定されていません。'); return; }

  try {
    await DataStore.init();
    const crane = await DataStore.getCrane(currentCraneId);
    if (!crane) { showPageError(`クレーン "${currentCraneId}" が見つかりません。`); return; }

    document.title = `メンテナンス入力 | ${crane.vehicleNumber}`;
    document.getElementById('vehicleNumberDisplay').textContent  = crane.vehicleNumber;
    document.getElementById('vehicleNumberDisplay2').textContent = crane.vehicleNumber;
    document.getElementById('craneNameDisplay').textContent      = crane.tonnage || crane.name || '';
    document.getElementById('btnBack').href       = `crane.html?id=${currentCraneId}`;
    document.getElementById('btnBackBottom').href = `crane.html?id=${currentCraneId}`;

    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('.date-today-default').forEach(el => { el.value = today; });

    initTypeTabs();
    document.getElementById('maintenanceForm').addEventListener('submit', handleSubmit);

  } catch (e) {
    console.error(e);
    showPageError('データの読み込みに失敗しました。');
  }
});

function initTypeTabs() {
  const types    = DataStore.getMaintTypes();
  const tabBar   = document.getElementById('typeTabs');
  const formBody = document.getElementById('formBody');

  tabBar.innerHTML = types.map((t, i) =>
    `<button type="button" class="filter-btn ${i === 0 ? 'active' : ''}" data-type="${t.key}">
       <i class="fas ${t.icon}"></i> ${t.label}
     </button>`
  ).join('');

  formBody.innerHTML = types.map((t, i) =>
    `<div class="type-form ${i === 0 ? '' : 'hidden'}" id="form-${t.key}">${buildFormHtml(t)}</div>`
  ).join('');

  tabBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const type = btn.dataset.type;
    tabBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    formBody.querySelectorAll('.type-form').forEach(f => f.classList.add('hidden'));
    document.getElementById(`form-${type}`).classList.remove('hidden');
  });
}

function buildFormHtml(t) {
  const common = `
    <div class="form-section">
      <div class="form-section-title"><i class="fas ${t.icon}"></i>${t.label}</div>
      <div class="form-group">
        <label class="form-label">部位 <span class="required">*</span></label>
        <select class="form-control" name="${t.key}_section">
          <option value="">— 選択してください —</option>
          <option value="carrier">キャリア</option>
          <option value="upper">アッパー</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">実施日 <span class="required">*</span></label>
        <input type="date" class="form-control date-today-default" name="${t.key}_date">
      </div>
      <div class="form-group">
        <label class="form-label">次回予定日</label>
        <input type="date" class="form-control" name="${t.key}_nextDate">
      </div>
      <div class="form-group">
        <label class="form-label">担当者 <span class="required">*</span></label>
        <input type="text" class="form-control" name="${t.key}_operator" placeholder="担当者名">
      </div>`;

  const QUANTITY_TYPES = ['engine_oil', 'coolant', 'hydraulic_oil'];
  let extra = '';
  if (QUANTITY_TYPES.includes(t.key)) {
    extra = `<div class="form-group">
      <label class="form-label">使用数量</label>
      <input type="text" class="form-control" name="${t.key}_quantity" placeholder="例：15L">
    </div>`;
  }

  const meters = `
      <div class="grid grid-2" style="gap:var(--sp-md)">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">オドメーター</label>
          <input type="number" class="form-control" name="${t.key}_odometer" placeholder="例：12500" min="0">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">アワメーター</label>
          <input type="number" class="form-control" name="${t.key}_hourMeter" placeholder="例：3200" min="0">
        </div>
      </div>`;

  return common + extra + meters + `
      <div class="form-group mb-0" style="margin-top:var(--sp-md)">
        <label class="form-label">備考</label>
        <textarea class="form-control" name="${t.key}_notes" rows="3" placeholder="特記事項があれば記入"></textarea>
      </div>
    </div>`;
}

async function handleSubmit(e) {
  e.preventDefault();
  const activeTab = document.querySelector('#typeTabs .filter-btn.active');
  if (!activeTab) return;
  const typeKey = activeTab.dataset.type;
  const form    = e.target;
  const g = name => form.elements[`${typeKey}_${name}`]?.value?.trim() || '';

  const section  = g('section');
  const date     = g('date');
  const operator = g('operator');

  if (!section)  { showToast('部位を選択してください', 'error'); return; }
  if (!date)     { showToast('実施日を入力してください', 'error'); return; }
  if (!operator) { showToast('担当者を入力してください', 'error'); return; }

  const record = {
    craneId:  currentCraneId,
    type:     typeKey,
    section,
    date,
    nextDate: g('nextDate') || null,
    operator,
    notes:    g('notes'),
  };

  if (['engine_oil', 'coolant', 'hydraulic_oil'].includes(typeKey)) record.quantity = g('quantity');
  const odometer  = g('odometer');
  const hourMeter = g('hourMeter');
  if (odometer)  record.odometer  = Number(odometer);
  if (hourMeter) record.hourMeter = Number(hourMeter);

  try {
    const btn = document.querySelector('#maintenanceForm button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';

    await DataStore.saveMaintenanceRecord(record);
    showToast('メンテナンス記録を保存しました', 'success');
    setTimeout(() => { window.location.href = `crane.html?id=${currentCraneId}`; }, 1200);
  } catch (err) {
    console.error(err);
    showToast('保存に失敗しました。通信環境を確認してください。', 'error');
    const btn = document.querySelector('#maintenanceForm button[type="submit"]');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> 保存する';
  }
}

function showPageError(msg) {
  document.getElementById('formWrapper').innerHTML =
    `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i>${msg}</div>`;
}
