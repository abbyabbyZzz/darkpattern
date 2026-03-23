'use strict';

function getGameUrl() {
  try {
    return new URL('game/index.html', window.location.href).href;
  } catch {
    return 'game/index.html';
  }
}

const GAME_URL = getGameUrl();

// ── 1. PROGRESS BAR ──────────────────────────────
const progressBar = document.getElementById('progress-bar');
window.addEventListener('scroll', () => {
  if (!progressBar) return;
  const max = document.body.scrollHeight - window.innerHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  progressBar.style.width = Math.min(pct, 100) + '%';
}, { passive: true });

// ── 2. SCROLL REVEAL ─────────────────────────────
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.13 });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ── 3. ACTIVE NAV ────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('[data-nav]');

const navObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a =>
        a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)
      );
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => navObs.observe(s));

// ── 4. MOBILE NAV ────────────────────────────────
const navToggle = document.getElementById('nav-toggle');
const navList   = document.getElementById('nav-links');

navToggle.addEventListener('click', () => {
  const open = navList.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
  const spans = navToggle.querySelectorAll('span');
  spans[0].style.transform = open ? 'translateY(8px) rotate(45deg)' : '';
  spans[2].style.transform = open ? 'translateY(-8px) rotate(-45deg)' : '';
  spans[1].style.opacity   = open ? '0' : '1';
});

navList.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navList.classList.remove('open');
  navToggle.setAttribute('aria-expanded', false);
  navToggle.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = '1'; });
}));

// ── 5. SMOOTH ANCHOR SCROLL ──────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
  });
});

// ── 6. STAGGER GRID CHILDREN ─────────────────────
document.querySelectorAll('.patterns-grid .px-notecard, .team-grid .team-card').forEach((el, i) => {
  el.style.transitionDelay = (i * 0.07) + 's';
});

// ── 7. SHARE FUNCTIONS ───────────────────────────
const shareInput = document.getElementById('share-url');
if (shareInput) shareInput.value = shareInput.value || GAME_URL;

const SHARE_TXT = 'Can you escape the Subscription Trap? This game exposes the dark patterns apps use to trap you.';

window.shareVia = function (platform) {
  const u = encodeURIComponent(GAME_URL);
  const t = encodeURIComponent(SHARE_TXT);
  const map = {
    whatsapp: `https://api.whatsapp.com/send?text=${t}%20${u}`,
    email:    `mailto:?subject=${encodeURIComponent('You need to play this game')}&body=${t}%0A%0A${u}`,
  };
  if (map[platform]) {
    window.open(map[platform], '_blank', 'noopener,noreferrer');
  } else {
    // Instagram / Discord → copy link
    navigator.clipboard.writeText(GAME_URL)
      .then(() => toast(`Link copied! Paste into ${platform === 'instagram' ? 'Instagram' : 'Discord'}.`))
      .catch(() => toast('Could not copy — please copy the link manually.'));
  }
};

window.copyLink = function () {
  const input = document.getElementById('share-url');
  const text = (input && input.value) ? input.value : GAME_URL;
  if (input && !input.value) input.value = GAME_URL;
  navigator.clipboard.writeText(text)
    .then(() => toast('Link copied!'))
    .catch(() => { if (input) { input.select(); document.execCommand('copy'); } toast('Link copied!'); });
};

// ── 8. TOAST ─────────────────────────────────────
function toast(msg) {
  document.getElementById('px-toast')?.remove();
  const t = document.createElement('div');
  t.id = 'px-toast';
  t.textContent = msg;
  t.style.cssText = `
    position:fixed; bottom:1.5rem; left:50%;
    transform:translateX(-50%);
    background:var(--purple-dark);
    border:3px solid var(--amber-light);
    box-shadow:4px 4px 0 var(--purple-mid);
    color:var(--cream);
    font-family:'Press Start 2P',monospace;
    font-size:0.625rem;
    letter-spacing:.04em;
    padding:.75rem 1.25rem;
    z-index:9999;
    white-space:nowrap;
    animation:toastIn .2s steps(4) forwards;
  `;
  document.head.insertAdjacentHTML('beforeend',
    '<style>@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}' +
    '@keyframes toastOut{to{opacity:0;transform:translateX(-50%) translateY(6px)}}</style>'
  );
  document.body.appendChild(t);
  setTimeout(() => { t.style.animation = 'toastOut .25s steps(4) forwards'; setTimeout(() => t.remove(), 250); }, 2800);
}

// ── 9. FILE INPUT LABEL ──────────────────────────
const fileInput = document.getElementById('bug-file');
const fileName  = document.getElementById('file-name');
if (fileInput) {
  fileInput.addEventListener('change', () => {
    fileName.textContent = fileInput.files[0] ? '> ' + fileInput.files[0].name : '';
  });
}

// ── 10. BUG FORM ─────────────────────────────────
const bugForm     = document.getElementById('bug-form');
const formSuccess = document.getElementById('form-success');

if (bugForm) {
  bugForm.addEventListener('submit', e => {
    e.preventDefault();
    const desc = document.getElementById('bug-desc').value.trim();
    if (!desc) { document.getElementById('bug-desc').focus(); toast('Please describe the bug first.'); return; }

    const btn = bugForm.querySelector('button[type="submit"]');
    btn.textContent = 'SENDING...';
    btn.disabled = true;

    setTimeout(() => {
      bugForm.hidden = true;
      formSuccess.hidden = false;
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 1000);
  });
}

// ── 11. LIVE RESULTS (ENDING SURVEY) ─────────────
const ENDING_SURVEY_KEY = 'trapEndingSurveyResponses';
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCp40xxSnJ8wVpdnWCgvEG2zLS4FnmeTRQ',
  authDomain: 'cct383-cd083.firebaseapp.com',
  projectId: 'cct383-cd083',
  storageBucket: 'cct383-cd083.firebasestorage.app',
  messagingSenderId: '178903299455',
  appId: '1:178903299455:web:34c4d47da7b3f2044d564a',
  measurementId: 'G-NS2M2VWS1K',
};
const FIREBASE_TOTALS_COLLECTION = 'surveyTotals';
const FIREBASE_TOTALS_DOC = 'main';
const RESULTS_OPTIONS = [
  'Hidden cancellation path',
  'Confirm shaming',
  'Misleading buttons',
  'Fake customer support',
];
const RESULT_FIELD_MAP = {
  'Hidden cancellation path': 'hiddenPath',
  'Confirm shaming': 'confirmShaming',
  'Misleading buttons': 'misleadingButtons',
  'Fake customer support': 'fakeSupport',
};
let firebaseResultsApiPromise = null;

function readEndingSurveyRows() {
  try {
    const raw = localStorage.getItem(ENDING_SURVEY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getFirebaseResultsApi() {
  if (firebaseResultsApiPromise) return firebaseResultsApiPromise;
  firebaseResultsApiPromise = (async () => {
    const [{ initializeApp }, { getFirestore, doc, getDoc }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js'),
    ]);
    const app = initializeApp(FIREBASE_CONFIG, 'cct383-marketing-results');
    const db = getFirestore(app);
    return { getDoc, totalsRef: doc(db, FIREBASE_TOTALS_COLLECTION, FIREBASE_TOTALS_DOC) };
  })().catch((err) => {
    firebaseResultsApiPromise = null;
    throw err;
  });
  return firebaseResultsApiPromise;
}

async function readFirebaseSurveyRows() {
  try {
    const { getDoc, totalsRef } = await getFirebaseResultsApi();
    const snap = await getDoc(totalsRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return RESULTS_OPTIONS.map((label) => {
      const field = RESULT_FIELD_MAP[label];
      const count = Number(data?.[field]);
      const safe = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
      return { choice: label, count: safe };
    });
  } catch {
    return null;
  }
}

function renderResultsChartFromRows(rows) {
  const chartHost = document.querySelector('[data-results-chart]');
  const totalEl = document.querySelector('[data-results-total]');
  if (!chartHost || !totalEl) return;
  const counts = new Map(RESULTS_OPTIONS.map((label) => [label, 0]));
  rows.forEach((row) => {
    const key = row && typeof row.choice === 'string' ? row.choice : '';
    if (!counts.has(key)) return;
    const directCount = Number(row?.count);
    if (Number.isFinite(directCount)) {
      counts.set(key, Math.max(0, Math.floor(directCount)));
      return;
    }
    counts.set(key, counts.get(key) + 1);
  });

  const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
  totalEl.textContent = `Total responses: ${total}`;

  if (total === 0) {
    chartHost.innerHTML = '<p class="results-empty">No survey responses yet. Play the game and submit one!</p>';
    return;
  }

  chartHost.innerHTML = '';
  RESULTS_OPTIONS.forEach((label) => {
    const count = counts.get(label) || 0;
    const pct = Math.round((count / total) * 100);

    const row = document.createElement('div');
    row.className = 'results-row';

    const labelEl = document.createElement('p');
    labelEl.className = 'results-row__label';
    labelEl.textContent = label;

    const barWrap = document.createElement('div');
    barWrap.className = 'results-row__bar-wrap';

    const bar = document.createElement('div');
    bar.className = 'results-row__bar';
    bar.style.width = `${pct}%`;

    const meta = document.createElement('p');
    meta.className = 'results-row__meta';
    meta.textContent = `${count} vote${count === 1 ? '' : 's'} (${pct}%)`;

    barWrap.appendChild(bar);
    row.appendChild(labelEl);
    row.appendChild(barWrap);
    row.appendChild(meta);
    chartHost.appendChild(row);
  });
}

async function renderResultsChart() {
  const remoteRows = await readFirebaseSurveyRows();
  const rows = Array.isArray(remoteRows) ? remoteRows : readEndingSurveyRows();
  renderResultsChartFromRows(rows);
}

renderResultsChart();
window.addEventListener('storage', (e) => {
  if (e.key === ENDING_SURVEY_KEY) renderResultsChart();
});
window.setInterval(renderResultsChart, 4000);
