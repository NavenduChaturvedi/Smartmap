// js/components.js - Reusable UI Components

const ensureAegisUi = () => {
  if (window.AegisUI) return window.AegisUI;

  const setSidebarState = (isOpen) => {
    const sidebar = document.querySelector("[data-aegis-sidebar]");
    const backdrop = document.querySelector("[data-aegis-sidebar-backdrop]");
    const page = document.body;
    if (!sidebar || !backdrop) return;

    sidebar.classList.toggle("-translate-x-full", !isOpen);
    sidebar.classList.toggle("translate-x-0", isOpen);
    backdrop.classList.toggle("opacity-0", !isOpen);
    backdrop.classList.toggle("pointer-events-none", !isOpen);
    backdrop.classList.toggle("opacity-100", isOpen);
    backdrop.classList.toggle("pointer-events-auto", isOpen);
    page.classList.toggle("overflow-hidden", isOpen);
  };

  window.AegisUI = {
    openSidebar: () => setSidebarState(true),
    closeSidebar: () => setSidebarState(false),
    toggleSidebar: () => {
      const sidebar = document.querySelector("[data-aegis-sidebar]");
      if (!sidebar) return;
      const isOpen = !sidebar.classList.contains("-translate-x-full");
      setSidebarState(!isOpen);
    }
  };

  return window.AegisUI;
};

class AegisSidebar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div data-aegis-sidebar-backdrop class="fixed inset-0 z-30 bg-black/60 opacity-0 pointer-events-none transition-opacity duration-300 lg:hidden"></div>
      <aside data-aegis-sidebar class="fixed left-0 top-0 z-40 flex h-[100dvh] w-72 max-w-[85vw] -translate-x-full flex-col border-r border-outline-variant bg-surface-container-low/90 px-5 py-6 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:w-64 lg:translate-x-0 lg:px-gutter lg:py-margin">
        <div class="mb-8 flex items-start justify-between gap-4 px-unit">
          <div class="flex flex-col gap-unit">
            <h1 class="font-h3 text-2xl sm:text-h3 leading-none tracking-tighter text-primary uppercase">AEGIS_OS</h1>
            <div class="flex items-center gap-unit">
              <span class="h-1 w-1 rounded-full bg-primary animate-pulse"></span>
              <p class="font-label-mono text-label-mono uppercase text-on-surface-variant">Secure_Node_Active</p>
            </div>
          </div>
          <button type="button" data-aegis-sidebar-close class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/30 text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary lg:hidden">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <nav class="flex-1 space-y-2 sm:space-y-unit">
          <a class="flex items-center gap-gutter rounded-lg px-gutter py-3 transition-all duration-200 group text-on-surface-variant hover:bg-white/5 hover:text-primary" href="dashboard.html">
            <span class="material-symbols-outlined text-[20px]">grid_view</span>
            <span class="font-label-caps text-label-caps tracking-widest uppercase">Dashboard</span>
          </a>
          <a class="flex items-center gap-gutter rounded-lg px-gutter py-3 transition-all duration-200 group text-on-surface-variant hover:bg-white/5 hover:text-primary" href="roadmap.html">
            <span class="material-symbols-outlined text-[20px]">account_tree</span>
            <span class="font-label-caps text-label-caps tracking-widest uppercase">Roadmaps</span>
          </a>
          <a class="flex items-center gap-gutter rounded-lg px-gutter py-3 transition-all duration-200 group text-on-surface-variant hover:bg-white/5 hover:text-primary" href="ai-roadmap.html">
            <span class="material-symbols-outlined text-[20px]">auto_awesome</span>
            <span class="font-label-caps text-label-caps tracking-widest uppercase">AI Creator</span>
          </a>
          <a class="flex items-center gap-gutter rounded-lg px-gutter py-3 transition-all duration-200 group text-on-surface-variant hover:bg-white/5 hover:text-primary" href="analytics.html">
            <span class="material-symbols-outlined text-[20px]">analytics</span>
            <span class="font-label-caps text-label-caps tracking-widest uppercase">Analytics</span>
          </a>
          <a class="flex items-center gap-gutter rounded-lg px-gutter py-3 transition-all duration-200 group text-on-surface-variant hover:bg-white/5 hover:text-primary" href="settings.html">
            <span class="material-symbols-outlined text-[20px]">settings</span>
            <span class="font-label-caps text-label-caps tracking-widest uppercase">Settings</span>
          </a>
        </nav>
        <div class="mt-auto border-t border-outline-variant pt-4 sm:pt-margin">
          <div class="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-high p-3">
            <div class="relative">
              <img alt="Commander Avatar" class="h-10 w-10 rounded-lg border border-outline-variant grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBT112ADXw5N73TxuFCH2Gheaylsd5FahTIUkzn1yQqSbZaivWnpZNDIj2Xf8d0paq8RFV8cLjx_m3adYK-IHV0uyXgfmVLmhW-IuFMwMHjuMgLYiiMjhWQasoHtFe8VleUiopn-UPwHWka0cKR25XbpqBy6AmO6F9mnx7usi_AmNjXqCSgcipdU5-QNC1mh6YShWFo-zoWqviRFN0lz9XwWdIc_kaJmmWUt65BcWdkZ7BOpt-9qsEmu4wL56pgdHNBxVwa3zay-oJj"/>
              <div class="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-surface-container-high bg-primary"></div>
            </div>
            <div class="overflow-hidden">
              <p class="truncate font-label-caps text-label-caps text-primary" id="cmp-name">OPERATOR_01</p>
              <p class="truncate text-[9px] uppercase tracking-tighter text-on-surface-variant" id="cmp-level">L7_CLEARANCE</p>
            </div>
          </div>
        </div>
      </aside>
    `;

    ensureAegisUi();

    const currentPath = window.location.pathname.split('/').pop();
    this.querySelectorAll('nav a').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
        link.classList.add('bg-primary/10', 'border', 'border-primary/20', 'text-primary', 'aegis-glow');
        link.classList.remove('text-on-surface-variant', 'border-transparent', 'hover:bg-white/5');
        const icon = link.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.add('text-primary');
      }
    });

    const syncCommander = () => {
      const nameNode = this.querySelector('#cmp-name');
      const lvlNode = this.querySelector('#cmp-level');
      if (window.Aegis?.state) {
        if (nameNode) nameNode.textContent = window.Aegis.state.commanderName || 'OPERATOR_01';
        if (lvlNode) lvlNode.textContent = window.Aegis.state.clearanceLevel || 'LEVEL_07';
      }
    };

    syncCommander();

    this.querySelector('[data-aegis-sidebar-close]')?.addEventListener('click', () => window.AegisUI?.closeSidebar());
    this.querySelectorAll('nav a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 1024) window.AegisUI?.closeSidebar();
      });
    });

    window.addEventListener('aegis:state-updated', syncCommander);
  }
}

class AegisTopbar extends HTMLElement {
  connectedCallback() {
    const title = this.getAttribute('title') || 'SYSTEM_NODE';
    const subtitle = this.getAttribute('subtitle') || 'Data Interface';

    this.innerHTML = `
      <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-dim/80 px-4 backdrop-blur-md sm:h-20 sm:px-margin">
        <div class="flex min-w-0 items-center gap-3 sm:gap-4 lg:gap-10">
          <button type="button" data-aegis-mobile-menu class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/30 text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary lg:hidden">
            <span class="material-symbols-outlined text-[20px]">menu</span>
          </button>
          <div class="min-w-0 flex flex-col">
            <span class="truncate font-h3 text-2xl leading-none text-primary sm:text-h3">${title}</span>
            <span class="mt-1 truncate font-label-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant sm:text-[10px]">${subtitle}</span>
          </div>
          <div class="hidden items-center gap-4 rounded-full border border-outline-variant/50 bg-surface-container-high px-5 py-2 md:flex">
            <div class="flex items-center gap-2">
              <span class="font-label-caps text-label-caps text-on-surface-variant" id="cmp-lvl-top">LEVEL_07</span>
              <div class="h-1.5 w-32 overflow-hidden rounded-full bg-surface-variant">
                <div class="h-full bg-primary aegis-glow transition-all" id="cmp-xp-bar" style="width: 65%;"></div>
              </div>
            </div>
            <div class="flex items-center gap-2 text-primary">
              <span class="material-symbols-outlined text-[16px]">local_fire_department</span>
              <span class="font-label-mono text-[12px]" id="cmp-streak">12_DAY</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 sm:gap-4">
          <button id="aegis-signout-btn" class="flex h-10 items-center gap-2 rounded-full border border-outline-variant/30 px-3 text-on-surface-variant transition-colors hover:border-error/50 hover:text-error sm:px-4" type="button">
            <span class="material-symbols-outlined text-[18px]">logout</span>
            <span class="hidden text-[10px] font-label-caps uppercase tracking-widest sm:inline">Sign Out</span>
          </button>
          <button class="relative flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/30 text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary" type="button">
            <span class="material-symbols-outlined text-[20px]">notifications</span>
            <span class="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full border-2 border-background bg-primary"></span>
          </button>
        </div>
      </header>
    `;

    ensureAegisUi();
    this.querySelector('[data-aegis-mobile-menu]')?.addEventListener('click', () => window.AegisUI?.toggleSidebar());

    if (window.Aegis?.state) {
      const lvl = this.querySelector('#cmp-lvl-top');
      const xpBar = this.querySelector('#cmp-xp-bar');
      const streak = this.querySelector('#cmp-streak');

      if (lvl) lvl.textContent = window.Aegis.state.clearanceLevel || 'LEVEL_07';
      if (streak) streak.textContent = `${window.Aegis.state.streak || 0}_DAY`;
      if (xpBar) {
        const cap = 10000;
        const val = (window.Aegis.state.totalXp || 0) % cap;
        xpBar.style.width = `${Math.max(10, Math.min(100, (val / cap) * 100))}%`;
      }
    }
  }
}

customElements.define('aegis-sidebar', AegisSidebar);
customElements.define('aegis-topbar', AegisTopbar);
