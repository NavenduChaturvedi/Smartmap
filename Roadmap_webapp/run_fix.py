import re

try:
    content = open('roadmap.html', 'r', encoding='utf-8').read()

    # Step 0: Ensure we didn't duplicate the sidebar already
    content = content.replace('<aegis-sidebar></aegis-sidebar>', '')

    # Step 1: Ensure <main> has ml-64
    content = re.sub(r'<main class="min-h-screen\s*', '<main class="ml-64 min-h-screen ', content)
    
    # Prepend sidebar before main
    content = re.sub(r'(<main class=")', r'<aegis-sidebar></aegis-sidebar>\n\1', content)

    # Re-insert topbar inside main if missing
    if '<aegis-topbar' not in content:
        content = re.sub(r'(<main class="ml-64[^>]*>)', r'\1\n<aegis-topbar title="MISSION_ROADMAP" subtitle="Path to Integration"></aegis-topbar>', content)
    
    # Ensure Mission Details Panel
    if 'id="mission-title"' not in content:
        panel_html = '''\n<aside class="fixed right-0 top-0 h-full w-[400px] bg-surface-container-low border-l border-outline-variant/30 px-8 py-margin flex flex-col shadow-2xl z-40 overflow-y-auto">
<div class="flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/20">
    <span class="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-widest">Selected_Target</span>
    <span class="material-symbols-outlined text-outline-variant hover:text-primary transition-colors text-[20px] cursor-pointer px-2">close</span>
</div>
<p class="font-h2 text-h2 text-primary mb-2" id="mission-title">Mission Briefing</p>
<div class="flex items-center gap-2 mb-6">
    <span class="font-label-mono text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase">MAIN_QUEST</span>
    <span class="font-label-mono text-[10px] text-on-surface-variant uppercase" id="mission-reward">0 XP</span>
</div>
<p class="font-body-sm text-on-surface-variant/90 border-l-2 border-primary/50 pl-4 py-1 mb-8" id="mission-description">Select a node</p>
<p class="font-label-caps text-xs text-on-surface uppercase mb-4 tracking-widest border-b border-outline-variant/20 pb-2">Sub_Objectives</p>
<div class="space-y-4 mb-auto" id="mission-subnodes"></div>
<button class="mt-8 w-full py-4 bg-primary text-background font-bold tracking-widest uppercase hover:opacity-90 transition-all flex justify-center items-center gap-3">
    <span id="mission-action">INITIALIZE LOGIC</span>
    <span class="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span>
</button>
</aside>\n'''
        # Inject before closing main or body
        content = re.sub(r'</main>', panel_html + '\n</main>', content)

    open('roadmap.html', 'w', encoding='utf-8').write(content)
    print("Success")
except Exception as e:
    print("Error:", e)
