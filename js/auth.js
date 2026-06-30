// auth.js — login, logout, Google sign-in, password reset, role check

import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc, getDoc, setDoc, deleteDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const provider = new GoogleAuthProvider();

async function getUserRole(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  console.log('[Auth] doc exists =', snap.exists(), '| data =', snap.exists() ? snap.data() : 'N/A');
  return snap.exists() ? snap.data().role : null;
}

// Ελέγχει αν υπάρχει invite για το email, δημιουργεί users doc και διαγράφει το invite
async function claimInvite(user) {
  const emailKey = (user.email || '').toLowerCase().trim();
  if (!emailKey) return null;
  try {
    const inviteSnap = await getDoc(doc(db, 'invites', emailKey));
    if (!inviteSnap.exists()) return null;
    const role = inviteSnap.data().role;
    await setDoc(doc(db, 'users', user.uid), {
      email:       user.email,
      displayName: user.displayName || '',
      role,
      createdAt:   serverTimestamp()
    });
    try { await deleteDoc(doc(db, 'invites', emailKey)); } catch {}
    console.log('[Auth] Invite claimed → role:', role);
    return role;
  } catch (err) {
    console.warn('[Auth] claimInvite error:', err.message);
    return null;
  }
}

function showError(msg) {
  const el = document.getElementById('loginError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function showNoAccess() {
  const el = document.getElementById('noAccessMsg');
  if (el) el.style.display = 'block';
}

// Κεντρικός role check — καλείται από popup/email handlers μετά από επιτυχή σύνδεση
async function handleLoginSuccess(user) {
  console.log('[Auth] handleLoginSuccess | uid =', user.uid, '| email =', user.email);
  let role = await getUserRole(user.uid);
  console.log('[Auth] role from users doc =', role);
  if (!role) role = await claimInvite(user);
  if (role === 'admin' || role === 'author') {
    console.log('[Auth] → admin.html');
    window.location.href = 'admin.html';
  } else {
    console.log('[Auth] → no valid role, signing out');
    await signOut(auth);
    showNoAccess();
  }
}

// Email/Password login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn      = document.getElementById('btnLogin');
    btn.disabled = true;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await handleLoginSuccess(cred.user);
    } catch (err) {
      const msgs = {
        'auth/invalid-credential': 'Λάθος email ή κωδικός.',
        'auth/too-many-requests':  'Πολλές αποτυχημένες προσπάθειες. Δοκίμασε αργότερα.',
        'auth/user-not-found':     'Δεν βρέθηκε λογαριασμός.',
        'auth/wrong-password':     'Λάθος κωδικός.',
      };
      showError(msgs[err.code] || 'Σφάλμα σύνδεσης. Δοκίμασε ξανά.');
    } finally {
      btn.disabled = false;
    }
  });
}

// Google sign-in — popup (το COOP warning είναι μη-fatal, το popup ολοκληρώνεται κανονικά)
const btnGoogle = document.getElementById('btnGoogle');
if (btnGoogle) {
  btnGoogle.addEventListener('click', async () => {
    try {
      const cred = await signInWithPopup(auth, provider);
      await handleLoginSuccess(cred.user);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        showError('Σφάλμα Google Sign-in. Δοκίμασε ξανά.');
      }
    }
  });
}

// Password reset
const forgotLink = document.getElementById('forgotLink');
if (forgotLink) {
  forgotLink.addEventListener('click', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) { showError('Πληκτρολόγησε το email σου πρώτα.'); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Email επαναφοράς εστάλη. Έλεγξε τα εισερχόμενά σου.');
    } catch {
      showError('Δεν βρέθηκε λογαριασμός με αυτό το email.');
    }
  });
}

// Existing session — αν ο χρήστης επιστρέψει στο login ενώ είναι ήδη συνδεδεμένος
onAuthStateChanged(auth, async user => {
  if (!user) return;
  // Αν φτάσουμε εδώ μέσω popup/email, το handleLoginSuccess τρέχει ήδη — το redirect
  // θα γίνει εκεί. Αυτό αφορά μόνο existing sessions (σελίδα φόρτωσε ενώ ήταν logged in).
  const role = await getUserRole(user.uid);
  if (role === 'admin' || role === 'author') {
    window.location.href = 'admin.html';
  }
});

export { getUserRole, auth, signOut };
