/**
 * データ管理モジュール
 * localStorageを使ったCRUD操作を提供します。
 * 将来的にFirebaseへ移行する場合は、このファイルの実装を
 * Firebase SDK呼び出しに置き換えてください。
 *
 * 【Firebase移行時の変更箇所】
 *  - DataStore.getCranes()       → Firestore collection('cranes').get()
 *  - DataStore.getCrane(id)      → Firestore doc('cranes/' + id).get()
 *  - DataStore.saveCrane(crane)  → Firestore doc set/update
 *  - DataStore.deleteCrane(id)   → Firestore doc delete
 *  - DataStore.getMaintenanceRecords(craneId) → collection query
 *  - DataStore.saveMaintenanceRecord(rec)     → doc set/update
 *  - DataStore.deleteMaintenanceRecord(id)    → doc delete
 */

/* ─── localStorageキー ─── */
const LS_CRANES   = 'sanwa_cranes';
const LS_MAINT    = 'sanwa_maintenance';
const LS_INIT     = 'sanwa_initialized';

/* ─── メンテナンス種別定義（拡張時はここに追加） ─── */
const MAINT_TYPES = [
  { key: 'engine_oil',    label: 'エンジンオイル交換', icon: 'fa-oil-can' },
  { key: 'coolant',       label: 'クーラント交換',     icon: 'fa-temperature-half' },
  { key: 'tire_pressure', label: 'タイヤ空気圧点検',   icon: 'fa-circle-dot' },
];

/* ─── サンプルデータ ─── */
const SAMPLE_CRANES = [
  {
    id: 'CRANE-001',
    vehicleNumber: '奈良100 あ 1234',
    name: 'ラフタークレーン 25t',
    model: 'GR-250N',
    location: '奈良営業所',
    status: 'active',
    notes: '定期点検済み',
    createdAt: '2024-01-10T09:00:00.000Z',
  },
  {
    id: 'CRANE-002',
    vehicleNumber: '奈良100 い 5678',
    name: 'ラフタークレーン 50t',
    model: 'GR-500N',
    location: '奈良営業所',
    status: 'active',
    notes: '',
    createdAt: '2024-01-10T09:00:00.000Z',
  },
  {
    id: 'CRANE-003',
    vehicleNumber: '奈良100 う 9012',
    name: 'トラッククレーン 16t',
    model: 'TG-1600M',
    location: '大阪出張所',
    status: 'active',
    notes: 'タイヤ要経過観察',
    createdAt: '2024-01-10T09:00:00.000Z',
  },
];

/* サンプルメンテナンス履歴（各クレーン複数件） */
const SAMPLE_MAINT = [
  /* ─── CRANE-001 ─── */
  {
    id: 'M001',
    craneId: 'CRANE-001',
    type: 'engine_oil',
    date: '2026-02-15',
    nextDate: '2026-05-15',
    operator: '山田太郎',
    notes: '異常なし',
    quantity: '15L',
    createdAt: '2026-02-15T10:00:00.000Z',
  },
  {
    id: 'M002',
    craneId: 'CRANE-001',
    type: 'coolant',
    date: '2026-01-20',
    nextDate: '2026-07-20',
    operator: '山田太郎',
    notes: 'LLC濃度確認済み',
    createdAt: '2026-01-20T14:00:00.000Z',
  },
  {
    id: 'M003',
    craneId: 'CRANE-001',
    type: 'tire_pressure',
    date: '2026-03-10',
    nextDate: '2026-04-10',
    operator: '鈴木一郎',
    notes: '',
    tirePressures: { fl: '700', fr: '700', rl: '720', rr: '710' },
    createdAt: '2026-03-10T08:30:00.000Z',
  },
  /* ─── CRANE-002 ─── */
  {
    id: 'M004',
    craneId: 'CRANE-002',
    type: 'engine_oil',
    date: '2026-01-05',
    nextDate: '2026-04-05',
    operator: '佐藤次郎',
    notes: 'オイル漏れなし',
    quantity: '20L',
    createdAt: '2026-01-05T09:00:00.000Z',
  },
  {
    id: 'M005',
    craneId: 'CRANE-002',
    type: 'tire_pressure',
    date: '2026-03-20',
    nextDate: '2026-04-20',
    operator: '佐藤次郎',
    notes: 'FL若干低め、補充済み',
    tirePressures: { fl: '680', fr: '700', rl: '700', rr: '700' },
    createdAt: '2026-03-20T09:00:00.000Z',
  },
  /* ─── CRANE-003 ─── */
  {
    id: 'M006',
    craneId: 'CRANE-003',
    type: 'engine_oil',
    date: '2025-11-10',
    nextDate: '2026-02-10',
    operator: '田中花子',
    notes: '',
    quantity: '12L',
    createdAt: '2025-11-10T11:00:00.000Z',
  },
  {
    id: 'M007',
    craneId: 'CRANE-003',
    type: 'coolant',
    date: '2025-12-01',
    nextDate: '2026-06-01',
    operator: '田中花子',
    notes: 'LLC補充のみ',
    createdAt: '2025-12-01T13:00:00.000Z',
  },
  {
    id: 'M008',
    craneId: 'CRANE-003',
    type: 'tire_pressure',
    date: '2026-03-25',
    nextDate: '2026-04-25',
    operator: '田中花子',
    notes: 'RR低下、補充済み',
    tirePressures: { fl: '700', fr: '700', rl: '700', rr: '660' },
    createdAt: '2026-03-25T10:00:00.000Z',
  },
];

/* ─────────────────────────────────────────── */

const DataStore = {

  /* ============================================================
     初期化
     ============================================================ */

  /** サンプルデータを投入（未初期化時のみ） */
  init() {
    if (!localStorage.getItem(LS_INIT)) {
      localStorage.setItem(LS_CRANES, JSON.stringify(SAMPLE_CRANES));
      localStorage.setItem(LS_MAINT,  JSON.stringify(SAMPLE_MAINT));
      localStorage.setItem(LS_INIT,   'true');
    }
  },

  /** データを完全にリセットしてサンプルを再投入 */
  reset() {
    localStorage.removeItem(LS_INIT);
    this.init();
  },

  /* ============================================================
     クレーン CRUD
     ============================================================ */

  /** 全クレーンを取得 */
  getCranes() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(LS_CRANES)) || [];
    } catch { return []; }
  },

  /** 指定IDのクレーンを取得（なければnull） */
  getCrane(id) {
    return this.getCranes().find(c => c.id === id) || null;
  },

  /**
   * クレーンを保存（追加 or 更新）
   * @param {Object} crane - idがあれば更新、なければ自動採番して追加
   * @returns {Object} 保存したクレーンオブジェクト
   */
  saveCrane(crane) {
    const cranes = this.getCranes();
    if (!crane.id) {
      crane.id        = this._generateCraneId();
      crane.createdAt = new Date().toISOString();
    }
    crane.updatedAt = new Date().toISOString();

    const idx = cranes.findIndex(c => c.id === crane.id);
    if (idx >= 0) { cranes[idx] = crane; }
    else          { cranes.push(crane); }

    localStorage.setItem(LS_CRANES, JSON.stringify(cranes));
    return crane;
  },

  /** クレーンを削除（紐づくメンテナンス記録も削除） */
  deleteCrane(id) {
    const cranes = this.getCranes().filter(c => c.id !== id);
    localStorage.setItem(LS_CRANES, JSON.stringify(cranes));

    const maint = this.getAllMaintenanceRecords().filter(m => m.craneId !== id);
    localStorage.setItem(LS_MAINT, JSON.stringify(maint));
  },

  /* ============================================================
     メンテナンス記録 CRUD
     ============================================================ */

  /** 全メンテナンス記録を取得 */
  getAllMaintenanceRecords() {
    try {
      return JSON.parse(localStorage.getItem(LS_MAINT)) || [];
    } catch { return []; }
  },

  /** 特定クレーンのメンテナンス記録を新しい順で取得 */
  getMaintenanceRecords(craneId) {
    return this.getAllMaintenanceRecords()
      .filter(m => m.craneId === craneId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * 各メンテナンス種別の最新記録を取得
   * @returns {Object} { engine_oil: {...}, coolant: {...}, tire_pressure: {...} }
   */
  getLatestMaintenanceByType(craneId) {
    const records = this.getMaintenanceRecords(craneId);
    const latest  = {};
    MAINT_TYPES.forEach(t => {
      latest[t.key] = records.find(r => r.type === t.key) || null;
    });
    return latest;
  },

  /**
   * メンテナンス記録を保存（追加 or 更新）
   * @param {Object} record
   * @returns {Object} 保存したレコード
   */
  saveMaintenanceRecord(record) {
    const all = this.getAllMaintenanceRecords();
    if (!record.id) {
      record.id        = this._generateId('M');
      record.createdAt = new Date().toISOString();
    }
    record.updatedAt = new Date().toISOString();

    const idx = all.findIndex(m => m.id === record.id);
    if (idx >= 0) { all[idx] = record; }
    else          { all.push(record); }

    localStorage.setItem(LS_MAINT, JSON.stringify(all));
    return record;
  },

  /** メンテナンス記録を削除 */
  deleteMaintenanceRecord(id) {
    const all = this.getAllMaintenanceRecords().filter(m => m.id !== id);
    localStorage.setItem(LS_MAINT, JSON.stringify(all));
  },

  /** 指定IDのメンテナンス記録を取得 */
  getMaintenanceRecord(id) {
    return this.getAllMaintenanceRecords().find(m => m.id === id) || null;
  },

  /* ============================================================
     ユーティリティ
     ============================================================ */

  /** ユニークなクレーンIDを生成（CRANE-XXX形式） */
  _generateCraneId() {
    const cranes = this.getCranes();
    const nums = cranes
      .map(c => parseInt(c.id.replace('CRANE-', ''), 10))
      .filter(n => !isNaN(n));
    const max  = nums.length ? Math.max(...nums) : 0;
    return 'CRANE-' + String(max + 1).padStart(3, '0');
  },

  /** ユニークIDを生成 */
  _generateId(prefix = 'ID') {
    return prefix + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();
  },

  /** メンテナンス種別定義を返す */
  getMaintTypes() {
    return MAINT_TYPES;
  },

  /** 種別キーからラベルを返す */
  getMaintLabel(key) {
    return MAINT_TYPES.find(t => t.key === key)?.label || key;
  },

  /** 種別キーからアイコンを返す */
  getMaintIcon(key) {
    return MAINT_TYPES.find(t => t.key === key)?.icon || 'fa-wrench';
  },
};
