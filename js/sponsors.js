// sponsors.js — σελίδα χορηγών: i18n + φόρτωση χορηγών από Firestore

import { db } from './firebase-config.js';
import {
  collection, getDocs, query, orderBy, limit
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== I18N =====
const translations = {
  el: {
    sp_back: '← Αρχική',
    sp_title: 'Οι <span>Χορηγοί</span> μας',
    sp_sub: 'Ευχαριστούμε θερμά τις επιχειρήσεις και τους ανθρώπους που στηρίζουν έμπρακτα το έργο της ομάδας μας. Χάρη σε αυτούς, κάθε δράση μας γίνεται πραγματικότητα.',
    sp_digital_title: 'Επίσημος Ψηφιακός Χορηγός',
    sp_digital_caption: 'Η DG Group σχεδίασε, ανέπτυξε και συντηρεί δωρεάν την ψηφιακή παρουσία της ομάδας μας.',
    sp_cta_title: 'Θέλεις να γίνεις χορηγός;',
    sp_cta_sub: 'Στήριξε το έργο μιας εθελοντικής ομάδας που δίνει καθημερινά ζωή στη γειτονιά. Επικοινώνησε μαζί μας για να συζητήσουμε πώς μπορούμε να συνεργαστούμε.',
    sp_cta_btn: 'Επικοινώνησε μαζί μας',
    sp_empty: 'Η θέση αυτή περιμένει τους πρώτους χορηγούς της ομάδας.',
    sp_visit: 'Επίσκεψη →',
    footer_rights: 'Όλα τα δικαιώματα διατηρούνται.',
  },
  en: {
    sp_back: '← Home',
    sp_title: 'Our <span>Sponsors</span>',
    sp_sub: 'A heartfelt thank you to the businesses and people who actively support our team\'s work. Thanks to them, every action of ours becomes reality.',
    sp_digital_title: 'Official Digital Sponsor',
    sp_digital_caption: 'DG Group designed, developed and maintains our team\'s digital presence free of charge.',
    sp_cta_title: 'Want to become a sponsor?',
    sp_cta_sub: 'Support the work of a volunteer team that brings life to the neighborhood every day. Contact us to discuss how we can work together.',
    sp_cta_btn: 'Get in touch',
    sp_empty: 'This spot is waiting for the team\'s first sponsors.',
    sp_visit: 'Visit →',
    footer_rights: 'All rights reserved.',
  }
};

// Κατηγορίες χορηγών — σειρά εμφάνισης: χρυσοί πρώτα
const TIERS = [
  { key: 'gold',      el: 'Χρυσοί Χορηγοί', en: 'Gold Sponsors' },
  { key: 'sponsor',   el: 'Χορηγοί',        en: 'Sponsors' },
  { key: 'supporter', el: 'Υποστηρικτές',   en: 'Supporters' },
];

let currentLang = 'el';
let cachedSponsors = null;

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = translations[currentLang][key];
    if (val !== undefined) el.innerHTML = val;
  });
  document.documentElement.lang = currentLang;
  document.getElementById('langToggle').textContent = currentLang === 'el' ? 'EN' : 'ΕΛ';
  renderSponsors();
}

document.getElementById('langToggle').addEventListener('click', () => {
  currentLang = currentLang === 'el' ? 'en' : 'el';
  applyTranslations();
});

// ===== RENDER =====
function sponsorCard(d) {
  const desc = currentLang === 'el' ? (d.descEl || '') : (d.descEn || d.descEl || '');
  const logo = d.logoUrl
    ? `<div class="sponsor-card-logo"><img src="${d.logoUrl}" alt="${d.name}" loading="lazy" /></div>`
    : `<div class="sponsor-card-logo sponsor-logo-fallback"><span>${(d.name || '?').charAt(0).toUpperCase()}</span></div>`;
  const link = d.website
    ? `<a href="${d.website}" target="_blank" rel="noopener" class="sponsor-visit">${translations[currentLang].sp_visit}</a>`
    : '';
  const card = `<div class="sponsor-card">
    ${logo}
    <div class="sponsor-card-body">
      <h3>${d.name}</h3>
      ${desc ? `<p>${desc}</p>` : ''}
      ${link}
    </div>
  </div>`;
  // Όλη η κάρτα clickable αν υπάρχει website
  return d.website
    ? `<a href="${d.website}" target="_blank" rel="noopener" class="sponsor-card-link">${card}</a>`
    : card;
}

function renderSponsors() {
  const el = document.getElementById('sponsorsContent');
  if (!el || cachedSponsors === null) return;

  if (!cachedSponsors.length) {
    el.innerHTML = `<p class="sponsors-empty">${translations[currentLang].sp_empty}</p>`;
    return;
  }

  el.innerHTML = TIERS.map(tier => {
    const items = cachedSponsors.filter(s => (s.tier || 'sponsor') === tier.key);
    if (!items.length) return '';
    return `<section class="sponsor-tier-block">
      <h2 class="sponsor-tier-title${tier.key === 'gold' ? ' gold' : ''}">${tier[currentLang]}</h2>
      <div class="sponsors-grid">${items.map(sponsorCard).join('')}</div>
    </section>`;
  }).join('');
}

async function loadSponsors() {
  try {
    const q = query(collection(db, 'sponsors'), orderBy('order'), limit(100));
    const snap = await getDocs(q);
    cachedSponsors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('loadSponsors error:', err);
    cachedSponsors = [];
  }
  renderSponsors();
}

// ===== INIT =====
applyTranslations();
loadSponsors();
