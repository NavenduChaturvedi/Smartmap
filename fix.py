import re
content = open('js/components.js', 'r', encoding='utf-8').read()
content = re.sub(r'if \(streak\) streak\.textContent = .*?;', 'if (streak) streak.textContent = \\_DAY\;', content)
content = re.sub(r'xpBar\.style\.width = .*?;', 'xpBar.style.width = \\%\;', content)
open('js/components.js', 'w', encoding='utf-8').write(content)