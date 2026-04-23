/**
 * データ管理モジュール（Firebase Firestore版）
 * 全端末でリアルタイムにデータが同期されます。
 *
 * コレクション構成:
 *   cranes/       - クレーン情報
 *   maintenance/  - メンテナンス記録
 */

/* ─── メンテナンス種別定義（拡張時はここに追加） ─── */
const MAINT_TYPES = [
  { key: 'engine_oil',    label: 'エンジンオイル交換', icon: 'fa-oil-can' },
  { key: 'coolant',       label: 'クーラント交換',     icon: 'fa-temperature-half' },
  { key: 'tire_pressure', label: 'タイヤ空気圧点検',   icon: 'fa-circle-dot' },
];

/* ─── サンプルデータ ─── */
const SAMPLE_CRANES = [
  { id: 'CRANE-001', vehicleNumber: '奈良100 あ 1234', name: 'ラフタークレーン 25t', model: 'GR-250N',  location: '奈良営業所', status: 'active', notes: '定期点検済み', createdAt: '2024-01-10T09:00:00.000Z' },
  { id: 'CRANE-002', vehicleNumber: '奈良100 い 5678', name: 'ラフタークレーン 50t', model: 'GR-500N',  location: '奈良営業所', status: 'active', notes: '',         createdAt: '2024-01-10T09:00:00.000Z' },
  { id: 'CRANE-003', vehicleNumber: '奈良100 う 9012', name: 'トラッククレーン 16t', model: 'TG-1600M', location: '大阪出張所', status: 'active', notes: 'タイヤ要経過観察', createdAt: '2024-01-10T09:00:00.000Z' },
];

const SAMPLE_MAINT = [
  { id: 'M001', craneId: 'CRANE-001', type: 'engine_oil',    date: '2026-02-15', nextDate: '2026-05-15', operator: '山田太郎', notes: '異常なし',        quantity: '15L', createdAt: '2026-02-15T10:00:00.000Z' },
  { id: 'M002', craneId: 'CRANE-001', type: 'coolant',       date: '2026-01-20', nextDate: '2026-07-20', operator: '山田太郎', notes: 'LLC濃度確認済み', createdAt: '2026-01-20T14:00:00.000Z' },
  { id: 'M003', craneId: 'CRANE-001', type: 'tire_pressure', date: '2026-03-10', nextDate: '2026-04-10', operator: '鈴木一郎', notes: '', tirePressures: { fl:'700', fr:'700', rl:'720', rr:'710' }, createdAt: '2026-03-10T08:30:00.000Z' },
  { id: 'M004', craneId: 'CRANE-002', type: 'engine_oil',    date: '2026-01-05', nextDate: '2026-04-05', operator: '佐藤次郎', notes: 'オイル漏れなし', quantity: '20L', createdAt: '2026-01-05T09:00:00.000Z' },
  { id: 'M005', craneId: 'CRANE-002', type: 'tire_pressure', date: '2026-03-20', nextDate: '2026-04-20', operator: '佐藤次郎', notes: 'FL若干低め、補充済み', tirePressures: { fl:'680', fr:'700', rl:'700', rr:'700' }, createdAt: '2026-03-20T09:00:00.000Z' },
  { id: 'M006', craneId: 'CRANE-003', type: 'engine_oil',    date: '2025-11-10', nextDate: '2026-02-10', operator: '田中花子', notes: '', quantity: '12L', createdAt: '2025-11-10T11:00:00.000Z' },
  { id: 'M007', craneId: 'CRANE-003', type: 'coolant',       date: '2025-12-01', nextDate: '2026-06-01', operator: '田中花子', notes: 'LLC補充のみ', createdAt: '2025-12-01T13:00:00.000Z' },
  { id: 'M008', craneId: 'CRANE-003', type: 'tire_pressure', date: '2026-03-25', nextDate: '2026-04-25', operator: '田中花子', notes: 'RR低下、補充済み', tirePressures: { fl:'700', fr:'700', rl:'700', rr:'660' }, createdAt: '2026-03-25T10:00:00.000Z' },
];

/* ─────────────────────────────────────────── */

const DataStore = {

  /* ============================================================
     初期化：Firestoreが空ならサンプルデータを投入
     ============================================================ */
  async init() {
    const snap = await db.collection('cranes').limit(1).get();
    if (snap.empty) {
      const batch = db.batch();
      SAMPLE_CRANES.forEach(c => batch.set(db.collection('cranes').doc(c.id), c));
      SAMPLE_MAINT.forEach(m => batch.set(db.collection('maintenance').doc(m.id), m));
      await batch.commit();
    }
  },

  /* ============================================================
     クレーン CRUD
     ============================================================ */

  async getCranes() {
    const snap = await db.collection('cranes').get();
    const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    return list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  },

  async getCrane(id) {
    const doc = await db.collection('cranes').doc(id).get();
    return doc.exists ? { ...doc.data(), id: doc.id } : null;
  },

  async saveCrane(crane) {
    if (!crane.id) {
      crane.id        = await this._generateCraneId();
      crane.createdAt = new Date().toISOString();
    }
    crane.updatedAt = new Date().toISOString();
    await db.collection('cranes').doc(crane.id).set(crane);
    return crane;
  },

  async deleteCrane(id) {
    await db.collection('cranes').doc(id).delete();
    /* 紐づくメンテナンス記録も削除 */
    const snap = await db.collection('maintenance').where('craneId', '==', id).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  },

  /* ============================================================
     メンテナンス記録 CRUD
     ============================================================ */

  async getAllMaintenanceRecords() {
    const snap = await db.collection('maintenance').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  },

  async getMaintenanceRecords(craneId) {
    const snap = await db.collection('maintenance')
      .where('craneId', '==', craneId)
      .get();
    const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  async getLatestMaintenanceByType(craneId) {
    const records = await this.getMaintenanceRecords(craneId);
    const latest  = {};
    MAINT_TYPES.forEach(t => {
      latest[t.key] = records.find(r => r.type === t.key) || null;
    });
    return latest;
  },

  async saveMaintenanceRecord(record) {
    if (!record.id) {
      record.id        = this._generateId('M');
      record.createdAt = new Date().toISOString();
    }
    record.updatedAt = new Date().toISOString();
    await db.collection('maintenance').doc(record.id).set(record);
    return record;
  },

  async deleteMaintenanceRecord(id) {
    await db.collection('maintenance').doc(id).delete();
  },

  async getMaintenanceRecord(id) {
    const doc = await db.collection('maintenance').doc(id).get();
    return doc.exists ? { ...doc.data(), id: doc.id } : null;
  },

  /* ============================================================
     ユーティリティ
     ============================================================ */

  async _generateCraneId() {
    const cranes = await this.getCranes();
    const nums   = cranes.map(c => parseInt(c.id.replace('CRANE-', ''), 10)).filter(n => !isNaN(n));
    const max    = nums.length ? Math.max(...nums) : 0;
    return 'CRANE-' + String(max + 1).padStart(3, '0');
  },

  _generateId(prefix = 'ID') {
    return prefix + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();
  },

  getMaintTypes()       { return MAINT_TYPES; },
  getMaintLabel(key)    { return MAINT_TYPES.find(t => t.key === key)?.label || key; },
  getMaintIcon(key)     { return MAINT_TYPES.find(t => t.key === key)?.icon  || 'fa-wrench'; },
};
