/**
 * 現場用 メンテナンス履歴ページ (history.html)
 */

let allRecords   = [];
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  const craneId = getUrlParam('id');
  if (!craneId) { showPageError('クレーンIDが指定されていません。'); return; }

  try {
    await DataStore.init();
    const crane = await DataStore.getCrane(craneId);
    if (!crane) { showPageError(`クレーン "${craneId}" が見つかりません。`); return; }

    document.title = `履歴 | ${crane.vehicleNumber}`;
    document.getElementById('vehicleNumberDisplay').textContent  = crane.vehicleNumber;
    document.getElementById('vehicleNumberDisplay2').textContent = crane.vehicleNumber;
    document.getElementById('craneNameDisplay').textContent      = crane.name;
    document.getElementById('btnBack').href = `crane.html?id=${craneId}`;

    buildFilterButtons();
    allRecords = await DataStore.getMaintenanceRecords(craneId);
    renderHistory();

  } catch (e) {
    console.error(e);
    showPageError('データの読み込みに失敗しました。');
  }
});

function buildFilterButtons() {
  const bar   = document.getElementById('filterBar');
  const types = DataStore.getMaintTypes();
  const buttons = [{ key: 'all', label: 'すべて', icon: 'fa-list' }, ...types];

  bar.innerHTML = buttons.map(b =>
    `<button class="filter-btn ${b.key === 'all' ? 'active' : ''}" data-filter="${b.key}">
       <i class="fas ${b.icon}"></i> ${b.label}
     </button>`
  ).join('');

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderHistory();
  });
}

function renderHistory() {
  const list    = document.getElementById('historyList');
  const records = activeFilter === 'all' ? allRecords : allRecords.filter(r => r.type === activeFilter);

  if (records.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-list"></i><h3>記録がありません</h3></div>`;
    return;
  }
  list.innerHTML = records.map(r => {
    const label = DataStore.getMaintLabel(r.type);
    const icon  = DataStore.getMaintIcon(r.type);
    const st    = getDateStatus(getDaysUntil(r.nextDate));
    let extra   = '';
    if (r.type === 'engine_oil' && r.quantity)
      extra = `<div class="history-detail-item"><span class="history-detail-label">使用数量</span><span>${r.quantity}</span></div>`;
    if (r.type === 'tire_pressure' && r.tirePressures) {
      const tp = r.tirePressures;
      extra = ['fl','fr','rl','rr'].map(k =>
        `<div class="history-detail-item"><span class="history-detail-label">${k.toUpperCase()}</span><span>${tp[k] ? tp[k]+' kPa' : '—'}</span></div>`
      ).join('');
    }
    return `
      <div class="history-item">
        <div class="history-item-header">
          <div class="history-type"><i class="fas ${icon}"></i>${label}</div>
          <div class="history-date"><i class="fas fa-calendar"></i> ${formatDate(r.date)}</div>
        </div>
        <div class="history-details">
          <div class="history-detail-item"><span class="history-detail-label">次回予定</span>
            <span>${formatDate(r.nextDate)} <span class="badge ${st.badgeCls}">${st.label}</span></span>
          </div>
          <div class="history-detail-item"><span class="history-detail-label">担当者</span><span>${r.operator || '—'}</span></div>
          ${extra}
          ${r.notes ? `<div class="history-detail-item" style="flex-basis:100%"><span class="history-detail-label">備考</span><span>${r.notes}</span></div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function showPageError(msg) {
  document.getElementById('historyContent').innerHTML =
    `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i>${msg}</div>`;
}
