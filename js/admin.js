// admin.js — CRUD, approve/reject, roles, ImgBB upload, forms display

import { auth, db, IMGBB_API_KEY } from './firebase-config.js';
import {
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc,
  query, where, orderBy, serverTimestamp, limit
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== STATE =====
let currentUser = null;
let currentRole = null; // 'admin' | 'author'
let editingArticleId = null;
let editingAnnId = null;
let editingActionId = null;
let editingActionImageUrl = '';

// ===== AUTH GUARD =====
onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = 'login.html'; return; }
  const snap = await getDoc(doc(db, 'users', user.uid));
  const role = snap.exists() ? snap.data().role : null;
  if (role !== 'admin' && role !== 'author') {
    await signOut(auth); window.location.href = 'login.html'; return;
  }
  currentUser = user;
  currentRole = role;
  document.getElementById('userDisplayName').textContent = user.displayName || user.email;
  document.getElementById('userRoleBadge').textContent = currentRole === 'admin' ? 'Admin' : 'Author';

  if (currentRole !== 'admin') {
    document.querySelectorAll('.admin-only-tab').forEach(el => el.style.display = 'none');
  }

  initTabs();
  loadPending();
  loadArticles();
  loadAnnouncements();
  loadGallery();
  loadActionsAdmin();
  if (currentRole === 'admin') {
    loadVolunteers();
    loadMessages();
    loadMembers();
  }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// ===== TABS =====
function initTabs() {
  const switchTo = panel => {
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-item, .admin-tabs-mobile button').forEach(t => t.classList.remove('active'));
    document.getElementById('panel-' + panel)?.classList.add('active');
    document.querySelectorAll(`[data-panel="${panel}"]`).forEach(t => t.classList.add('active'));
  };
  document.querySelectorAll('[data-panel]').forEach(el => {
    el.addEventListener('click', () => switchTo(el.dataset.panel));
  });
}

// ===== HELPERS =====
function fmt(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(s) {
  return `<span class="status-badge ${s}">${s === 'published' ? '✓ Δημοσ.' : '⏳ Εκκρεμεί'}</span>`;
}

// ImgBB upload — επιστρέφει public URL
async function uploadToImgBB(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Μέγιστο μέγεθος εικόνας: 5MB');
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: form });
  const json = await res.json();
  if (!json.success) throw new Error('Αποτυχία ανεβάσματος εικόνας');
  return json.data.url;
}

function setupUploadArea(areaId, inputId, previewId, statusId) {
  const area = document.getElementById(areaId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const status = document.getElementById(statusId);
  if (!area) return;

  area.addEventListener('click', () => input.click());
  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) { input.files = e.dataTransfer.files; input.dispatchEvent(new Event('change')); }
  });
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { status.textContent = 'Μόνο εικόνες επιτρέπονται.'; return; }
    if (file.size > 5 * 1024 * 1024) { status.textContent = 'Μέγιστο 5MB.'; return; }
    status.textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.classList.remove('hidden'); };
    reader.readAsDataURL(file);
  });
}

// ===== PENDING =====
async function loadPending() {
  const el = document.getElementById('pendingContent');
  let count = 0;
  let html = '';

  for (const col of ['articles', 'announcements', 'gallery', 'actions']) {
    try {
      // where + orderBy σε διαφορετικά fields → χρειάζεται composite index στο Firestore
      const q = query(collection(db, col), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        count++;
        const data = d.data();
        const label = data.title || data.titleEl || '(Gallery)';
        html += `<div style="background:#fff;border-radius:10px;padding:16px 20px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.07);display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <strong>${label}</strong>
            <span style="font-size:0.75rem;color:#888;margin-left:8px;">${col}</span>
            <div style="font-size:0.8rem;color:#888;margin-top:4px;">${data.authorName || data.uploadedByName || ''} · ${fmt(data.createdAt)}</div>
          </div>
          ${currentRole === 'admin' ? `
            <button class="btn btn-sm btn-primary" data-approve="${d.id}" data-col="${col}">Έγκριση</button>
            <button class="btn btn-sm btn-danger" data-reject="${d.id}" data-col="${col}">Απόρριψη</button>
          ` : ''}
        </div>`;
      });
    } catch (err) {
      console.warn(`[Pending] ${col}:`, err.message);
      // Αν λείπει composite index, το Firestore link για δημιουργία του εμφανίζεται στην κονσόλα
    }
  }

  el.innerHTML = html || '<p style="color:#888;">Δεν υπάρχουν εκκρεμότητες.</p>';

  const badge = document.getElementById('pendingBadge');
  if (count > 0) { badge.textContent = count; badge.style.display = 'inline-block'; }

  el.querySelectorAll('[data-approve]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateDoc(doc(db, btn.dataset.col, btn.dataset.approve), { status: 'published', publishedAt: serverTimestamp() });
      loadPending();
    });
  });
  el.querySelectorAll('[data-reject]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await deleteDoc(doc(db, btn.dataset.col, btn.dataset.reject));
      loadPending();
    });
  });
}

// ===== ARTICLES =====
setupUploadArea('articleUploadArea', 'articleImageFile', 'articleImagePreview', 'articleUploadStatus');

async function loadArticles() {
  const el = document.getElementById('articlesList');
  const q = currentRole === 'admin'
    ? query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(50))
    : query(collection(db, 'articles'), where('authorUid', '==', currentUser.uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  if (snap.empty) { el.innerHTML = '<p style="color:#888;">Δεν υπάρχουν άρθρα.</p>'; return; }
  el.innerHTML = `<table class="content-table">
    <thead><tr><th>Τίτλος</th><th>Συγγραφέας</th><th>Ημ/νία</th><th>Κατάσταση</th><th>Ενέργειες</th></tr></thead>
    <tbody>${snap.docs.map(d => {
      const data = d.data();
      const canEdit = currentRole === 'admin' || data.authorUid === currentUser.uid;
      return `<tr>
        <td><strong>${data.title}</strong></td>
        <td style="font-size:0.82rem;color:#666;">${data.authorName || '—'}</td>
        <td style="font-size:0.8rem;color:#888;">${fmt(data.createdAt)}</td>
        <td>${statusBadge(data.status)}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          ${canEdit ? `<button class="btn btn-sm btn-blue" data-edit-art="${d.id}">Επεξ.</button>` : ''}
          ${canEdit ? `<button class="btn btn-sm btn-danger" data-del-art="${d.id}">Διαγρ.</button>` : ''}
          ${currentRole === 'admin' && data.status === 'pending' ? `<button class="btn btn-sm btn-primary" data-pub-art="${d.id}">Δημοσ.</button>` : ''}
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;

  el.querySelectorAll('[data-edit-art]').forEach(btn => btn.addEventListener('click', () => startEditArticle(btn.dataset.editArt)));
  el.querySelectorAll('[data-del-art]').forEach(btn => btn.addEventListener('click', async () => {
    if (confirm('Διαγραφή άρθρου;')) { await deleteDoc(doc(db, 'articles', btn.dataset.delArt)); loadArticles(); loadPending(); }
  }));
  el.querySelectorAll('[data-pub-art]').forEach(btn => btn.addEventListener('click', async () => {
    await updateDoc(doc(db, 'articles', btn.dataset.pubArt), { status: 'published', publishedAt: serverTimestamp() });
    loadArticles(); loadPending();
  }));
}

async function startEditArticle(id) {
  const snap = await getDoc(doc(db, 'articles', id));
  const d = snap.data();
  document.getElementById('articleTitle').value = d.title;
  document.getElementById('articleBody').value = d.body;
  document.getElementById('articleFormTitle').textContent = 'Επεξεργασία Άρθρου';
  document.getElementById('btnCancelArticle').style.display = 'inline-block';
  editingArticleId = id;
  document.getElementById('panel-articles').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('btnCancelArticle').addEventListener('click', () => {
  editingArticleId = null;
  document.getElementById('articleTitle').value = '';
  document.getElementById('articleBody').value = '';
  document.getElementById('articleFormTitle').textContent = 'Νέο Άρθρο';
  document.getElementById('btnCancelArticle').style.display = 'none';
  document.getElementById('articleError').style.display = 'none';
  document.getElementById('articleImagePreview').classList.add('hidden');
  document.getElementById('articleUploadStatus').textContent = '';
});

document.getElementById('btnSubmitArticle').addEventListener('click', async () => {
  const title = document.getElementById('articleTitle').value.trim();
  const body = document.getElementById('articleBody').value.trim();
  const errEl = document.getElementById('articleError');
  errEl.style.display = 'none';
  if (!title || !body) { errEl.textContent = 'Τίτλος και κείμενο είναι υποχρεωτικά.'; errEl.style.display = 'block'; return; }

  const btn = document.getElementById('btnSubmitArticle');
  btn.disabled = true;
  btn.textContent = 'Αποθήκευση…';

  try {
    let coverImageUrl = '';
    const file = document.getElementById('articleImageFile').files[0];
    if (file) {
      document.getElementById('articleUploadStatus').textContent = 'Ανέβασμα εικόνας…';
      coverImageUrl = await uploadToImgBB(file);
    }

    if (editingArticleId) {
      const updates = { title, body };
      if (coverImageUrl) updates.coverImageUrl = coverImageUrl;
      await updateDoc(doc(db, 'articles', editingArticleId), updates);
    } else {
      await addDoc(collection(db, 'articles'), {
        title, body, coverImageUrl,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email,
        status: currentRole === 'admin' ? 'published' : 'pending',
        createdAt: serverTimestamp(),
        publishedAt: currentRole === 'admin' ? serverTimestamp() : null
      });
    }
    document.getElementById('btnCancelArticle').click();
    loadArticles(); loadPending();
  } catch (err) {
    errEl.textContent = err.message || 'Σφάλμα αποθήκευσης.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Αποθήκευση';
  }
});

// ===== ANNOUNCEMENTS =====
async function loadAnnouncements() {
  const el = document.getElementById('annList');
  const q = currentRole === 'admin'
    ? query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(50))
    : query(collection(db, 'announcements'), where('authorUid', '==', currentUser.uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  if (snap.empty) { el.innerHTML = '<p style="color:#888;">Δεν υπάρχουν ανακοινώσεις.</p>'; return; }
  el.innerHTML = `<table class="content-table">
    <thead><tr><th>Τίτλος</th><th>Συγγραφέας</th><th>Ημ/νία</th><th>Κατάσταση</th><th>Ενέργειες</th></tr></thead>
    <tbody>${snap.docs.map(d => {
      const data = d.data();
      const canEdit = currentRole === 'admin' || data.authorUid === currentUser.uid;
      return `<tr>
        <td><strong>${data.title}</strong></td>
        <td style="font-size:0.82rem;color:#666;">${data.authorName || '—'}</td>
        <td style="font-size:0.8rem;color:#888;">${fmt(data.createdAt)}</td>
        <td>${statusBadge(data.status)}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          ${canEdit ? `<button class="btn btn-sm btn-blue" data-edit-ann="${d.id}">Επεξ.</button>` : ''}
          ${canEdit ? `<button class="btn btn-sm btn-danger" data-del-ann="${d.id}">Διαγρ.</button>` : ''}
          ${currentRole === 'admin' && data.status === 'pending' ? `<button class="btn btn-sm btn-primary" data-pub-ann="${d.id}">Δημοσ.</button>` : ''}
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;

  el.querySelectorAll('[data-edit-ann]').forEach(btn => btn.addEventListener('click', async () => {
    const snap = await getDoc(doc(db, 'announcements', btn.dataset.editAnn));
    const d = snap.data();
    document.getElementById('annTitle').value = d.title;
    document.getElementById('annBody').value = d.body;
    document.getElementById('annFormTitle').textContent = 'Επεξεργασία Ανακοίνωσης';
    document.getElementById('btnCancelAnn').style.display = 'inline-block';
    editingAnnId = btn.dataset.editAnn;
  }));
  el.querySelectorAll('[data-del-ann]').forEach(btn => btn.addEventListener('click', async () => {
    if (confirm('Διαγραφή ανακοίνωσης;')) { await deleteDoc(doc(db, 'announcements', btn.dataset.delAnn)); loadAnnouncements(); loadPending(); }
  }));
  el.querySelectorAll('[data-pub-ann]').forEach(btn => btn.addEventListener('click', async () => {
    await updateDoc(doc(db, 'announcements', btn.dataset.pubAnn), { status: 'published', publishedAt: serverTimestamp() });
    loadAnnouncements(); loadPending();
  }));
}

document.getElementById('btnCancelAnn').addEventListener('click', () => {
  editingAnnId = null;
  document.getElementById('annTitle').value = '';
  document.getElementById('annBody').value = '';
  document.getElementById('annFormTitle').textContent = 'Νέα Ανακοίνωση';
  document.getElementById('btnCancelAnn').style.display = 'none';
});

document.getElementById('btnSubmitAnn').addEventListener('click', async () => {
  const title = document.getElementById('annTitle').value.trim();
  const body = document.getElementById('annBody').value.trim();
  const errEl = document.getElementById('annError');
  if (!title || !body) { errEl.textContent = 'Τίτλος και κείμενο είναι υποχρεωτικά.'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';
  const btn = document.getElementById('btnSubmitAnn');
  btn.disabled = true;
  try {
    if (editingAnnId) {
      await updateDoc(doc(db, 'announcements', editingAnnId), { title, body });
    } else {
      await addDoc(collection(db, 'announcements'), {
        title, body,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email,
        status: currentRole === 'admin' ? 'published' : 'pending',
        createdAt: serverTimestamp(),
        publishedAt: currentRole === 'admin' ? serverTimestamp() : null
      });
    }
    document.getElementById('btnCancelAnn').click();
    loadAnnouncements(); loadPending();
  } catch { errEl.textContent = 'Σφάλμα.'; errEl.style.display = 'block'; }
  finally { btn.disabled = false; }
});

// ===== GALLERY =====
setupUploadArea('galleryUploadArea', 'galleryImageFile', 'galleryImagePreview', 'galleryUploadStatus');

async function loadGallery() {
  const el = document.getElementById('galleryList');
  const q = currentRole === 'admin'
    ? query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(50))
    : query(collection(db, 'gallery'), where('uploadedByUid', '==', currentUser.uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  if (snap.empty) { el.innerHTML = '<p style="color:#888;">Δεν υπάρχουν φωτογραφίες.</p>'; return; }
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-top:8px;">${
    snap.docs.map(d => {
      const data = d.data();
      return `<div style="position:relative;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08);">
        <img src="${data.imageUrl}" alt="${data.caption || ''}" style="width:100%;aspect-ratio:4/3;object-fit:cover;" loading="lazy" />
        <div style="padding:8px 10px;font-size:0.78rem;background:#fff;">
          ${statusBadge(data.status)}<br/>
          <span style="color:#888;">${data.uploadedByName || ''}</span>
        </div>
        ${currentRole === 'admin' || data.uploadedByUid === currentUser.uid
          ? `<button class="btn btn-sm btn-danger" data-del-gal="${d.id}" style="position:absolute;top:6px;right:6px;opacity:0.85;">✕</button>`
          : ''}
        ${currentRole === 'admin' && data.status === 'pending'
          ? `<button class="btn btn-sm btn-primary" data-pub-gal="${d.id}" style="position:absolute;top:6px;left:6px;opacity:0.9;">✓</button>`
          : ''}
      </div>`;
    }).join('')
  }</div>`;

  el.querySelectorAll('[data-del-gal]').forEach(btn => btn.addEventListener('click', async () => {
    if (confirm('Διαγραφή φωτογραφίας;')) { await deleteDoc(doc(db, 'gallery', btn.dataset.delGal)); loadGallery(); loadPending(); }
  }));
  el.querySelectorAll('[data-pub-gal]').forEach(btn => btn.addEventListener('click', async () => {
    await updateDoc(doc(db, 'gallery', btn.dataset.pubGal), { status: 'published' });
    loadGallery(); loadPending();
  }));
}

document.getElementById('btnSubmitGallery').addEventListener('click', async () => {
  const file = document.getElementById('galleryImageFile').files[0];
  const caption = document.getElementById('galleryCaption').value.trim();
  const errEl = document.getElementById('galleryError');
  const statusEl = document.getElementById('galleryUploadStatus');
  if (!file) { errEl.textContent = 'Επίλεξε εικόνα.'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';
  const btn = document.getElementById('btnSubmitGallery');
  btn.disabled = true; statusEl.textContent = 'Ανέβασμα…';
  try {
    const url = await uploadToImgBB(file);
    await addDoc(collection(db, 'gallery'), {
      imageUrl: url, caption,
      uploadedByUid: currentUser.uid,
      uploadedByName: currentUser.displayName || currentUser.email,
      status: currentRole === 'admin' ? 'published' : 'pending',
      createdAt: serverTimestamp()
    });
    statusEl.textContent = 'Ανέβηκε!';
    document.getElementById('galleryCaption').value = '';
    document.getElementById('galleryImagePreview').classList.add('hidden');
    document.getElementById('galleryImageFile').value = '';
    loadGallery(); loadPending();
  } catch (err) { errEl.textContent = err.message; errEl.style.display = 'block'; statusEl.textContent = ''; }
  finally { btn.disabled = false; }
});

// ===== VOLUNTEERS (admin only) =====
async function loadVolunteers() {
  const el = document.getElementById('volunteersList');
  const q = query(collection(db, 'volunteers'), orderBy('createdAt', 'desc'), limit(100));
  const snap = await getDocs(q);
  if (snap.empty) { el.innerHTML = '<p style="color:#888;">Δεν υπάρχουν εγγραφές εθελοντών.</p>'; return; }
  el.innerHTML = `<table class="content-table">
    <thead><tr><th>Όνομα</th><th>Email</th><th>Τηλέφωνο</th><th>Ενδιαφέροντα</th><th>Μήνυμα</th><th>Ημ/νία</th></tr></thead>
    <tbody>${snap.docs.map(d => {
      const v = d.data();
      return `<tr>
        <td><strong>${v.name}</strong></td>
        <td><a href="mailto:${v.email}" style="color:var(--blue);">${v.email}</a></td>
        <td>${v.phone || '—'}</td>
        <td style="font-size:0.8rem;">${(v.interests || []).join(', ') || '—'}</td>
        <td style="font-size:0.82rem;color:#555;max-width:200px;">${v.message || '—'}</td>
        <td style="font-size:0.78rem;color:#888;">${fmt(v.createdAt)}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

// ===== MESSAGES (admin only) =====
async function loadMessages() {
  const el = document.getElementById('messagesList');
  const q = query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'), limit(100));
  const snap = await getDocs(q);
  if (snap.empty) { el.innerHTML = '<p style="color:#888;">Δεν υπάρχουν μηνύματα.</p>'; return; }
  el.innerHTML = `<table class="content-table">
    <thead><tr><th>Όνομα</th><th>Email</th><th>Μήνυμα</th><th>Ημ/νία</th></tr></thead>
    <tbody>${snap.docs.map(d => {
      const m = d.data();
      return `<tr>
        <td><strong>${m.name}</strong></td>
        <td><a href="mailto:${m.email}" style="color:var(--blue);">${m.email}</a></td>
        <td style="font-size:0.88rem;max-width:280px;">${m.message}</td>
        <td style="font-size:0.78rem;color:#888;">${fmt(m.createdAt)}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

// ===== MEMBERS (admin only) =====
const MAX_ADMINS  = 4;
const MAX_AUTHORS = 3;

async function loadMembers() {
  const el = document.getElementById('membersList');
  el.innerHTML = '<div class="spinner"></div>';

  const [usersSnap, invitesSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'invites'))
  ]);

  // Συνδυαστικά όρια: ενεργά μέλη + εκκρεμείς προσκλήσεις
  const adminCount  = usersSnap.docs.filter(d => d.data().role === 'admin').length
                    + invitesSnap.docs.filter(d => d.data().role === 'admin').length;
  const authorCount = usersSnap.docs.filter(d => d.data().role === 'author').length
                    + invitesSnap.docs.filter(d => d.data().role === 'author').length;

  // ── Μπάρα ορίων ───────────────────────────────────────────────────────────
  const limitBar = `<div style="margin-bottom:16px;padding:12px 16px;background:#f8f8f8;border-radius:10px;font-size:0.85rem;display:flex;gap:24px;flex-wrap:wrap;align-items:center;">
    <span>👑 Admins: <strong>${adminCount} / ${MAX_ADMINS}</strong></span>
    <span>✏️ Authors: <strong>${authorCount} / ${MAX_AUTHORS}</strong></span>
    <span style="font-size:0.78rem;color:#aaa;">(ενεργά + εκκρεμείς προσκλήσεις)</span>
  </div>`;

  // ── Φόρμα πρόσκλησης ──────────────────────────────────────────────────────
  const inviteForm = `<div class="admin-form" style="margin-bottom:24px;">
    <h3 style="margin-bottom:14px;font-size:1rem;">Πρόσκληση νέου μέλους</h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
      <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0;">
        <label style="font-size:0.82rem;">Email</label>
        <input type="email" id="inviteEmail" placeholder="email@example.com" autocomplete="off" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label style="font-size:0.82rem;">Ρόλος</label>
        <select id="inviteRole" style="padding:10px;border:1.5px solid #ddd;border-radius:8px;font-family:var(--font);font-size:0.88rem;height:44px;">
          <option value="author">author</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <button class="btn btn-primary" id="btnSendInvite" style="height:44px;margin-bottom:0;">Αποστολή πρόσκλησης</button>
    </div>
    <div class="form-error"   id="inviteError"   style="display:none;margin-top:8px;"></div>
    <div id="inviteSuccess" style="display:none;margin-top:8px;color:#2e7d32;background:#e8f5e9;padding:8px 12px;border-radius:6px;font-size:0.85rem;"></div>
  </div>`;

  // ── Εκκρεμείς προσκλήσεις ─────────────────────────────────────────────────
  const invitesHtml = invitesSnap.empty ? '' : `
    <div style="margin-bottom:24px;">
      <h3 style="margin-bottom:10px;font-size:1rem;">Εκκρεμείς προσκλήσεις</h3>
      <table class="content-table">
        <thead><tr><th>Email</th><th>Ρόλος</th><th>Ημ/νία</th><th></th></tr></thead>
        <tbody>${invitesSnap.docs.map(d => {
          const inv = d.data();
          return `<tr>
            <td style="font-size:0.88rem;">${d.id}</td>
            <td><span style="font-weight:600;color:${inv.role === 'admin' ? '#e07b00' : '#2563eb'};">${inv.role}</span></td>
            <td style="font-size:0.78rem;color:#888;">${fmt(inv.createdAt)}</td>
            <td><button class="btn btn-sm btn-danger" data-cancel-invite="${d.id}">Ακύρωση</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;

  // ── Ενεργά μέλη ───────────────────────────────────────────────────────────
  const membersRows = usersSnap.docs.map(d => {
    const u = d.data();
    const isSelf = d.id === currentUser.uid;
    const roleBadge = u.role === 'admin'
      ? '<span style="color:#e07b00;font-weight:700;">admin</span>'
      : u.role === 'author'
        ? '<span style="color:#2563eb;font-weight:600;">author</span>'
        : `<span style="color:#999;">${u.role || '—'}</span>`;

    const controls = isSelf
      ? '<em style="font-size:0.8rem;color:#aaa;">(εσύ)</em>'
      : `<select data-uid="${d.id}" data-current="${u.role}" class="role-select" style="padding:5px 8px;border-radius:6px;border:1px solid #ddd;font-family:var(--font);font-size:0.82rem;">
           <option value="admin"  ${u.role === 'admin'  ? 'selected' : ''}>admin</option>
           <option value="author" ${u.role === 'author' ? 'selected' : ''}>author</option>
           <option value="none"   ${!['admin','author'].includes(u.role) ? 'selected' : ''}>— αφαίρεση πρόσβασης</option>
         </select>`;

    return `<tr>
      <td><strong>${u.displayName || '—'}</strong></td>
      <td style="font-size:0.85rem;">${u.email}</td>
      <td>${roleBadge}</td>
      <td style="font-size:0.78rem;color:#888;">${fmt(u.createdAt)}</td>
      <td>${controls}</td>
    </tr>`;
  }).join('');

  const membersTable = `<div>
    <h3 style="margin-bottom:10px;font-size:1rem;">Ενεργά μέλη</h3>
    ${usersSnap.empty
      ? '<p style="color:#888;">Δεν υπάρχουν χρήστες ακόμα.</p>'
      : `<table class="content-table">
           <thead><tr><th>Όνομα</th><th>Email</th><th>Τρέχων ρόλος</th><th>Εγγραφή</th><th>Αλλαγή ρόλου</th></tr></thead>
           <tbody>${membersRows}</tbody>
         </table>`}
  </div>`;

  el.innerHTML = limitBar + inviteForm + invitesHtml + membersTable;

  // ── Αλλαγή ρόλου ──────────────────────────────────────────────────────────
  el.querySelectorAll('.role-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const newRole  = sel.value;
      const prevRole = sel.dataset.current;
      const uid      = sel.dataset.uid;

      const newAdmins  = adminCount  + (newRole === 'admin'  ? 1 : 0) - (prevRole === 'admin'  ? 1 : 0);
      const newAuthors = authorCount + (newRole === 'author' ? 1 : 0) - (prevRole === 'author' ? 1 : 0);

      if (newRole === 'admin' && newAdmins > MAX_ADMINS) {
        alert(`Έχει συμπληρωθεί το όριο (${MAX_ADMINS} admins). Αφαίρεσε πρώτα κάποιον admin.`);
        sel.value = prevRole; return;
      }
      if (newRole === 'author' && newAuthors > MAX_AUTHORS) {
        alert(`Έχει συμπληρωθεί το όριο (${MAX_AUTHORS} authors). Αφαίρεσε πρώτα κάποιον author.`);
        sel.value = prevRole; return;
      }
      if (newRole === 'none') {
        if (!confirm('Να αφαιρεθεί εντελώς η πρόσβαση αυτού του χρήστη;')) { sel.value = prevRole; return; }
        await deleteDoc(doc(db, 'users', uid));
      } else {
        await updateDoc(doc(db, 'users', uid), { role: newRole });
      }
      loadMembers();
    });
  });

  // ── Ακύρωση πρόσκλησης ────────────────────────────────────────────────────
  el.querySelectorAll('[data-cancel-invite]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm(`Ακύρωση πρόσκλησης για ${btn.dataset.cancelInvite};`)) {
        await deleteDoc(doc(db, 'invites', btn.dataset.cancelInvite));
        loadMembers();
      }
    });
  });

  // ── Αποστολή πρόσκλησης ───────────────────────────────────────────────────
  document.getElementById('btnSendInvite').addEventListener('click', async () => {
    const email  = (document.getElementById('inviteEmail').value || '').trim().toLowerCase();
    const role   = document.getElementById('inviteRole').value;
    const errEl  = document.getElementById('inviteError');
    const sucEl  = document.getElementById('inviteSuccess');
    errEl.style.display = 'none';
    sucEl.style.display = 'none';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = 'Μη έγκυρο email.'; errEl.style.display = 'block'; return;
    }
    if (role === 'admin' && adminCount >= MAX_ADMINS) {
      errEl.textContent = `Όριο admins (${MAX_ADMINS}) συμπληρώθηκε — ενεργά + εκκρεμείς.`;
      errEl.style.display = 'block'; return;
    }
    if (role === 'author' && authorCount >= MAX_AUTHORS) {
      errEl.textContent = `Όριο authors (${MAX_AUTHORS}) συμπληρώθηκε — ενεργά + εκκρεμείς.`;
      errEl.style.display = 'block'; return;
    }
    if (usersSnap.docs.some(d => (d.data().email || '').toLowerCase() === email)) {
      errEl.textContent = 'Αυτό το email έχει ήδη πρόσβαση.'; errEl.style.display = 'block'; return;
    }
    if (invitesSnap.docs.some(d => d.id === email)) {
      errEl.textContent = 'Υπάρχει ήδη εκκρεμής πρόσκληση για αυτό το email.'; errEl.style.display = 'block'; return;
    }

    const btnSend = document.getElementById('btnSendInvite');
    btnSend.disabled = true;
    try {
      await setDoc(doc(db, 'invites', email), {
        email, role,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });
      document.getElementById('inviteEmail').value = '';
      await loadMembers();
      const fresh = document.getElementById('inviteSuccess');
      if (fresh) { fresh.textContent = `✓ Πρόσκληση για ${email} (${role}) καταχωρήθηκε.`; fresh.style.display = 'block'; }
    } catch (err) {
      const freshErr = document.getElementById('inviteError');
      if (freshErr) { freshErr.textContent = err.message || 'Σφάλμα αποστολής.'; freshErr.style.display = 'block'; }
    } finally {
      const freshBtn = document.getElementById('btnSendInvite');
      if (freshBtn) freshBtn.disabled = false;
    }
  });
}

// ===== ACTIONS =====
setupUploadArea('actionUploadArea', 'actionImageFile', 'actionImagePreview', 'actionUploadStatus');

async function loadActionsAdmin() {
  const el = document.getElementById('actionsList');
  if (!el) return;
  const q = currentRole === 'admin'
    ? query(collection(db, 'actions'), orderBy('order'), limit(50))
    : query(collection(db, 'actions'), where('authorUid', '==', currentUser.uid), orderBy('order'));
  const snap = await getDocs(q);
  if (snap.empty) { el.innerHTML = '<p style="color:#888;">Δεν υπάρχουν δράσεις.</p>'; return; }
  el.innerHTML = `<table class="content-table">
    <thead><tr><th>#</th><th>Τίτλος (ΕΛ)</th><th>Κατηγορία</th><th>Κατάσταση</th><th>Ενέργειες</th></tr></thead>
    <tbody>${snap.docs.map(d => {
      const data = d.data();
      const canEdit = currentRole === 'admin' || data.authorUid === currentUser.uid;
      return `<tr>
        <td>${data.order}</td>
        <td><strong>${data.icon || ''} ${data.titleEl}</strong></td>
        <td style="font-size:0.82rem;color:#666;">${data.category || ''}</td>
        <td>${statusBadge(data.status)}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          ${canEdit ? `<button class="btn btn-sm btn-blue" data-edit-act="${d.id}">Επεξ.</button>` : ''}
          ${canEdit ? `<button class="btn btn-sm btn-danger" data-del-act="${d.id}">Διαγρ.</button>` : ''}
          ${currentRole === 'admin' && data.status === 'pending' ? `<button class="btn btn-sm btn-primary" data-pub-act="${d.id}">Δημοσ.</button>` : ''}
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;

  el.querySelectorAll('[data-edit-act]').forEach(btn => btn.addEventListener('click', () => startEditAction(btn.dataset.editAct)));
  el.querySelectorAll('[data-del-act]').forEach(btn => btn.addEventListener('click', async () => {
    if (confirm('Διαγραφή δράσης;')) { await deleteDoc(doc(db, 'actions', btn.dataset.delAct)); loadActionsAdmin(); loadPending(); }
  }));
  el.querySelectorAll('[data-pub-act]').forEach(btn => btn.addEventListener('click', async () => {
    await updateDoc(doc(db, 'actions', btn.dataset.pubAct), { status: 'published', publishedAt: serverTimestamp() });
    loadActionsAdmin(); loadPending();
  }));
}

async function startEditAction(id) {
  const snap = await getDoc(doc(db, 'actions', id));
  const d = snap.data();
  document.getElementById('actionTitleEl').value = d.titleEl || '';
  document.getElementById('actionTitleEn').value = d.titleEn || '';
  document.getElementById('actionDescEl').value = d.descEl || '';
  document.getElementById('actionDescEn').value = d.descEn || '';
  document.getElementById('actionCategory').value = d.category || 'Δημόσιος χώρος';
  document.getElementById('actionIcon').value = d.icon || '';
  document.getElementById('actionOrder').value = d.order || 10;
  document.getElementById('actionFormTitle').textContent = 'Επεξεργασία Δράσης';
  document.getElementById('btnCancelAction').style.display = 'inline-block';
  editingActionId = id;
  editingActionImageUrl = d.imageUrl || '';
  document.getElementById('panel-actions').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('btnCancelAction').addEventListener('click', () => {
  editingActionId = null;
  editingActionImageUrl = '';
  ['actionTitleEl','actionTitleEn','actionDescEl','actionDescEn','actionIcon'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('actionCategory').value = 'Δημόσιος χώρος';
  document.getElementById('actionOrder').value = 10;
  document.getElementById('actionFormTitle').textContent = 'Νέα Δράση';
  document.getElementById('btnCancelAction').style.display = 'none';
  document.getElementById('actionError').style.display = 'none';
  document.getElementById('actionImagePreview').classList.add('hidden');
  document.getElementById('actionUploadStatus').textContent = '';
  document.getElementById('actionImageFile').value = '';
});

document.getElementById('btnSubmitAction').addEventListener('click', async () => {
  const titleEl = document.getElementById('actionTitleEl').value.trim();
  const titleEn = document.getElementById('actionTitleEn').value.trim();
  const descEl  = document.getElementById('actionDescEl').value.trim();
  const descEn  = document.getElementById('actionDescEn').value.trim();
  const category = document.getElementById('actionCategory').value;
  const icon  = document.getElementById('actionIcon').value.trim();
  const order = parseInt(document.getElementById('actionOrder').value) || 10;
  const errEl = document.getElementById('actionError');
  errEl.style.display = 'none';

  if (!titleEl || !descEl) {
    errEl.textContent = 'Τίτλος (ΕΛ) και περιγραφή (ΕΛ) είναι υποχρεωτικά.';
    errEl.style.display = 'block'; return;
  }

  const btn = document.getElementById('btnSubmitAction');
  btn.disabled = true; btn.textContent = 'Αποθήκευση…';

  try {
    let imageUrl = editingActionImageUrl;
    const file = document.getElementById('actionImageFile').files[0];
    if (file) {
      document.getElementById('actionUploadStatus').textContent = 'Ανέβασμα εικόνας…';
      imageUrl = await uploadToImgBB(file);
    }

    const payload = {
      titleEl, titleEn, descEl, descEn, category, icon, order, imageUrl,
      authorUid: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email,
    };

    if (editingActionId) {
      await updateDoc(doc(db, 'actions', editingActionId), payload);
    } else {
      await addDoc(collection(db, 'actions'), {
        ...payload,
        status: currentRole === 'admin' ? 'published' : 'pending',
        createdAt: serverTimestamp(),
        publishedAt: currentRole === 'admin' ? serverTimestamp() : null
      });
    }
    document.getElementById('btnCancelAction').click();
    loadActionsAdmin(); loadPending();
  } catch (err) {
    errEl.textContent = err.message || 'Σφάλμα αποθήκευσης.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Αποθήκευση';
  }
});
