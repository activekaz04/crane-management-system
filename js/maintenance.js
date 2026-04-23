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
    document.getElementById('craneNameDisplay').textContent      = crane.name;
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
        <label class="form-label">実施日 <span class="required">*</span></label>
        <input type="date" class="form-control date-today-default" name="${t.key}_date" required>
      </div>
      <div class="form-group">
        <label class="form-label">次回予定日</label>
        <input type="date" class="form-control" name="${t.key}_nextDate">
      </div>
      <div class="form-group">
        <label class="form-label">担当者 <span class="required">*</span></label>
        <input type="text" class="form-control" name="${t.key}_operator" placeholder="担当者名" required>
      </div>`;

  let extra = '';
  if (t.key === 'engine_oil') {
    extra = `<div class="form-group">
      <label class="form-label">使用数量</label>
      <input type="text" class="form-control" name="${t.key}_quantity" placeholder="例：15L">
    </div>`;
  }
  if (t.key === 'tire_pressure') {
    extra = `<div class="form-group">
      <label class="form-label">タイヤ空気圧（kPa）</label>
      <div class="grid grid-2" style="gap:var(--sp-sm)">
        <div><label class="form-label" style="font-size:var(--font-size-sm)">左前 (FL)</label>
          <input type="number" class="form-control" name="${t.key}_fl" placeholder="700" min="0" max="1200"></div>
        <div><label class="form-label" style="font-size:var(--font-size-sm)">右前 (FR)</label>
          <input type="number" class="form-control" name="${t.key}_fr" placeholder="700" min="0" max="1200"></div>
        <div><label class="form-label" style="font-size:var(--font-size-sm)">左後 (RL)</label>
          <input type="number" class="form-control" name="${t.key}_rl" placeholder="700" min="0" max="1200"></div>
        <div><label class="form-label" style="font-size:var(--font-size-sm)">右後 (RR)</label>
          <input type="number" class="form-control" name="${t.key}_rr" placeholder="700" min="0" max="1200"></div>
      </div>
    </div>`;
  }

  return common + extra + `
      <div class="form-group mb-0">
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

  const record = {
    craneId:  currentCraneId,
    type:     typeKey,
    date:     g('date'),
    nextDate: g('nextDate') || null,
    operator: g('operator'),
    notes:    g('notes'),
  };

  if (typeKey === 'engine_oil')    record.quantity      = g('quantity');
  if (typeKey === 'tire_pressure') record.tirePressures = { fl: g('fl'), fr: g('fr'), rl: g('rl'), rr: g('rr') };

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
