/**
 * 現場用 クレーン詳細ページ (crane.html)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const craneId = getUrlParam('id');

  if (!craneId) {
    showError('クレーンIDが指定されていません。QRコードを読み込んでアクセスしてください。');
    return;
  }

  try {
    await DataStore.init();
    const crane = await DataStore.getCrane(craneId);

    if (!crane) {
      showError(`クレーン "${craneId}" が見つかりません。`);
      return;
    }

    document.title = `${crane.vehicleNumber} | サンワクレーン`;

    document.getElementById('craneInfo').innerHTML = `
      <div class="crane-info-card">
        <div class="crane-vehicle-number"><i class="fas fa-id-card"></i> ${crane.vehicleNumber}</div>
        <div class="crane-name-display">${crane.tonnage || crane.name || ''}</div>
        <div class="crane-meta">
          ${crane.maker ? `<div class="crane-meta-item"><i class="fas fa-industry"></i> ${crane.maker}</div>` : ''}
          <div class="crane-meta-item"><i class="fas fa-cogs"></i> ${crane.model || '—'}</div>
          ${crane.notes ? `<div class="crane-meta-item"><i class="fas fa-sticky-note"></i> ${crane.notes}</div>` : ''}
        </div>
      </div>`;

    document.getElementById('btnMaintenance').href = `maintenance.html?id=${craneId}`;
    document.getElementById('btnInspection').href  = `inspection.html?id=${craneId}`;
    document.getElementById('btnRepair').href      = `repair.html?id=${craneId}`;
    document.getElementById('btnHistory').href     = `history.html?id=${craneId}`;
    document.getElementById('craneContent').classList.remove('hidden');
    document.getElementById('loadingEl').classList.add('hidden');

  } catch (e) {
    console.error(e);
    showError('データの読み込みに失敗しました。通信環境を確認してください。');
  }
});

function showError(msg) {
  document.getElementById('loadingEl').classList.add('hidden');
  document.getElementById('craneContent').innerHTML =
    `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i>${msg}</div>`;
  document.getElementById('craneContent').classList.remove('hidden');
}
