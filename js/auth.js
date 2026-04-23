/**
 * 認証・権限管理モジュール
 * localStorageでセッションを管理します。
 * 本番運用前に必ずパスワードを変更してください。
 */

/* 管理者パスワード（本番前に変更推奨） */
const ADMIN_PASSWORD = 'sanwa2024';
const LS_AUTH        = 'sanwa_auth_session';

const Auth = {

  /**
   * ログイン処理
   * @param {string} password - 入力されたパスワード
   * @returns {boolean} 成功可否
   */
  login(password) {
    if (password !== ADMIN_PASSWORD) return false;

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
