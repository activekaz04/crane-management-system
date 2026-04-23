/**
 * クレーン管理ページ (admin-cranes.html)
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;
  try {
    await DataStore.init();
    await renderCranes();
    document.getElementById('btnAddCrane').addEventListener('click', () => openCraneModal(null));
  } catch (e) {
    console.error(e);
    showToast('データの読み込みに失敗しました', 'error');
  }
});

async function renderCranes() {
  const cranes = await DataStore.getCranes();
  const list   = document.getElementById('craneList');

  if (cranes.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-truck-moving"></i><h3>クレーンが登録されていません</h3><p>「クレーンを追加」ボタンから登録してください。</p></div>`;
    return;
  }

  const items = await Promise.all(cranes.map(async crane => {
    const records = await DataStore.getMaintenanceRecords(crane.id);
    const statusMap   = { active: '稼働中', maintenance: 'メンテナンス中', retired: '引退' };
    const statusBadge = { active: 'badge-success', maintenance: 'badge-warning', retired: 'badge-muted' };
    return `
      <div class="card mb-md">
        <div class="card-body">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--sp-sm)">
            <div>
              <div style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-primary)">${crane.vehicleNumber}</div>
              <div style="color:var(--color-text-muted)">${crane.tonnage || '—'} ／ ${crane.maker || '—'} ／ ${crane.model || '—'}</div>
              <div style="margin-top:var(--sp-xs)">
                <span class="badge ${statusBadge[crane.status] || 'badge-muted'}">${statusMap[crane.status] || crane.status}</span>
                <span class="badge badge-primary" style="margin-left:4px"><i class="fas fa-clipboard-list"></i> ${records.length}件</span>
              </div>
            </div>
            <div style="display:flex;gap:var(--sp-sm);flex-wrap:wrap">
              <button class="btn btn-sm btn-outline-accent" onclick="showQrModal('${crane.id}')"><i class="fas fa-qrcode"></i> QR</button>
              <a href="admin-crane.html?id=${crane.id}" class="btn btn-sm btn-outline"><i class="fas fa-eye"></i> 詳細</a>
              <button class="btn btn-sm btn-primary" onclick="openCraneModal('${crane.id}')"><i class="fas fa-edit"></i> 編集</button>
              <button class="btn btn-sm btn-danger"  onclick="deleteCrane('${crane.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
      </div>`;
  }));

  list.innerHTML = items.join('');
}

function openCraneModal(craneId) {
  const load = async () => {
    const crane  = craneId ? await DataStore.getCrane(craneId) : null;
    const isEdit = !!crane;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'craneModal';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title"><i class="fas fa-truck-moving"></i>${isEdit ? 'クレーンを編集' : 'クレーンを追加'}</div>
          <button class="modal-close" onclick="document.getElementById('craneModal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">車番 <span class="required">*</span></label>
            <input type="text" class="form-control" id="cVehicleNumber" value="${crane ? crane.vehicleNumber : ''}" placeholder="例：奈良100 あ 1234" required></div>
          <div class="form-group"><label class="form-label">メーカー</label>
            <input type="text" class="form-control" id="cMaker" value="${crane ? (crane.maker || '') : ''}" placeholder="例：タダノ、コベルコ"></div>
          <div class="form-group"><label class="form-label">トン数 <span class="required">*</span></label>
            <input type="text" class="form-control" id="cTonnage" value="${crane ? (crane.tonnage || '') : ''}" placeholder="例：25t" required></div>
          <div class="form-group"><label class="form-label">型番・型式</label>
            <input type="text" class="form-control" id="cModel" value="${crane ? (crane.model || '') : ''}" placeholder="例：GR-250N"></div>
          <div class="form-group"><label class="form-label">ステータス</label>
            <select class="form-control" id="cStatus">
              <option value="active"      ${crane && crane.status === 'active'      ? 'selected' : ''}>稼働中</option>
              <option value="maintenance" ${crane && crane.status === 'maintenance' ? 'selected' : ''}>メンテナンス中</option>
              <option value="retired"     ${crane && crane.status === 'retired'     ? 'selected' : ''}>引退</option>
            </select></div>
          <div class="form-group"><label class="form-label">備考</label>
            <textarea class="form-control" id="cNotes" rows="3">${crane ? (crane.notes || '') : ''}</textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('craneModal').remove()">キャンセル</button>
          <button class="btn btn-accent" onclick="saveCrane('${craneId || ''}')"><i class="fas fa-save"></i> 保存</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  };
  load();
}

async function saveCrane(craneId) {
  const vehicleNumber = document.getElementById('cVehicleNumber').value.trim();
  const tonnage       = document.getElementById('cTonnage').value.trim();
  if (!vehicleNumber || !tonnage) { showToast('車番とトン数は必須です', 'error'); return; }

  const crane = craneId ? (await DataStore.getCrane(craneId) || {}) : {};
  if (craneId) crane.id = craneId;
  crane.vehicleNumber = vehicleNumber;
  crane.maker    = document.getElementById('cMaker').value.trim();
  crane.tonnage  = tonnage;
  crane.model    = document.getElementById('cModel').value.trim();
  crane.status   = document.getElementById('cStatus').value;
  crane.notes    = document.getElementById('cNotes').value.trim();

  await DataStore.saveCrane(crane);
  document.getElementById('craneModal').remove();
  showToast(`クレーンを${craneId ? '更新' : '追加'}しました`, 'success');
  await renderCranes();
}

function deleteCrane(craneId) {
  DataStore.getCrane(craneId).then(crane => {
    showConfirm(`「${crane.vehicleNumber}」を削除しますか？<br>紐づくメンテナンス記録もすべて削除されます。`, async () => {
      await DataStore.deleteCrane(craneId);
      showToast('クレーンを削除しました', 'success');
      await renderCranes();
    });
  });
}

function showQrModal(craneId) {
  DataStore.getCrane(craneId).then(crane => {
    if (!crane) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'qrModal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;text-align:center">
        <div class="modal-header">
          <div class="modal-title"><i class="fas fa-qrcode"></i>QRコード</div>
          <button class="modal-close" onclick="document.getElementById('qrModal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div style="font-size:var(--font-size-lg);font-weight:700;color:var(--color-primary);margin-bottom:4px">${crane.vehicleNumber}</div>
          <div style="color:var(--color-text-muted);margin-bottom:var(--sp-md)">${crane.tonnage || ''}</div>
          <div id="qrCodeWrap" style="display:flex;justify-content:center;margin-bottom:var(--sp-md)"></div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);word-break:break-all" id="qrUrlText"></div>
        </div>
        <div class="modal-footer" style="justify-content:center">
          <button class="btn btn-outline" onclick="document.getElementById('qrModal').remove()">閉じる</button>
          <button class="btn btn-accent" onclick="downloadQr('${craneId}')"><i class="fas fa-download"></i> PNG保存</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const url = `https://activekaz04.github.io/crane-management-system/crane.html?id=${craneId}`;
    document.getElementById('qrUrlText').textContent = url;
    new QRCode(document.getElementById('qrCodeWrap'), { text: url, width: 200, height: 200, colorDark: '#1a2744', colorLight: '#ffffff' });
  });
}

function downloadQr(craneId) {
  const canvas = document.querySelector('#qrCodeWrap canvas');
  if (!canvas) return;
  DataStore.getCrane(craneId).then(crane => {
    const link = document.createElement('a');
    link.download = `QR_${crane.vehicleNumber.replace(/\s/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}
