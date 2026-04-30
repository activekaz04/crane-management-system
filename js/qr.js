/**
 * QRコード生成ページ (qr-generator.html)
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;

  /* ベースURLは常にGitHub Pages */
  document.getElementById('baseUrlInput').value = 'https://sanwa-crane.github.io/crane-management-system/';

  try {
    await DataStore.init();
    await generateAllQr();
  } catch (e) {
    console.error(e);
    showToast('データの読み込みに失敗しました', 'error');
  }

  document.getElementById('btnRegenerate').addEventListener('click', generateAllQr);
  document.getElementById('btnPrintAll').addEventListener('click', () => window.print());
});

async function generateAllQr() {
  const cranes  = await DataStore.getCranes();
  const baseUrl = document.getElementById('baseUrlInput').value.trim().replace(/([^/])$/, '$1/');
  const grid    = document.getElementById('qrGrid');

  if (cranes.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-truck-moving"></i><h3>クレーンが登録されていません</h3></div>`;
    return;
  }

  grid.innerHTML = '';
  cranes.forEach(crane => {
    const url  = `${baseUrl}crane.html?id=${crane.id}`;
    const card = document.createElement('div');
    card.className = 'qr-card';
    card.innerHTML = `
      <div class="qr-vehicle-number">${crane.vehicleNumber}</div>
      <div class="qr-crane-name">${crane.name}</div>
      <div class="qr-code-wrap" id="qr-${crane.id}"></div>
      <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:4px">${crane.id}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:var(--sp-sm)" class="no-print">
        <button class="btn btn-sm btn-outline" onclick="downloadSingleQr('${crane.id}')">
          <i class="fas fa-download"></i> 保存
        </button>
      </div>`;
    grid.appendChild(card);

    new QRCode(document.getElementById(`qr-${crane.id}`), {
      text: url, width: 180, height: 180,
      colorDark: '#1a2744', colorLight: '#ffffff',
    });
  });
}

function downloadSingleQr(craneId) {
  const wrap   = document.getElementById(`qr-${craneId}`);
  const canvas = wrap.querySelector('canvas');
  const img    = wrap.querySelector('img');
  DataStore.getCrane(craneId).then(crane => {
    const src  = canvas ? canvas.toDataURL('image/png') : img?.src;
    if (!src) return;
    const link = document.createElement('a');
    link.download = `QR_${crane.vehicleNumber.replace(/\s/g, '_')}.png`;
    link.href = src;
    link.click();
  });
}
