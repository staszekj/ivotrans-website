/**
 * Language Dropdown Web Component
 * 
 * Usage:
 * <lang-dropdown>
 *   <button slot="toggle">...</button>
 *   <ul slot="menu">...</ul>
 * </lang-dropdown>
 */
class LangDropdown extends HTMLElement {
  private toggle: HTMLElement | null = null;
  private menu: HTMLElement | null = null;
  private isOpen = false;

  constructor() {
    super();
  }

  connectedCallback() {
    this.toggle = this.querySelector('[slot="toggle"], .lang-toggle');
    this.menu = this.querySelector('[slot="menu"], .lang-menu');

    this.toggle?.addEventListener('click', this.handleToggle);
    document.addEventListener('click', this.handleOutsideClick);
    document.addEventListener('keydown', this.handleKeydown);
  }

  disconnectedCallback() {
    this.toggle?.removeEventListener('click', this.handleToggle);
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleKeydown);
  }

  private handleToggle = (e: Event) => {
    e.stopPropagation();
    this.isOpen = !this.isOpen;
    this.updateState();
  };

  private handleOutsideClick = (e: Event) => {
    if (!this.contains(e.target as Node)) {
      this.close();
    }
  };

  private handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.close();
      this.toggle?.focus();
    }
  };

  private updateState() {
    this.toggle?.setAttribute('aria-expanded', String(this.isOpen));
    this.classList.toggle('open', this.isOpen);
  }

  private close() {
    if (this.isOpen) {
      this.isOpen = false;
      this.updateState();
    }
  }
}

// Register the custom element
if (!customElements.get('lang-dropdown')) {
  customElements.define('lang-dropdown', LangDropdown);
}

export { LangDropdown };
