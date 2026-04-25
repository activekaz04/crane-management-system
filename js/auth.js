/**
 * 認証・権限管理モジュール
 * localStorageでセッションを管理します。
 */

/* パスワードのSHA-256ハッシュ値（パスワード本文はここに含まれません） */
const ADMIN_PASSWORD_HASH = '5e4a60ab4d804ab6101bb16700442675edf05d03b60a517a2aec373679f1dac5';
const LS_AUTH             = 'sanwa_auth_session';

async function _hashPassword(password) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const Auth = {

  async login(password) {
    const hash = await _hashPassword(password);
    if (hash !== ADMIN_PASSWORD_HASH) return false;

    const session = {
      isLoggedIn: true,
      loginAt:    new Date().toISOString(),
    };
    localStorage.setItem(LS_AUTH, JSON.stringify(session));
    return true;
  },

  /** ログアウト処理 */
  logout() {
    localStorage.removeItem(LS_AUTH);
    window.location.href = 'admin-login.html';
  },

  /** ログイン中か確認 */
  isLoggedIn() {
    try {
      const session = JSON.parse(localStorage.getItem(LS_AUTH));
      return !!(session && session.isLoggedIn);
    } catch { return false; }
  },

  /**
   * 管理者ページ保護用ガード
   * 未ログインなら管理者ログインページへリダイレクト
   */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'admin-login.html';
      return false;
    }
    return true;
  },
};
