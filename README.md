# Simple Todo App

A clean, minimal todo list that lives entirely in your browser — no account, no server, no data ever leaves your device.

![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![100% vibe coded](https://img.shields.io/badge/100%25-vibe%20coded-blueviolet)

---

## Features

### Privacy first
All data is stored in your browser's `localStorage`. Nothing is synced, tracked, or transmitted — the app works fully offline and never contacts any server after the initial page load.

### Manage your tasks
- Add tasks and check them off as you go
- Delete individual tasks with the × button
- Reset the entire list (and title) with the reset button in the header

### Drag to reorder
Grab the handle on the left of any task to drag it into a new position. The order is saved automatically.

### Editable list title
Click the title to rename your list. Edits are saved when you press **Enter**, click away, or press **Escape** to cancel.

### Persistent state
Your tasks and list title survive page refreshes and browser restarts — everything is saved locally as you type.

### Polished UI details
- Smooth entrance animation when a task is added
- Tasks fade and slide out when removed
- "All done ✓" indicator when every task is checked off
- Fully responsive layout

---

## Tech stack

| | |
|---|---|
| Framework | [Vue 3](https://vuejs.org) (Composition API, `<script setup>`) |
| Build tool | [Vite](https://vite.dev) |
| Drag & drop | [vuedraggable](https://github.com/SortableJS/vue.draggable.next) (SortableJS) |
| Deployment | GitHub Pages via GitHub Actions |
| Storage | Browser `localStorage` — no backend |

---

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 100% vibe coded by Claude Code

This project was built entirely through natural language conversations with [Claude Code](https://claude.ai/claude-code) — no manual code was written. Every feature, bug fix, animation, and CI pipeline was implemented by describing what was wanted and letting Claude handle the rest.
