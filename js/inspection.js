/**
 * 現場用 点検入力ページ (inspection.html)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const craneId = getUrlParam('id');
  if (!craneId) { showPageError('クレーンIDが指定されていません。'); return; }

  try {
    await DataStore.init();
    const crane = await DataStore.getCrane(craneId);
    if (!crane) { showPageError(`クレーン "${craneId}" が見つかりません。`); return; }

    document.title = `点検入力 | ${crane.vehicleNumber}`;
    document.getElementById('vehicleNumberDisplay').textContent  = crane.vehicleNumber;
    document.getElementById('vehicleNumberDisplay2').textContent = crane.vehicleNumber;
    document.getElementById('craneNameDisplay').textContent      = crane.tonnage || crane.name || '';
    document.getElementById('btnBack').href       = `crane.html?id=${craneId}`;
    document.getElementById('btnBackBottom').href = `crane.html?id=${craneId}`;

    document.getElementById('iDate').value = new Date().toISOString().split('T')[0];

    document.getElementById('inspectionForm').addEventListener('submit', e => handleSubmit(e, craneId));

  } catch (e) {
    console.error(e);
    showPageError('データの読み込みに失敗しました。');
  }
});

async function handleSubmit(e, craneId) {
  e.preventDefault();

  const date     = document.getElementById('iDate').value;
  const operator = document.getElementById('iOperator').value.trim();
  if (!date || !operator) {
    showToast('点検日と担当者は必須です', 'error');
    return;
  }

  const record = {
    craneId,
    date,
    operator,
    oilLevel: document.getElementById('iOilLevel').value || null,
    tirePressures: {
      fl: document.getElementById('iFL').value,
      fr: document.getElementById('iFR').value,
      rl: document.getElementById('iRL').value,
      rr: document.getElementById('iRR').value,
    },
    notes: document.getElementById('iNotes').value.trim(),
  };

  try {
    const btn = document.querySelector('#inspectionForm button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';

    await DataStore.saveInspectionRecord(record);
    showToast('点検記録を保存しました', 'success');
    setTimeout(() => { window.location.href = `crane.html?id=${craneId}`; }, 1200);
  } catch (err) {
    console.error(err);
    showToast('保存に失敗しました。通信環境を確認してください。', 'error');
    const btn = document.querySelector('#inspectionForm button[type="submit"]');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> 保存する';
  }
}

function showPageError(msg) {
  document.getElementById('formWrapper').innerHTML =
    `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i>${msg}</div>`;
}
