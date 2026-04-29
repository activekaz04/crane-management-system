/**
 * 現場用 修理記録入力ページ (repair.html)
 */

let currentCraneId = null;
let selectedFiles  = [];   // 選択中の写真ファイル配列

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

    // 写真追加ボタン
    document.getElementById('btnAddPhoto').addEventListener('click', () => {
      document.getElementById('photoInput').click();
    });
    document.getElementById('photoInput').addEventListener('change', handlePhotoSelect);
    document.getElementById('repairForm').addEventListener('submit', handleSubmit);

  } catch (e) {
    console.error(e);
    showPageError('データの読み込みに失敗しました。');
  }
});

/* ======================================================
   写真選択・プレビュー
   ====================================================== */

function handlePhotoSelect(e) {
  const files  = Array.from(e.target.files);
  const canAdd = 3 - selectedFiles.length;

  if (canAdd <= 0) { showToast('写真は最大3枚までです', 'error'); return; }

  files.slice(0, canAdd).forEach(file => {
    selectedFiles.push(file);
    renderPhotoPreview(file, selectedFiles.length - 1);
  });

  updateAddBtn();
  e.target.value = ''; // 同じファイルを再選択できるようリセット
}

function renderPhotoPreview(file, index) {
  const reader = new FileReader();
  reader.onload = ev => {
    const grid = document.getElementById('photoPreviewGrid');
    const div  = document.createElement('div');
    div.className  = 'photo-thumbnail';
    div.dataset.idx = index;
    div.innerHTML = `
      <img src="${ev.target.result}" alt="写真${index + 1}">
      <button type="button" class="photo-remove-btn" onclick="removePhoto(${index})">
        <i class="fas fa-times"></i>
      </button>`;
    grid.appendChild(div);
  };
  reader.readAsDataURL(file);
}

function removePhoto(index) {
  selectedFiles.splice(index, 1);
  // プレビューを全件再描画
  document.getElementById('photoPreviewGrid').innerHTML = '';
  selectedFiles.forEach((f, i) => renderPhotoPreview(f, i));
  updateAddBtn();
}

function updateAddBtn() {
  document.getElementById('btnAddPhoto').style.display =
    selectedFiles.length >= 3 ? 'none' : '';
}

/* ======================================================
   画像圧縮（最大幅1200px、JPEG 78%品質）
   ====================================================== */

function compressImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX) {
          height = Math.round(height * MAX / width);
          width  = MAX;
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', 0.78);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ======================================================
   Firebase Storage アップロード
   ====================================================== */

async function uploadPhotos(craneId, recordId, btn) {
  const urls = [];
  for (let i = 0; i < selectedFiles.length; i++) {
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 写真アップロード中 (${i + 1}/${selectedFiles.length})...`;
    const compressed = await compressImage(selectedFiles[i]);
    const ref  = storage.ref(`repairs/${craneId}/${recordId}/photo_${i}.jpg`);
    await ref.put(compressed, { contentType: 'image/jpeg' });
    const url = await ref.getDownloadURL();
    urls.push(url);
  }
  return urls;
}

/* ======================================================
   フォーム送信
   ====================================================== */

async function handleSubmit(e) {
  e.preventDefault();

  const date          = document.getElementById('rDate').value;
  const faultLocation = document.getElementById('rFaultLocation').value.trim();

  if (!date)          { showToast('修理日を入力してください', 'error'); return; }
  if (!faultLocation) { showToast('故障箇所を入力してください', 'error'); return; }

  const btn = document.querySelector('#repairForm button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';

  try {
    // レコードIDを先に生成（写真パスに使用）
    const recordId = 'R' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

    // 写真アップロード
    const photoURLs = selectedFiles.length > 0
      ? await uploadPhotos(currentCraneId, recordId, btn)
      : [];

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';

    const record = {
      id:             recordId,
      craneId:        currentCraneId,
      date,
      operator:       document.getElementById('rOperator').value.trim(),
      faultLocation,
      replacedParts:  document.getElementById('rReplacedParts').value.trim(),
      countermeasure: document.getElementById('rCountermeasure').value.trim(),
      notes:          document.getElementById('rNotes').value.trim(),
    };
    if (photoURLs.length > 0) record.photoURLs = photoURLs;

    await DataStore.saveRepairRecord(record);
    showToast('修理記録を保存しました', 'success');
    setTimeout(() => { window.location.href = `crane.html?id=${currentCraneId}`; }, 1200);

  } catch (err) {
    console.error(err);
    showToast('保存に失敗しました。通信環境を確認してください。', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> 保存する';
  }
}

function showPageError(msg) {
  document.getElementById('formWrapper').innerHTML =
    `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i>${msg}</div>`;
}
