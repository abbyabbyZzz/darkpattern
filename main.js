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
