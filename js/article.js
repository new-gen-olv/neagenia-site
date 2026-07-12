// article.js — εμφανίζει ένα άρθρο ή ανακοίνωση από το Firestore

import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const params = new URLSearchParams(window.location.search);
const id  = params.get('id');
const col = params.get('col') || 'articles';

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function bodyToHtml(text) {
  return (text || '')
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

async function load() {
  const el = document.getElementById('articleContainer');

  if (!id || !['articles', 'announcements'].includes(col)) {
    el.innerHTML = '<p class="article-not-found">Το άρθρο δεν βρέθηκε.</p>';
    return;
  }

  try {
    const snap = await getDoc(doc(db, col, id));
    if (!snap.exists() || snap.data().status !== 'published') {
      el.innerHTML = '<p class="article-not-found">Το άρθρο δεν βρέθηκε ή δεν είναι δημοσιευμένο.</p>';
      return;
    }
    const d = snap.data();
    document.title = `${d.title} | Νέα Γενιά «Πράξις» Ολυμπιακού Χωριού`;
    const plain = (d.body || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const setMeta = (name, content) => {
      let m = document.querySelector(`meta[name="${name}"]`);
      if (!m) { m = document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); }
      m.setAttribute('content', content);
    };
    const setOg = (prop, content) => {
      let m = document.querySelector(`meta[property="${prop}"]`);
      if (!m) { m = document.createElement('meta'); m.setAttribute('property', prop); document.head.appendChild(m); }
      m.setAttribute('content', content);
    };
    if (plain) { setMeta('description', plain); setOg('og:description', plain); }
    setOg('og:title', d.title);
    if (d.coverImageUrl) setOg('og:image', d.coverImageUrl);

    el.innerHTML = `
      ${d.coverImageUrl ? `<img src="${d.coverImageUrl}" alt="${d.title}" class="article-cover-img" />` : ''}
      <h1 class="article-detail-title">${d.title}</h1>
      <div class="article-detail-meta">${d.authorName || ''} · ${formatDate(d.publishedAt || d.createdAt)}</div>
      <div class="article-detail-body">${bodyToHtml(d.body)}</div>
      <a href="index.html#news" class="article-back-link">← Επιστροφή στα άρθρα</a>
    `;

    // Portrait εξώφυλλο: εμφανίζεται ολόκληρο (contain) αντί να κόβεται
    const cover = el.querySelector('.article-cover-img');
    if (cover) {
      const markPortrait = () => {
        if (cover.naturalHeight > cover.naturalWidth * 1.05) cover.classList.add('portrait');
      };
      if (cover.complete && cover.naturalWidth) markPortrait();
      else cover.addEventListener('load', markPortrait, { once: true });
    }
  } catch (err) {
    el.innerHTML = '<p class="article-not-found">Σφάλμα φόρτωσης.</p>';
    console.error('article.js:', err);
  }
}

load();
