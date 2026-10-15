// =========================================================
// Νέα Γενιά «Πράξις» — maintenance.js
// Λειτουργία συντήρησης.
//
// Ο διακόπτης είναι στο admin και γράφει στο settings/maintenance.
// Ισχύει αμέσως, χωρίς deploy.
//
// Ο επισκέπτης βλέπει οθόνη συντήρησης. Όποιος είναι συνδεδεμένος με
// ρόλο (admin ή author) βλέπει κανονικά το site, με κόκκινη μπάρα στην
// κορυφή. Δεν είναι μέτρο ασφαλείας: απλώς κρύβει την ενδιάμεση
// κατάσταση των αλλαγών από τον κόσμο.
// =========================================================
import { db, auth } from './firebase-config.js';
import { doc, onSnapshot, getDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const CACHE_KEY = 'ng-maint';   // τελευταία γνωστή κατάσταση, για να μην αναβοσβήνει

// Σταθερό μήνυμα: ο επισκέπτης δεν χρειάζεται να ξέρει τι ακριβώς αλλάζουμε.
const TITLE = 'Κάνουμε μια μικρή συντήρηση';
const TEXT  = 'Ανανεώνουμε τη σελίδα μας και επιστρέφουμε πολύ σύντομα. '
            + 'Ευχαριστούμε για την υπομονή σας.';

let screenEl = null, barEl = null, hasRole = false, state = null;

const cached = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); }
  catch { return null; }
};
const cache = v => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch {}
};

function showScreen() {
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', showScreen);
    return;
  }
  if (!screenEl) {
    screenEl = document.createElement('div');
    screenEl.id = 'maintenance-screen';
    screenEl.setAttribute('role', 'alert');
    screenEl.style.cssText =
      'position:fixed;inset:0;z-index:99999;overflow:auto;background:#FAF7F2;color:#1A1A1A;' +
      'display:flex;align-items:center;justify-content:center;padding:24px 16px;text-align:center;' +
      "font-family:'Segoe UI',system-ui,-apple-system,sans-serif;";
    screenEl.innerHTML = `
      <div style="max-width:520px;width:100%;">
        <img src="/Assets/Images/logo.png" alt="Νέα Γενιά «Πράξις»"
             style="width:120px;max-width:45%;height:auto;margin:0 auto 20px;display:block;">
        <div style="width:54px;height:3px;background:#F4A82C;margin:0 auto 22px;border-radius:2px;"></div>
        <h1 style="font-size:26px;line-height:1.3;font-weight:700;margin:0 0 14px;">${TITLE}</h1>
        <p style="font-size:16px;line-height:1.7;margin:0 auto 10px;max-width:460px;color:#4a4a4a;">${TEXT}</p>
        <p style="font-size:15px;line-height:1.7;margin:0 auto 22px;max-width:460px;color:#777;">
          Αν χρειάζεστε κάτι στο μεταξύ, μπορείτε να μας γράψετε.</p>
        <a href="mailto:newgen.olv@gmail.com"
           style="display:inline-block;background:#F4A82C;color:#1A1A1A;font-weight:700;
                  text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;">
          Στείλτε μας μήνυμα</a>
        <img src="/Assets/Images/olympic_village_qr.png"
             alt="Ολυμπιακό Χωριό, Αχαρνές. Ένας κόσμος δυνατοτήτων."
             loading="lazy"
             style="width:100%;height:auto;margin:28px 0 0;border-radius:14px;
                    box-shadow:0 10px 30px rgba(26,26,26,.16);display:block;">
      </div>`;
    document.body.appendChild(screenEl);
    document.documentElement.style.overflow = 'hidden';
  }
}

function hideScreen() {
  if (screenEl) { screenEl.remove(); screenEl = null; }
  document.documentElement.style.overflow = '';
}

// Όποιος έχει ρόλο βλέπει το site κανονικά, αλλά με προειδοποίηση
function showBar() {
  if (barEl || !document.body) return;
  barEl = document.createElement('div');
  barEl.id = 'maintenance-bar';
  barEl.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:99998;background:#E04A3F;color:#fff;' +
    "font:700 13px 'Segoe UI',system-ui,sans-serif;text-align:center;padding:7px 12px;";
  barEl.textContent =
    'Λειτουργία συντήρησης ΕΝΕΡΓΗ. Οι επισκέπτες βλέπουν οθόνη συντήρησης, εσείς όχι.';
  document.body.appendChild(barEl);
}
const hideBar = () => { if (barEl) { barEl.remove(); barEl = null; } };

function apply() {
  if (!state || !state.on) { hideScreen(); hideBar(); return; }
  if (hasRole) { hideScreen(); showBar(); return; }
  showScreen();
}

// Πρώτο βάψιμο από την τελευταία γνωστή κατάσταση, πριν απαντήσει το Firestore
const first = cached();
if (first && first.on) { state = first; apply(); }

onSnapshot(doc(db, 'settings', 'maintenance'), snap => {
  state = snap.exists() ? (snap.data() || {}) : { on: false };
  cache({ on: !!state.on });
  apply();
}, () => { /* σιωπηλά: χωρίς πρόσβαση, το site δείχνεται κανονικά */ });

onAuthStateChanged(auth, async user => {
  hasRole = false;
  if (user) {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const role = snap.exists() ? snap.data().role : null;
      hasRole = role === 'admin' || role === 'author';
    } catch { /* αν δεν διαβάζεται ο ρόλος, θεωρούμε επισκέπτη */ }
  }
  apply();
});
