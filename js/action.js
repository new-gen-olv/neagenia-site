// action.js — εμφανίζει μία δράση από το Firestore (έως 4 φωτό + link social)

import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const params = new URLSearchParams(window.location.search);
const id   = params.get('id');
const lang = params.get('lang') === 'en' ? 'en' : 'el';

const T = {
  el: {
    notFound: 'Η δράση δεν βρέθηκε ή δεν είναι δημοσιευμένη.',
    error: 'Σφάλμα φόρτωσης.',
    back: '← Επιστροφή στις δράσεις',
    social: 'Δείτε περισσότερες φωτογραφίες στη δημοσίευσή μας →'
  },
  en: {
    notFound: 'This action was not found or is not published.',
    error: 'Loading error.',
    back: '← Back to actions',
    social: 'See more photos in our post →'
  }
};
const t = T[lang];

// Ενημέρωση/δημιουργία meta tags για SEO και social share
function setMeta(name, content) {
  let m = document.querySelector(`meta[name="${name}"]`);
  if (!m) { m = document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); }
  m.setAttribute('content', content);
}
function setOg(prop, content) {
  let m = document.querySelector(`meta[property="${prop}"]`);
  if (!m) { m = document.createElement('meta'); m.setAttribute('property', prop); document.head.appendChild(m); }
  m.setAttribute('content', content);
}
function setCanonical(url) {
  let l = document.querySelector('link[rel="canonical"]');
  if (!l) { l = document.createElement('link'); l.setAttribute('rel', 'canonical'); document.head.appendChild(l); }
  l.setAttribute('href', url);
}
function setJsonLd(data) {
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

function descToHtml(text) {
  return (text || '')
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

async function load() {
  const el = document.getElementById('actionContainer');

  if (!id) { el.innerHTML = `<p class="article-not-found">${t.notFound}</p>`; return; }

  try {
    const snap = await getDoc(doc(db, 'actions', id));
    if (!snap.exists() || snap.data().status !== 'published') {
      el.innerHTML = `<p class="article-not-found">${t.notFound}</p>`;
      return;
    }
    const d = snap.data();
    const title = lang === 'el' ? d.titleEl : (d.titleEn || d.titleEl);
    const desc  = lang === 'el' ? d.descEl  : (d.descEn  || d.descEl);
    document.title = `${title} | Νέα Γενιά «Πράξις» Ολυμπιακού Χωριού`;

    // Φωτογραφίες: νέο πεδίο images (έως 4), fallback στο παλιό imageUrl
    const images = (d.images && d.images.length ? d.images : (d.imageUrl ? [d.imageUrl] : [])).slice(0, 4);
    const [mainImg, ...restImgs] = images;

    // Δυναμικά meta για SEO και social share ανά δράση
    const pageUrl = `https://neageniaolv.org/action.html?id=${encodeURIComponent(id)}`;
    setMeta('description', (desc || '').slice(0, 160));
    setOg('og:title', title);
    setOg('og:description', (desc || '').slice(0, 160));
    setOg('og:url', pageUrl);
    if (mainImg) setOg('og:image', mainImg);
    setCanonical(pageUrl);

    const published = d.publishedAt || d.createdAt;
    setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: (desc || '').slice(0, 160),
      url: pageUrl,
      image: images.length ? images : 'https://neageniaolv.org/Assets/Images/background.jpg',
      datePublished: published && published.toDate ? published.toDate().toISOString() : undefined,
      inLanguage: lang,
      author: { '@type': 'Organization', name: 'Νέα Γενιά «Πράξις» Ολυμπιακού Χωριού' },
      publisher: {
        '@type': 'Organization',
        name: 'Νέα Γενιά «Πράξις» Ολυμπιακού Χωριού',
        logo: { '@type': 'ImageObject', url: 'https://neageniaolv.org/Assets/Images/logo.png' }
      }
    });

    el.innerHTML = `
      ${mainImg ? `<img src="${mainImg}" alt="${title}" class="article-cover-img action-photo" style="cursor:pointer;" />` : ''}
      ${d.icon ? `<span class="action-detail-icon">${d.icon}</span>` : ''}
      <h1 class="article-detail-title">${title}</h1>
      ${d.category ? `<span class="action-detail-tag">${d.category}</span>` : ''}
      <div class="article-detail-body">${descToHtml(desc)}</div>
      ${restImgs.length ? `<div class="action-photos-grid">${restImgs.map(u =>
        `<img src="${u}" alt="${title}" loading="lazy" class="action-photo" />`).join('')}</div>` : ''}
      ${d.socialUrl ? `<a href="${d.socialUrl}" target="_blank" rel="noopener" class="btn btn-primary action-social-btn">${t.social}</a>` : ''}
      <br/>
      <a href="index.html#actions" class="article-back-link">${t.back}</a>
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

    // Lightbox σε όλες τις φωτογραφίες
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    el.querySelectorAll('.action-photo').forEach(img => {
      img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.classList.add('open');
      });
    });
  } catch (err) {
    el.innerHTML = `<p class="article-not-found">${t.error}</p>`;
    console.error('action.js:', err);
  }
}

// Lightbox close
const lightbox = document.getElementById('lightbox');
document.getElementById('lightboxClose').addEventListener('click', () => lightbox.classList.remove('open'));
lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') lightbox.classList.remove('open'); });

// Πίσω κουμπί/τίτλοι στα EN αν χρειάζεται
if (lang === 'en') {
  const backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.textContent = '← Back';
}

load();
