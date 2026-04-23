/**
 * 現場用 クレーン詳細ページスクリプト (crane.html)
 * URLパラメータ ?id=CRANE-XXX で対象クレーンを特定します。
 */

document.addEventListener('DOMContentLoaded', () => {
  DataStore.init();

  const craneId = getUrlParam('id');

  /* IDがなければトップへ */
  if (!craneId) {
    document.getElementById('craneContent').innerHTML =
      `<div class="empty-state"><i class="fas fa-ban"></i><h3>クレーンIDが指定されていません</h3><p>QRコードを読み込んでアクセスしてください。</p></div>`;
    return;
  }

  const crane = DataStore.getCrane(craneId);

  if (!crane) {
    document.getElementById('craneContent').innerHTML =
      `<div class="empty-state"><i class="fas fa-search"></i><h3>クレーンが見つかりません</h3><p>ID: ${craneId}</p></div>`;
    return;
  }

  /* ページタイトル更新 */
  document.title = `${crane.vehicleNumber} | サンワクレーン`;

  /* クレーン情報カード */
  document.getElementById('craneInfo').innerHTML = `
    <div class="crane-info-card">
      <div class="crane-vehicle-number"><i class="fas fa-id-card"></i> ${crane.vehicleNumber}</div>
      <div class="crane-name-display">${crane.name}</div>
      <div class="crane-meta">
        <div class="crane-meta-item"><i class="fas fa-cogs"></i> ${crane.model || '—'}</div>
        <div class="crane-meta-item"><i class="fas fa-map-marker-alt"></i> ${crane.location || '—'}</div>
        ${crane.notes ? `<div class="crane-meta-item"><i class="fas fa-sticky-note"></i> ${crane.notes}</div>` : ''}
      </div>
    </div>`;

  /* メンテナンス状態カード */
  const latest = DataStore.getLatestMaintenanceByType(craneId);
  const types  = DataStore.getMaintTypes();

  const cardsHtml = types.map(t => {
    const rec  = latest[t.key];
    const days = rec ? getDaysUntil(rec.nextDate) : null;
    const st   = getDateStatus(days);

    return `
      <div class="maint-card">
        <div class="maint-card-title">
          <i class="fas ${t.icon}"></i>${t.label}
        </div>
        ${rec ? `
          <div class="maint-date-row"><i class="fas fa-calendar-check"></i> 最終実施：<strong>${formatDate(rec.date)}</strong></div>
          <div class="maint-date-row"><i class="fas fa-calendar-alt"></i> 次回予定：<strong>${formatDate(rec.nextDate)}</strong>
            <span class="badge ${st.badgeCls}">${st.label}</span>
          </div>
          <div class="maint-date-row"><i class="fas fa-user"></i> 担当：<strong>${rec.operator || '—'}</strong></div>
        ` : `
          <div class="maint-date-row text-muted"><i class="fas fa-minus-circle"></i> 記録なし</div>
        `}
      </div>`;
  }).join('');

  document.getElementById('maintCards').innerHTML = cardsHtml;

  /* ボタンのhrefを設定 */
  document.getElementById('btnMaintenance').href = `maintenance.html?id=${craneId}`;
  document.getElementById('btnHistory').href     = `history.html?id=${craneId}`;

  /* コンテンツを表示 */
  document.getElementById('craneContent').classList.remove('hidden');
  document.getElementById('loadingEl').classList.add('hidden');
});
