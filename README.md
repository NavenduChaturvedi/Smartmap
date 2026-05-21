# 🚀 RoadmapOS

> An RPG-style productivity and self-improvement dashboard built for ambitious people.

RoadmapOS transforms self-improvement into an immersive progression system — think RPG skill trees, XP gains, mission briefings, and achievement unlocks, but for real life goals.

Instead of boring task lists and guilt-powered productivity apps, RoadmapOS treats growth like a game:
- Build roadmaps for any life goal
- Complete missions and tasks
- Earn XP and level up
- Track streaks and consistency
- Unlock achievements
- Visualize long-term progress

---

## 🧠 Core Philosophy

Most productivity apps fail because they feel like digital punishment.

RoadmapOS is designed to feel like:
- 🎮 An RPG progression system
- 🧠 A personal operating system
- 📊 A futuristic mission control dashboard
- ⚡ A dopamine-friendly growth tracker

> *"progression over perfection"*

---

## 🚧 Current Status

```
Frontend MVP:     ████████████████████░░░  82% Complete
Backend:          ░░░░░░░░░░░░░░░░░░░░░░░  Planning Phase
Overall:          ████████████░░░░░░░░░░░  ~50% Complete
```

**Frontend MVP is stable and fully interactive.** All core pages are built, wired, and stateful. Backend integration is the next major phase.

---

## ✅ What's Built

### Core Pages
- `index.html` — Entry page (repaired and stable)
- `dashboard.html` — Fully interactive: task toggles, XP tracking, pending count, live status updates
- `roadmap.html` — Interactive node system with dynamic mission briefing panel
- `analytics.html` — Connected to persisted app state (XP, streak, task metrics)
- `achievements.html` — Filters (All/Rare/Common/Locked), modals, commander/vault summary from state
- `settings.html` — Full persistence: theme, font scale, profile fields, scanlines/sound/animation toggles

### Architecture
- **Shared state layer** — `aegis_state_v1` via localStorage; consistent data across all pages
- **Web Components** — `<aegis-sidebar>` and `<aegis-topbar>` replace hundreds of lines of repeated HTML
- **Centralized JS** — All scripts extracted to `js/` directory (no inline scripts)
- **Global CSS** — `css/base.css` and `js/tailwind-config.js` replace scattered inline styles
- **Zero broken links** — All navigation wired and functional
- **Lint-clean** — All edited files verified

### Roadmap Features
- Clickable nodes update mission title, description, rewards, and sub-task checklist dynamically
- Selected node persists across page reloads
- Visual highlight for active selected node

---

## 🔄 In Progress

- Backend provider selection (Firebase vs Supabase)
- Auth flow design (sign up, login, session restore)
- Remote persistence model to replace localStorage

---

## 🗺️ Next Steps

1. **Choose backend** — Firebase or Supabase; define data model for users, roadmaps, tasks
2. **Implement auth** — Sign up, login, session restore; replace localStorage with remote persistence
3. **Sync strategy** — Offline cache + conflict resolution for roadmap progress
4. **Re-introduce signup flow** — After backend is stable
5. **YouTube Course Player** — Paste a course link, watch inside the app, auto-track lecture progress

---

## 🧩 Feature Overview

### 📌 Dashboard
Centralized productivity hub:
- Active roadmaps with progress %
- XP & level display
- Daily streaks
- Recent activity
- Upcoming milestones
- Live analytics overview

### 🗺️ Roadmap System
Create roadmaps for any goal — Python, MMA, Ethical Hacking, Fitness, Content Creation, etc.

Each roadmap supports:
- Stages, milestones, tasks, subtasks
- Progress tracking and completion %
- Interactive node-based visual tree

### 🎮 Gamification
- **XP** — Earned from tasks, milestones, streaks, roadmap completions
- **Leveling** — Progress through XP milestones
- **Achievements** — Unlock badges for consistency, speed, streaks, completions

### 📊 Analytics
- Weekly productivity tracking
- Completion trends
- Most active roadmaps
- Consistency graphs
- Progress heatmaps

---

## 🎨 Design

**Color Palette**

| Color | Purpose |
|---|---|
| Pearl White | Primary text / highlights |
| Charcoal Stone | Main background |
| Graphite Gray | Secondary surfaces |
| Soft Silver | UI accents |
| Muted Black | Depth / shadows |

**UI Philosophy** — Futuristic, immersive, minimal, smooth, rewarding. Not a corporate admin panel.

---

## 🛠️ Tech Stack

### Frontend (Complete)
- HTML5, CSS3, Vanilla JavaScript
- Web Components for shared UI (`<aegis-sidebar>`, `<aegis-topbar>`)
- localStorage for state persistence (`aegis_state_v1`)

### Backend (Planned)
- Firebase **or** Supabase (decision pending)

### AI Integration
- Gemini API key stays in `.env` as `GEMINI_API_KEY`
- Local proxy lives in `server.py` and exposes `http://127.0.0.1:8765/api/ai/chat`
- Dashboard AI panel calls the proxy instead of the Gemini API directly from the browser

### Hosting (Planned)
- Netlify **or** Vercel

---

## 📁 Project Structure

```
RoadmapOS/
│
├── index.html
├── dashboard.html
├── roadmap.html
├── analytics.html
├── achievements.html
├── settings.html
│
├── css/
│   ├── base.css              # Global shared styles
│   ├── dashboard.css
│   ├── roadmap.css
│   └── animations.css
│
├── js/
│   ├── app.js                # Shared state logic
│   ├── components.js         # Web Components (sidebar, topbar)
│   ├── tailwind-config.js    # Shared Tailwind config
│   ├── dashboard.js
│   ├── roadmap.js
│   ├── analytics.js
│   ├── achievements.js
│   ├── settings.js
│   └── xp-system.js
│
├── assets/
│   ├── icons/
│   ├── images/
│   └── fonts/
│
└── backend/
    └── firebase-config.js    # Placeholder — backend TBD

---

## 🤖 Gemini Setup

1. Copy `.env.example` to `.env`
2. Set `GEMINI_API_KEY` to your Gemini API key
3. Run `npm run ai:proxy`
4. Open the dashboard and use the AI panel

The browser never sees the Gemini key. Only the local proxy reads it.
```

---

## 🔮 Future Features

- AI-generated roadmaps
- YouTube Course Player with auto progress tracking
- AI productivity assistant
- Pomodoro system
- Real-time sync
- Mobile app
- Community challenges
- Multiplayer accountability systems

---

## 📜 Changelog

### 2026-05-09
- Restored `roadmap.html` after accidental wipe
- Rebuilt `analytics.html` layout with shared topbar
- Fixed layout overlap issues
- **Completion: 82%**

### 2026-05-06
- Replaced repeated sidebar/topbar HTML with Web Components (`<aegis-sidebar>`, `<aegis-topbar>`)
- Extracted all inline scripts to `js/` directory
- Centralized styles into `css/base.css` and `js/tailwind-config.js`
- Implemented shared state persistence (`aegis_state_v1`)
- Wired analytics and achievements to live persisted state
- Made roadmap nodes fully interactive with dynamic mission briefing
- **Frontend MVP Architecture: Complete**

---

## 📜 License

MIT License

---

*RoadmapOS — A leveling system for real life.*
