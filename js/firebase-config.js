/**
 * Firebase設定ファイル
 * プロジェクト: crane-maintenance-snw
 */

const firebaseConfig = {
  apiKey: "AIzaSyAM3Xal8OYF-jV6Aw4IR3P5YPeyWs5Olzw",
  authDomain: "crane-maintenance-snw.firebaseapp.com",
  projectId: "crane-maintenance-snw",
  storageBucket: "crane-maintenance-snw.firebasestorage.app",
  messagingSenderId: "857408392583",
  appId: "1:857408392583:web:9546a820153fdea9d71722"
};

/* Firebase初期化 */
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
