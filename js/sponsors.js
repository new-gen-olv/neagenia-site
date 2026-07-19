// sponsors.js — σελίδα χορηγών: i18n + φόρτωση χορηγών από Firestore

import { db } from './firebase-config.js';
import {
  collection, getDocs, addDoc, query, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== I18N =====
const translations = {
  el: {
    sp_back: '← Αρχική',
    sp_title: 'Οι <span>Χορηγοί</span> μας',
    sp_sub: 'Πίσω από κάθε δράση της ομάδας μας υπάρχουν επιχειρήσεις και άνθρωποι που πιστεύουν στο έργο μας και το στηρίζουν έμπρακτα. Οι χορηγοί μας δεν προσφέρουν απλώς μια χορηγία: <strong>γίνονται συνοδοιπόροι</strong> σε κάθε παγκάκι που βάφεται, σε κάθε μάθημα που γίνεται, σε κάθε χαμόγελο που γεννιέται στη γειτονιά. Τους ευχαριστούμε θερμά.',
    sp_digital_title: 'Επίσημος Ψηφιακός Χορηγός',
    sp_digital_caption: 'Η DG Group σχεδίασε, ανέπτυξε και συντηρεί δωρεάν την ψηφιακή παρουσία της ομάδας μας.',
    sp_cta_title: 'Θέλεις να γίνεις χορηγός;',
    sp_cta_sub: 'Στήριξε το έργο μιας εθελοντικής ομάδας που δίνει καθημερινά ζωή στη γειτονιά. Συμπλήρωσε τη φόρμα και θα επικοινωνήσουμε μαζί σου για να συζητήσουμε πώς μπορούμε να συνεργαστούμε.',
    sp_empty: 'Η θέση αυτή περιμένει τους πρώτους χορηγούς της ομάδας.',
    sp_visit: 'Επίσκεψη →',
    sp_thanks_title: 'Ένα ευχαριστώ σε όλους',
    sp_thanks_text: 'Πέρα από τους χορηγούς, η ομάδα μας στηρίζεται καθημερινά σε απλούς ανθρώπους: γείτονες, φίλους και περιστασιακούς υποστηρικτές που προσφέρουν ό,τι μπορεί ο καθένας, όποτε μπορεί. Λίγος χρόνος, ένα υλικό, ένα χέρι βοήθειας σε μια δράση ή απλώς ένας καλός λόγος. Κάθε προσφορά, μικρή ή μεγάλη, έχει για εμάς την ίδια αξία, γιατί ξέρουμε πως ο καθένας δίνει ανάλογα με τις δυνατότητες και τις συνθήκες της ζωής του. Σας ευχαριστούμε από καρδιάς.',
    spf_company: 'Επωνυμία επιχείρησης',
    spf_name: 'Ονοματεπώνυμο υπευθύνου',
    spf_phone: 'Τηλέφωνο (προαιρετικό)',
    spf_message: 'Μήνυμα (προαιρετικό)',
    spf_send: 'Αποστολή ενδιαφέροντος',
    spf_success: 'Λάβαμε το ενδιαφέρον σου! Θα επικοινωνήσουμε σύντομα μαζί σου.',
    err_required: 'Παρακαλώ συμπλήρωσε όλα τα απαιτούμενα πεδία.',
    err_email: 'Μη έγκυρη διεύθυνση email.',
    err_generic: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.',
    footer_rights: 'Όλα τα δικαιώματα διατηρούνται.',
  },
  en: {
    sp_back: '← Home',
    sp_title: 'Our <span>Sponsors</span>',
    sp_sub: 'Behind every action of our team there are businesses and people who believe in our work and support it in practice. Our sponsors don\'t just offer sponsorship: <strong>they walk alongside us</strong>, in every bench repainted, every lesson taught, every smile born in the neighborhood. We thank them warmly.',
    sp_digital_title: 'Official Digital Sponsor',
    sp_digital_caption: 'DG Group designed, developed and maintains our team\'s digital presence free of charge.',
    sp_cta_title: 'Want to become a sponsor?',
    sp_cta_sub: 'Support the work of a volunteer team that brings life to the neighborhood every day. Fill in the form and we\'ll get in touch to discuss how we can work together.',
    sp_empty: 'This spot is waiting for the team\'s first sponsors.',
    sp_visit: 'Visit →',
    sp_thanks_title: 'A thank you to everyone',
    sp_thanks_text: 'Beyond our sponsors, our team relies every day on ordinary people: neighbors, friends and occasional supporters who offer whatever each one can, whenever they can. Some time, a material, a helping hand at an action, or simply a kind word. Every contribution, big or small, holds the same value for us, because we know that each person gives according to their abilities and life circumstances. We thank you from the heart.',
    spf_company: 'Company name',
    spf_name: 'Contact person',
    spf_phone: 'Phone (optional)',
    spf_message: 'Message (optional)',
    spf_send: 'Send inquiry',
    spf_success: 'We received your inquiry! We\'ll be in touch soon.',
    err_required: 'Please fill in all required fields.',
    err_email: 'Invalid email address.',
    err_generic: 'Something went wrong. Please try again.',
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

// ===== ΦΟΡΜΑ ΕΝΔΙΑΦΕΡΟΝΤΟΣ ΧΟΡΗΓΙΑΣ =====
// Αποθηκεύεται στα contactMessages με σήμανση χορηγίας — εμφανίζεται
// στο admin panel στα Μηνύματα, χωρίς ξεχωριστή διαχείριση.
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

const inquiryForm = document.getElementById('sponsorInquiryForm');
if (inquiryForm) {
  inquiryForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (inquiryForm.querySelector('input[name="website"]').value) return; // honeypot

    const errEl = document.getElementById('sponsorInquiryError');
    const sucEl = document.getElementById('sponsorInquirySuccess');
    errEl.style.display = 'none';
    sucEl.style.display = 'none';

    const company = document.getElementById('siCompany').value.trim();
    const name    = document.getElementById('siName').value.trim();
    const email   = document.getElementById('siEmail').value.trim();
    const phone   = document.getElementById('siPhone').value.trim();
    const msg     = document.getElementById('siMessage').value.trim();

    const showErr = m => { errEl.textContent = m; errEl.style.display = 'block'; };
    if (!company || !name || !email) { showErr(translations[currentLang].err_required); return; }
    if (!isValidEmail(email))        { showErr(translations[currentLang].err_email); return; }

    const btn = inquiryForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const message = `🤝 ΕΝΔΙΑΦΕΡΟΝ ΧΟΡΗΓΙΑΣ · Επιχείρηση: ${company} · Τηλ: ${phone || '—'}${msg ? ' — ' + msg : ''}`;
      await addDoc(collection(db, 'contactMessages'), {
        name, email, message,
        type: 'sponsor', company, phone,
        createdAt: serverTimestamp()
      });
      // Ειδοποίηση στο email της ομάδας μέσω EmailJS — αποτυχία δεν μπλοκάρει
      try {
        await window.emailjs.send('service_orzkyoc', 'template_bvainut', {
          form_type: 'Ενδιαφέρον χορηγίας',
          name: `${name} (${company})`,
          email, phone: phone || '', interests: '',
          message: msg || ''
        });
      } catch { /* silent */ }
      // Auto-reply στον υποψήφιο χορηγό
      try {
        const gr = currentLang !== 'en';
        await window.emailjs.send('service_orzkyoc', 'template_6mpy8yq', {
          email, name,
          auto_subject: gr ? 'Νέα Γενιά «Πράξις»: Λάβαμε το ενδιαφέρον σας για χορηγία'
                           : 'Nea Genia "Praxis": We received your sponsorship inquiry',
          auto_message: gr ? 'Ευχαριστούμε θερμά για το ενδιαφέρον σας να στηρίξετε το έργο της ομάδας μας! Λάβαμε τα στοιχεία σας και θα επικοινωνήσουμε σύντομα μαζί σας.'
                           : 'Thank you for your interest in supporting our team\'s work! We received your details and will get in touch with you soon.'
        });
      } catch { /* silent */ }
      if (window.gtag) window.gtag('event', 'sponsor_inquiry');
      sucEl.style.display = 'block';
      inquiryForm.reset();
    } catch {
      showErr(translations[currentLang].err_generic);
    } finally {
      btn.disabled = false;
    }
  });
}

// ===== INIT =====
applyTranslations();
loadSponsors();
