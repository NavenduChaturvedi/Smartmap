// js/components.js - Reusable UI Components

class AegisSidebar extends HTMLElement {
  connectedCallback() {
      // Draw sidebar HTML
      this.innerHTML = `
      <aside class="fixed left-0 top-0 h-screen w-64 border-r border-outline-variant bg-surface-container-low/90 backdrop-blur-xl z-40 flex flex-col py-margin px-gutter shadow-2xl">
        <div class="mb-10 px-unit flex flex-col gap-unit">
          <h1 class="font-h3 text-h3 text-primary tracking-tighter uppercase leading-none">AEGIS_OS</h1>
          <div class="flex items-center gap-unit">
            <span class="h-1 w-1 rounded-full bg-primary animate-pulse"></span>
            <p class="font-label-mono text-label-mono text-on-surface-variant uppercase">Secure_Node_Active</p>
          </div>
        </div>
        <nav class="flex-1 space-y-unit">
          <a class="flex items-center gap-gutter px-gutter py-3 rounded-lg transition-all duration-200 group text-on-surface-variant hover:text-primary hover:bg-white/5" href="dashboard.html">
            <span class="material-symbols-outlined text-[20px]">grid_view</span>
            <span class="font-label-caps text-label-caps tracking-widest uppercase">Dashboard</span>
          </a>
          <a class="flex items-center gap-gutter px-gutter py-3 rounded-lg transition-all duration-200 group text-on-surface-variant hover:text-primary hover:bg-white/5" href="roadmap.html">
            <span class="material-symbols-outlined text-[20px]">account_tree</span>
            <span class="font-label-caps text-label-caps tracking-widest uppercase">Roadmaps</span>
          </a>
          <a class="flex items-center gap-gutter px-gutter py-3 rounded-lg transition-all duration-200 group text-on-surface-variant hover:text-primary hover:bg-white/5" href="analytics.html">
            <span class="material-symbols-outlined text-[20px]">analytics</span>
            <span class="font-label-caps text-label-caps tracking-widest uppercase">Analytics</span>
          </a>
          <a class="flex items-center gap-gutter px-gutter py-3 rounded-lg transition-all duration-200 group text-on-surface-variant hover:text-primary hover:bg-white/5" href="achievements.html">
            <span class="material-symbols-outlined text-[20px]">military_tech</span>
            <span class="font-label-caps text-label-caps tracking-widest uppercase">Achievements</span>
          </a>
          <a class="flex items-center gap-gutter px-gutter py-3 rounded-lg transition-all duration-200 group text-on-surface-variant hover:text-primary hover:bg-white/5" href="settings.html">
            <span class="material-symbols-outlined text-[20px]">settings</span>
            <span class="font-label-caps text-label-caps tracking-widest uppercase">Settings</span>
          </a>
        </nav>
        <div class="mt-auto pt-margin border-t border-outline-variant">
          <div class="p-3 bg-surface-container-high rounded-xl flex items-center gap-3 border border-outline-variant/30">
            <div class="relative">
              <img alt="Commander Avatar" class="w-10 h-10 rounded-lg grayscale border border-outline-variant" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBT112ADXw5N73TxuFCH2Gheaylsd5FahTIUkzn1yQqSbZaivWnpZNDIj2Xf8d0paq8RFV8cLjx_m3adYK-IHV0uyXgfmVLmhW-IuFMwMHjuMgLYiiMjhWQasoHtFe8VleUiopn-UPwHWka0cKR25XbpqBy6AmO6F9mnx7usi_AmNjXqCSgcipdU5-QNC1mh6YShWFo-zoWqviRFN0lz9XwWdIc_kaJmmWUt65BcWdkZ7BOpt-9qsEmu4wL56pgdHNBxVwa3zay-oJj"/>
              <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border-2 border-surface-container-high rounded-full"></div>
            </div>
            <div class="overflow-hidden">
              <p class="font-label-caps text-label-caps text-primary truncate" id="cmp-name">OPERATOR_01</p>
              <p class="text-[9px] text-on-surface-variant uppercase tracking-tighter truncate" id="cmp-level">L7_CLEARANCE</p>
            </div>
          </div>
        </div>
      </aside>
      `;

      // Apply active states using window path
      const currentPath = window.location.pathname.split('/').pop();
      this.querySelectorAll('nav a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
            link.classList.add('bg-primary/10', 'border-primary/20', 'text-primary', 'aegis-glow', 'border');
            link.classList.remove('text-on-surface-variant', 'border-transparent', 'hover:bg-white/5');
            const icon = link.querySelector('.material-symbols-outlined');
            if(icon) icon.classList.add('text-primary');
        }
      });

      // Update commander info if window state is available
      if (window.Aegis && window.Aegis.state) {
        const nameNode = this.querySelector('#cmp-name');
        const lvlNode = this.querySelector('#cmp-level');
        if(nameNode) nameNode.textContent = window.Aegis.state.commanderName || "OPERATOR_01";
        if(lvlNode) lvlNode.textContent = window.Aegis.state.clearanceLevel || "L7_CLEARANCE";
      }
  }
}

class AegisTopbar extends HTMLElement {
  connectedCallback() {
      const title = this.getAttribute('title') || 'SYSTEM_NODE';
      const subtitle = this.getAttribute('subtitle') || 'Data Interface';
      
      this.innerHTML = `
      <header class="h-20 bg-surface-dim/80 backdrop-blur-md border-b border-outline-variant flex justify-between items-center px-margin z-30 sticky top-0">
        <div class="flex items-center gap-10">
          <div class="flex flex-col">
            <span class="font-h3 text-h3 text-primary leading-none">${title}</span>
            <span class="font-label-mono text-[10px] text-on-surface-variant tracking-[0.2em] mt-1 uppercase">${subtitle}</span>
          </div>
          <div class="hidden md:flex items-center gap-4 bg-surface-container-high px-5 py-2 rounded-full border border-outline-variant/50">
            <div class="flex items-center gap-2">
              <span class="font-label-caps text-label-caps text-on-surface-variant" id="cmp-lvl-top">LEVEL_07</span>
              <div class="h-1.5 w-32 bg-surface-variant rounded-full overflow-hidden">
                <div class="h-full bg-primary aegis-glow transition-all" id="cmp-xp-bar" style="width: 65%;"></div>
              </div>
            </div>
            <div class="flex items-center gap-2 text-primary">
              <span class="material-symbols-outlined text-[16px]">local_fire_department</span>
              <span class="font-label-mono text-[12px]" id="cmp-streak">12_DAY</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <button class="w-10 h-10 rounded-full flex items-center justify-center border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors relative">
            <span class="material-symbols-outlined text-[20px]">notifications</span>
            <span class="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse border-2 border-background"></span>
          </button>
        </div>
      </header>
      `;

      if (window.Aegis && window.Aegis.state) {
        const lvl = this.querySelector('#cmp-lvl-top');
        const xpBar = this.querySelector('#cmp-xp-bar');
        const streak = this.querySelector('#cmp-streak');
        
        if (lvl) lvl.textContent = (window.Aegis.state.clearanceLevel || "L7_CLEARANCE").split('_')[0].replace('L', 'LEVEL_');
        if (streak) streak.textContent = `${window.Aegis.state.streak || 0}_DAY`;
        if (xpBar) {
            // Fake calculation just for top bar visual 
            const cap = 10000;
            const val = (window.Aegis.state.totalXp || 0) % cap;
            xpBar.style.width = `${Math.max(10, Math.min(100, (val/cap)*100))}%`;
        }
      }
  }
}

customElements.define('aegis-sidebar', AegisSidebar);
customElements.define('aegis-topbar', AegisTopbar);
