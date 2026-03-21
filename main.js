(() => {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Resolve paths from project root (folder containing main.js) so navigation works from any subpage. */
  const getSiteRoot = () => {
    const el = document.querySelector('script[src*="main.js"]');
    const src = el?.getAttribute('src')?.trim() || './main.js';
    return new URL('./', new URL(src, window.location.href));
  };
  const goTo = (path) => {
    window.location.href = new URL(path, getSiteRoot()).href;
  };
  const STORAGE_KEYS = {
    subscriptionStart: 'subscriptionTrialStartAt',
    subscriptionCancelled: 'subscriptionCancelled',
  };
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

  const isSubscriptionCancelled = () => localStorage.getItem(STORAGE_KEYS.subscriptionCancelled) === '1';

  const markSubscriptionCancelled = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.subscriptionCancelled, '1');
    } catch {
      /* ignore quota / private mode */
    }
  };

  /** Remaining trial time in ms; 0 if subscription was successfully cancelled or trial ended. */
  const getTrialMsLeft = () => {
    if (isSubscriptionCancelled()) return 0;
    const startRaw = localStorage.getItem(STORAGE_KEYS.subscriptionStart);
    if (!startRaw) return TRIAL_DURATION_MS;
    const startAt = Number(startRaw);
    if (!Number.isFinite(startAt)) return TRIAL_DURATION_MS;
    return Math.max(0, TRIAL_DURATION_MS - (Date.now() - startAt));
  };

  // ----- Warning popup (show once after 10s) -----
  const overlay = qs('[data-warning-overlay]');
  const closeBtn = qs('[data-warning-close]');
  const okBtn = qs('[data-warning-ok]');
  const isHomePage = /(?:^|\/)index\.html$/i.test(window.location.pathname) || window.location.pathname.endsWith('/');

  const ensureSubscriptionStart = () => {
    if (!isHomePage) return;
    if (localStorage.getItem(STORAGE_KEYS.subscriptionStart)) return;
    localStorage.setItem(STORAGE_KEYS.subscriptionStart, String(Date.now()));
  };

  const showOverlay = () => {
    if (!overlay) return;
    overlay.classList.remove('is-hidden');
    overlay.setAttribute('aria-hidden', 'false');
  };
  const hideOverlay = () => {
    if (!overlay) return;
    ensureSubscriptionStart();
    overlay.classList.add('is-hidden');
    overlay.setAttribute('aria-hidden', 'true');
  };

  // Always show after 10s on every page load.
  window.setTimeout(() => {
    showOverlay();
  }, 10000);

  closeBtn?.addEventListener('click', hideOverlay);
  okBtn?.addEventListener('click', hideOverlay);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) hideOverlay();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideOverlay();
  });

  // ----- Carousel -----
  const slides = qsa('[data-carousel-slide]');
  const dotsHost = qs('[data-carousel-dots]');
  let current = 0;

  const renderDots = () => {
    if (!dotsHost) return;
    dotsHost.innerHTML = '';
    slides.forEach((_, idx) => {
      const dot = document.createElement('div');
      dot.className = `w-4 h-4 border-4 border-win-black transition-colors ${idx === current ? 'bg-win-black' : 'bg-white'}`;
      dotsHost.appendChild(dot);
    });
  };

  const applySlidePositions = () => {
    slides.forEach((el, idx) => {
      const offset = idx - current; // 0 = center, 1 = right, -1 = left
      el.style.transform = `translateX(${offset * 100}%)`;
    });
  };

  const setActiveSlide = (next) => {
    if (!slides.length) return;
    current = (next + slides.length) % slides.length;
    applySlidePositions();
    renderDots();
  };

  if (slides.length) {
    applySlidePositions();
    renderDots();
    window.setInterval(() => setActiveSlide(current + 1), 3000);
  }

  // ----- Trial countdown + progress (visual illusion) -----
  // Original React mock was static: "23:59:59" and a nearly-full bar.
  const barEl = qs('[data-trial-progress]');
  if (barEl) barEl.style.width = '99%';

  // ----- Subscription page realtime countdown -----
  const countdownEl = qs('[data-subscription-countdown]');
  if (countdownEl) {
    const formatHMS = (msLeft) => {
      const total = Math.max(0, Math.floor(msLeft / 1000));
      const h = String(Math.floor(total / 3600)).padStart(2, '0');
      const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
      const s = String(total % 60).padStart(2, '0');
      return `${h}:${m}:${s}`;
    };

    const tickCountdown = () => {
      countdownEl.textContent = formatHMS(getTrialMsLeft());
    };

    tickCountdown();
    if (!isSubscriptionCancelled()) {
      window.setInterval(tickCountdown, 1000);
    }
  }

  // ----- Cancel plan page remaining time + button behavior -----
  const cancelRemainingEl = qs('[data-cancel-remaining]');
  if (cancelRemainingEl) {
    const formatRemaining = (msLeft) => {
      const ms = Math.max(0, msLeft);
      if (ms <= 0) return '0 minutes left';

      const day = 24 * 60 * 60 * 1000;
      const hour = 60 * 60 * 1000;
      const minute = 60 * 1000;

      if (ms >= day) {
        const days = Math.ceil(ms / day);
        return `${days} days left`;
      }
      if (ms >= hour) {
        const hours = Math.ceil(ms / hour);
        return `${hours} hours left`;
      }
      const mins = Math.max(1, Math.ceil(ms / minute));
      return `${mins} minutes left`;
    };

    const tickCancelRemaining = () => {
      cancelRemainingEl.textContent = formatRemaining(getTrialMsLeft());
    };

    tickCancelRemaining();
    if (!isSubscriptionCancelled()) {
      window.setInterval(tickCancelRemaining, 1000);
    }
  }

  const keepMembershipBtn = qs('[data-keep-membership]');
  const remindLaterBtn = qs('[data-remind-later]');
  if (keepMembershipBtn) {
    keepMembershipBtn.addEventListener('click', () => {
      goTo('index.html');
    });
  }
  if (remindLaterBtn) {
    remindLaterBtn.addEventListener('click', () => {
      window.history.back();
    });
  }

  const cancelFinalLink = qs('[data-cancel-final]');
  const leaveOverlay = qs('[data-leave-overlay]');
  const leaveClose = qs('[data-leave-close]');
  const leaveKeep = qs('[data-leave-keep]');
  const leaveConfirm = qs('[data-leave-confirm]');

  const feedbackOverlay = qs('[data-feedback-overlay]');
  const feedbackClose = qs('[data-feedback-close]');
  const feedbackLeave = qs('[data-feedback-leave]');
  const feedbackSkip = qs('[data-feedback-skip]');

  const showLeaveOverlay = () => {
    if (!leaveOverlay) return;
    leaveOverlay.classList.remove('is-hidden');
    leaveOverlay.setAttribute('aria-hidden', 'false');
  };

  const hideLeaveOverlay = () => {
    if (!leaveOverlay) return;
    leaveOverlay.classList.add('is-hidden');
    leaveOverlay.setAttribute('aria-hidden', 'true');
  };

  const showFeedbackOverlay = () => {
    if (!feedbackOverlay) return;
    feedbackOverlay.classList.remove('is-hidden');
    feedbackOverlay.setAttribute('aria-hidden', 'false');
  };

  const hideFeedbackOverlay = () => {
    if (!feedbackOverlay) return;
    feedbackOverlay.classList.add('is-hidden');
    feedbackOverlay.setAttribute('aria-hidden', 'true');
  };

  cancelFinalLink?.addEventListener('click', (e) => {
    // On cancel-plan page, intercept and show retention popup first
    if (!leaveOverlay) return;
    e.preventDefault();
    showLeaveOverlay();
  });
  leaveClose?.addEventListener('click', hideLeaveOverlay);
  leaveKeep?.addEventListener('click', () => {
    hideLeaveOverlay();
    goTo('index.html');
  });
  leaveConfirm?.addEventListener('click', () => {
    hideLeaveOverlay();
    showFeedbackOverlay();
  });
  leaveOverlay?.addEventListener('click', (e) => {
    if (e.target === leaveOverlay) hideLeaveOverlay();
  });

  feedbackClose?.addEventListener('click', hideFeedbackOverlay);
  feedbackLeave?.addEventListener('click', () => {
    hideFeedbackOverlay();
    markSubscriptionCancelled();
    goTo('customer-support/');
  });
  feedbackSkip?.addEventListener('click', () => {
    hideFeedbackOverlay();
    markSubscriptionCancelled();
    goTo('cancelled/');
  });
  feedbackOverlay?.addEventListener('click', (e) => {
    if (e.target === feedbackOverlay) hideFeedbackOverlay();
  });

  // ----- Manage subscription: expandable sections -----
  const bindExpandable = (triggerSelector, panelSelector) => {
    const trigger = qs(triggerSelector);
    const panel = qs(panelSelector);
    if (!trigger || !panel) return;

    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !expanded;
      trigger.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
      panel.classList.toggle('is-open', nextExpanded);
    });
  };

  bindExpandable('[data-switch-plan-trigger]', '[data-switch-plan-panel]');
  bindExpandable('[data-more-options-trigger]', '[data-more-options-panel]');
  bindExpandable('[data-preferences-trigger]', '[data-preferences-panel]');

  // ----- Cancel membership confirmation popup -----
  const cancelTrigger = qs('[data-cancel-trigger]');
  const cancelOverlay = qs('[data-cancel-overlay]');
  const cancelClose = qs('[data-cancel-close]');
  const cancelPrimary = qs('[data-cancel-primary]');
  const cancelContinue = qs('[data-cancel-continue]');

  const showCancelOverlay = () => {
    if (!cancelOverlay) return;
    cancelOverlay.classList.remove('is-hidden');
    cancelOverlay.setAttribute('aria-hidden', 'false');
  };

  const hideCancelOverlay = () => {
    if (!cancelOverlay) return;
    cancelOverlay.classList.add('is-hidden');
    cancelOverlay.setAttribute('aria-hidden', 'true');
  };

  cancelTrigger?.addEventListener('click', (e) => {
    e.preventDefault();
    showCancelOverlay();
  });
  cancelClose?.addEventListener('click', hideCancelOverlay);
  cancelPrimary?.addEventListener('click', hideCancelOverlay);
  cancelContinue?.addEventListener('click', () => {
    hideCancelOverlay();
    // Proceed to cancel plan page
    goTo('cancel-plan/');
  });
  cancelOverlay?.addEventListener('click', (e) => {
    if (e.target === cancelOverlay) hideCancelOverlay();
  });
})();

