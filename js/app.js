/**
 * 共通ユーティリティモジュール
 * 全ページで利用する汎用関数を提供します。
 */

/** URLクエリパラメータを取得 */
function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * 日付文字列を日本語形式にフォーマット
 * @param {string} dateStr - 'YYYY-MM-DD' 形式
 * @returns {string} 'YYYY年MM月DD日'
 */
function formatDate(dateStr) {
  if (!dateStr) return '未設定';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 日付文字列をISO日時文字列から日本語形式に
 */
function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d)) return isoStr;
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/**
 * 今日から指定日付までの残日数を返す
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {number|null} 負数 = 超過
 */
function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today  = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target)) return null;
  return Math.round((target - today) / 86400000);
}

/**
 * 残日数からステータスラベルとクラスを返す
 * @param {number|null} days
 * @returns {{ label: string, cls: string, badgeCls: string }}
 */
function getDateStatus(days) {
  if (days === null) return { label: '未設定', cls: 'text-muted', badgeCls: 'badge-muted' };
  if (days < 0)     return { label: `${Math.abs(days)}日超過`, cls: 'text-danger', badgeCls: 'badge-danger' };
  if (days === 0)   return { label: '本日期限',          cls: 'text-danger', badgeCls: 'badge-danger' };
  if (days <= 30)   return { label: `残${days}日`,       cls: 'text-warning', badgeCls: 'badge-warning' };
  return              { label: `残${days}日`,             cls: 'text-success', badgeCls: 'badge-success' };
}

/* ─────────────────────────────────────────── */

/** トースト通知コンテナを取得（なければ生成） */
function _getToastContainer() {
  let el = document.getElementById('toastContainer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastContainer';
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
  return el;
}

/**
 * トースト通知を表示
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration - 表示ミリ秒（0で自動消去なし）
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = _getToastContainer();

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast  = document.createElement('div');
  toast.className  = `toast toast-${type}`;
  toast.innerHTML  = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }
}

/* ─────────────────────────────────────────── */

/**
 * 確認ダイアログを表示
 * @param {string} message
 * @param {Function} onConfirm
 * @param {string} confirmLabel
 */
function showConfirm(message, onConfirm, confirmLabel = '削除する') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-exclamation-triangle"></i>確認</div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <p style="font-size:var(--font-size-base);line-height:1.7">${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">キャンセル</button>
        <button class="btn btn-danger" id="confirmOkBtn">${confirmLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#confirmOkBtn').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });
}

/* ─────────────────────────────────────────── */

/**
 * ヘッダーを描画するヘルパー
 * @param {HTMLElement} el - .header 要素
 * @param {string} subtitle - サブタイトル文字列
 * @param {boolean} isAdmin - 管理者ナビを表示するか
 */
function renderHeader(el, subtitle = '', isAdmin = false) {
  el.innerHTML = `
    <a class="header-brand" href="${isAdmin ? 'admin-dashboard.html' : '#'}">
      <img class="header-logo"
           src="http://sanwacrane.jp/images/logo4.png"
           alt="サンワクレーン"
           onerror="this.style.display='none'">
      <div class="header-brand-text">
        <div class="header-title">サンワクレーン</div>
        ${subtitle ? `<div class="header-subtitle">${subtitle}</div>` : ''}
      </div>
    </a>
    <nav class="header-nav">
      ${isAdmin
        ? `<button onclick="Auth.logout()"><i class="fas fa-sign-out-alt"></i> ログアウト</button>`
        : ''}
    </nav>`;
}

/** 管理者ナビのアクティブ状態を設定 */
function setAdminNavActive(href) {
  document.querySelectorAll('.admin-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === href);
  });
}
