import re
for f in ['dashboard.html', 'roadmap.html', 'analytics.html', 'achievements.html', 'settings.html']:
    html = open(f, encoding='utf-8').read()
    if 'js/components.js' not in html:
        html = html.replace('js/app.js"></script>', 'js/app.js"></script>\n<script src="js/components.js"></script>')
    html = re.sub(r'<aside.*?</aside>', '<aegis-sidebar></aegis-sidebar>', html, flags=re.DOTALL)
    open(f, 'w', encoding='utf-8').write(html)
print('Sidebar migrated!')