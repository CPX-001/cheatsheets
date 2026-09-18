// Native dialogs provide top-layer rendering, inert background and keyboard focus containment.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const resetDialogs = [];
  document.querySelectorAll('.series-dialog').forEach((dialog) => {
    let opener;
    let restoring = false;
    if (typeof dialog.showModal !== 'function') return;
    const placeDialog = () => {
      const gap = 14;
      const edge = 16;
      const width = Math.min(1100, window.innerWidth - edge * 2);
      dialog.style.width = `${width}px`;
      const rect = opener.getBoundingClientRect();
      // Layout dimensions exclude the entrance animation's transform.
      const height = dialog.offsetHeight;
      const above = rect.top - height - gap;
      const top =
        above >= edge
          ? above
          : Math.max(edge, Math.min(rect.bottom + gap, window.innerHeight - height - edge));
      const left = Math.max(
        edge,
        Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - edge)
      );
      dialog.style.top = `${top}px`;
      dialog.style.left = `${left}px`;
      dialog.dataset.placement = above >= edge ? 'above' : 'below';
    };

    document
      .querySelectorAll(`[aria-controls="${dialog.id}"][data-series-trigger]`)
      .forEach((trigger) => {
        trigger.addEventListener('click', (event) => {
          // Preserve open-in-new-tab/link behavior and a functional no-JS fallback.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          opener = trigger;
          const scrollTop = window.scrollY;
          dialog.dataset.preparing = '';
          dialog.style.width = `${Math.min(1100, window.innerWidth - 32)}px`;
          document.documentElement.classList.add('series-is-open');
          dialog.showModal();
          window.scrollTo({ top: scrollTop, behavior: 'instant' });
          trigger.setAttribute('aria-expanded', 'true');
          placeDialog();
          delete dialog.dataset.preparing;
          dialog
            .querySelector('[aria-current="page"], .series-options a')
            ?.focus({ preventScroll: true });
        });
      });
    dialog.querySelector('[data-series-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('a[href], button:not([disabled])')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    let pointerStartedOutside = false;
    dialog.addEventListener('pointerdown', (event) => {
      pointerStartedOutside = event.target === dialog;
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog && pointerStartedOutside) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('series-is-open');
      opener?.setAttribute('aria-expanded', 'false');
      if (!restoring) opener?.focus({ preventScroll: true });
      restoring = false;
    });
    resetDialogs.push(() => {
      if (dialog.open) {
        restoring = true;
        dialog.close();
      }
      opener?.setAttribute('aria-expanded', 'false');
    });
    window.addEventListener('resize', () => {
      if (dialog.open) placeDialog();
    });
  });

  // Clear transient catalogue UI before it enters the back/forward cache.
  const resetCatalogue = () => {
    if (!document.querySelector('section.home')) return;
    resetDialogs.forEach((reset) => reset());
    document.documentElement.classList.remove('series-is-open');
    document.querySelectorAll('.home details[open]').forEach((details) => {
      details.open = false;
    });
    window.search?.closeModal(true);
    const url = new URL(window.location.href);
    if (url.searchParams.has('q')) {
      url.searchParams.delete('q');
      window.history.replaceState(window.history.state, '', url);
    }
  };
  window.addEventListener('pagehide', resetCatalogue);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted || performance.getEntriesByType('navigation')[0]?.type === 'back_forward') {
      resetCatalogue();
    }
  });

  // Long-form guides keep copy actions visible for touch and keyboard users.
  const article = document.querySelector('.learning-content');
  if (!article) return;

  // Section navigation updates the shareable URL without adding a Back step.
  document.querySelector('.learning-page').addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || link.hasAttribute('download'))
      return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
    const hash = link.getAttribute('href');
    let target;
    try {
      target = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return;
    }
    if (!target) return;
    event.preventDefault();
    window.history.replaceState(window.history.state, '', hash);
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: reduceMotion.matches ? 'instant' : 'smooth',
      block: 'start'
    });
    document.querySelectorAll('.learning-sidebar a').forEach((item) => {
      if (item === link) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
  });

  // Animate one measured height, retaining native details and keyboard behavior.
  document.querySelectorAll('.learning-page details').forEach((details) => {
    const summary = details.querySelector('summary');
    let animation;
    let opening = details.open;
    summary.addEventListener('click', (event) => {
      if (reduceMotion.matches || typeof details.animate !== 'function') return;
      event.preventDefault();
      opening = animation ? !opening : !details.open;
      const start = details.getBoundingClientRect().height;
      animation?.cancel();
      details.open = true;
      const styles = getComputedStyle(details);
      const closedHeight =
        summary.getBoundingClientRect().height +
        parseFloat(styles.paddingTop) +
        parseFloat(styles.paddingBottom) +
        parseFloat(styles.borderTopWidth) +
        parseFloat(styles.borderBottomWidth);
      const end = opening ? details.getBoundingClientRect().height : closedHeight;
      details.style.overflow = 'hidden';
      animation = details.animate(
        { height: [`${start}px`, `${end}px`] },
        { duration: 180, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
      );
      animation.onfinish = () => {
        details.open = opening;
        details.style.removeProperty('overflow');
        animation = null;
      };
    });
  });
  // Code and wide comparisons must also scroll without a pointer.
  article.querySelectorAll('pre, table').forEach((block) => {
    block.tabIndex = 0;
  });
  if (window.matchMedia('(max-width: 900px)').matches) {
    document.querySelectorAll('.learning-sidebar details').forEach((details) => {
      details.open = false;
    });
  }
  const status = document.createElement('p');
  status.className = 'learning-copy-status';
  status.setAttribute('role', 'status');
  article.append(status);
  article.querySelectorAll('pre > code').forEach((code) => {
    // Plain-text blocks in a glossary are commands (for example redis-cli), not diagrams.
    if (
      !article.closest('.learning-glossary') &&
      (code.classList.contains('language-text') || code.classList.contains('language-plaintext'))
    )
      return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'learning-copy';
    button.textContent = 'Copiar';
    button.setAttribute('aria-label', 'Copiar bloque de código');
    code.parentElement.prepend(button);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = 'Copiado';
        status.textContent = 'Código copiado al portapapeles.';
        window.setTimeout(() => {
          button.textContent = 'Copiar';
        }, 1800);
        window.setTimeout(() => {
          status.textContent = '';
        }, 4000);
      } catch {
        status.textContent = 'No se pudo copiar. Selecciona el código y cópialo manualmente.';
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  });
})();
