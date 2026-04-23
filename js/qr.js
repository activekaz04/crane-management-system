/**
 * QRコード生成ページスクリプト (qr-generator.html)
 * 全クレーンのQRコードを生成・印刷・ダウンロードします。
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  DataStore.init();

  /* ベースURLは常にGitHub PagesのURLを使用 */
  const defaultBase = 'https://activekaz04.github.io/crane-management-system/';
  document.getElementById('baseUrlInput').value = defaultBase;

  /* 全クレーン分QRを生成 */
  generateAllQr();

  document.getElementById('btnRegenerate').addEventListener('click', generateAllQr);
  document.getElementById('btnPrintAll').addEventListener('click', () => window.print());
});

/** 全クレーンのQRコードを生成して描画 */
function generateAllQr() {
  const cranes  = DataStore.getCranes();
  const baseUrl = document.getElementById('baseUrlInput').value.trim().replace(/\/$/, '/');
  const grid    = document.getElementById('qrGrid');

  if (cranes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <i class="fas fa-truck-moving"></i>
        <h3>クレーンが登録されていません</h3>
      </div>`;
    return;
  }

  grid.innerHTML = '';

  cranes.forEach(crane => {
    const url = `${baseUrl}crane.html?id=${crane.id}`;

    const card = document.createElement('div');
    card.className = 'qr-card';
    card.innerHTML = `
      <div class="qr-vehicle-number">${crane.vehicleNumber}</div>
      <div class="qr-crane-name">${crane.name}</div>
      <div class="qr-code-wrap" id="qr-${crane.id}"></div>
      <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:4px;word-break:break-all">${crane.id}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:var(--sp-sm)" class="no-print">
        <button class="btn btn-sm btn-outline" onclick="downloadSingleQr('${crane.id}', this)">
          <i class="fas fa-download"></i> 保存
        </button>
      </div>`;

    grid.appendChild(card);

    /* QRコード生成 */
    new QRCode(document.getElementById(`qr-${crane.id}`), {
      text:       url,
      width:      180,
      height:     180,
      colorDark:  '#1a2744',
      colorLight: '#ffffff',
    });
  });
}

/** 個別QRコードをPNGダウンロード */
function downloadSingleQr(craneId, btn) {
  /* QRCode.jsはcanvasまたはimgを生成 */
  const wrap   = document.getElementById(`qr-${craneId}`);
  const canvas = wrap.querySelector('canvas');
  const img    = wrap.querySelector('img');
  const crane  = DataStore.getCrane(craneId);

  if (canvas) {
    const link = document.createElement('a');
    link.download = `QR_${crane.vehicleNumber.replace(/\s/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } else if (img) {
    const link = document.createElement('a');
    link.download = `QR_${crane.vehicleNumber.replace(/\s/g, '_')}.png`;
    link.href = img.src;
    link.click();
  }
}
