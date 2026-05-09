import json
from pathlib import Path
for f in ["dashboard.html", "roadmap.html", "analytics.html", "achievements.html", "settings.html"]:
    content = Path(f).read_text(encoding='utf-8')
    print(f, "Sidebar start:", content.find('<aside'), "Sidebar end:", content.find('</aside>'))
