// Firebase configuration — client-side public (ασφάλεια μέσω Firestore Rules + App Check)
const firebaseConfig = {
  apiKey: "AIzaSyCiCgfbEVhriFppJ-UQ_Q1uqWZ9sWKVF44",
  authDomain: "nea-genia-olympiakou-choriou.firebaseapp.com",
  projectId: "nea-genia-olympiakou-choriou",
  storageBucket: "nea-genia-olympiakou-choriou.firebasestorage.app",
  messagingSenderId: "820215884122",
  appId: "1:820215884122:web:d1b5d301b29e40eab86b63"
};

// reCAPTCHA v3 site key — βάλε το πραγματικό από Google reCAPTCHA console
const RECAPTCHA_V3_SITE_KEY = "6Lc41T0tAAAAADGo-BHwood-wKVJHAYlBztFyB7K";

// ImgBB API key — βάλε το πραγματικό από api.imgbb.com
const IMGBB_API_KEY = "70900f5b3dbad933ac0e1a79374b4f93";

// Firebase SDK imports (modular v10+ από CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app = initializeApp(firebaseConfig);

// Debug token — μόνο σε localhost, αυτόματα απενεργοποιείται σε οποιοδήποτε άλλο domain
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// App Check με reCAPTCHA v3 (δωρεάν, δεν χρειάζεται Blaze)
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
  isTokenAutoRefreshEnabled: true
});

export const db = getFirestore(app);
export const auth = getAuth(app);
export { IMGBB_API_KEY };
