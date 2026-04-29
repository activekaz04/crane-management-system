/**
 * 現場用 修理記録入力ページ (repair.html)
 */

let currentCraneId = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentCraneId = getUrlParam('id');

  if (!currentCraneId) { showPageError('クレーンIDが指定されていません。'); return; }

  try {
    await DataStore.init();
    const crane = await DataStore.getCrane(currentCraneId);
    if (!crane) { showPageError(`クレーン "${currentCraneId}" が見つかりません。`); return; }

    document.title = `修理記録入力 | ${crane.vehicleNumber}`;
    document.getElementById('vehicleNumberDisplay').textContent  = crane.vehicleNumber;
    document.getElementById('vehicleNumberDisplay2').textContent = crane.vehicleNumber;
    document.getElementById('craneNameDisplay').textContent      = crane.tonnage || crane.name || '';
    document.getElementById('btnBack').href       = `crane.html?id=${currentCraneId}`;
    document.getElementById('btnBackBottom').href = `crane.html?id=${currentCraneId}`;

    // 今日の日付をデフォルトセット
    document.getElementById('rDate').value = new Date().toISOString().split('T')[0];

    document.getElementById('repairForm').addEventListener('submit', handleSubmit);

  } catch (e) {
    console.error(e);
    showPageError('データの読み込みに失敗しました。');
  }
});

async function handleSubmit(e) {
  e.preventDefault();

  const date         = document.getElementById('rDate').value;
  const faultLocation = document.getElementById('rFaultLocation').value.trim();

  if (!date)          { showToast('修理日を入力してください', 'error'); return; }
  if (!faultLocation) { showToast('故障箇所を入力してください', 'error'); return; }

  const record = {
    craneId:       currentCraneId,
    date,
    operator:      document.getElementById('rOperator').value.trim(),
    faultLocation,
    replacedParts: document.getElementById('rReplacedParts').value.trim(),
    countermeasure: document.getElementById('rCountermeasure').value.trim(),
    notes:         document.getElementById('rNotes').value.trim(),
  };

  try {
    const btn = document.querySelector('#repairForm button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';

    await DataStore.saveRepairRecord(record);
    showToast('修理記録を保存しました', 'success');
    setTimeout(() => { window.location.href = `crane.html?id=${currentCraneId}`; }, 1200);
  } catch (err) {
    console.error(err);
    showToast('保存に失敗しました。通信環境を確認してください。', 'error');
    const btn = document.querySelector('#repairForm button[type="submit"]');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> 保存する';
  }
}

function showPageError(msg) {
  document.getElementById('formWrapper').innerHTML =
    `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i>${msg}</div>`;
}
