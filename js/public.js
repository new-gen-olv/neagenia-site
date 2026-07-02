// public.js — δημόσιο site: i18n, δυναμικές δράσεις, άρθρα, gallery, forms

import { db, auth } from './firebase-config.js';
import {
  collection, getDocs, addDoc, query, where, orderBy, serverTimestamp, limit, doc, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ===== I18N =====
const translations = {
  el: {
    nav_problem: 'Το Πρόβλημα',
    nav_actions: 'Οι Δράσεις',
    nav_articles: 'Άρθρα',
    nav_announcements: 'Ανακοινώσεις',
    nav_gallery: 'Gallery',
    nav_about: 'Σχετικά',
    nav_contact: 'Επικοινωνία',
    nav_join: 'Γίνε μέλος',
    nav_donate: '❤ Δωρεά',
    donate_section_title: 'Στήριξε τη <span>δράση μας</span>',
    donate_sub: 'Κάθε δωρεά, μικρή ή μεγάλη, μας βοηθά να συνεχίσουμε το έργο μας για τη γειτονιά. Η κατάθεση γίνεται απευθείας στον τραπεζικό λογαριασμό της ομάδας, μέσω e-banking ή σε κατάστημα της τράπεζάς σας.',
    donate_bank: 'Τράπεζα Πειραιώς',
    donate_copy: '📋 Αντιγραφή IBAN',
    donate_copied: '✓ Αντιγράφηκε!',
    donate_note_title: 'Παρακαλούμε, στην αιτιολογία της κατάθεσης να αναγράφετε:',
    donate_note_1: '«Δωρεά στη Νέα Γενιά Πράξις Ολυμπιακού Χωριού»',
    donate_note_2: 'Το ονοματεπώνυμό σας',
    donate_note_3: 'Την ημερομηνία της κατάθεσης',
    donate_note_footer: 'Τα στοιχεία αυτά διευκολύνουν την ταυτοποίηση και την ορθή καταγραφή της δωρεάς από την ομάδα. Σας ευχαριστούμε θερμά! ❤',
    donate_note_notify: 'Σε περίπτωση που καταθέσετε δωρεά, παρακαλούμε ενημερώστε μας μέσω της φόρμας επικοινωνίας ή απευθείας στο <a href="mailto:newgen.olv@gmail.com">newgen.olv@gmail.com</a>.',
    btn_volunteer: 'Γίνε εθελοντής',
    btn_see_actions: 'Δες τις δράσεις μας',
    btn_send: 'Αποστολή',
    hero_title: 'Νέα Γενιά στο <span>Ολυμπιακό Χωριό</span>',
    hero_subtitle: 'Μια ομάδα νέων ανθρώπων που αλλάζει συνειδήσεις μέσα από τον εθελοντισμό. Φροντίζουμε τον τόπο μας, στηρίζουμε τους ανθρώπους του, χτίζουμε ένα καλύτερο μέλλον, μαζί.',
    problem_title: 'Ένας τόπος που αξίζει <span>περισσότερα</span>',
    problem_p1: 'Το Ολυμπιακό Χωριό σχεδιάστηκε ως ένα πρότυπο σημείο ζωής και κοινότητας. Σήμερα, πολλοί από τους χώρους που θα έπρεπε να σφύζουν από ζωή (χώροι συλλόγων, κοινόχρηστα σημεία, υποδομές της γειτονιάς) παραμένουν κλειστοί ή εγκαταλελειμμένοι.',
    problem_p2: 'Πιστεύουμε πως όταν αυτοί οι χώροι λειτουργήσουν ξανά σωστά, μπορούν να δώσουν πίσω στην κοινότητα τη ζωντάνια, τη φροντίδα και τη δημιουργία που της αξίζουν.',
    problem_p3: 'Γι\' αυτό δεν περιμένουμε. Καθαρίζουμε, επιδιορθώνουμε, δημιουργούμε και διεκδικούμε. Έχουμε ήδη καταθέσει επίσημη επιστολή διαμαρτυρίας και διεκδίκησης για την επαναλειτουργία και τη διασφάλιση των χώρων ενεργών συλλόγων.',
    problem_p4: 'Είναι ένας καθαρός εθελοντικός αγώνας για τον τόπο μας, μακριά από κόμματα, δογματισμούς και άγονες αντιπαραθέσεις, με μόνο σκοπό την εύρεση λύσεων. Όλοι την ίδια ευθύνη φέρουμε, και όλοι ενωμένοι μπορούμε να δώσουμε μια μάχη για το μέλλον μας.',
    actions_title: 'Πράξεις, <span>όχι λόγια</span>',
    news_title: 'Άρθρα & <span>Ανακοινώσεις</span>',
    gallery_title: 'Gallery',
    about_title: 'Ποιοι <span>είμαστε</span>',
    about_p1: 'Είμαστε η <strong>Νέα Γενιά «Πράξις» Ολυμπιακού Χωριού</strong>, μια Αστική Μη Κερδοσκοπική Εταιρεία και, πάνω απ\' όλα, μια ομάδα νέων ανθρώπων που πιστεύουν ότι ο τόπος αλλάζει όταν οι πολίτες του ανασκουμπώνονται.',
    about_p2: 'Δεν μας ενώνει κόμμα ή ιδεολογία. Μας ενώνει η αγάπη για τη γειτονιά μας και η πεποίθηση ότι κάθε μικρή πράξη μετράει. Από ένα παγκάκι που ξαναβάφεται μέχρι ένα μάθημα που φέρνει τους ανθρώπους κοντά, χτίζουμε καθημερινά μια κοινότητα που συμμετέχει, δημιουργεί και νοιάζεται.',
    motto: 'Να Αγαπάτε. Να Φροντίζετε. Να Προσφέρετε. Να Χαμογελάτε.',
    contact_section_title: 'Επικοινωνία & <span>Συμμετοχή</span>',
    contact_title: 'Επικοινώνησε μαζί μας',
    contact_sub: 'Έχεις μια ιδέα, μια απορία ή θέλεις να βοηθήσεις; Γράψε μας.',
    vol_title: 'Γίνε μέλος της ομάδας',
    vol_sub: 'Έλα κι εσύ στη Νέα Γενιά. Όσος χρόνος κι αν έχεις, χωράει.',
    field_name: 'Όνομα',
    field_message: 'Μήνυμα',
    field_phone: 'Τηλέφωνο',
    field_interests: 'Με ενδιαφέρει',
    field_message_opt: 'Μήνυμα (προαιρετικό)',
    int_actions: 'Δράσεις εθελοντισμού',
    int_dance: 'Παραδοσιακοί χοροί',
    int_spanish: 'Ξένες Γλώσσες',
    int_photo: 'Φωτογραφία',
    int_aid: 'Πρώτες Βοήθειες',
    int_anything: 'Ό,τι χρειαστεί',
    form_success: 'Το μήνυμά σου στάλθηκε! Θα επικοινωνήσουμε σύντομα.',
    form_success_vol: 'Η εγγραφή σου έγινε! Θα σου στείλουμε email σύντομα.',
    footer_contact_title: 'Επικοινωνία',
    footer_links_title: 'Σύνδεσμοι',
    footer_facebook: 'Facebook',
    footer_site: 'neageniaolv.org',
    footer_rights: 'Όλα τα δικαιώματα διατηρούνται.',
    footer_members_login: 'Είσοδος μελών',
    admin_panel: 'Πίνακας διαχείρισης',
    news_empty: 'Δεν υπάρχουν δημοσιεύσεις ακόμα.',
    gallery_empty: 'Δεν υπάρχουν φωτογραφίες ακόμα.',
    err_required: 'Παρακαλώ συμπλήρωσε όλα τα απαιτούμενα πεδία.',
    err_generic: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.',
    err_email: 'Μη έγκυρη διεύθυνση email.',
  },
  en: {
    nav_problem: 'The Problem',
    nav_actions: 'Our Actions',
    nav_articles: 'Articles',
    nav_announcements: 'Announcements',
    nav_gallery: 'Gallery',
    nav_about: 'About',
    nav_contact: 'Contact',
    nav_join: 'Join us',
    nav_donate: '❤ Donate',
    donate_section_title: 'Support <span>our work</span>',
    donate_sub: 'Every donation, big or small, helps us continue our work for the neighbourhood. Deposits are made directly to the team\'s bank account, via e-banking or at your bank\'s branch.',
    donate_bank: 'Piraeus Bank',
    donate_copy: '📋 Copy IBAN',
    donate_copied: '✓ Copied!',
    donate_note_title: 'When making the deposit, please include in the payment reference:',
    donate_note_1: '"Donation to Nea Genia Praxis of Olympic Village"',
    donate_note_2: 'Your full name',
    donate_note_3: 'The date of the deposit',
    donate_note_footer: 'These details help us identify and properly record your donation. Thank you very much! ❤',
    donate_note_notify: 'If you make a donation, please let us know through the contact form or directly at <a href="mailto:newgen.olv@gmail.com">newgen.olv@gmail.com</a>.',
    btn_volunteer: 'Become a volunteer',
    btn_see_actions: 'See our actions',
    btn_send: 'Send',
    hero_title: '«Nea Genia» in the <span>Olympic Village</span>',
    hero_subtitle: 'A group of young people changing mindsets through volunteering. We care for our place, support its people, and build a better future, together.',
    problem_title: 'A place that deserves <span>more</span>',
    problem_p1: 'The Olympic Village was designed as a model space for life and community. Today, many of the spaces that should be full of life (club spaces, common areas, neighborhood facilities) remain closed or abandoned.',
    problem_p2: 'We believe that when these spaces work properly again, they can give back to the community the vitality, care and creativity it deserves.',
    problem_p3: 'That\'s why we don\'t wait. We clean, repair, create and we advocate. We have already filed an official letter of protest and demand for the reopening and safeguarding of the spaces of active community groups.',
    problem_p4: 'This is a pure volunteer effort for our place, free of parties, dogmatism and fruitless confrontation, with the sole aim of finding solutions. We all share the same responsibility, and united we can fight for our future.',
    actions_title: 'Actions, <span>not words</span>',
    news_title: 'Articles & <span>Announcements</span>',
    gallery_title: 'Gallery',
    about_title: 'Who <span>we are</span>',
    about_p1: 'We are <strong>Nea Genia "Praxis" of the Olympic Village</strong>, a non-profit civil organization and, above all, a group of young people who believe that a place changes when its citizens roll up their sleeves.',
    about_p2: 'We are not united by party or ideology. We are united by love for our neighborhood and the belief that every small action counts. From a bench being repainted to a lesson that brings people together, we build a community every day that participates, creates and cares.',
    motto: 'Love. Care. Give. Smile.',
    contact_section_title: 'Contact & <span>Participate</span>',
    contact_title: 'Get in touch',
    contact_sub: 'Have an idea, a question, or want to help? Write to us.',
    vol_title: 'Join the team',
    vol_sub: 'Come join Nea Genia. However much time you have, there\'s room for it.',
    field_name: 'Name',
    field_message: 'Message',
    field_phone: 'Phone',
    field_interests: 'I\'m interested in',
    field_message_opt: 'Message (optional)',
    int_actions: 'Volunteer actions',
    int_dance: 'Traditional dances',
    int_spanish: 'Foreign Languages',
    int_photo: 'Photography',
    int_aid: 'First Aid',
    int_anything: 'Whatever is needed',
    form_success: 'Your message was sent! We\'ll be in touch soon.',
    form_success_vol: 'You\'re signed up! We\'ll send you an email soon.',
    footer_contact_title: 'Contact',
    footer_links_title: 'Links',
    footer_facebook: 'Facebook',
    footer_site: 'neageniaolv.org',
    footer_rights: 'All rights reserved.',
    footer_members_login: 'Members login',
    admin_panel: 'Admin panel',
    news_empty: 'No posts yet.',
    gallery_empty: 'No photos yet.',
    err_required: 'Please fill in all required fields.',
    err_generic: 'Something went wrong. Please try again.',
    err_email: 'Invalid email address.',
  }
};

// Κατηγορίες δράσεων (EL ↔ EN)
const CAT_LABELS = {
  'Δημόσιος χώρος': { el: 'Δημόσιος χώρος', en: 'Public space' },
  'Μαθήματα':              { el: 'Μαθήματα', en: 'Lessons' },
  'Πολιτισμός':  { el: 'Πολιτισμός', en: 'Culture' },
  'Αλληλεγγύη':  { el: 'Αλληλεγγύη', en: 'Solidarity' },
};
function catLabel(cat) { return (CAT_LABELS[cat] || {})[currentLang] || cat; }

// ===== SEED DATA — φαίνεται αν η Firestore collection "actions" είναι άδεια =====
const SEED_ACTIONS = [
  {
    titleEl: 'Παγκάκια & πλατείες', titleEn: 'Benches & squares',
    descEl: 'Αναστηλώνουμε παγκάκια και καθαρίζουμε κοινόχρηστους χώρους, δίνοντας ζωή σε σημεία της γειτονιάς που είχαν παραμεληθεί.',
    descEn: 'We restore benches and clean shared public spaces, bringing life back to neglected spots in the neighborhood.',
    category: 'Δημόσιος χώρος', icon: '🪑', order: 1,
    imageUrl: 'Assets/Images/pagkakia.png'
  },
  {
    titleEl: 'Στέγαστρα στάσεων', titleEn: 'Bus stop shelters',
    descEl: 'Επιδιορθώνουμε και ομορφαίνουμε τα στέγαστρα, με σεβασμό στον δημόσιο χώρο.',
    descEn: 'We repair and beautify bus stop shelters, with respect for public space.',
    category: 'Δημόσιος χώρος', icon: '🚌', order: 2,
    imageUrl: 'Assets/Images/stegastra.png'
  },
  {
    titleEl: '29ο Νηπιαγωγείο Αχαρνών', titleEn: '29th Kindergarten of Acharnes',
    descEl: 'Βελτιώνουμε τους αύλειους χώρους τοπικών σχολείων, ώστε τα παιδιά να απολαμβάνουν τον χώρο τους.',
    descEn: 'We improve outdoor spaces at local schools so children can enjoy their yard to the fullest.',
    category: 'Δημόσιος χώρος', icon: '🏫', order: 3,
    imageUrl: 'Assets/Images/nipiagogeio.png'
  },
  {
    titleEl: 'Τοιχογραφία', titleEn: 'Mural',
    descEl: 'Μετατρέπουμε παραμελημένους τοίχους σε έργα τέχνης που φέρνουν χρώμα και έμπνευση στη γειτονιά.',
    descEn: 'We transform neglected walls into works of art, bringing color and inspiration to the neighborhood.',
    category: 'Πολιτισμός', icon: '🎨', order: 4,
    imageUrl: 'Assets/Images/toixografia.png'
  },
  {
    titleEl: 'Παραδοσιακοί / Λαϊκοί Χοροί', titleEn: 'Traditional / Folk Dances',
    descEl: 'Μαθήματα παραδοσιακών και λαϊκών χορών για όλες τις ηλικίες.',
    descEn: 'Traditional and folk dance classes for all ages.',
    category: 'Μαθήματα', icon: '💃', order: 5,
    imageUrl: 'Assets/Images/xoroi.png'
  },
  {
    titleEl: 'Ξένες Γλώσσες', titleEn: 'Foreign Languages',
    descEl: 'Μαθήματα ξένων γλωσσών για όλα τα επίπεδα.',
    descEn: 'Foreign language lessons for all levels.',
    category: 'Μαθήματα', icon: '🌍', order: 6,
    imageUrl: 'Assets/Images/glosses.png'
  },
  {
    titleEl: 'Μαθήματα Φωτογραφίας', titleEn: 'Photography Lessons',
    descEl: 'Μάθε να χρησιμοποιείς σωστά την κάμερά σου.',
    descEn: 'Learn to use your camera properly.',
    category: 'Μαθήματα', icon: '📷', order: 7,
    imageUrl: 'Assets/Images/fotografia.png'
  },
  {
    titleEl: 'Πρώτες Βοήθειες & CPR', titleEn: 'First Aid & CPR',
    descEl: 'Εκπαίδευση σε βασικές δεξιότητες που σώζουν ζωές.',
    descEn: 'Training in basic life-saving skills.',
    category: 'Μαθήματα', icon: '🩺', order: 8,
    imageUrl: 'Assets/Images/protes-voithies.png'
  }
];

let currentLang = 'el';
let cachedActions = null;

// ===== ACTIONS — render =====
function renderActionCard(d) {
  const title = currentLang === 'el' ? d.titleEl : (d.titleEn || d.titleEl);
  const fullDesc = currentLang === 'el' ? d.descEl : (d.descEn || d.descEl);
  const cat   = catLabel(d.category || '');
  const styleAttr = d.imageStyle ? ` style="${d.imageStyle}"` : '';

  // Προεπισκόπηση: αν το κείμενο είναι μεγάλο, κόβεται + «Διάβασε περισσότερα»
  const isLong = (fullDesc || '').length > 140;
  const desc = isLong ? fullDesc.slice(0, 140) + '…' : (fullDesc || '');
  const readMore = currentLang === 'el' ? 'Διάβασε περισσότερα →' : 'Read more →';

  const mediaHtml = d.imageUrl
    ? `<div class="action-card-img"><img src="${d.imageUrl}" alt="${title}" loading="lazy"${styleAttr} /></div>`
    : `<div class="action-card-icon-fallback"><span>${d.icon || '⭐'}</span></div>`;

  const iconHtml = d.imageUrl && d.icon ? `<span class="icon">${d.icon}</span>` : '';

  const card = `<div class="action-card">
    ${mediaHtml}
    <div class="action-card-body">
      ${iconHtml}
      <h3>${title}</h3>
      <p>${desc}</p>
      ${d.id && isLong ? `<span class="read-more-label">${readMore}</span>` : ''}
      <span class="tag">${cat}</span>
    </div>
  </div>`;

  // Δράσεις από τη βάση (με id) ανοίγουν τη δική τους σελίδα σε νέο παράθυρο
  if (d.id) {
    const url = `action.html?id=${d.id}${currentLang === 'en' ? '&lang=en' : ''}`;
    return `<a href="${url}" target="_blank" rel="noopener" class="action-card-link">${card}</a>`;
  }
  return card;
}

function renderActions() {
  const grid = document.getElementById('actionsGrid');
  if (!grid || !cachedActions) return;
  grid.innerHTML = cachedActions.map(renderActionCard).join('');
}

async function loadActions() {
  const grid = document.getElementById('actionsGrid');
  try {
    const q = query(
      collection(db, 'actions'),
      where('status', '==', 'published'),
      orderBy('order'),
      limit(20)
    );
    const snap = await getDocs(q);
    cachedActions = snap.empty ? SEED_ACTIONS : snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    cachedActions = SEED_ACTIONS;
  }
  renderActions();
}

// ===== I18N apply =====
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = translations[currentLang][key];
    if (val !== undefined) el.innerHTML = val;
  });
  document.documentElement.lang = currentLang;
  const label = currentLang === 'el' ? 'EN' : 'ΕΛ';
  document.getElementById('langToggle').textContent = label;
  const mob = document.getElementById('langToggleMobile');
  if (mob) mob.textContent = label;
  renderActions(); // δράσεις ξαναζωγραφίζονται στη νέα γλώσσα
}

document.getElementById('langToggle').addEventListener('click', () => {
  currentLang = currentLang === 'el' ? 'en' : 'el';
  applyTranslations();
});

// ===== HAMBURGER =====
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileNav = document.getElementById('mobileNav');
hamburgerBtn.addEventListener('click', () => mobileNav.classList.toggle('open'));
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileNav.classList.remove('open')));

// Lang toggle μέσα στο mobile menu — mirrors τον header toggle
const langToggleMobile = document.getElementById('langToggleMobile');
if (langToggleMobile) {
  langToggleMobile.addEventListener('click', () => {
    currentLang = currentLang === 'el' ? 'en' : 'el';
    applyTranslations();
    mobileNav.classList.remove('open');
  });
}

// ===== ARTICLES / ANNOUNCEMENTS TABS =====
const tabBtns = document.querySelectorAll('.tab-btn');
const articlesGrid = document.getElementById('articlesGrid');
const announcementsGrid = document.getElementById('announcementsGrid');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.tab === 'articles') {
      articlesGrid.classList.remove('hidden');
      announcementsGrid.classList.add('hidden');
    } else {
      articlesGrid.classList.add('hidden');
      announcementsGrid.classList.remove('hidden');
    }
  });
});

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function renderNewsCard(doc, col) {
  const d = doc.data();
  const url = `article.html?col=${col}&id=${doc.id}`;
  const imgHtml = d.coverImageUrl
    ? `<img src="${d.coverImageUrl}" alt="${d.title}" loading="lazy" />`
    : '';
  const preview = d.body ? d.body.slice(0, 140) + (d.body.length > 140 ? '…' : '') : '';
  return `
    <a href="${url}" class="news-card-link">
      <article class="news-card">
        ${imgHtml}
        <div class="news-body">
          <h3>${d.title}</h3>
          <p>${preview}</p>
          <div class="meta">${d.authorName || ''} &middot; ${formatDate(d.publishedAt || d.createdAt)}</div>
          ${d.body && d.body.length > 140 ? '<span class="read-more-label">Διάβασε περισσότερα →</span>' : ''}
        </div>
      </article>
    </a>`;
}

async function loadArticles() {
  try {
    const q = query(collection(db, 'articles'), where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(12));
    const snap = await getDocs(q);
    if (snap.empty) {
      articlesGrid.innerHTML = `<p class="news-placeholder">${translations[currentLang].news_empty}</p>`;
    } else {
      articlesGrid.innerHTML = snap.docs.map(d => renderNewsCard(d, 'articles')).join('');
    }
  } catch (err) {
    console.error('loadArticles error:', err);
    articlesGrid.innerHTML = `<p class="news-placeholder">${translations[currentLang].news_empty}</p>`;
  }
}

async function loadAnnouncements() {
  try {
    const q = query(collection(db, 'announcements'), where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(12));
    const snap = await getDocs(q);
    if (snap.empty) {
      announcementsGrid.innerHTML = `<p class="news-placeholder">${translations[currentLang].news_empty}</p>`;
    } else {
      announcementsGrid.innerHTML = snap.docs.map(d => renderNewsCard(d, 'announcements')).join('');
    }
  } catch (err) {
    console.error('loadAnnouncements error:', err);
    announcementsGrid.innerHTML = `<p class="news-placeholder">${translations[currentLang].news_empty}</p>`;
  }
}

// ===== GALLERY =====
const galleryGrid = document.getElementById('galleryGrid');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');

async function loadGallery() {
  try {
    const q = query(collection(db, 'gallery'), where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(24));
    const snap = await getDocs(q);
    if (snap.empty) {
      galleryGrid.innerHTML = `<p class="gallery-placeholder">${translations[currentLang].gallery_empty}</p>`;
    } else {
      galleryGrid.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `<div class="gallery-item" data-src="${d.imageUrl}" data-caption="${d.caption || ''}">
          <img src="${d.imageUrl}" alt="${d.caption || 'Gallery'}" loading="lazy" />
          <div class="caption">${d.caption || ''}</div>
        </div>`;
      }).join('');
      galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => {
          lightboxImg.src = item.dataset.src;
          lightboxCaption.textContent = item.dataset.caption;
          lightbox.classList.add('open');
        });
      });
    }
  } catch {
    galleryGrid.innerHTML = `<p class="gallery-placeholder">${translations[currentLang].gallery_empty}</p>`;
  }
}

document.getElementById('lightboxClose').addEventListener('click', () => lightbox.classList.remove('open'));
lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') lightbox.classList.remove('open'); });

// ===== ΔΩΡΕΑ — αντιγραφή IBAN =====
const IBAN = 'GR5801710420006042145997905';
const btnCopyIban = document.getElementById('btnCopyIban');
if (btnCopyIban) {
  btnCopyIban.addEventListener('click', async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(IBAN);
      ok = true;
    } catch {
      // Fallback για παλιούς browsers / http
      const ta = document.createElement('textarea');
      ta.value = IBAN;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    if (ok) {
      btnCopyIban.textContent = translations[currentLang].donate_copied;
      btnCopyIban.classList.add('copied');
      setTimeout(() => {
        btnCopyIban.textContent = translations[currentLang].donate_copy;
        btnCopyIban.classList.remove('copied');
      }, 2500);
    }
  });
}

// ===== GOOGLE SHEETS (εθελοντές) =====
// Στέλνει την εγγραφή εθελοντή σε Google Form, που ενημερώνει αυτόματα
// το Google Sheet «Εθελοντές site». Αποτυχία δεν επηρεάζει τον επισκέπτη
// (η εγγραφή έχει ήδη σωθεί σε Firestore + email).
const SHEETS_FORM_ID = '1FAIpQLScXSx4CulxXwfPwsOQBGqS50odibGwhIVdsVbqod9VigD7-dA';
const SHEETS_ENTRIES = {
  name:      'entry.731191083',
  email:     'entry.474990558',
  phone:     'entry.1553215363',
  interests: 'entry.1116117290',
  message:   'entry.1477498083',
};
function sendVolunteerToSheet({ name, email, phone, interests, message }) {
  if (!SHEETS_FORM_ID) return;
  try {
    const body = new URLSearchParams();
    body.append(SHEETS_ENTRIES.name, name || '');
    body.append(SHEETS_ENTRIES.email, email || '');
    body.append(SHEETS_ENTRIES.phone, phone || '');
    body.append(SHEETS_ENTRIES.interests, interests || '');
    body.append(SHEETS_ENTRIES.message, message || '');
    fetch(`https://docs.google.com/forms/d/e/${SHEETS_FORM_ID}/formResponse`, {
      method: 'POST', mode: 'no-cors', body
    }).catch(() => {});
  } catch { /* silent */ }
}

// ===== FORM HELPERS =====
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function showError(el, msg) { el.textContent = msg; el.style.display = 'block'; }
function hideError(el) { el.style.display = 'none'; }
function showSuccess(el) { el.style.display = 'block'; }

// ===== AUTO-REPLY (η σελίδα απαντά αυτόματα στον επισκέπτη) =====
// Στέλνεται από το Gmail της ομάδας μέσω EmailJS. Ενεργοποιείται μόλις
// συμπληρωθεί το ID του auto-reply template από το EmailJS dashboard.
const AUTOREPLY_TEMPLATE_ID = 'template_6mpy8yq';

async function sendAutoReply(kind, name, email) {
  if (!AUTOREPLY_TEMPLATE_ID) return;
  const gr = currentLang !== 'en';
  const auto_subject = kind === 'volunteer'
    ? (gr ? 'Νέα Γενιά «Πράξις»: Λάβαμε την αίτησή σου' : 'Nea Genia "Praxis": We received your application')
    : (gr ? 'Νέα Γενιά «Πράξις»: Λάβαμε το μήνυμά σου' : 'Nea Genia "Praxis": We received your message');
  const auto_message = kind === 'volunteer'
    ? (gr ? 'Ευχαριστούμε για το ενδιαφέρον σου να γίνεις μέλος της ομάδας μας! Λάβαμε τα στοιχεία σου και θα επικοινωνήσουμε σύντομα μαζί σου.'
          : 'Thank you for your interest in joining our team! We received your details and will get in touch with you soon.')
    : (gr ? 'Λάβαμε το μήνυμά σου και θα σου απαντήσουμε το συντομότερο δυνατό.'
          : 'We received your message and will reply as soon as possible.');
  try {
    await window.emailjs.send('service_orzkyoc', AUTOREPLY_TEMPLATE_ID, {
      email, name, auto_subject, auto_message
    });
  } catch { /* silent — δεν επηρεάζει τον επισκέπτη */ }
}

// ===== CONTACT FORM =====
document.getElementById('contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  if (form.querySelector('input[name="website"]').value) return; // honeypot

  const errEl = document.getElementById('contactError');
  const sucEl = document.getElementById('contactSuccess');
  hideError(errEl); sucEl.style.display = 'none';

  const name    = form.querySelector('#cName').value.trim();
  const email   = form.querySelector('#cEmail').value.trim();
  const message = form.querySelector('#cMessage').value.trim();

  if (!name || !email || !message) { showError(errEl, translations[currentLang].err_required); return; }
  if (!isValidEmail(email))        { showError(errEl, translations[currentLang].err_email); return; }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await addDoc(collection(db, 'contactMessages'), { name, email, message, createdAt: serverTimestamp() });
    // EmailJS — αποτυχία δεν μπλοκάρει
    try {
      await window.emailjs.send('service_orzkyoc', 'template_bvainut', {
        form_type: 'Επικοινωνία', name, email, message,
        phone: '', interests: ''
      });
    } catch { /* silent */ }
    sendAutoReply('contact', name, email);
    showSuccess(sucEl);
    form.reset();
  } catch {
    showError(errEl, translations[currentLang].err_generic);
  } finally {
    btn.disabled = false;
  }
});

// ===== VOLUNTEER FORM =====
document.getElementById('volunteerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  if (form.querySelector('input[name="website"]').value) return; // honeypot

  const errEl = document.getElementById('volunteerError');
  const sucEl = document.getElementById('volunteerSuccess');
  hideError(errEl); sucEl.style.display = 'none';

  const name    = form.querySelector('#vName').value.trim();
  const email   = form.querySelector('#vEmail').value.trim();
  const phone   = form.querySelector('#vPhone').value.trim();
  const message = form.querySelector('#vMessage').value.trim();
  const checked = [...form.querySelectorAll('input[name="interests"]:checked')].map(c => c.value);

  if (!name || !email) { showError(errEl, translations[currentLang].err_required); return; }
  if (!isValidEmail(email)) { showError(errEl, translations[currentLang].err_email); return; }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await addDoc(collection(db, 'volunteers'), { name, email, phone, interests: checked, message, createdAt: serverTimestamp() });
    // EmailJS — αποτυχία δεν μπλοκάρει
    try {
      await window.emailjs.send('service_orzkyoc', 'template_bvainut', {
        form_type: 'Εθελοντής', name, email,
        phone: phone || '',
        interests: checked.join(', '),
        message: message || ''
      });
    } catch { /* silent */ }
    sendAutoReply('volunteer', name, email);
    sendVolunteerToSheet({ name, email, phone, interests: checked.join(', '), message });
    showSuccess(sucEl);
    form.reset();
  } catch {
    showError(errEl, translations[currentLang].err_generic);
  } finally {
    btn.disabled = false;
  }
});

// ===== ADMIN SHORTCUT =====
// Εμφανίζει το floating badge μόνο σε logged-in admin/author
onAuthStateChanged(auth, async user => {
  const btn = document.getElementById('adminPanelBtn');
  if (!btn) return;
  if (!user) { btn.style.display = 'none'; return; }
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    const role = snap.exists() ? snap.data().role : null;
    btn.style.display = (role === 'admin' || role === 'author') ? 'block' : 'none';
  } catch {
    btn.style.display = 'none';
  }
});

// ===== INIT =====
applyTranslations();
loadActions();
loadArticles();
loadAnnouncements();
loadGallery();

