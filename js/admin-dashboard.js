/**
 * 管理者ダッシュボードスクリプト (admin-dashboard.html)
 * 全クレーンのサマリーとアラートを表示します。
 */

document.addEventListener('DOMContentLoaded', () => {
  /* 認証チェック */
  if (!Auth.requireAuth()) return;

  DataStore.init();
  renderStats();
  renderCraneList();
});

/** 統計カードを描画 */
function renderStats() {
  const cranes  = DataStore.getCranes();
  const records = DataStore.getAllMaintenanceRecords();

  /* 30日以内に期限があるレコードを集計 */
  let alertCount  = 0;
  let expiredCount = 0;

  cranes.forEach(c => {
    const latest = DataStore.getLatestMaintenanceByType(c.id);
    Object.values(latest).forEach(rec => {
      if (!rec) return;
      const days = getDaysUntil(rec.nextDate);
      if (days === null) return;
      if (days < 0)       expiredCount++;
      else if (days <= 30) alertCount++;
    });
  });

  document.getElementById('statTotal').textContent   = cranes.length;
  document.getElementById('statRecords').textContent = records.length;
  document.getElementById('statAlert').textContent   = alertCount;
  document.getElementById('statExpired').textContent = expiredCount;
}

/** クレーン一覧テーブルを描画 */
function renderCraneList() {
  const cranes = DataStore.getCranes();
  const tbody  = document.getElementById('craneTableBody');

  if (cranes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">クレーンが登録されていません</td></tr>`;
    return;
  }

  tbody.innerHTML = cranes.map(crane => {
    const latest = DataStore.getLatestMaintenanceByType(crane.id);

    /* 最も近い期限を探す */
    let minDays = null;
    Object.values(latest).forEach(rec => {
      if (!rec) return;
      const d = getDaysUntil(rec.nextDate);
      if (d === null) return;
      if (minDays === null || d < minDays) minDays = d;
    });

    const st = getDateStatus(minDays);

    /* 最終メンテナンス日 */
    const allRec = DataStore.getMaintenanceRecords(crane.id);
    const lastDate = allRec.length
      ? allRec.reduce((a, b) => a.date > b.date ? a : b).date
      : null;

    /* ステータス表示 */
    const statusBadge = minDays === null
      ? '<span class="badge badge-muted">未記録</span>'
      : minDays < 0
        ? '<span class="badge badge-danger">超過</span>'
        : minDays <= 30
          ? `<span class="badge badge-warning">要注意</span>`
          : '<span class="badge badge-success">正常</span>';

    return `
      <tr>
        <td><strong>${crane.id}</strong></td>
        <td>${crane.vehicleNumber}</td>
        <td>${crane.name}</td>
        <td>${crane.location || '—'}</td>
        <td>${lastDate ? formatDate(lastDate) : '—'}</td>
        <td>${statusBadge}</td>
        <td>
          <a href="admin-crane.html?id=${crane.id}" class="btn btn-sm btn-outline">
            <i class="fas fa-eye"></i> 詳細
          </a>
        </td>
      </tr>`;
  }).join('');
}
