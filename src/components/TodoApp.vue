<script setup>
import { ref, computed, watch, nextTick } from 'vue'
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

function removeTodo(id) {
  removingIds.value = new Set([...removingIds.value, id])
  setTimeout(() => {
    todos.value = todos.value.filter(t => t.id !== id)
    removingIds.value.delete(id)
    removingIds.value = new Set(removingIds.value)
  }, 200)
}

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
        <h1 v-if="!editingName" class="title" @click="startNameEdit" title="Click to rename">
          {{ listName }}
        </h1>
        <input
          v-else
          ref="nameInput"
          class="title title-input"
          v-model="editNameValue"
          maxlength="60"
          @blur="saveName"
          @keydown.enter.prevent="saveName"
          @keydown.escape="cancelNameEdit"
        />
        <button class="reset-btn" @click="resetApp" title="Reset — clears all tasks">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7a5 5 0 1 0 1.5-3.5L2 2v3h3L3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
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

.header {
  margin-bottom: 32px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reset-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition), color var(--transition), background var(--transition);
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

.title {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--text-primary);
  line-height: 1.1;
}

h1.title {
  cursor: text;
  text-decoration: underline;
  text-decoration-style: dashed;
  text-decoration-color: transparent;
  text-underline-offset: 4px;
  transition: text-decoration-color 200ms ease;
}

h1.title:hover {
  text-decoration-color: var(--text-muted);
}

.title-input {
  font-family: inherit;
  border: none;
  outline: none;
  box-shadow: 0 2px 0 0 var(--accent);
  border-radius: 4px 4px 0 0;
  background: rgba(79, 70, 229, 0.06);
  padding: 0 6px;
  margin: 0 -6px;
  width: calc(100% + 12px);
  caret-color: var(--accent);
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
  font-size: 15px;
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
