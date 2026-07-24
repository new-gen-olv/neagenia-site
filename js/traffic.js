// =========================================================
// ΝΕΑ ΓΕΝΙΑ «ΠΡΑΞΙΣ» — Site traffic tracking (pageviews + unique visitors)
// Γράφει στο Firestore collection "analytics", ένα doc ανά ημέρα:
//   analytics/2026-07-24 = {
//     totalViews:     number (increment σε κάθε pageview),
//     uniqueVisitors: number (increment 1 φορά/συσκευή/ημέρα),
//     pageBreakdown:  { "index": 12, "action": 5, ... },
//     lastUpdated:    serverTimestamp
//   }
// Δεν χρειάζεται login — τα rules επιτρέπουν increment-only writes.
// =========================================================
import { db } from './firebase-config.js';
import {
  doc, setDoc, updateDoc, increment, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── storage helpers (private mode μπορεί να πετάξει exception) ──
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const ssGet = k => { try { return sessionStorage.getItem(k); } catch { return null; } };
const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch {} };

function uuid() {
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const pad = n => (n < 10 ? '0' : '') + n;

// Doc ID ημέρας σε τοπική ώρα, π.χ. "2026-07-24"
function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// Κλειδί σελίδας για το pageBreakdown map: "index", "action", "sponsors"...
function pageKey() {
  let p = (location.pathname || '/').replace(/^\/+/, '').replace(/\.html$/i, '');
  if (!p) p = 'index';
  return p.replace(/[.~*/\[\]]/g, '_').substring(0, 80) || 'index';
}

function record() {
  const day = todayKey();
  const page = pageKey();

  // Guard: 1 pageview ανά σελίδα ανά session ανά ημέρα (reload δεν ξαναμετράει)
  const sessionKey = 'ng_pv_' + day + '_' + page;
  if (ssGet(sessionKey)) return;

  // Anonymous visitor id (μόνιμο ανά συσκευή/browser)
  if (!lsGet('ng_visitor_id')) lsSet('ng_visitor_id', uuid());
  // Unique visitor: μετράει 1 φορά ανά συσκευή ανά ημέρα
  const isNewToday = lsGet('ng_uv_date') !== day;

  const update = {
    totalViews: increment(1),
    lastUpdated: serverTimestamp(),
    pageBreakdown: { [page]: increment(1) }
  };
  if (isNewToday) update.uniqueVisitors = increment(1);

  setDoc(doc(db, 'analytics', day), update, { merge: true })
    .then(() => {
      // Σημαδεύουμε ΜΕΤΑ την επιτυχία, ώστε αποτυχία να ξαναδοκιμαστεί στο επόμενο load
      ssSet(sessionKey, '1');
      if (isNewToday) lsSet('ng_uv_date', day);
    })
    .catch(() => {}); // σιωπηλή αποτυχία — το tracking δεν σπάει ποτέ τη σελίδα
}

// ── Μετρητής προβολών ανά άρθρο/ανακοίνωση (viewCount πάνω στο ίδιο το doc) ──
// Τρέχει μόνο στο article.html (?id=...&col=articles|announcements).
// Τα rules επιτρέπουν δημόσιο update ΜΟΝΟ του viewCount, μόνο +1, μόνο σε published.
function recordArticleView() {
  if (pageKey() !== 'article') return;
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const col = params.get('col') || 'articles';
  if (!id || !/^[A-Za-z0-9_-]{1,60}$/.test(id)) return;
  if (col !== 'articles' && col !== 'announcements') return;

  // Guard: 1 προβολή ανά άρθρο ανά session
  const sessionKey = 'ng_av_' + col + '_' + id;
  if (ssGet(sessionKey)) return;

  updateDoc(doc(db, col, id), { viewCount: increment(1) })
    .then(() => { ssSet(sessionKey, '1'); })
    .catch(() => {}); // ανύπαρκτο/μη δημοσιευμένο άρθρο: απλώς δεν μετράει
}

// Τρέχει αφού φορτώσει η σελίδα, σε idle time, για μηδενική επίδραση στο loading
function schedule() {
  if (window.requestIdleCallback) requestIdleCallback(record, { timeout: 4000 });
  else setTimeout(record, 1500);
  if (window.requestIdleCallback) requestIdleCallback(recordArticleView, { timeout: 4000 });
  else setTimeout(recordArticleView, 1600);
}
if (document.readyState === 'complete') schedule();
else window.addEventListener('load', schedule);
