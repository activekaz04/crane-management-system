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

function toggleItem(key) {
  const card   = document.getElementById(`card-${key}`);
  const detail = document.getElementById(`detail-${key}`);
  const isSelected = card.classList.toggle('selected');
  detail.classList.toggle('hidden', !isSelected);
}

async function handleSubmit(e, craneId) {
  e.preventDefault();

  const date     = document.getElementById('iDate').value;
  const operator = document.getElementById('iOperator').value.trim();
  const section  = document.getElementById('iSection').value;

  if (!date || !operator) { showToast('点検日と担当者は必須です', 'error'); return; }
  if (!section)           { showToast('部位を選択してください', 'error'); return; }

  const selectedItems = document.querySelectorAll('.insp-item-card.selected');
  if (selectedItems.length === 0) { showToast('点検項目を1つ以上選択してください', 'error'); return; }

  const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };

  const items = {};
  if (document.getElementById('card-engineOil').classList.contains('selected')) {
    items.engineOil = { level: val('item-engineOil-level'), notes: val('item-engineOil-notes') };
  }
  if (document.getElementById('card-coolant').classList.contains('selected')) {
    items.coolant = { level: val('item-coolant-level'), notes: val('item-coolant-notes') };
  }
  if (document.getElementById('card-tirePressure').classList.contains('selected')) {
    items.tirePressure = {
      fl: val('item-tire-fl'), fr: val('item-tire-fr'),
      rl: val('item-tire-rl'), rr: val('item-tire-rr'),
      notes: val('item-tirePressure-notes'),
    };
  }
  if (document.getElementById('card-hydraulicOil').classList.contains('selected')) {
    items.hydraulicOil = { level: val('item-hydraulicOil-level'), notes: val('item-hydraulicOil-notes') };
  }
  if (document.getElementById('card-other').classList.contains('selected')) {
    items.other = { notes: val('item-other-notes') };
  }

  const record = {
    craneId, date, operator, section,
    items,
    notes: val('iNotes'),
  };

  const odometer  = val('iOdometer');
  const hourMeter = val('iHourMeter');
  if (odometer)  record.odometer  = Number(odometer);
  if (hourMeter) record.hourMeter = Number(hourMeter);

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
