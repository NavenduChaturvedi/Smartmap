import re

with open('js/roadmap-create.js', 'r') as f:
    text = f.read()

rep1 = """const tasksToAdd = validPhases.map((phase) => ({
        title: phase.label ? `${phase.label}: ${phase.title}` : phase.title,
        tag: roadmapTag,
        xp: phase.xp
      }));
      window.Aegis.addTasks(tasksToAdd);"""

rep2 = """const tasksToAdd = validPhases.map((phase) => ({
      title: phase.label ? `${phase.label}: ${phase.title}` : phase.title,
      tag: '',
      xp: phase.xp,
      roadmap_id: roadmapId,
      parent_task_id: null
    }));
    window.Aegis.addTasks(tasksToAdd);"""

import re
text = re.sub(r'for \(const phase of validPhases\) \{\s*const taskTitle = phase\.label \? `\$\{phase\.label\}: \$\{phase\.title\}` : phase\.title;\s*window\.Aegis\.addTask\(taskTitle, roadmapTag, phase\.xp\);\s*\}\s*await window\.Aegis\.save\(\);', rep1, text)
text = re.sub(r'for \(const phase of validPhases\) \{\s*const taskTitle = phase\.label \? `\$\{phase\.label\}: \$\{phase\.title\}` : phase\.title;\s*window\.Aegis\.addTask\(taskTitle, \'\', phase\.xp, roadmapId, null\);\s*\}\s*await window\.Aegis\.save\(\);', rep2, text)

with open('js/roadmap-create.js', 'w') as f:
    f.write(text)
