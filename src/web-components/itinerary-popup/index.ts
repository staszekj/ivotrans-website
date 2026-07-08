class ItineraryPopup extends HTMLElement {
  private overlay: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private titleEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private activeTrigger: HTMLElement | null = null;
  private closeTimer: number | null = null;
  private previousBodyOverflow = '';

  connectedCallback() {
    this.renderShell();
    this.cacheElements();

    this.overlay?.addEventListener('click', this.handleCloseRequest);
    this.closeButton?.addEventListener('click', this.handleCloseRequest);
    document.addEventListener('click', this.handleTriggerClick);
    document.addEventListener('keydown', this.handleDocumentKeydown);
  }

  disconnectedCallback() {
    this.overlay?.removeEventListener('click', this.handleCloseRequest);
    this.closeButton?.removeEventListener('click', this.handleCloseRequest);
    document.removeEventListener('click', this.handleTriggerClick);
    document.removeEventListener('keydown', this.handleDocumentKeydown);
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private renderShell() {
    if (this.querySelector('[data-popup-shell]')) {
      return;
    }

    const shell = document.createElement('div');
    shell.setAttribute('data-popup-shell', '');
    shell.innerHTML = `
      <div class="itinerary-popup__overlay" data-popup-overlay></div>
      <section
        class="itinerary-popup__panel"
        data-popup-panel
        role="dialog"
        aria-modal="true"
        aria-hidden="true"
        aria-labelledby="itinerary-popup-title"
      >
        <button type="button" class="itinerary-popup__close" data-popup-close aria-label="Close popup">
          <span aria-hidden="true">×</span>
        </button>
        <div class="itinerary-popup__content">
          <h2 id="itinerary-popup-title" class="itinerary-popup__title" data-popup-title></h2>
          <div class="itinerary-popup__body" data-popup-body></div>
        </div>
      </section>
    `;

    this.appendChild(shell);
  }

  private cacheElements() {
    this.overlay = this.querySelector('[data-popup-overlay]');
    this.panel = this.querySelector('[data-popup-panel]');
    this.closeButton = this.querySelector('[data-popup-close]');
    this.titleEl = this.querySelector('[data-popup-title]');
    this.bodyEl = this.querySelector('[data-popup-body]');
  }

  private handleTriggerClick = (event: Event) => {
    const trigger = (event.target as HTMLElement | null)?.closest('[data-popup-target]') as HTMLElement | null;
    if (!trigger) {
      return;
    }

    const popupTargetId = trigger.dataset.popupTarget;
    if (!popupTargetId) {
      return;
    }

    if (!this.bodyEl || !this.titleEl) {
      this.openFallback(trigger.dataset.popupFallback);
      return;
    }

    const content = Array.from(this.querySelectorAll<HTMLElement>('[data-popup-content]')).find(
      (item) => item.dataset.popupContent === popupTargetId
    );

    if (!content) {
      this.openFallback(trigger.dataset.popupFallback);
      return;
    }

    event.preventDefault();
    this.activeTrigger = trigger;
    this.titleEl.textContent = content.dataset.popupHeading || trigger.dataset.popupHeading || 'Details';
    this.bodyEl.innerHTML = content.innerHTML;
    this.open();
  };

  private handleDocumentKeydown = (event: KeyboardEvent) => {
    if (!this.classList.contains('is-open')) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  };

  private trapFocus(event: KeyboardEvent) {
    if (!this.panel) {
      return;
    }

    const focusable = this.getFocusable(this.panel);
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private getFocusable(scope: HTMLElement) {
    return Array.from(
      scope.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  }

  private handleCloseRequest = () => {
    this.close();
  };

  private open() {
    if (!this.panel) {
      return;
    }

    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    this.classList.remove('is-closing');
    this.classList.add('is-open');
    this.panel.setAttribute('aria-hidden', 'false');

    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => {
      this.closeButton?.focus();
    }, 0);
  }

  private close() {
    if (!this.classList.contains('is-open')) {
      return;
    }

    this.classList.remove('is-open');
    this.classList.add('is-closing');

    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
    }

    this.closeTimer = window.setTimeout(() => {
      this.classList.remove('is-closing');
      this.panel?.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = this.previousBodyOverflow;
      this.activeTrigger?.focus();
      this.closeTimer = null;
    }, 200);
  }

  private openFallback(fallback?: string) {
    if (!fallback) {
      return;
    }
    window.open(fallback, '_blank', 'noopener');
  }
}

if (!customElements.get('itinerary-popup')) {
  customElements.define('itinerary-popup', ItineraryPopup);
}

export { ItineraryPopup };
