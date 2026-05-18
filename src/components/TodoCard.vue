<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  todo: { type: Object, required: true },
  removing: { type: Boolean, default: false },
})

defineEmits(['remove'])

const isNew = ref(true)
onMounted(() => {
  setTimeout(() => { isNew.value = false }, 280)
})

const textEl = ref(null)
const editing = ref(false)
let snapshot = ''

onMounted(() => {
  if (textEl.value) textEl.value.textContent = props.todo.text
})

watch(
  () => props.todo.text,
  val => {
    if (!editing.value && textEl.value && textEl.value.textContent !== val) {
      textEl.value.textContent = val
    }
  }
)

function onFocus() {
  editing.value = true
  snapshot = props.todo.text
}

function onBlur() {
  editing.value = false
  const next = (textEl.value?.textContent ?? '').trim().slice(0, 200)
  if (next && next !== props.todo.text) {
    props.todo.text = next
    if (textEl.value && textEl.value.textContent !== next) {
      textEl.value.textContent = next
    }
  } else if (!next && textEl.value) {
    textEl.value.textContent = props.todo.text
  }
}

function onKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    textEl.value?.blur()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    if (textEl.value) textEl.value.textContent = snapshot
    textEl.value?.blur()
  }
}
</script>

<template>
  <div class="card" :class="{ 'card--new': isNew, 'card--done': todo.done, 'card--removing': removing }">
    <div class="drag-handle" title="Drag to reorder">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="5.5" cy="4" r="1.2" fill="currentColor"/>
        <circle cx="10.5" cy="4" r="1.2" fill="currentColor"/>
        <circle cx="5.5" cy="8" r="1.2" fill="currentColor"/>
        <circle cx="10.5" cy="8" r="1.2" fill="currentColor"/>
        <circle cx="5.5" cy="12" r="1.2" fill="currentColor"/>
        <circle cx="10.5" cy="12" r="1.2" fill="currentColor"/>
      </svg>
    </div>

    <label class="checkbox-wrap">
      <input type="checkbox" v-model="todo.done" class="sr-only" />
      <span class="checkbox">
        <svg
          v-if="todo.done"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          class="check-icon"
        >
          <path
            d="M2 6l3 3 5-5"
            stroke="white"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </label>

    <span
      ref="textEl"
      class="todo-text"
      :class="{ 'todo-text--editing': editing }"
      contenteditable="plaintext-only"
      spellcheck="false"
      title="Click to edit"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    ></span>

    <button class="delete-btn" @click="$emit('remove')" title="Delete task">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  user-select: none;
  transition:
    box-shadow var(--transition),
    border-color var(--transition),
    opacity 200ms ease;
}

.card--new {
  animation: card-enter 260ms cubic-bezier(0.34, 1.2, 0.64, 1) both;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: #d8d8d5;
}

.card--done {
  opacity: 0.55;
}

.card--removing {
  opacity: 0 !important;
  transform: scale(0.98);
  pointer-events: none;
  transition: opacity 200ms ease, transform 200ms ease;
}

.drag-handle {
  flex-shrink: 0;
  color: var(--text-muted);
  cursor: grab;
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 4px;
  transition: color var(--transition);
}

.drag-handle:hover {
  color: var(--text-secondary);
}

.drag-handle:active {
  cursor: grabbing;
}

.checkbox-wrap {
  flex-shrink: 0;
  cursor: pointer;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
}

.checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  transition:
    background var(--transition),
    border-color var(--transition),
    transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.checkbox-wrap:hover .checkbox {
  border-color: var(--accent);
  transform: scale(1.08);
}

.checkbox-wrap input:checked + .checkbox {
  background: var(--accent);
  border-color: var(--accent);
}

.check-icon {
  animation: pop 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.todo-text {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.4;
  transition:
    color var(--transition),
    background var(--transition),
    box-shadow var(--transition);
  text-decoration-line: none;
  text-decoration-color: transparent;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 6px;
  cursor: text;
  word-break: break-word;
  white-space: pre-wrap;
  outline: none;
  user-select: text;
  caret-color: var(--accent);
  box-shadow: inset 0 -2px 0 0 transparent;
}

.todo-text:hover {
  background: rgba(0, 0, 0, 0.04);
}

.todo-text--editing,
.todo-text--editing:hover {
  background: rgba(79, 70, 229, 0.06);
  box-shadow: inset 0 -2px 0 0 var(--accent);
  border-radius: 6px 6px 0 0;
}

.card--done .todo-text {
  color: var(--text-muted);
  text-decoration-line: line-through;
  text-decoration-color: var(--text-muted);
}

.delete-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
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
}

.card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

@media (hover: none) {
  .delete-btn {
    opacity: 0.4;
  }
  .delete-btn:active {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
    opacity: 1;
  }
}
</style>
