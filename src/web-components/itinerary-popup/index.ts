class ItineraryPopup extends HTMLElement {
  private panel: HTMLElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private modal: HTMLElement | null = null;
  private renderScheduled = false;

  static get observedAttributes() {
    return ['class', 'data-popup-top-offset', 'data-popup-top'];
  }

  connectedCallback() {
    this.scheduleRender();
  }

  disconnectedCallback() {
    this.closeButton?.removeEventListener('click', this.handleCloseRequest);
    this.modal?.removeEventListener('click', this.handleBackdropClick);
  }

  attributeChangedCallback(name: string) {
    if (name === 'class') {
      this.syncAriaState();
      return;
    }

    this.scheduleRender();
  }

  private scheduleRender() {
    if (this.renderScheduled) {
      return;
    }

    this.renderScheduled = true;
    queueMicrotask(() => {
      this.renderScheduled = false;
      if (!this.isConnected) {
        return;
      }
      this.flushRender();
    });
  }

  private flushRender() {
    this.applyTopOffsetConfig();
    this.renderShadow();

    this.closeButton?.removeEventListener('click', this.handleCloseRequest);
    this.closeButton?.addEventListener('click', this.handleCloseRequest);
    this.modal?.removeEventListener('click', this.handleBackdropClick);
    this.modal?.addEventListener('click', this.handleBackdropClick);

    this.syncAriaState();
  }

  private applyTopOffsetConfig() {
    const rawTopOffset = this.getAttribute('data-popup-top-offset') || this.getAttribute('data-popup-top') || '24';
    const parsed = Number.parseFloat(rawTopOffset);
    const topOffset = Number.isFinite(parsed) ? Math.max(0, parsed) : 24;
    this.style.setProperty('--itinerary-popup-top-offset', `${topOffset}px`);
  }

  private renderShadow() {
    const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host {
          position: relative;
          display: block;
        }

        .modal {
          position: fixed;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: var(--itinerary-popup-top-offset, 24px);
          padding-bottom: 24px;
          box-sizing: border-box;
          overflow: hidden;
          z-index: 1200;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 220ms ease, visibility 220ms ease;
        }

        :host(.is-open) .modal {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .modal__window {
          position: relative;
          background-color: #fff;
          width: min(420px, calc(100vw - 32px));
          min-height: 120px;
          max-height: calc(100vh - var(--itinerary-popup-top-offset, 100px) - 24px);
          padding: 2em 1em;
          border-radius: 14px;
          box-sizing: border-box;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
          opacity: 0;
          transform: translateY(8px) scale(0.98);
          transition: opacity 220ms ease, transform 220ms ease;
        }

        .modal__window::-webkit-scrollbar {
          width: 4px;
        }

        .modal__window::-webkit-scrollbar-track {
          background: transparent;
        }

        .modal__window::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }

        .modal__window::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.5);
        }

        :host(.is-open) .modal__window {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .modal__close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 22px;
          height: 22px;
          border: 2px solid var(--secondary-color, #c43d3d);
          border-radius: 999px;
          background: #fff;
          color: var(--secondary-color, #c43d3d);
          font-size: 11px;
          line-height: 1;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }

        .modal__close:hover {
          background: var(--secondary-color, #c43d3d);
          color: #fff;
        }

        .modal__close:focus-visible {
          outline: 2px solid var(--secondary-color, #c43d3d);
          outline-offset: 2px;
        }

        .modal__close:active {
          transform: scale(0.96);
        }
      </style>
      <div class="modal" data-popup-modal>
        <div
          class="modal__window"
          data-popup-panel
          role="dialog"
          aria-modal="true"
          aria-hidden="false"
          aria-label="Popup"
        >
          <button type="button" class="modal__close" data-popup-close aria-label="Close popup">
            <span aria-hidden="true">X</span>
          </button>
          <slot></slot>
        </div>
      </div>
    `;

    this.panel = root.querySelector('[data-popup-panel]');
    this.closeButton = root.querySelector('[data-popup-close]');
    this.modal = root.querySelector('[data-popup-modal]');
  }

  private handleCloseRequest = () => {
    this.close();
  };

  private handleBackdropClick = (event: Event) => {
    if (event.target === this.modal) {
      this.close();
    }
  };

  private syncAriaState() {
    this.panel?.setAttribute('aria-hidden', this.classList.contains('is-open') ? 'false' : 'true');
  }

  private close() {
    this.classList.remove('is-open');
    this.syncAriaState();
  }
}

if (!customElements.get('itinerary-popup')) {
  customElements.define('itinerary-popup', ItineraryPopup);
}

export { ItineraryPopup };
