<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import draggable from 'vuedraggable'
import TodoCard from './TodoCard.vue'

const STORAGE_KEY = 'simple-todo-items'
const NAME_KEY = 'simple-todo-name'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

const todos = ref(load())

let nextId = Math.max(0, ...todos.value.map(t => t.id)) + 1

watch(todos, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

const listName = ref(localStorage.getItem(NAME_KEY) ?? 'Todo')
watch(listName, val => localStorage.setItem(NAME_KEY, val))

const editingName = ref(false)
const editNameValue = ref('')
const nameInput = ref(null)
const fileInput = ref(null)

async function startNameEdit() {
  editNameValue.value = listName.value
  editingName.value = true
  await nextTick()
  nameInput.value?.select()
}

function saveName() {
  const trimmed = editNameValue.value.trim()
  if (trimmed) listName.value = trimmed
  editingName.value = false
}

function cancelNameEdit() {
  editingName.value = false
}

const newText = ref('')
const dragging = ref(false)
const removingIds = ref(new Set())

const activeTodos = computed(() => todos.value.filter(t => !t.done))

function addTodo() {
  const text = newText.value.trim()
  if (!text) return
  todos.value.unshift({ id: nextId++, text, done: false })
  newText.value = ''
}

function resetApp() {
  todos.value = []
  localStorage.removeItem(STORAGE_KEY)
  listName.value = 'Todo'
  localStorage.removeItem(NAME_KEY)
}

function exportTodos() {
  const payload = JSON.stringify({ name: listName.value, todos: todos.value }, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const safeName = (listName.value || 'todos').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'todos'
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value?.click()
}

function handleImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result)
      const rawTodos = Array.isArray(parsed) ? parsed : parsed?.todos
      if (!Array.isArray(rawTodos)) throw new Error('Invalid format')
      const imported = rawTodos
        .filter(t => t && typeof t.text === 'string')
        .map(t => ({ id: nextId++, text: t.text, done: Boolean(t.done) }))
      todos.value = imported
      if (parsed && typeof parsed.name === 'string' && parsed.name.trim()) {
        listName.value = parsed.name.trim()
      }
    } catch {
      alert('Could not import: file is not a valid todo JSON export.')
    }
  }
  reader.readAsText(file)
}

function removeTodo(id) {
  removingIds.value = new Set([...removingIds.value, id])
  setTimeout(() => {
    todos.value = todos.value.filter(t => t.id !== id)
    removingIds.value.delete(id)
    removingIds.value = new Set(removingIds.value)
  }, 200)
}

function clearDone() {
  const doneIds = todos.value.filter(t => t.done).map(t => t.id)
  if (doneIds.length === 0) return
  removingIds.value = new Set([...removingIds.value, ...doneIds])
  setTimeout(() => {
    const doneSet = new Set(doneIds)
    todos.value = todos.value.filter(t => !doneSet.has(t.id))
    doneIds.forEach(id => removingIds.value.delete(id))
    removingIds.value = new Set(removingIds.value)
  }, 200)
}

const pendingAction = ref(null)
let pendingTimer = null

function requestConfirm(action) {
  if (action === 'clearDone' && !todos.value.some(t => t.done)) return
  if (action === 'reset' && todos.value.length === 0 && listName.value === 'Todo') return

  if (pendingAction.value === action) {
    pendingAction.value = null
    clearTimeout(pendingTimer)
    if (action === 'reset') resetApp()
    else if (action === 'clearDone') clearDone()
    return
  }
  pendingAction.value = action
  clearTimeout(pendingTimer)
  pendingTimer = setTimeout(() => { pendingAction.value = null }, 3000)
}

function cancelPending() {
  if (!pendingAction.value) return
  pendingAction.value = null
  clearTimeout(pendingTimer)
}

function onDocPointerDown(e) {
  if (!pendingAction.value) return
  const btn = e.target.closest(`.reset-btn[data-action="${pendingAction.value}"]`)
  if (btn) return
  cancelPending()
}

function onDocKeydown(e) {
  if (e.key === 'Escape') cancelPending()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown)
  document.addEventListener('keydown', onDocKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onDocKeydown)
})

// Lock drag to vertical axis by zeroing the X component of SortableJS's matrix transform
function onDragStart() {
  dragging.value = true
  document.addEventListener('pointermove', lockHorizontal)
}

function onDragEnd() {
  dragging.value = false
  document.removeEventListener('pointermove', lockHorizontal)
}

function lockHorizontal() {
  requestAnimationFrame(() => {
    const el = document.querySelector('.drag-clone')
    if (!el) return
    const t = el.style.transform
    if (!t) return
    // SortableJS writes matrix(a,b,c,d,e,f) — zero e (translateX), keep f (translateY)
    el.style.transform = t.replace(
      /matrix\(([^,]+,[^,]+,[^,]+,[^,]+,)[^,]+,/,
      (_, abcd) => `matrix(${abcd}0,`
    )
  })
}
</script>

<template>
  <div class="layout">
    <header class="header">
      <div class="header-row">
        <div class="title-wrap" :class="{ 'title-wrap--editing': editingName }">
          <h1
            class="title"
            :style="{ visibility: editingName ? 'hidden' : 'visible' }"
            @click="startNameEdit"
            title="Click to rename"
          >{{ listName }}</h1>
          <input
            v-if="editingName"
            ref="nameInput"
            class="title title-input"
            v-model="editNameValue"
            maxlength="60"
            @blur="saveName"
            @keydown.enter.prevent="saveName"
            @keydown.escape="cancelNameEdit"
          />
        </div>
        <button class="reset-btn" @click="exportTodos" title="Export tasks to JSON">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v6.5M4.5 6L7 8.5 9.5 6M2.5 11.5h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="reset-btn" @click="triggerImport" title="Import tasks from JSON">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 8.5V2M4.5 4.5L7 2l2.5 2.5M2.5 11.5h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="file-input"
          @change="handleImport"
        />
        <button
          class="reset-btn"
          :class="{ 'reset-btn--confirm': pendingAction === 'clearDone' }"
          @click="requestConfirm('clearDone')"
          :title="pendingAction === 'clearDone' ? 'Click again to confirm' : 'Clear completed tasks'"
          data-action="clearDone"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8.5 8.5l4 4M12.5 8.5l-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <span class="confirm-label">Confirm?</span>
        </button>
        <button
          class="reset-btn"
          :class="{ 'reset-btn--confirm': pendingAction === 'reset' }"
          @click="requestConfirm('reset')"
          :title="pendingAction === 'reset' ? 'Click again to confirm' : 'Reset — clears all tasks'"
          data-action="reset"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7a5 5 0 1 0 1.5-3.5L2 2v3h3L3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="confirm-label">Confirm?</span>
        </button>
      </div>
      <p class="subtitle" :class="{ 'done-all': todos.length && !activeTodos.length }">
        {{ todos.length && !activeTodos.length ? 'All done ✓' : `${activeTodos.length} remaining` }}
      </p>
    </header>

    <main class="main">
      <form class="add-form" @submit.prevent="addTodo">
        <input
          v-model="newText"
          class="add-input"
          placeholder="Add a new task…"
          maxlength="200"
        />
        <button class="add-btn" type="submit" :disabled="!newText.trim()">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </form>

      <draggable
        v-model="todos"
        item-key="id"
        handle=".drag-handle"
        :animation="250"
        ghost-class="ghost"
        chosen-class="chosen"
        :force-fallback="true"
        fallback-class="drag-clone"
        @start="onDragStart"
        @end="onDragEnd"
        class="todo-list"
        :class="{ 'is-dragging': dragging }"
      >
        <template #item="{ element }">
          <TodoCard
            :todo="element"
            :removing="removingIds.has(element.id)"
            @remove="removeTodo(element.id)"
          />
        </template>
      </draggable>

      <div v-if="todos.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" class="empty-icon">
          <rect x="8" y="8" width="32" height="32" rx="6" stroke="currentColor" stroke-width="1.5"/>
          <path d="M16 24h16M16 30h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M16 18h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p>No tasks yet</p>
        <p class="empty-sub">Add something above to get started</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  max-width: 580px;
  margin: 0 auto;
  padding: 48px 16px 80px;
  min-height: 100vh;
}

@media (max-width: 480px) {
  .layout {
    padding: 28px 12px 60px;
  }
}

.header {
  margin-bottom: 32px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-input {
  display: none;
}

.reset-btn {
  flex-shrink: 0;
  min-width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  opacity: 0;
  transition: opacity var(--transition), color var(--transition), background var(--transition), padding var(--transition);
  margin-top: 4px;
}

.header:hover .reset-btn {
  opacity: 0.4;
}

.reset-btn:hover {
  opacity: 1 !important;
  color: var(--text-secondary);
  background: var(--border);
}

.reset-btn--confirm,
.reset-btn--confirm:hover {
  opacity: 1 !important;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 0 8px 0 6px;
}

.reset-btn--confirm:hover {
  background: rgba(239, 68, 68, 0.18);
  color: #dc2626;
}

.confirm-label {
  font-size: 12px;
  font-weight: 500;
  max-width: 0;
  opacity: 0;
  transition: max-width 200ms ease, opacity 150ms ease;
}

.reset-btn--confirm .confirm-label {
  max-width: 80px;
  opacity: 1;
}

@media (hover: none) {
  .reset-btn {
    opacity: 0.35;
  }
}

.title {
  font-size: clamp(22px, 7vw, 32px);
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--text-primary);
  line-height: 1.1;
}

h1.title {
  cursor: text;
  width: fit-content;
  border-radius: 6px;
  padding: 2px 6px;
  margin: -2px -6px;
  transition: background 200ms ease;
}

h1.title:hover {
  background: rgba(0, 0, 0, 0.05);
}

.title-wrap {
  position: relative;
  min-width: 0;
}

.title-wrap--editing {
  flex: 1;
}

.title-input {
  position: absolute;
  inset: 0;
  font-family: inherit;
  border: none;
  outline: none;
  box-shadow: 0 2px 0 0 var(--accent);
  border-radius: 4px 4px 0 0;
  background-image: linear-gradient(rgba(79, 70, 229, 0.06), rgba(79, 70, 229, 0.06));
  background-repeat: no-repeat;
  background-position: left center;
  background-size: 0% 100%;
  animation: title-expand 180ms ease forwards;
  padding: 0 6px;
  caret-color: var(--accent);
}

@keyframes title-expand {
  to { background-size: 100% 100%; }
}

.subtitle {
  margin-top: 4px;
  font-size: 14px;
  color: var(--text-muted);
  transition: color var(--transition);
}

.done-all {
  color: #22c55e;
}

.add-form {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.add-input {
  flex: 1;
  height: 48px;
  padding: 0 16px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  font-family: inherit;
  font-size: 16px;
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.add-input::placeholder {
  color: var(--text-muted);
}

.add-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.add-btn {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: var(--radius);
  background: var(--accent);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition), transform var(--transition), opacity var(--transition);
}

.add-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.04);
}

.add-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.add-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-list.is-dragging {
  cursor: grabbing;
}

:deep(.ghost) {
  opacity: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
  color: var(--text-muted);
  gap: 8px;
}

.empty-icon {
  margin-bottom: 8px;
  opacity: 0.4;
}

.empty-sub {
  font-size: 13px;
  opacity: 0.7;
}
</style>
