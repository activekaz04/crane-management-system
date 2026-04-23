/**
 * 管理者ダッシュボード (admin-dashboard.html)
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;

  try {
    await DataStore.init();
    await renderStats();
    await renderCraneList();
  } catch (e) {
    console.error(e);
    showToast('データの読み込みに失敗しました', 'error');
  }
});

async function renderStats() {
  const cranes  = await DataStore.getCranes();
  const records = await DataStore.getAllMaintenanceRecords();

  let alertCount = 0, expiredCount = 0;
  for (const c of cranes) {
    const latest = await DataStore.getLatestMaintenanceByType(c.id);
    Object.values(latest).forEach(rec => {
      if (!rec) return;
      const days = getDaysUntil(rec.nextDate);
      if (days === null) return;
      if (days < 0)       expiredCount++;
      else if (days <= 30) alertCount++;
    });
  }

  document.getElementById('statTotal').textContent   = cranes.length;
  document.getElementById('statRecords').textContent = records.length;
  document.getElementById('statAlert').textContent   = alertCount;
  document.getElementById('statExpired').textContent = expiredCount;
}

async function renderCraneList() {
  const cranes = await DataStore.getCranes();
  const tbody  = document.getElementById('craneTableBody');

  if (cranes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">クレーンが登録されていません</td></tr>`;
    return;
  }

  const rows = await Promise.all(cranes.map(async crane => {
    const latest  = await DataStore.getLatestMaintenanceByType(crane.id);
    const allRec  = await DataStore.getMaintenanceRecords(crane.id);
    const lastDate = allRec.length ? allRec[0].date : null;

    let minDays = null;
    Object.values(latest).forEach(rec => {
      if (!rec) return;
      const d = getDaysUntil(rec.nextDate);
      if (d === null) return;
      if (minDays === null || d < minDays) minDays = d;
    });

    const st = getDateStatus(minDays);
    const statusBadge = minDays === null
      ? '<span class="badge badge-muted">未記録</span>'
      : minDays < 0  ? '<span class="badge badge-danger">超過</span>'
      : minDays <= 30 ? '<span class="badge badge-warning">要注意</span>'
      : '<span class="badge badge-success">正常</span>';

    return `<tr>
      <td><strong>${crane.id}</strong></td>
      <td>${crane.vehicleNumber}</td>
      <td>${crane.name}</td>
      <td>${crane.location || '—'}</td>
      <td>${lastDate ? formatDate(lastDate) : '—'}</td>
      <td>${statusBadge}</td>
      <td><a href="admin-crane.html?id=${crane.id}" class="btn btn-sm btn-outline"><i class="fas fa-eye"></i> 詳細</a></td>
    </tr>`;
  }));

  tbody.innerHTML = rows.join('');
}
