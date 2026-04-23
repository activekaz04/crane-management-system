/**
 * 管理者用 クレーン詳細・編集スクリプト (admin-crane.html)
 * クレーン情報の編集、メンテナンス記録の追加・編集・削除を行います。
 */

let currentCraneId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  DataStore.init();

  currentCraneId = getUrlParam('id');
  if (!currentCraneId) {
    window.location.href = 'admin-cranes.html';
    return;
  }

  loadCrane();
  loadMaintenanceRecords();

  /* クレーン情報編集フォーム */
  document.getElementById('craneEditForm').addEventListener('submit', saveCraneInfo);

  /* メンテナンス追加ボタン */
  document.getElementById('btnAddMaint').addEventListener('click', () => openMaintModal(null));
});

/** クレーン情報を読み込みフォームに反映 */
function loadCrane() {
  const crane = DataStore.getCrane(currentCraneId);
  if (!crane) {
    showToast('クレーンが見つかりません', 'error');
    setTimeout(() => window.location.href = 'admin-cranes.html', 1500);
    return;
  }

  document.title = `${crane.vehicleNumber} | 管理者`;
  document.getElementById('pageHeading').textContent     = crane.vehicleNumber;
  document.getElementById('pageSubheading').textContent  = crane.name;

  /* フォーム値セット */
  document.getElementById('fieldVehicleNumber').value = crane.vehicleNumber || '';
  document.getElementById('fieldName').value          = crane.name          || '';
  document.getElementById('fieldModel').value         = crane.model         || '';
  document.getElementById('fieldLocation').value      = crane.location      || '';
  document.getElementById('fieldStatus').value        = crane.status        || 'active';
  document.getElementById('fieldNotes').value         = crane.notes         || '';
}

/** クレーン情報を保存 */
function saveCraneInfo(e) {
  e.preventDefault();
  const crane = DataStore.getCrane(currentCraneId);
  crane.vehicleNumber = document.getElementById('fieldVehicleNumber').value.trim();
  crane.name          = document.getElementById('fieldName').value.trim();
  crane.model         = document.getElementById('fieldModel').value.trim();
  crane.location      = document.getElementById('fieldLocation').value.trim();
  crane.status        = document.getElementById('fieldStatus').value;
  crane.notes         = document.getElementById('fieldNotes').value.trim();
  DataStore.saveCrane(crane);
  showToast('クレーン情報を更新しました', 'success');
  loadCrane();
}

/** メンテナンス記録一覧を描画 */
function loadMaintenanceRecords() {
  const records = DataStore.getMaintenanceRecords(currentCraneId);
  const tbody   = document.getElementById('maintTableBody');

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:24px">記録がありません</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => {
    const label = DataStore.getMaintLabel(r.type);
    const icon  = DataStore.getMaintIcon(r.type);
    const days  = getDaysUntil(r.nextDate);
    const st    = getDateStatus(days);
    return `
      <tr>
        <td><i class="fas ${icon} text-accent" style="margin-right:6px"></i>${label}</td>
        <td>${formatDate(r.date)}</td>
        <td>${formatDate(r.nextDate)} <span class="badge ${st.badgeCls}">${st.label}</span></td>
        <td>${r.operator || '—'}</td>
        <td>${r.notes || '—'}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-outline" onclick="openMaintModal('${r.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteMaint('${r.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ─── メンテナンス記録モーダル ─── */

/** メンテナンス記録追加・編集モーダルを開く */
function openMaintModal(recordId) {
  const rec    = recordId ? DataStore.getMaintenanceRecord(recordId) : null;
  const types  = DataStore.getMaintTypes();
  const isEdit = !!rec;

  /* 種別セレクト */
  const typeOptions = types.map(t =>
    `<option value="${t.key}" ${rec && rec.type === t.key ? 'selected' : ''}>${t.label}</option>`
  ).join('');

  const today = new Date().toISOString().split('T')[0];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'maintModal';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-wrench"></i>${isEdit ? 'メンテナンス記録を編集' : 'メンテナンス記録を追加'}
        </div>
        <button class="modal-close" onclick="document.getElementById('maintModal').remove()">×</button>
      </div>
      <div class="modal-body">
        <form id="maintForm">
          <div class="form-group">
            <label class="form-label">種別 <span class="required">*</span></label>
            <select class="form-control" id="mType" required>${typeOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">実施日 <span class="required">*</span></label>
            <input type="date" class="form-control" id="mDate" value="${rec ? rec.date : today}" required>
          </div>
          <div class="form-group">
            <label class="form-label">次回予定日</label>
            <input type="date" class="form-control" id="mNextDate" value="${rec ? (rec.nextDate || '') : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">担当者 <span class="required">*</span></label>
            <input type="text" class="form-control" id="mOperator" value="${rec ? (rec.operator || '') : ''}" placeholder="担当者名" required>
          </div>
          <div class="form-group" id="quantityGroup">
            <label class="form-label">使用数量</label>
            <input type="text" class="form-control" id="mQuantity" value="${rec ? (rec.quantity || '') : ''}" placeholder="例：15L">
          </div>
          <div id="tirePressureGroup">
            <label class="form-label">タイヤ空気圧（kPa）</label>
            <div class="grid grid-2" style="gap:var(--sp-sm);margin-bottom:var(--sp-lg)">
              <div>
                <label class="form-label" style="font-size:var(--font-size-sm)">左前 (FL)</label>
                <input type="number" class="form-control" id="mFL" value="${rec && rec.tirePressures ? rec.tirePressures.fl : ''}" placeholder="700">
              </div>
              <div>
                <label class="form-label" style="font-size:var(--font-size-sm)">右前 (FR)</label>
                <input type="number" class="form-control" id="mFR" value="${rec && rec.tirePressures ? rec.tirePressures.fr : ''}" placeholder="700">
              </div>
              <div>
                <label class="form-label" style="font-size:var(--font-size-sm)">左後 (RL)</label>
                <input type="number" class="form-control" id="mRL" value="${rec && rec.tirePressures ? rec.tirePressures.rl : ''}" placeholder="700">
              </div>
              <div>
                <label class="form-label" style="font-size:var(--font-size-sm)">右後 (RR)</label>
                <input type="number" class="form-control" id="mRR" value="${rec && rec.tirePressures ? rec.tirePressures.rr : ''}" placeholder="700">
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">備考</label>
            <textarea class="form-control" id="mNotes" rows="3" placeholder="特記事項">${rec ? (rec.notes || '') : ''}</textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('maintModal').remove()">キャンセル</button>
        <button class="btn btn-accent" onclick="saveMaintRecord('${recordId || ''}')">
          <i class="fas fa-save"></i> 保存
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  toggleExtraFields(document.getElementById('mType').value);
  document.getElementById('mType').addEventListener('change', e => toggleExtraFields(e.target.value));
}

/** 種別に応じて追加フィールドを切り替え */
function toggleExtraFields(typeKey) {
  const quantityGroup     = document.getElementById('quantityGroup');
  const tirePressureGroup = document.getElementById('tirePressureGroup');
  if (!quantityGroup) return;
  quantityGroup.classList.toggle('hidden',     typeKey !== 'engine_oil');
  tirePressureGroup.classList.toggle('hidden', typeKey !== 'tire_pressure');
}

/** メンテナンス記録を保存 */
function saveMaintRecord(recordId) {
  const typeKey  = document.getElementById('mType').value;
  const date     = document.getElementById('mDate').value;
  const operator = document.getElementById('mOperator').value.trim();

  if (!date || !operator) {
    showToast('実施日と担当者は必須です', 'error');
    return;
  }

  const record = {
    id:       recordId || undefined,
    craneId:  currentCraneId,
    type:     typeKey,
    date:     date,
    nextDate: document.getElementById('mNextDate').value || null,
    operator: operator,
    notes:    document.getElementById('mNotes').value.trim(),
  };

  if (typeKey === 'engine_oil') {
    record.quantity = document.getElementById('mQuantity').value.trim();
  }

  if (typeKey === 'tire_pressure') {
    record.tirePressures = {
      fl: document.getElementById('mFL').value,
      fr: document.getElementById('mFR').value,
      rl: document.getElementById('mRL').value,
      rr: document.getElementById('mRR').value,
    };
  }

  DataStore.saveMaintenanceRecord(record);
  document.getElementById('maintModal').remove();
  showToast('記録を保存しました', 'success');
  loadMaintenanceRecords();
}

/** メンテナンス記録を削除 */
function deleteMaint(recordId) {
  showConfirm('このメンテナンス記録を削除しますか？', () => {
    DataStore.deleteMaintenanceRecord(recordId);
    showToast('記録を削除しました', 'success');
    loadMaintenanceRecords();
  });
}
