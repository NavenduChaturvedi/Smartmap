import glob, re
for f in glob.glob('*.html'):
    if f == 'index.html': continue
    html = open(f, encoding='utf-8').read()
    if 'js/app.js' not in html:
        html = html.replace('</head>', '<script src="js/app.js"></script>\n</head>')
    
    pattern = r'const AEGIS_STORAGE_KEY\s*=\s*"aegis_state_v1";[\s\S]*?const state\s*=\s*loadState\(\);'
    html = re.sub(pattern, 'const state = window.Aegis.state;', html)
    html = html.replace('saveState(state)', 'window.Aegis.save()')
    open(f, 'w', encoding='utf-8').write(html)
print('Done!')
