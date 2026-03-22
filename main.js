(() => {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Resolve paths from project root (folder containing main.js) so navigation works from any subpage. */
  const getSiteRoot = () => {
    const el = document.querySelector('script[src*="main.js"]');
    const src = el?.getAttribute('src')?.trim() || './main.js';
    return new URL('./', new URL(src, window.location.href));
  };
  const BG_MUSIC_KEY = 'bgMusicState';
  /** Set when leaving via in-site navigation so the next page can resume with muted→unmute (autoplay policy). */
  const BG_MUSIC_INTERNAL_NAV_KEY = 'bgMusicInternalNav';
  const BG_MUSIC_MUTED_KEY = 'bgMusicMuted';
  /** After first successful audible playback, browsers allow autoplay with sound on return visits. */
  const MUSIC_UNLOCK_KEY = 'bgMusicAutoplayUnlocked';
  const MUSIC_TARGET_VOL = 0.35;

  let bgMusicEl = null;

  const saveMusicState = () => {
    if (!bgMusicEl) return;
    try {
      sessionStorage.setItem(
        BG_MUSIC_KEY,
        JSON.stringify({
          t: bgMusicEl.currentTime,
          playing: !bgMusicEl.paused,
        }),
      );
    } catch {
      /* ignore */
    }
  };

  /** 站内跳转：保存状态并立刻换页（无淡出，减少无声间隙） */
  const navigateInSite = (absUrl) => {
    try {
      sessionStorage.setItem(BG_MUSIC_INTERNAL_NAV_KEY, '1');
    } catch {
      /* ignore */
    }
    saveMusicState();
    window.location.href = absUrl;
  };

  const goTo = (path) => {
    navigateInSite(new URL(path, getSiteRoot()).href);
  };

  const initBackgroundMusic = () => {
    const audio = qs('#bg-music');
    if (!audio) return;
    bgMusicEl = audio;

    try {
      const explicit = audio.dataset.musicSrc?.trim();
      audio.src = explicit
        ? new URL(explicit, window.location.href).href
        : new URL('assets/bg-music.mp3', getSiteRoot()).href;
      audio.load();
    } catch {
      return;
    }

    audio.setAttribute('loop', '');
    audio.loop = true;
    audio.volume = MUSIC_TARGET_VOL;
    audio.muted = false;

    /** Backup if browser ignores loop attribute on some tracks */
    audio.addEventListener('ended', () => {
      try {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch {
        /* ignore */
      }
    });

    const readState = () => {
      try {
        const raw = sessionStorage.getItem(BG_MUSIC_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    const applyVolume = () => {
      audio.volume = MUSIC_TARGET_VOL;
    };

    const readMutedPreference = () => {
      try {
        return localStorage.getItem(BG_MUSIC_MUTED_KEY) === '1';
      } catch {
        return false;
      }
    };

    const saveMutedPreference = (isMuted) => {
      try {
        localStorage.setItem(BG_MUSIC_MUTED_KEY, isMuted ? '1' : '0');
      } catch {
        /* ignore */
      }
    };

    let userMuted = readMutedPreference();
    let toggleBtn = null;
    const TOGGLE_BASE_CLASSES = 'win-button text-10 uppercase';

    const updateToggleTheme = () => {
      if (!toggleBtn) return;
      toggleBtn.className = userMuted
        ? `${TOGGLE_BASE_CLASSES} bg-win-black text-win-beige border-win-black`
        : `${TOGGLE_BASE_CLASSES} bg-win-blue text-white border-win-blue`;
    };

    const updateToggleLabel = () => {
      if (!toggleBtn) return;
      toggleBtn.textContent = userMuted ? 'Music Off' : 'Music On';
      toggleBtn.setAttribute('aria-pressed', userMuted ? 'true' : 'false');
      toggleBtn.title = userMuted ? 'Turn music on' : 'Turn music off';
      updateToggleTheme();
    };

    const syncMutedFromPreference = () => {
      audio.muted = userMuted;
      if (!userMuted) applyVolume();
      updateToggleLabel();
    };

    const ensureMusicToggleButton = () => {
      if (document.body?.dataset?.startPage === 'true') return;
      toggleBtn = document.getElementById('music-toggle-btn');
      if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.id = 'music-toggle-btn';
        toggleBtn.type = 'button';
        toggleBtn.className = TOGGLE_BASE_CLASSES;
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.right = '16px';
        toggleBtn.style.bottom = '16px';
        toggleBtn.style.zIndex = '45';
        toggleBtn.style.boxShadow = 'var(--shadow-hard)';
        document.body.appendChild(toggleBtn);
      }

      toggleBtn.addEventListener('click', () => {
        userMuted = !userMuted;
        saveMutedPreference(userMuted);
        syncMutedFromPreference();
        if (!userMuted) {
          const p = audio.play();
          if (p !== undefined) {
            p.then(() => {
              markUnlocked();
            }).catch(() => {});
          } else {
            markUnlocked();
          }
        }
      });

      updateToggleLabel();
    };

    const markUnlocked = () => {
      try {
        localStorage.setItem(MUSIC_UNLOCK_KEY, '1');
      } catch {
        /* ignore */
      }
    };

    const isUnlocked = () => {
      try {
        return localStorage.getItem(MUSIC_UNLOCK_KEY) === '1';
      } catch {
        return false;
      }
    };

    const applySavedTime = (st) => {
      if (!st || typeof st.t !== 'number' || st.t <= 0) return;
      try {
        const maxT = Math.max(0, (audio.duration || 0) - 0.25);
        audio.currentTime = Math.min(st.t, maxT);
      } catch {
        /* ignore */
      }
    };

    const startOrResume = () => {
      userMuted = readMutedPreference();
      const st = readState();

      let internalNav = false;
      try {
        if (sessionStorage.getItem(BG_MUSIC_INTERNAL_NAV_KEY) === '1') {
          sessionStorage.removeItem(BG_MUSIC_INTERNAL_NAV_KEY);
          internalNav = true;
        }
      } catch {
        /* ignore */
      }

      /** Next document has no user gesture — muted play() usually succeeds, then unmute. */
      const resumeAfterInternalNav = () => {
        applySavedTime(st);
        audio.muted = true;
        audio.volume = 0;
        const p = audio.play();
        const afterPlay = () => {
          syncMutedFromPreference();
          if (!userMuted) {
            markUnlocked();
          }
        };
        if (p !== undefined) {
          p.then(() => afterPlay()).catch(() => {
            attachUnlockListeners();
          });
        } else {
          afterPlay();
        }
      };

      if (internalNav && st?.playing !== false) {
        const go = () => {
          resumeAfterInternalNav();
        };
        if (st && typeof st.t === 'number' && st.t > 0) {
          audio.addEventListener('loadedmetadata', go, { once: true });
        } else if (audio.readyState >= 2) {
          go();
        } else {
          audio.addEventListener('canplay', go, { once: true });
        }
        return;
      }

      if (st && typeof st.t === 'number' && st.t > 0) {
        audio.addEventListener(
          'loadedmetadata',
          () => {
            applySavedTime(st);
          },
          { once: true },
        );
      }

      const attachUnlockListeners = () => {
        const unlock = () => {
          if (userMuted) return;
          audio.muted = false;
          audio
            .play()
            .then(() => {
              applyVolume();
              markUnlocked();
            })
            .catch(() => {});
          document.removeEventListener('pointerdown', unlock);
          document.removeEventListener('click', unlock);
          document.removeEventListener('keydown', unlock);
          document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('pointerdown', unlock, { once: true, capture: true });
        document.addEventListener('click', unlock, { once: true, capture: true });
        document.addEventListener('keydown', unlock, { once: true, capture: true });
        document.addEventListener('touchstart', unlock, { once: true, capture: true });
      };

      const runPlay = (useMutedFallback) => {
        const tryPlay = () => {
          const promise = audio.play();
          if (promise === undefined) {
            applyVolume();
            markUnlocked();
            return;
          }
          return promise
            .then(() => {
              if (audio.muted && !userMuted) {
                audio.muted = false;
                return audio
                  .play()
                  .then(() => {
                    applyVolume();
                    markUnlocked();
                  })
                  .catch(() => {
                    attachUnlockListeners();
                  });
              }
              applyVolume();
              markUnlocked();
            })
            .catch(() => {
              if (!useMutedFallback) {
                audio.muted = true;
                runPlay(true);
                return;
              }
              attachUnlockListeners();
            });
        };
        tryPlay();
      };

      if (isUnlocked() && !userMuted) {
        audio.muted = false;
      }
      syncMutedFromPreference();
      runPlay(false);
    };

    ensureMusicToggleButton();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden || !audio) return;
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    });

    window.addEventListener('pagehide', saveMusicState);
    window.addEventListener('beforeunload', saveMusicState);

    document.addEventListener(
      'click',
      (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest('a[href]');
        if (!a) return;
        if (a.target === '_blank' || a.hasAttribute('download')) return;
        const hrefAttr = a.getAttribute('href');
        if (!hrefAttr || hrefAttr.startsWith('javascript:')) return;
        if (hrefAttr === '#' || (hrefAttr.startsWith('#') && !hrefAttr.includes('/'))) return;

        let dest;
        try {
          dest = new URL(a.href, location.href).href.replace(/#.*$/, '');
        } catch {
          return;
        }
        const cur = location.href.replace(/#.*$/, '');
        if (dest === cur) return;

        e.preventDefault();
        navigateInSite(a.href);
      },
      false,
    );

    startOrResume();
  };

  initBackgroundMusic();

  const STORAGE_KEYS = {
    subscriptionStart: 'subscriptionTrialStartAt',
    subscriptionCancelled: 'subscriptionCancelled',
  };
  /** localStorage: claim time (must survive navigation; file:// paths often don’t share sessionStorage) */
  const CLAIM_BENEFITS_AT_KEY = 'trapClaimBenefitsAt';

  const readClaimBenefitsAt = () => {
    try {
      let raw = localStorage.getItem(CLAIM_BENEFITS_AT_KEY);
      if (!raw) {
        raw = sessionStorage.getItem(CLAIM_BENEFITS_AT_KEY);
        if (raw) {
          localStorage.setItem(CLAIM_BENEFITS_AT_KEY, raw);
          sessionStorage.removeItem(CLAIM_BENEFITS_AT_KEY);
        }
      }
      return raw;
    } catch {
      return null;
    }
  };

  const clearClaimBenefitsAt = () => {
    try {
      localStorage.removeItem(CLAIM_BENEFITS_AT_KEY);
      sessionStorage.removeItem(CLAIM_BENEFITS_AT_KEY);
    } catch {
      /* ignore */
    }
  };
  /** promoEmailOptIn: '1' = opted in, '0' = opted out; absent ⇒ checkbox default on */
  const PROMO_EMAIL_OPT_IN_KEY = 'promoEmailOptIn';
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;
  const TRIAL_WARNING_DELAY_MS = 10 * 1000;

  const isStartPage = () => document.body?.dataset?.startPage === 'true';

  const isSubscriptionCancelled = () => localStorage.getItem(STORAGE_KEYS.subscriptionCancelled) === '1';

  const markSubscriptionCancelled = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.subscriptionCancelled, '1');
    } catch {
      /* ignore quota / private mode */
    }
  };

  const clearSubscriptionCancelled = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.subscriptionCancelled);
    } catch {
      /* ignore */
    }
  };

  /**
   * Remaining trial ms: `null` = 24h countdown has not started yet (close the warning first).
   * `0` = subscription cancelled (in-game) or trial time fully elapsed.
   * Positive = ms left in 24h window from `subscriptionTrialStartAt`.
   */
  const getTrialMsLeft = () => {
    if (isSubscriptionCancelled()) return 0;
    const startRaw = localStorage.getItem(STORAGE_KEYS.subscriptionStart);
    if (!startRaw) return null;
    const startAt = Number(startRaw);
    if (!Number.isFinite(startAt) || startAt <= 0) return null;
    return Math.max(0, TRIAL_DURATION_MS - (Date.now() - startAt));
  };

  const formatTrialCountdownMs = (ms) => {
    if (ms === null) return '24:00:00';
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatCancelRemainingText = (msLeft) => {
    if (msLeft === null) return '24 hours left';
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

  // ----- Trial warning: Claim benefits → 10s later show; 24h countdown starts when player closes the warning -----
  const warningOverlay = qs('[data-warning-overlay]');
  const warningCloseBtn = qs('[data-warning-close]');
  const warningOkBtn = qs('[data-warning-ok]');

  const showWarningOverlay = () => {
    if (!warningOverlay) return;
    warningOverlay.classList.remove('is-hidden');
    warningOverlay.setAttribute('aria-hidden', 'false');
  };
  const hideWarningOverlay = () => {
    if (!warningOverlay) return;
    const wasVisible = !warningOverlay.classList.contains('is-hidden');
    warningOverlay.classList.add('is-hidden');
    warningOverlay.setAttribute('aria-hidden', 'true');
    if (wasVisible) {
      clearSubscriptionCancelled();
      try {
        localStorage.setItem(STORAGE_KEYS.subscriptionStart, String(Date.now()));
      } catch {
        /* ignore */
      }
      const cd = qs('[data-subscription-countdown]');
      if (cd) cd.textContent = formatTrialCountdownMs(getTrialMsLeft());
      const cr = qs('[data-cancel-remaining]');
      if (cr) cr.textContent = formatCancelRemainingText(getTrialMsLeft());
    }
  };

  let claimBenefitsWarningTimeoutId = null;

  const clearWarningTimers = () => {
    if (claimBenefitsWarningTimeoutId !== null) {
      clearTimeout(claimBenefitsWarningTimeoutId);
      claimBenefitsWarningTimeoutId = null;
    }
  };

  const commitTrialWarningAndShow = () => {
    clearWarningTimers();
    clearClaimBenefitsAt();
    showWarningOverlay();
  };

  const onClaimBenefitsWarningDeadline = () => {
    claimBenefitsWarningTimeoutId = null;
    commitTrialWarningAndShow();
  };

  const armClaimBenefitsWarningTimer = () => {
    if (!warningOverlay) return;
    const raw = readClaimBenefitsAt();
    if (!raw) return;

    if (claimBenefitsWarningTimeoutId !== null) {
      clearTimeout(claimBenefitsWarningTimeoutId);
      claimBenefitsWarningTimeoutId = null;
    }

    const claimAt = Number(raw);
    if (!Number.isFinite(claimAt)) return;

    const elapsed = Date.now() - claimAt;
    if (elapsed >= TRIAL_WARNING_DELAY_MS) {
      onClaimBenefitsWarningDeadline();
    } else {
      claimBenefitsWarningTimeoutId = window.setTimeout(
        onClaimBenefitsWarningDeadline,
        TRIAL_WARNING_DELAY_MS - elapsed,
      );
    }
  };

  warningCloseBtn?.addEventListener('click', hideWarningOverlay);
  warningOkBtn?.addEventListener('click', hideWarningOverlay);
  warningOverlay?.addEventListener('click', (e) => {
    if (e.target === warningOverlay) hideWarningOverlay();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideWarningOverlay();
  });

  armClaimBenefitsWarningTimer();
  window.addEventListener('pageshow', () => {
    armClaimBenefitsWarningTimer();
  });

  // ----- Start screen: sound choice + free-trial modal -----
  const initStartScreen = () => {
    if (!isStartPage()) return;
    const startBtn = qs('[data-start-game]');
    const introOverlay = qs('[data-intro-offer-overlay]');
    const claimBtn = qs('[data-intro-claim]');
    const emailCb = qs('[data-intro-email]');
    if (!startBtn || !introOverlay || !claimBtn) return;

    try {
      const promo = localStorage.getItem(PROMO_EMAIL_OPT_IN_KEY);
      if (emailCb) emailCb.checked = promo !== '0';
    } catch {
      /* ignore */
    }

    try {
      const muted = localStorage.getItem(BG_MUSIC_MUTED_KEY) === '1';
      const onRadio = qs('[name="start-sound"][value="on"]');
      const offRadio = qs('[name="start-sound"][value="off"]');
      if (onRadio && offRadio) {
        onRadio.checked = !muted;
        offRadio.checked = muted;
      }
    } catch {
      /* ignore */
    }

    const syncRadiosToAudio = () => {
      const off = qs('[name="start-sound"]:checked')?.value === 'off';
      try {
        localStorage.setItem(BG_MUSIC_MUTED_KEY, off ? '1' : '0');
      } catch {
        /* ignore */
      }
      const a = qs('#bg-music');
      if (!a) return;
      a.muted = !!off;
      if (!off) {
        a.volume = MUSIC_TARGET_VOL;
        a.play().catch(() => {});
      }
    };

    qsa('[name="start-sound"]').forEach((r) => r.addEventListener('change', syncRadiosToAudio));
    syncRadiosToAudio();

    startBtn.addEventListener('click', () => {
      syncRadiosToAudio();
      introOverlay.classList.remove('is-hidden');
      introOverlay.setAttribute('aria-hidden', 'false');
    });

    claimBtn.addEventListener('click', () => {
      try {
        localStorage.setItem(PROMO_EMAIL_OPT_IN_KEY, emailCb?.checked ? '1' : '0');
        localStorage.setItem(CLAIM_BENEFITS_AT_KEY, String(Date.now()));
        clearSubscriptionCancelled();
      } catch {
        /* ignore */
      }
      introOverlay.classList.add('is-hidden');
      introOverlay.setAttribute('aria-hidden', 'true');
      window.location.href = new URL('home/', getSiteRoot()).href;
    });
  };

  initStartScreen();

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
    const tickCountdown = () => {
      countdownEl.textContent = formatTrialCountdownMs(getTrialMsLeft());
    };

    tickCountdown();
    window.setInterval(tickCountdown, 1000);
  }

  // ----- Cancel plan page remaining time + button behavior -----
  const cancelRemainingEl = qs('[data-cancel-remaining]');
  if (cancelRemainingEl) {
    const tickCancelRemaining = () => {
      cancelRemainingEl.textContent = formatCancelRemainingText(getTrialMsLeft());
    };

    tickCancelRemaining();
    window.setInterval(tickCancelRemaining, 1000);
  }

  window.addEventListener('storage', (e) => {
    if (
      e.key !== STORAGE_KEYS.subscriptionStart &&
      e.key !== STORAGE_KEYS.subscriptionCancelled
    ) {
      return;
    }
    const cd = qs('[data-subscription-countdown]');
    if (cd) cd.textContent = formatTrialCountdownMs(getTrialMsLeft());
    const cr = qs('[data-cancel-remaining]');
    if (cr) cr.textContent = formatCancelRemainingText(getTrialMsLeft());
  });

  const keepMembershipBtn = qs('[data-keep-membership]');
  const remindLaterBtn = qs('[data-remind-later]');
  if (keepMembershipBtn) {
    keepMembershipBtn.addEventListener('click', () => {
      goTo('home/');
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
    goTo('home/');
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

  // ----- My Page: dead-end account options → screen shake -----
  const playShakeSfx = () => {
    try {
      let url;
      const bg = qs('#bg-music');
      const musicSrc = bg?.dataset?.musicSrc?.trim();
      if (musicSrc) {
        url = new URL(musicSrc.replace(/bg-music\.mp3$/i, 'sfx-shake.mp3'), window.location.href).href;
      } else {
        url = new URL('assets/sfx-shake.mp3', getSiteRoot()).href;
      }
      const sfx = new Audio(url);
      sfx.volume = 1;
      sfx.play().catch(() => {});
    } catch {
      /* ignore */
    }
  };

  const shakeScreen = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    playShakeSfx();
    const body = document.body;
    body.classList.remove('is-screen-shake');
    void body.offsetWidth;
    body.classList.add('is-screen-shake');
    body.addEventListener(
      'animationend',
      () => {
        body.classList.remove('is-screen-shake');
      },
      { once: true },
    );
  };

  qsa('[data-account-wrong]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      shakeScreen();
    });
  });

  // ----- Email promo toasts (opt-in checkbox on start screen Claim modal) -----
  const initEmailPromoNotifications = () => {
    if (isStartPage()) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let opted;
    try {
      opted = localStorage.getItem(PROMO_EMAIL_OPT_IN_KEY) === '1';
    } catch {
      return;
    }
    if (!opted) return;

    let stack = document.getElementById('email-promo-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'email-promo-stack';
      stack.className = 'email-promo-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }

    const sfxUrl = new URL('assets/email-promo-notify.mp3', getSiteRoot()).href;
    const iconUrl = new URL('assets/email-promo-icon.svg', getSiteRoot()).href;

    const subjects = [
      'LIMITED TIME: Save 90% on Annual Plan',
      'Your trial “benefits” are waiting — open now',
      'We saw you click Support… exclusive offer inside',
      'Final reminder: renew before midnight (probably)',
      'You have (1) unread message from Billing',
      'FREE shipping* on your next subscription year',
      'Congratulations! You’ve been “selected” for VIP pricing',
    ];

    let subjectIdx = 0;

    const playEmailNotifySfx = () => {
      try {
        const a = new Audio(sfxUrl);
        a.volume = 0.7;
        a.play().catch(() => {});
      } catch {
        /* ignore */
      }
    };

    const spawnEmailToast = () => {
      playEmailNotifySfx();
      const toast = document.createElement('div');
      toast.className = 'email-promo-toast win-window';
      toast.setAttribute('role', 'status');

      const bar = document.createElement('div');
      bar.className = 'email-promo-toast__bar win-title-bar bg-win-blue';

      const titleEl = document.createElement('span');
      titleEl.className = 'email-promo-toast__title text-10 font-pixel';
      titleEl.textContent = 'New mail';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className =
        'win-button email-promo-toast__close p-0 px-2 leading-none bg-win-red text-white border-win-black hover-bg-white hover-text-win-red';
      closeBtn.setAttribute('aria-label', 'Dismiss notification');
      closeBtn.textContent = '×';

      bar.appendChild(titleEl);
      bar.appendChild(closeBtn);

      const body = document.createElement('div');
      body.className = 'email-promo-toast__body';

      const icon = document.createElement('img');
      icon.className = 'email-promo-toast__icon';
      icon.src = iconUrl;
      icon.width = 34;
      icon.height = 34;
      icon.alt = '';

      const text = document.createElement('p');
      text.className = 'email-promo-toast__text';
      text.textContent = subjects[subjectIdx % subjects.length];
      subjectIdx += 1;

      body.appendChild(icon);
      body.appendChild(text);

      toast.appendChild(bar);
      toast.appendChild(body);

      closeBtn.addEventListener('click', () => {
        toast.remove();
      });

      stack.appendChild(toast);
    };

    window.setInterval(spawnEmailToast, 8000);
  };

  initEmailPromoNotifications();
})();

