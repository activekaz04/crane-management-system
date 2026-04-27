/**
 * 管理者用 クレーン詳細・編集 (admin-crane.html)
 */

let currentCraneId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;

  currentCraneId = getUrlParam('id');
  if (!currentCraneId) { window.location.href = 'admin-cranes.html'; return; }

  try {
    await DataStore.init();
    await loadCrane();
    await loadMaintenanceRecords();
    await loadInspectionRecords();
    document.getElementById('craneEditForm').addEventListener('submit', saveCraneInfo);
    document.getElementById('btnAddMaint').addEventListener('click', () => openMaintModal(null));
    document.getElementById('btnAddInspection').addEventListener('click', () => openInspectionModal(null));
  } catch (e) {
    console.error(e);
    showToast('データの読み込みに失敗しました', 'error');
  }
});

async function loadCrane() {
  const crane = await DataStore.getCrane(currentCraneId);
  if (!crane) { showToast('クレーンが見つかりません', 'error'); setTimeout(() => window.location.href = 'admin-cranes.html', 1500); return; }

  document.title = `${crane.vehicleNumber} | 管理者`;
  document.getElementById('pageHeading').textContent    = crane.vehicleNumber;
  document.getElementById('pageSubheading').textContent = crane.tonnage || '';
  document.getElementById('fieldVehicleNumber').value   = crane.vehicleNumber || '';
  document.getElementById('fieldMaker').value           = crane.maker         || '';
  document.getElementById('fieldTonnage').value         = crane.tonnage       || '';
  document.getElementById('fieldModel').value           = crane.model         || '';
  document.getElementById('fieldStatus').value          = crane.status        || 'active';
  document.getElementById('fieldNotes').value           = crane.notes         || '';
}

async function saveCraneInfo(e) {
  e.preventDefault();
  const crane = await DataStore.getCrane(currentCraneId);
  crane.vehicleNumber = document.getElementById('fieldVehicleNumber').value.trim();
  crane.maker         = document.getElementById('fieldMaker').value.trim();
  crane.tonnage       = document.getElementById('fieldTonnage').value.trim();
  crane.model         = document.getElementById('fieldModel').value.trim();
  crane.status        = document.getElementById('fieldStatus').value;
  crane.notes         = document.getElementById('fieldNotes').value.trim();
  await DataStore.saveCrane(crane);
  showToast('クレーン情報を更新しました', 'success');
  await loadCrane();
}

async function loadMaintenanceRecords() {
  const records = await DataStore.getMaintenanceRecords(currentCraneId);
  const tbody   = document.getElementById('maintTableBody');

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:24px">記録がありません</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => {
    const label = DataStore.getMaintLabel(r.type);
    const icon  = DataStore.getMaintIcon(r.type);
    const st    = getDateStatus(getDaysUntil(r.nextDate));
    const sectionLabel = r.section === 'upper' ? 'アッパー' : r.section === 'carrier' ? 'キャリア' : '—';
    return `<tr>
      <td><i class="fas ${icon} text-accent" style="margin-right:6px"></i>${label}</td>
      <td>${sectionLabel}</td>
      <td>${formatDate(r.date)}</td>
      <td>${formatDate(r.nextDate)} <span class="badge ${st.badgeCls}">${st.label}</span></td>
      <td>${r.operator || '—'}</td>
      <td>${r.notes || '—'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" onclick="openMaintModal('${r.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger"  onclick="deleteMaint('${r.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function openMaintModal(recordId) {
  const rec    = recordId ? await DataStore.getMaintenanceRecord(recordId) : null;
  const types  = DataStore.getMaintTypes();
  const isEdit = !!rec;
  const today  = new Date().toISOString().split('T')[0];

  const typeOptions = types.map(t =>
    `<option value="${t.key}" ${rec && rec.type === t.key ? 'selected' : ''}>${t.label}</option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'maintModal';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-wrench"></i>${isEdit ? '記録を編集' : '記録を追加'}</div>
        <button class="modal-close" onclick="document.getElementById('maintModal').remove()">×</button>
      </div>
      <div class="modal-body">
        <form id="maintForm">
          <div class="form-group">
            <label class="form-label">種別 <span class="required">*</span></label>
            <select class="form-control" id="mType" required>${typeOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">部位 <span class="required">*</span></label>
            <select class="form-control" id="mSection" required>
              <option value="">— 選択してください —</option>
              <option value="carrier" ${rec && rec.section === 'carrier' ? 'selected' : ''}>キャリア</option>
              <option value="upper"   ${rec && rec.section === 'upper'   ? 'selected' : ''}>アッパー</option>
            </select>
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
          <div class="form-group">
            <label class="form-label">備考</label>
            <textarea class="form-control" id="mNotes" rows="3">${rec ? (rec.notes || '') : ''}</textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('maintModal').remove()">キャンセル</button>
        <button class="btn btn-accent" onclick="saveMaintRecord('${recordId || ''}')"><i class="fas fa-save"></i> 保存</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  toggleExtraFields(document.getElementById('mType').value);
  document.getElementById('mType').addEventListener('change', e => toggleExtraFields(e.target.value));
}

function toggleExtraFields(typeKey) {
  const showQty = ['engine_oil', 'coolant', 'hydraulic_oil'].includes(typeKey);
  document.getElementById('quantityGroup')?.classList.toggle('hidden', !showQty);
}

async function saveMaintRecord(recordId) {
  const typeKey  = document.getElementById('mType').value;
  const date     = document.getElementById('mDate').value;
  const operator = document.getElementById('mOperator').value.trim();
  if (!date || !operator) { showToast('実施日と担当者は必須です', 'error'); return; }

  const section  = document.getElementById('mSection').value;
  if (!section) { showToast('部位を選択してください', 'error'); return; }

  const record = {
    id:       recordId || undefined,
    craneId:  currentCraneId,
    type:     typeKey,
    section,
    date, nextDate: document.getElementById('mNextDate').value || null,
    operator, notes: document.getElementById('mNotes').value.trim(),
  };

  if (['engine_oil', 'coolant', 'hydraulic_oil'].includes(typeKey)) record.quantity = document.getElementById('mQuantity').value.trim();

  await DataStore.saveMaintenanceRecord(record);
  document.getElementById('maintModal').remove();
  showToast('記録を保存しました', 'success');
  await loadMaintenanceRecords();
}

function deleteMaint(recordId) {
  showConfirm('このメンテナンス記録を削除しますか？', async () => {
    await DataStore.deleteMaintenanceRecord(recordId);
    showToast('記録を削除しました', 'success');
    await loadMaintenanceRecords();
  });
}

/* ============================================================
   点検記録
   ============================================================ */

async function loadInspectionRecords() {
  const records = await DataStore.getInspectionRecords(currentCraneId);
  const tbody   = document.getElementById('inspectionTableBody');

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:24px">記録がありません</td></tr>`;
    return;
  }

  const LEVEL = { appropriate:'適量', refilled:'補充済', full:'満タン', three_quarter:'3/4', half:'1/2', quarter:'1/4', low:'要補充' };
  const ITEM_LABELS = { engineOil:'エンジンオイル', coolant:'クーラント', tirePressure:'タイヤ空気圧', hydraulicOil:'作動油', other:'その他' };

  tbody.innerHTML = records.map(r => {
    const sectionLabel = r.section === 'upper' ? 'アッパー' : r.section === 'carrier' ? 'キャリア' : '—';
    let itemSummary = '—';
    if (r.items && Object.keys(r.items).length > 0) {
      itemSummary = Object.entries(r.items).map(([key, val]) => {
        const label = ITEM_LABELS[key] || key;
        if (val.level) return `${label}(${LEVEL[val.level] || val.level})`;
        if (key === 'tirePressure') return label;
        return label;
      }).join('<br>');
    } else if (r.oilLevel) {
      itemSummary = `エンジンオイル(${LEVEL[r.oilLevel] || r.oilLevel})`;
    }
    return `<tr>
      <td>${formatDate(r.date)}</td>
      <td>${sectionLabel}</td>
      <td style="font-size:var(--font-size-xs);line-height:1.8">${itemSummary}</td>
      <td>${r.operator || '—'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" onclick="openInspectionModal('${r.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger"  onclick="deleteInspection('${r.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function openInspectionModal(recordId) {
  const rec    = recordId ? await DataStore.getInspectionRecord(recordId) : null;
  const isEdit = !!rec;
  const today  = new Date().toISOString().split('T')[0];
  const tp     = rec?.tirePressures || {};

  const oilOptions = [
    { value: 'full',          label: '満タン' },
    { value: 'three_quarter', label: '3/4' },
    { value: 'half',          label: '1/2' },
    { value: 'quarter',       label: '1/4' },
    { value: 'low',           label: '要補充' },
  ].map(o => `<option value="${o.value}" ${rec && rec.oilLevel === o.value ? 'selected' : ''}>${o.label}</option>`).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'inspectionModal';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-search"></i>${isEdit ? '点検記録を編集' : '点検記録を追加'}</div>
        <button class="modal-close" onclick="document.getElementById('inspectionModal').remove()">×</button>
      </div>
      <div class="modal-body">
        <form id="inspectionForm">
          <div class="form-group">
            <label class="form-label">点検日 <span class="required">*</span></label>
            <input type="date" class="form-control" id="iDate" value="${rec ? rec.date : today}" required>
          </div>
          <div class="form-group">
            <label class="form-label">担当者 <span class="required">*</span></label>
            <input type="text" class="form-control" id="iOperator" value="${rec ? (rec.operator || '') : ''}" placeholder="担当者名" required>
          </div>
          <div class="form-group">
            <label class="form-label">部位 <span class="required">*</span></label>
            <select class="form-control" id="iSection" required>
              <option value="">— 選択してください —</option>
              <option value="carrier" ${rec && rec.section === 'carrier' ? 'selected' : ''}>キャリア</option>
              <option value="upper"   ${rec && rec.section === 'upper'   ? 'selected' : ''}>アッパー</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">オイル残量</label>
            <select class="form-control" id="iOilLevel">
              <option value="">— 選択 —</option>
              ${oilOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">タイヤ空気圧（kPa）</label>
            <div class="grid grid-2" style="gap:var(--sp-sm)">
              <div><label class="form-label" style="font-size:var(--font-size-sm)">左前 (FL)</label>
                <input type="number" class="form-control" id="iFL" value="${tp.fl || ''}" placeholder="700"></div>
              <div><label class="form-label" style="font-size:var(--font-size-sm)">右前 (FR)</label>
                <input type="number" class="form-control" id="iFR" value="${tp.fr || ''}" placeholder="700"></div>
              <div><label class="form-label" style="font-size:var(--font-size-sm)">左後 (RL)</label>
                <input type="number" class="form-control" id="iRL" value="${tp.rl || ''}" placeholder="700"></div>
              <div><label class="form-label" style="font-size:var(--font-size-sm)">右後 (RR)</label>
                <input type="number" class="form-control" id="iRR" value="${tp.rr || ''}" placeholder="700"></div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">備考</label>
            <textarea class="form-control" id="iNotes" rows="2">${rec ? (rec.notes || '') : ''}</textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('inspectionModal').remove()">キャンセル</button>
        <button class="btn btn-accent" onclick="saveInspection('${recordId || ''}')"><i class="fas fa-save"></i> 保存</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

async function saveInspection(recordId) {
  const date     = document.getElementById('iDate').value;
  const operator = document.getElementById('iOperator').value.trim();
  if (!date || !operator) { showToast('点検日と担当者は必須です', 'error'); return; }

  const iSection = document.getElementById('iSection').value;
  if (!iSection) { showToast('部位を選択してください', 'error'); return; }

  const record = {
    id:       recordId || undefined,
    craneId:  currentCraneId,
    date,
    operator,
    section:  iSection,
    oilLevel: document.getElementById('iOilLevel').value || null,
    tirePressures: {
      fl: document.getElementById('iFL').value,
      fr: document.getElementById('iFR').value,
      rl: document.getElementById('iRL').value,
      rr: document.getElementById('iRR').value,
    },
    notes: document.getElementById('iNotes').value.trim(),
  };

  await DataStore.saveInspectionRecord(record);
  document.getElementById('inspectionModal').remove();
  showToast('点検記録を保存しました', 'success');
  await loadInspectionRecords();
}

function deleteInspection(recordId) {
  showConfirm('この点検記録を削除しますか？', async () => {
    await DataStore.deleteInspectionRecord(recordId);
    showToast('点検記録を削除しました', 'success');
    await loadInspectionRecords();
  });
}
