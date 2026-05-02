(() => {
  const isHome = document.body.classList.contains('home');
  const preview = document.querySelector(isHome ? '.landing-content .landing-preview' : '.nav-preview');
  if (!preview) return;

  const hero = document.querySelector(isHome ? '.landing-hero' : '.landing-hero-inline');
  const landingContent = document.querySelector('#landing-content');
  const siteHeader = document.querySelector('.site-header');
  const homeLogo = document.querySelector('.nav-logo-home');
  const siteNav = document.querySelector('.site-nav');
  const siteNavList = document.querySelector('.site-nav ul');
  const navLinks = Array.from(document.querySelectorAll('.site-nav a[data-panel]'));
  const panels = Array.from(preview.querySelectorAll('.preview-panel[data-panel]'));
  const previewStage = preview.querySelector('.preview-stage');
  const panelMap = new Map(panels.map((panel) => [panel.dataset.panel, panel]));
  const panelScrollPos = new Map();
  const hoverDebounceMs = isHome ? 350 : 220;
  const resetDebounceMs = 180;

  let selectedPanel = preview.dataset.selected || 'manifesto';
  let isCollapsed = document.body.classList.contains('home-collapsed');
  let navInteracting = false;
  let hoverTimer = null;
  let pendingHover = null;
  let resetTimer = null;
  let touchStartY = null;
  let snapFrame = null;
  let isSnapping = false;
  let previousSnapOverflowAnchor = null;

  const parseTimeToMs = (timeValue) => {
    const value = timeValue.trim();
    if (value.endsWith('ms')) return Number.parseFloat(value);
    if (value.endsWith('s')) return Number.parseFloat(value) * 1000;
    return 0;
  };

  const getHeroCollapseMs = () => {
    if (!hero) return 560;
    const styles = window.getComputedStyle(hero);
    const durations = styles.transitionDuration.split(',').map(parseTimeToMs);
    const delays = styles.transitionDelay.split(',').map(parseTimeToMs);
    const longest = durations.reduce((max, duration, index) => {
      const delay = delays[index] ?? delays[delays.length - 1] ?? 0;
      return Math.max(max, duration + delay);
    }, 0);
    return Math.max(120, Math.round(longest));
  };

  const getHeaderHeight = () => siteHeader ? siteHeader.getBoundingClientRect().height : 0;

  const getSnapTarget = () => {
    if (isHome) {
      return preview.querySelector('.preview-panel.is-active .preview-head h2')
        || preview.querySelector('.preview-panel.is-active .preview-head')
        || landingContent;
    }

    return document.querySelector('.page-header h1')
      || document.querySelector('.page-header')
      || document.querySelector('#page-content-start');
  };

  const cancelHeroSnap = () => {
    isSnapping = false;
    if (snapFrame !== null) {
      window.cancelAnimationFrame(snapFrame);
      snapFrame = null;
    }
    if (previousSnapOverflowAnchor !== null) {
      document.documentElement.style.overflowAnchor = previousSnapOverflowAnchor;
      previousSnapOverflowAnchor = null;
    }
  };

  const holdScrollPosition = (targetTop, durationMs, onDone = null) => {
    isSnapping = true;
    const releaseAt = performance.now() + durationMs;

    const hold = () => {
      window.scrollTo({ top: targetTop, behavior: 'auto' });
      if (performance.now() < releaseAt) {
        snapFrame = window.requestAnimationFrame(hold);
        return;
      }
      isSnapping = false;
      snapFrame = null;
      onDone?.();
    };

    hold();
  };

  const measureCollapsedTargetTop = () => {
    const target = getSnapTarget();
    if (!target) return 0;

    const previousScrollY = window.scrollY || window.pageYOffset || 0;
    const previousTransition = hero?.style.transition || '';
    const previousOverflowAnchor = document.documentElement.style.overflowAnchor;
    const wasCollapsed = document.body.classList.contains('home-collapsed');

    document.documentElement.style.overflowAnchor = 'none';
    if (hero) hero.style.transition = 'none';
    document.body.classList.add('home-collapsed');
    hero?.getBoundingClientRect();

    const targetTop = previousScrollY + target.getBoundingClientRect().top - getHeaderHeight();
    const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clampedTop = Math.min(Math.max(0, targetTop), maxTop);

    document.body.classList.toggle('home-collapsed', wasCollapsed);
    hero?.getBoundingClientRect();
    if (hero) hero.style.transition = previousTransition;
    document.documentElement.style.overflowAnchor = previousOverflowAnchor;
    window.scrollTo({ top: previousScrollY, behavior: 'auto' });

    return clampedTop;
  };

  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

  const animateToSnapTarget = () => {
    if (!getSnapTarget() || isCollapsed || isSnapping) return;

    cancelHeroSnap();

    const startTop = window.scrollY || window.pageYOffset || 0;
    const targetTop = measureCollapsedTargetTop();
    const duration = getHeroCollapseMs();
    const startTime = performance.now();

    isCollapsed = true;
    isSnapping = true;
    previousSnapOverflowAnchor = document.documentElement.style.overflowAnchor;
    document.documentElement.style.overflowAnchor = 'none';
    document.body.classList.add('home-collapsed');

    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(progress);
      const nextTop = startTop + ((targetTop - startTop) * eased);
      window.scrollTo({ top: nextTop, behavior: 'auto' });

      if (progress < 1) {
        snapFrame = window.requestAnimationFrame(step);
        return;
      }

      window.scrollTo({ top: targetTop, behavior: 'auto' });
      holdScrollPosition(targetTop, 180, () => {
        if (previousSnapOverflowAnchor !== null) {
          document.documentElement.style.overflowAnchor = previousSnapOverflowAnchor;
          previousSnapOverflowAnchor = null;
        }
      });
    };

    snapFrame = window.requestAnimationFrame(step);
  };

  const canStartHeroSnap = () => {
    const y = window.scrollY || window.pageYOffset || 0;
    return Boolean(getSnapTarget() && !isCollapsed && !isSnapping && y <= 28);
  };

  const updateScrollState = () => {
    if (isSnapping) {
      document.body.classList.add('home-collapsed');
      return;
    }

    if (navInteracting && isCollapsed) {
      document.body.classList.add('home-collapsed');
      return;
    }

    const y = window.scrollY || window.pageYOffset || 0;
    if (!isCollapsed && y >= 28) {
      animateToSnapTarget();
      return;
    }

    if (isCollapsed && y <= 0) {
      isCollapsed = false;
    }

    document.body.classList.toggle('home-collapsed', isCollapsed);
  };

  const setNavSelection = () => {
    navLinks.forEach((link) => {
      const isSelected = link.dataset.panel === selectedPanel;
      link.classList.toggle('is-selected', isSelected);
      if (isSelected) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const measurePanelHeight = (panel) => {
    const previous = {
      position: panel.style.position,
      visibility: panel.style.visibility,
      opacity: panel.style.opacity,
      pointerEvents: panel.style.pointerEvents,
      display: panel.style.display,
    };

    panel.style.position = 'relative';
    panel.style.visibility = 'hidden';
    panel.style.opacity = '0';
    panel.style.pointerEvents = 'none';
    panel.style.display = 'block';

    const height = panel.scrollHeight;

    panel.style.position = previous.position;
    panel.style.visibility = previous.visibility;
    panel.style.opacity = previous.opacity;
    panel.style.pointerEvents = previous.pointerEvents;
    panel.style.display = previous.display;

    return height;
  };

  const stabilizePreviewHeight = () => {
    if (!isHome || !previewStage || panels.length === 0) return;
    const maxPanelHeight = panels.reduce((max, panel) => Math.max(max, measurePanelHeight(panel)), 0);
    if (maxPanelHeight > 0) {
      previewStage.style.minHeight = `${Math.ceil(maxPanelHeight)}px`;
    }
  };

  const showPanel = (panelKey, preserveViewportOffset = false) => {
    if (!panelMap.has(panelKey)) return;

    let previousOffset = null;
    if (isHome && preserveViewportOffset) {
      const activePanel = panels.find((panel) => panel.classList.contains('is-active'));
      if (activePanel) {
        const rect = activePanel.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          previousOffset = -rect.top;
        }
      }
    }

    if (isHome && isCollapsed) {
      const currentPanel = preview.dataset.active;
      if (currentPanel) panelScrollPos.set(currentPanel, window.scrollY);
    }

    preview.dataset.active = panelKey;
    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === panelKey;
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', String(!isActive));
    });

    if (!isHome) return;

    if (isCollapsed) {
      const saved = panelScrollPos.get(panelKey);
      if (saved != null) {
        window.scrollTo({ top: saved, behavior: 'auto' });
      } else {
        const targetTop = window.scrollY + preview.getBoundingClientRect().top - getHeaderHeight();
        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
      }
      return;
    }

    if (preserveViewportOffset !== true || previousOffset === null) return;

    const nextPanel = panelMap.get(panelKey);
    if (!nextPanel) return;
    const nextTop = window.scrollY + nextPanel.getBoundingClientRect().top;
    const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetTop = Math.min(Math.max(0, nextTop + previousOffset), maxTop);
    window.scrollTo({ top: targetTop, behavior: 'auto' });
  };

  const resetToSelected = () => showPanel(selectedPanel);

  const clearReset = () => {
    if (resetTimer) {
      window.clearTimeout(resetTimer);
      resetTimer = null;
    }
  };

  const scheduleReset = (closeOverlay = false) => {
    clearReset();
    resetTimer = window.setTimeout(() => {
      resetToSelected();
      if (closeOverlay) closePreview();
      resetTimer = null;
      updateScrollState();
    }, resetDebounceMs);
  };

  const setPreviewOffset = () => {
    if (isHome || !siteHeader) return;
    const headerHeight = Math.ceil(siteHeader.getBoundingClientRect().height);
    preview.style.setProperty('--preview-top', `${headerHeight + 8}px`);
  };

  const openPreview = () => {
    if (isHome) return;
    navInteracting = true;
    setPreviewOffset();
    preview.classList.add('is-open');
    updateScrollState();
  };

  function closePreview() {
    if (isHome) return;
    preview.classList.remove('is-open');
    navInteracting = false;
    updateScrollState();
  }

  navLinks.forEach((link) => {
    const panelKey = link.dataset.panel;

    link.addEventListener('mouseenter', () => {
      if (isHome) {
        navInteracting = true;
      } else {
        openPreview();
      }

      clearReset();
      if (hoverTimer) window.clearTimeout(hoverTimer);
      pendingHover = panelKey;
      hoverTimer = window.setTimeout(() => {
        showPanel(pendingHover, isHome && !isCollapsed);
        hoverTimer = null;
        pendingHover = null;
      }, hoverDebounceMs);
    });

    link.addEventListener('mouseleave', () => {
      if (hoverTimer) {
        window.clearTimeout(hoverTimer);
        hoverTimer = null;
        pendingHover = null;
      }
      scheduleReset(false);
    });

    link.addEventListener('focus', () => {
      if (isHome) {
        navInteracting = true;
      } else {
        openPreview();
      }

      clearReset();
      if (hoverTimer) {
        window.clearTimeout(hoverTimer);
        hoverTimer = null;
        pendingHover = null;
      }
      showPanel(panelKey, isHome && !isCollapsed);
    });
  });

  homeLogo?.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!isHome) return;
    event.preventDefault();
    cancelHeroSnap();
    isCollapsed = false;
    document.body.classList.remove('home-collapsed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  siteNavList?.addEventListener('mouseleave', () => {
    navInteracting = false;
    scheduleReset(false);
  });

  siteNavList?.addEventListener('focusout', (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    navInteracting = false;
    scheduleReset(false);
  });

  if (!isHome) {
    siteNav?.addEventListener('mouseenter', () => {
      navInteracting = true;
    });
    siteNav?.addEventListener('mouseleave', () => scheduleReset(true));
    preview.addEventListener('mouseleave', () => scheduleReset(true));
    preview.addEventListener('mouseenter', () => {
      openPreview();
      clearReset();
    });
  }

  window.addEventListener('wheel', (event) => {
    if (isSnapping) {
      if (event.cancelable) event.preventDefault();
      return;
    }

    const isPrimaryDownScroll = event.deltaY > 0 && Math.abs(event.deltaY) >= Math.abs(event.deltaX);
    if (!isPrimaryDownScroll || !canStartHeroSnap()) return;

    if (event.cancelable) event.preventDefault();
    animateToSnapTarget();
  }, { passive: false });

  window.addEventListener('touchstart', (event) => {
    touchStartY = event.touches[0]?.clientY ?? null;
  }, { passive: true });

  window.addEventListener('touchmove', (event) => {
    if (isSnapping) {
      if (event.cancelable) event.preventDefault();
      return;
    }

    if (!canStartHeroSnap() || touchStartY === null) return;

    const currentY = event.touches[0]?.clientY ?? touchStartY;
    const isScrollingDown = touchStartY - currentY > 8;
    if (!isScrollingDown) return;

    if (event.cancelable) event.preventDefault();
    animateToSnapTarget();
    touchStartY = null;
  }, { passive: false });

  window.addEventListener('touchend', () => {
    touchStartY = null;
  }, { passive: true });

  window.addEventListener('keydown', (event) => {
    const scrollKeys = new Set(['ArrowDown', 'PageDown', ' ', 'Spacebar']);
    if (!scrollKeys.has(event.key)) return;

    const target = event.target;
    const isEditable = target?.isContentEditable
      || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName);
    if (isEditable) return;

    if (isSnapping) {
      event.preventDefault();
      return;
    }

    if (!canStartHeroSnap()) return;
    event.preventDefault();
    animateToSnapTarget();
  });

  const scrollToContentAfterFonts = () => {
    const doScroll = () => animateToSnapTarget();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => window.requestAnimationFrame(doScroll));
    } else {
      window.requestAnimationFrame(doScroll);
    }
  };

  setNavSelection();
  showPanel(selectedPanel);
  closePreview();
  setPreviewOffset();
  stabilizePreviewHeight();
  updateScrollState();
  if (!isHome) scrollToContentAfterFonts();

  window.addEventListener('scroll', updateScrollState, { passive: true });
  window.addEventListener('resize', () => {
    setPreviewOffset();
    stabilizePreviewHeight();
    updateScrollState();
  });
  window.setTimeout(stabilizePreviewHeight, 120);
})();
