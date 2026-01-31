/**
 * Native Web Component - Language Switcher
 * A simple language toggle for switching between Polish and Italian
 */
class LanguageSwitcher extends HTMLElement {
  static get observedAttributes() {
    return ['current-lang', 'current-path'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  get currentLang() {
    return this.getAttribute('current-lang') || 'pl';
  }

  get currentPath() {
    return this.getAttribute('current-path') || '/pl/';
  }

  getOtherLang() {
    return this.currentLang === 'pl' ? 'it' : 'pl';
  }

  getOtherLangPath() {
    const otherLang = this.getOtherLang();
    return this.currentPath.replace(`/${this.currentLang}/`, `/${otherLang}/`);
  }

  render() {
    const otherLang = this.getOtherLang();
    const otherPath = this.getOtherLangPath();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .lang-container {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 0.25rem;
        }

        .lang-btn {
          padding: 0.4rem 0.75rem;
          border: none;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-block;
        }

        .lang-btn.active {
          background: white;
          color: #1a365d;
        }

        .lang-btn:not(.active) {
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
        }

        .lang-btn:not(.active):hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .flag {
          margin-right: 0.25rem;
        }
      </style>

      <div class="lang-container">
        <span class="lang-btn ${this.currentLang === 'pl' ? 'active' : ''}">
          <span class="flag">🇵🇱</span>PL
        </span>
        <a href="${otherPath}" class="lang-btn ${this.currentLang === 'it' ? 'active' : ''}">
          <span class="flag">🇮🇹</span>IT
        </a>
      </div>
    `;

    // Re-render the active states correctly
    const buttons = this.shadowRoot.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
      if (btn.tagName === 'SPAN') {
        btn.classList.toggle('active', this.currentLang === 'pl');
      } else {
        btn.classList.toggle('active', this.currentLang === 'it');
      }
    });
  }
}

// Register the custom element
customElements.define('language-switcher', LanguageSwitcher);

export default LanguageSwitcher;
