import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, h, defineComponent } from 'vue'

// vi.mock is hoisted — this mock persists across vi.resetModules() calls,
// so re-imports of TodoApp.vue still get a stub instead of the real draggable.
vi.mock('vuedraggable', () => {
  return {
    default: defineComponent({
      name: 'Draggable',
      props: ['modelValue'],
      setup(props, { slots }) {
        return () => h('div', { class: 'todo-list' },
          (props.modelValue ?? []).map(item => slots.item?.({ element: item }))
        )
      },
    }),
  }
})

describe('TodoApp', () => {
  let wrapper

  beforeEach(async () => {
    // Reset module registry so TodoApp.vue re-executes its top-level setup
    // (todos ref, listName ref, nextId counter) fresh for each test.
    vi.resetModules()
    localStorage.clear()
    const { mount } = await import('@vue/test-utils')
    const { default: TodoApp } = await import('../TodoApp.vue')
    wrapper = mount(TodoApp)
    await nextTick()
  })

  afterEach(() => wrapper?.unmount())

  // ─── Initial state ────────────────────────────────────────────────────────

  it('shows empty state when there are no todos', () => {
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-state').text()).toContain('No tasks yet')
  })

  it('shows "Todo" as the default list name', () => {
    expect(wrapper.find('h1.title').text()).toBe('Todo')
  })

  it('shows "0 remaining" subtitle when list is empty', () => {
    expect(wrapper.find('.subtitle').text()).toBe('0 remaining')
  })

  it('disables add button when input is empty', () => {
    expect(wrapper.find('.add-btn').attributes('disabled')).toBeDefined()
  })

  // ─── Adding todos ─────────────────────────────────────────────────────────

  it('adds a todo on form submit', async () => {
    await wrapper.find('.add-input').setValue('Walk the dog')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    expect(wrapper.find('.todo-list').text()).toContain('Walk the dog')
  })

  it('does not add a whitespace-only todo', async () => {
    await wrapper.find('.add-input').setValue('   ')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('clears input after adding a todo', async () => {
    await wrapper.find('.add-input').setValue('Task')
    await wrapper.find('.add-form').trigger('submit')
    expect(wrapper.find('.add-input').element.value).toBe('')
  })

  it('enables add button when input has text', async () => {
    await wrapper.find('.add-input').setValue('Hello')
    expect(wrapper.find('.add-btn').attributes('disabled')).toBeUndefined()
  })

  it('updates the remaining count after adding a todo', async () => {
    await wrapper.find('.add-input').setValue('Task 1')
    await wrapper.find('.add-form').trigger('submit')
    await wrapper.find('.add-input').setValue('Task 2')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    expect(wrapper.find('.subtitle').text()).toBe('2 remaining')
  })

  it('prepends new todos to the top of the list', async () => {
    await wrapper.find('.add-input').setValue('First')
    await wrapper.find('.add-form').trigger('submit')
    await wrapper.find('.add-input').setValue('Second')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    const cards = wrapper.findAll('.card')
    expect(cards[0].text()).toContain('Second')
    expect(cards[1].text()).toContain('First')
  })

  // ─── Completing todos ─────────────────────────────────────────────────────

  it('shows "All done ✓" when every todo is checked', async () => {
    await wrapper.find('.add-input').setValue('Task')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await nextTick()
    expect(wrapper.find('.subtitle').text()).toBe('All done ✓')
    expect(wrapper.find('.subtitle').classes()).toContain('done-all')
  })

  it('decrements remaining count when a todo is checked', async () => {
    await wrapper.find('.add-input').setValue('Task A')
    await wrapper.find('.add-form').trigger('submit')
    await wrapper.find('.add-input').setValue('Task B')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await nextTick()
    expect(wrapper.find('.subtitle').text()).toBe('1 remaining')
  })

  // ─── Removing todos ───────────────────────────────────────────────────────

  it('removes a todo after the 200 ms animation delay', async () => {
    vi.useFakeTimers()
    await wrapper.find('.add-input').setValue('Remove me')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    await wrapper.find('.delete-btn').trigger('click')
    await nextTick()
    // card--removing applied immediately
    expect(wrapper.find('.card').classes()).toContain('card--removing')
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    vi.useRealTimers()
  })

  // ─── Clear done ───────────────────────────────────────────────────────────

  it('removes all done todos after second click of clear-done button', async () => {
    vi.useFakeTimers()
    await wrapper.find('.add-input').setValue('Active')
    await wrapper.find('.add-form').trigger('submit')
    await wrapper.find('.add-input').setValue('Done')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    // The most-recently added ("Done") is first
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await nextTick()
    const clearBtn = wrapper.find('[data-action="clearDone"]')
    await clearBtn.trigger('click')
    await clearBtn.trigger('click')
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(wrapper.find('.todo-list').text()).not.toContain('Done')
    expect(wrapper.find('.todo-list').text()).toContain('Active')
    vi.useRealTimers()
  })

  // ─── Reset ────────────────────────────────────────────────────────────────

  it('resets everything after double-clicking the reset button', async () => {
    await wrapper.find('.add-input').setValue('Task to wipe')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    const resetBtn = wrapper.find('[data-action="reset"]')
    await resetBtn.trigger('click')
    await nextTick()
    // First click only arms the confirm state, todos still present
    expect(wrapper.find('.empty-state').exists()).toBe(false)
    await resetBtn.trigger('click')
    await nextTick()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('h1.title').text()).toBe('Todo')
  })

  it('cancels pending action on Escape key', async () => {
    await wrapper.find('.add-input').setValue('Task')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    const resetBtn = wrapper.find('[data-action="reset"]')
    await resetBtn.trigger('click')
    await nextTick()
    expect(resetBtn.classes()).toContain('reset-btn--confirm')
    // The handler listens on document, not on the component root
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(resetBtn.classes()).not.toContain('reset-btn--confirm')
  })

  it('auto-cancels pending action after 3 seconds', async () => {
    vi.useFakeTimers()
    await wrapper.find('.add-input').setValue('Task')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    const resetBtn = wrapper.find('[data-action="reset"]')
    await resetBtn.trigger('click')
    await nextTick()
    expect(resetBtn.classes()).toContain('reset-btn--confirm')
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(resetBtn.classes()).not.toContain('reset-btn--confirm')
    vi.useRealTimers()
  })

  // ─── List name editing ────────────────────────────────────────────────────

  it('shows name input when title is clicked', async () => {
    await wrapper.find('h1.title').trigger('click')
    await nextTick()
    expect(wrapper.find('.title-input').exists()).toBe(true)
    expect(wrapper.find('h1.title').attributes('style')).toContain('hidden')
  })

  it('saves new name on Enter key', async () => {
    await wrapper.find('h1.title').trigger('click')
    await nextTick()
    await wrapper.find('.title-input').setValue('My Tasks')
    await wrapper.find('.title-input').trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(wrapper.find('h1.title').text()).toBe('My Tasks')
  })

  it('saves new name on blur', async () => {
    await wrapper.find('h1.title').trigger('click')
    await nextTick()
    await wrapper.find('.title-input').setValue('Saved Name')
    await wrapper.find('.title-input').trigger('blur')
    await nextTick()
    expect(wrapper.find('h1.title').text()).toBe('Saved Name')
  })

  it('cancels name edit on Escape', async () => {
    await wrapper.find('h1.title').trigger('click')
    await nextTick()
    await wrapper.find('.title-input').setValue('Discarded')
    await wrapper.find('.title-input').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.find('h1.title').text()).toBe('Todo')
  })

  it('does not save an empty list name', async () => {
    await wrapper.find('h1.title').trigger('click')
    await nextTick()
    await wrapper.find('.title-input').setValue('   ')
    await wrapper.find('.title-input').trigger('blur')
    await nextTick()
    expect(wrapper.find('h1.title').text()).toBe('Todo')
  })

  // ─── localStorage persistence ─────────────────────────────────────────────

  it('persists todos to localStorage', async () => {
    await wrapper.find('.add-input').setValue('Persistent task')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    const stored = JSON.parse(localStorage.getItem('simple-todo-items'))
    expect(stored).toHaveLength(1)
    expect(stored[0].text).toBe('Persistent task')
  })

  it('persists list name to localStorage', async () => {
    await wrapper.find('h1.title').trigger('click')
    await nextTick()
    await wrapper.find('.title-input').setValue('Saved Name')
    await wrapper.find('.title-input').trigger('blur')
    await nextTick()
    expect(localStorage.getItem('simple-todo-name')).toBe('Saved Name')
  })

  it('loads todos from localStorage on mount', async () => {
    localStorage.setItem('simple-todo-items', JSON.stringify([
      { id: 5, text: 'Loaded task', done: false },
    ]))
    localStorage.setItem('simple-todo-name', 'Loaded Name')
    // Fresh mount to pick up the pre-seeded localStorage values
    vi.resetModules()
    const { mount } = await import('@vue/test-utils')
    const { default: TodoApp } = await import('../TodoApp.vue')
    const freshWrapper = mount(TodoApp)
    await nextTick()
    expect(freshWrapper.find('.todo-list').text()).toContain('Loaded task')
    expect(freshWrapper.find('h1.title').text()).toBe('Loaded Name')
    freshWrapper.unmount()
  })

  it('handles corrupt localStorage gracefully', async () => {
    localStorage.setItem('simple-todo-items', 'not-valid-json')
    vi.resetModules()
    const { mount } = await import('@vue/test-utils')
    const { default: TodoApp } = await import('../TodoApp.vue')
    const freshWrapper = mount(TodoApp)
    await nextTick()
    // Should fall back to empty list without throwing
    expect(freshWrapper.find('.empty-state').exists()).toBe(true)
    freshWrapper.unmount()
  })

  // ─── Export ───────────────────────────────────────────────────────────────

  it('calls createObjectURL and revokeObjectURL on export', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    global.URL.createObjectURL = createObjectURL
    global.URL.revokeObjectURL = revokeObjectURL
    await wrapper.find('[title="Export tasks to JSON"]').trigger('click')
    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()
  })

  // ─── Import ───────────────────────────────────────────────────────────────

  it('imports todos from a JSON array', async () => {
    const content = JSON.stringify([
      { text: 'Imported A', done: false },
      { text: 'Imported B', done: true },
    ])
    const OriginalFileReader = global.FileReader
    global.FileReader = class {
      readAsText() { this.onload({ target: { result: content } }) }
    }
    const fileInput = wrapper.find('.file-input')
    Object.defineProperty(fileInput.element, 'files', { value: [new File([content], 'todos.json')], configurable: true })
    await fileInput.trigger('change')
    await nextTick()
    expect(wrapper.find('.todo-list').text()).toContain('Imported A')
    expect(wrapper.find('.todo-list').text()).toContain('Imported B')
    global.FileReader = OriginalFileReader
  })

  it('imports todos and list name from a JSON object', async () => {
    const content = JSON.stringify({ name: 'Shopping', todos: [{ text: 'Apples', done: false }] })
    const OriginalFileReader = global.FileReader
    global.FileReader = class {
      readAsText() { this.onload({ target: { result: content } }) }
    }
    const fileInput = wrapper.find('.file-input')
    Object.defineProperty(fileInput.element, 'files', { value: [new File([content], 'todos.json')], configurable: true })
    await fileInput.trigger('change')
    await nextTick()
    expect(wrapper.find('.todo-list').text()).toContain('Apples')
    expect(wrapper.find('h1.title').text()).toBe('Shopping')
    global.FileReader = OriginalFileReader
  })

  it('shows an alert and keeps existing todos when import JSON is invalid', async () => {
    await wrapper.find('.add-input').setValue('Keep me')
    await wrapper.find('.add-form').trigger('submit')
    await nextTick()
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const OriginalFileReader = global.FileReader
    global.FileReader = class {
      readAsText() { this.onload({ target: { result: 'not json' } }) }
    }
    const fileInput = wrapper.find('.file-input')
    Object.defineProperty(fileInput.element, 'files', { value: [new File(['not json'], 'bad.json')], configurable: true })
    await fileInput.trigger('change')
    await nextTick()
    expect(alertMock).toHaveBeenCalled()
    expect(wrapper.find('.todo-list').text()).toContain('Keep me')
    global.FileReader = OriginalFileReader
    alertMock.mockRestore()
  })

  it('shows an alert when import JSON has no todos array', async () => {
    const content = JSON.stringify({ name: 'Bad', data: [] })
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const OriginalFileReader = global.FileReader
    global.FileReader = class {
      readAsText() { this.onload({ target: { result: content } }) }
    }
    const fileInput = wrapper.find('.file-input')
    Object.defineProperty(fileInput.element, 'files', { value: [new File([content], 'bad.json')], configurable: true })
    await fileInput.trigger('change')
    await nextTick()
    expect(alertMock).toHaveBeenCalled()
    global.FileReader = OriginalFileReader
    alertMock.mockRestore()
  })
})
