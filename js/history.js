/**
 * 現場用 メンテナンス履歴ページスクリプト (history.html)
 * URLパラメータ ?id=CRANE-XXX で対象クレーンを特定します。
 */

let allRecords  = [];
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  DataStore.init();

  const craneId = getUrlParam('id');

  if (!craneId) {
    showPageError('クレーンIDが指定されていません。');
    return;
  }

  const crane = DataStore.getCrane(craneId);
  if (!crane) {
    showPageError(`クレーン "${craneId}" が見つかりません。`);
    return;
  }

  /* ヘッダー情報 */
  document.title = `履歴 | ${crane.vehicleNumber}`;
  document.getElementById('vehicleNumberDisplay').textContent = crane.vehicleNumber;
  document.getElementById('craneNameDisplay').textContent     = crane.name;

  /* 戻るボタン */
  document.getElementById('btnBack').href = `crane.html?id=${craneId}`;

  /* フィルターボタン生成 */
  buildFilterButtons();

  /* 履歴読み込み */
  allRecords = DataStore.getMaintenanceRecords(craneId);
  renderHistory();
});

/** フィルターボタンを生成 */
function buildFilterButtons() {
  const bar   = document.getElementById('filterBar');
  const types = DataStore.getMaintTypes();

  const buttons = [
    { key: 'all', label: 'すべて', icon: 'fa-list' },
    ...types.map(t => ({ key: t.key, label: t.label, icon: t.icon })),
  ];

  bar.innerHTML = buttons.map(b =>
    `<button class="filter-btn ${b.key === 'all' ? 'active' : ''}"
             data-filter="${b.key}">
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

/** 履歴を描画 */
function renderHistory() {
  const list = document.getElementById('historyList');
  const records = activeFilter === 'all'
    ? allRecords
    : allRecords.filter(r => r.type === activeFilter);

  if (records.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-list"></i>
        <h3>記録がありません</h3>
        <p>まだメンテナンスの記録がありません。</p>
      </div>`;
    return;
  }

  list.innerHTML = records.map(r => buildHistoryItem(r)).join('');
}

/** 履歴アイテムHTMLを生成 */
function buildHistoryItem(r) {
  const label    = DataStore.getMaintLabel(r.type);
  const icon     = DataStore.getMaintIcon(r.type);
  const days     = getDaysUntil(r.nextDate);
  const st       = getDateStatus(days);

  /* 種別固有の詳細 */
  let extraDetails = '';

  if (r.type === 'engine_oil' && r.quantity) {
    extraDetails = `<div class="history-detail-item">
      <span class="history-detail-label">使用数量</span>
      <span>${r.quantity}</span>
    </div>`;
  }

  if (r.type === 'tire_pressure' && r.tirePressures) {
    const tp = r.tirePressures;
    extraDetails = `
      <div class="history-detail-item">
        <span class="history-detail-label">FL</span>
        <span>${tp.fl ? tp.fl + ' kPa' : '—'}</span>
      </div>
      <div class="history-detail-item">
        <span class="history-detail-label">FR</span>
        <span>${tp.fr ? tp.fr + ' kPa' : '—'}</span>
      </div>
      <div class="history-detail-item">
        <span class="history-detail-label">RL</span>
        <span>${tp.rl ? tp.rl + ' kPa' : '—'}</span>
      </div>
      <div class="history-detail-item">
        <span class="history-detail-label">RR</span>
        <span>${tp.rr ? tp.rr + ' kPa' : '—'}</span>
      </div>`;
  }

  return `
    <div class="history-item">
      <div class="history-item-header">
        <div class="history-type"><i class="fas ${icon}"></i>${label}</div>
        <div class="history-date"><i class="fas fa-calendar"></i> ${formatDate(r.date)}</div>
      </div>
      <div class="history-details">
        <div class="history-detail-item">
          <span class="history-detail-label">次回予定</span>
          <span>${formatDate(r.nextDate)} <span class="badge ${st.badgeCls}">${st.label}</span></span>
        </div>
        <div class="history-detail-item">
          <span class="history-detail-label">担当者</span>
          <span>${r.operator || '—'}</span>
        </div>
        ${extraDetails}
        ${r.notes ? `
        <div class="history-detail-item" style="flex-basis:100%">
          <span class="history-detail-label">備考</span>
          <span>${r.notes}</span>
        </div>` : ''}
      </div>
    </div>`;
}

function showPageError(msg) {
  document.getElementById('historyContent').innerHTML =
    `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i>${msg}</div>`;
}
