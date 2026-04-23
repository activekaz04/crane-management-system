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

    const latest = await DataStore.getLatestMaintenanceByType(craneId);
    const types  = DataStore.getMaintTypes();

    document.getElementById('maintCards').innerHTML = types.map(t => {
      const rec  = latest[t.key];
      const days = rec ? getDaysUntil(rec.nextDate) : null;
      const st   = getDateStatus(days);
      return `
        <div class="maint-card">
          <div class="maint-card-title"><i class="fas ${t.icon}"></i>${t.label}</div>
          ${rec ? `
            <div class="maint-date-row"><i class="fas fa-calendar-check"></i> 最終実施：<strong>${formatDate(rec.date)}</strong></div>
            <div class="maint-date-row"><i class="fas fa-calendar-alt"></i> 次回予定：<strong>${formatDate(rec.nextDate)}</strong>
              <span class="badge ${st.badgeCls}">${st.label}</span>
            </div>
            <div class="maint-date-row"><i class="fas fa-user"></i> 担当：<strong>${rec.operator || '—'}</strong></div>
          ` : `<div class="maint-date-row text-muted"><i class="fas fa-minus-circle"></i> 記録なし</div>`}
        </div>`;
    }).join('');

    document.getElementById('btnMaintenance').href = `maintenance.html?id=${craneId}`;
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
