# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server at http://localhost:5173
npm run build     # production build to dist/
npm run preview   # preview production build locally
```

There is no test runner or linter configured in this project.

## Architecture

The app is a pure frontend, no-backend Vue 3 SPA. All state is persisted to `localStorage` — nothing ever leaves the browser.

**Component tree:**

```
index.html
└── src/main.js         (mounts Vue app)
    └── src/App.vue     (thin shell — just renders TodoApp)
        └── src/components/TodoApp.vue   (all state + logic)
            └── src/components/TodoCard.vue  (presentational, per-item)
```

**`TodoApp.vue`** owns everything: the `todos` array, the list title, drag state, and the remove-animation queue. It persists reactively via `watch` directly to `localStorage` (`simple-todo-items` and `simple-todo-name`). There is no Pinia/Vuex store — state is local to this component.

**Todo data shape:** `{ id: number, text: string, done: boolean }`. `id` is an in-memory incrementing counter seeded from the max existing id on load; it is not persisted separately.

**`TodoCard.vue`** is purely presentational. It receives `todo` (Object) and `removing` (Boolean) as props and emits `remove`. The `done` checkbox mutates `todo.done` directly via `v-model` — this works because the object is a ref item from the parent's reactive array.

## Key implementation details

**Drag-and-drop:** Uses `vuedraggable` (SortableJS wrapper) with `force-fallback: true` to always use the JS fallback drag clone (so CSS can style it). The clone is appended to `<body>` outside the Vue root, which means it cannot be reached by `<style scoped>`. The `.drag-clone` rule in `src/style.css` (global) styles it. A `pointermove` listener (`lockHorizontal`) patches the SortableJS `matrix(...)` inline transform on every animation frame to zero out the X translation, constraining drag to the vertical axis.

**Remove animation:** `removingIds` is a `Set` ref. When a todo is removed, its id is added to the set (triggering the CSS exit transition on the card), and the actual array splice happens after 200 ms.

**Deployment:** GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on every push to `main`. The workflow sets `VITE_BASE_PATH=/<repo-name>/` so `vite.config.js` picks it up as the `base` path. For local dev the base defaults to `/`.

## Styling conventions

- Global CSS variables (colors, radii, shadows, transition easing) are defined in `src/style.css`.
- Each component uses `<style scoped>`.
- The single exception is `.drag-clone` which must live in the global stylesheet because SortableJS appends the element directly to `<body>`.
- Accent color is `--accent: #4f46e5` (indigo). Avoid introducing additional color values outside the CSS variable set.
