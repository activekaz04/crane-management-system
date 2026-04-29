/**
 * 現場用 記録履歴ページ (history.html)
 * メンテナンス・点検・修理の全記録を表示し、削除も可能
 */

let allRecords   = [];
let activeFilter = 'all';
let currentCraneId = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentCraneId = getUrlParam('id');
  if (!currentCraneId) { showPageError('クレーンIDが指定されていません。'); return; }

  try {
    await DataStore.init();
    const crane = await DataStore.getCrane(currentCraneId);
    if (!crane) { showPageError(`クレーン "${currentCraneId}" が見つかりません。`); return; }

    document.title = `記録履歴 | ${crane.vehicleNumber}`;
    document.getElementById('vehicleNumberDisplay').textContent  = crane.vehicleNumber;
    document.getElementById('vehicleNumberDisplay2').textContent = crane.vehicleNumber;
    document.getElementById('craneNameDisplay').textContent      = crane.tonnage || crane.name || '';
    document.getElementById('btnBack').href = `crane.html?id=${currentCraneId}`;

    buildFilterButtons();
    await loadAllRecords();

  } catch (e) {
    console.error(e);
    showPageError('データの読み込みに失敗しました。');
  }
});

async function loadAllRecords() {
  const [maintRecords, inspRecords, repairRecords] = await Promise.all([
    DataStore.getMaintenanceRecords(currentCraneId),
    DataStore.getInspectionRecords(currentCraneId),
    DataStore.getRepairRecords(currentCraneId),
  ]);

  allRecords = [
    ...maintRecords.map(r  => ({ ...r,  _type: 'maintenance' })),
    ...inspRecords.map(r   => ({ ...r,  _type: 'inspection'  })),
    ...repairRecords.map(r => ({ ...r,  _type: 'repair'      })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  renderHistory();
}

function buildFilterButtons() {
  const bar = document.getElementById('filterBar');
  const filters = [
    { key: 'all',         label: 'すべて',       icon: 'fa-list'       },
    { key: 'maintenance', label: 'メンテナンス', icon: 'fa-wrench'     },
    { key: 'inspection',  label: '点検',         icon: 'fa-search'     },
    { key: 'repair',      label: '修理',         icon: 'fa-tools'      },
  ];

  bar.innerHTML = filters.map(f =>
    `<button class="filter-btn ${f.key === 'all' ? 'active' : ''}" data-filter="${f.key}">
       <i class="fas ${f.icon}"></i> ${f.label}
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
  const list = document.getElementById('historyList');
  const records = activeFilter === 'all'
    ? allRecords
    : allRecords.filter(r => r._type === activeFilter);

  if (records.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-list"></i><h3>記録がありません</h3></div>`;
    return;
  }

  list.innerHTML = records.map(r => buildItemHtml(r)).join('');
}

function buildItemHtml(r) {
  const sectionLabel = r.section === 'upper' ? 'アッパー' : r.section === 'carrier' ? 'キャリア' : '';

  /* ---- メンテナンス ---- */
  if (r._type === 'maintenance') {
    const label = DataStore.getMaintLabel(r.type);
    const icon  = DataStore.getMaintIcon(r.type);
    const st    = getDateStatus(getDaysUntil(r.nextDate));
    return `
      <div class="history-item">
        <div class="history-item-header">
          <div class="history-type">
            <span class="badge badge-info" style="margin-right:4px">メンテナンス</span>
            <i class="fas ${icon}"></i>${label}
          </div>
          <button class="btn btn-sm btn-danger btn-icon"
                  onclick="confirmDelete('maintenance','${r.id}')"
                  style="min-width:36px;height:36px;flex-shrink:0">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="history-details">
          <div class="history-detail-item"><span class="history-detail-label">実施日</span><span>${formatDate(r.date)}</span></div>
          ${sectionLabel ? `<div class="history-detail-item"><span class="history-detail-label">部位</span><span>${sectionLabel}</span></div>` : ''}
          <div class="history-detail-item"><span class="history-detail-label">次回予定</span>
            <span>${formatDate(r.nextDate)} <span class="badge ${st.badgeCls}">${st.label}</span></span>
          </div>
          <div class="history-detail-item"><span class="history-detail-label">担当者</span><span>${r.operator || '—'}</span></div>
          ${r.quantity ? `<div class="history-detail-item"><span class="history-detail-label">使用数量</span><span>${r.quantity}</span></div>` : ''}
          ${r.odometer  ? `<div class="history-detail-item"><span class="history-detail-label">オドメーター</span><span>${r.odometer.toLocaleString()} km</span></div>` : ''}
          ${r.hourMeter ? `<div class="history-detail-item"><span class="history-detail-label">アワメーター</span><span>${r.hourMeter.toLocaleString()} h</span></div>` : ''}
          ${r.notes ? `<div class="history-detail-item" style="flex-basis:100%"><span class="history-detail-label">備考</span><span>${r.notes}</span></div>` : ''}
        </div>
      </div>`;
  }

  /* ---- 点検 ---- */
  if (r._type === 'inspection') {
    const ITEM_LABELS = { engineOil:'エンジンオイル', coolant:'クーラント', tirePressure:'タイヤ空気圧', hydraulicOil:'作動油', other:'その他' };
    const LEVEL = { appropriate:'適量', refilled:'補充済' };
    let itemSummary = '—';
    if (r.items && Object.keys(r.items).length > 0) {
      itemSummary = Object.entries(r.items).map(([key, val]) => {
        const label = ITEM_LABELS[key] || key;
        if (val && val.level) return `${label}：${LEVEL[val.level] || val.level}`;
        return label;
      }).join('　');
    }
    return `
      <div class="history-item">
        <div class="history-item-header">
          <div class="history-type">
            <span class="badge badge-primary" style="margin-right:4px">点検</span>
            <i class="fas fa-search"></i>点検記録
          </div>
          <button class="btn btn-sm btn-danger btn-icon"
                  onclick="confirmDelete('inspection','${r.id}')"
                  style="min-width:36px;height:36px;flex-shrink:0">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="history-details">
          <div class="history-detail-item"><span class="history-detail-label">点検日</span><span>${formatDate(r.date)}</span></div>
          ${sectionLabel ? `<div class="history-detail-item"><span class="history-detail-label">部位</span><span>${sectionLabel}</span></div>` : ''}
          <div class="history-detail-item"><span class="history-detail-label">担当者</span><span>${r.operator || '—'}</span></div>
          ${r.odometer  ? `<div class="history-detail-item"><span class="history-detail-label">オドメーター</span><span>${r.odometer.toLocaleString()} km</span></div>` : ''}
          ${r.hourMeter ? `<div class="history-detail-item"><span class="history-detail-label">アワメーター</span><span>${r.hourMeter.toLocaleString()} h</span></div>` : ''}
          <div class="history-detail-item" style="flex-basis:100%"><span class="history-detail-label">点検項目</span><span>${itemSummary}</span></div>
          ${r.notes ? `<div class="history-detail-item" style="flex-basis:100%"><span class="history-detail-label">備考</span><span>${r.notes}</span></div>` : ''}
        </div>
      </div>`;
  }

  /* ---- 修理 ---- */
  if (r._type === 'repair') {
    return `
      <div class="history-item">
        <div class="history-item-header">
          <div class="history-type">
            <span class="badge badge-danger" style="margin-right:4px">修理</span>
            <i class="fas fa-tools"></i>${r.faultLocation || '修理記録'}
          </div>
          <button class="btn btn-sm btn-danger btn-icon"
                  onclick="confirmDelete('repair','${r.id}')"
                  style="min-width:36px;height:36px;flex-shrink:0">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="history-details">
          <div class="history-detail-item"><span class="history-detail-label">修理日</span><span>${formatDate(r.date)}</span></div>
          <div class="history-detail-item"><span class="history-detail-label">担当者</span><span>${r.operator || '—'}</span></div>
          ${r.replacedParts ? `<div class="history-detail-item" style="flex-basis:100%"><span class="history-detail-label">交換部品</span><span>${r.replacedParts}</span></div>` : ''}
          ${r.countermeasure ? `<div class="history-detail-item" style="flex-basis:100%"><span class="history-detail-label">対策</span><span>${r.countermeasure}</span></div>` : ''}
          ${r.notes ? `<div class="history-detail-item" style="flex-basis:100%"><span class="history-detail-label">備考</span><span>${r.notes}</span></div>` : ''}
          ${r.photoURLs && r.photoURLs.length > 0 ? `
            <div class="history-detail-item" style="flex-basis:100%">
              <span class="history-detail-label">写真</span>
              <div class="photo-history-grid">
                ${r.photoURLs.map((url, i) => `
                  <a href="${url}" target="_blank" class="photo-history-item" title="写真${i + 1}を拡大">
                    <img src="${url}" alt="修理写真${i + 1}" loading="lazy">
                  </a>`).join('')}
              </div>
            </div>` : ''}
        </div>
      </div>`;
  }

  return '';
}

function confirmDelete(recordType, recordId) {
  const labels = { maintenance: 'メンテナンス記録', inspection: '点検記録', repair: '修理記録' };
  showConfirm(`この${labels[recordType] || '記録'}を削除しますか？`, async () => {
    try {
      if (recordType === 'maintenance') await DataStore.deleteMaintenanceRecord(recordId);
      else if (recordType === 'inspection') await DataStore.deleteInspectionRecord(recordId);
      else if (recordType === 'repair')     await DataStore.deleteRepairRecord(recordId);

      showToast('記録を削除しました', 'success');
      await loadAllRecords();
    } catch (e) {
      console.error(e);
      showToast('削除に失敗しました', 'error');
    }
  });
}

function showPageError(msg) {
  document.getElementById('historyContent').innerHTML =
    `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i>${msg}</div>`;
}
