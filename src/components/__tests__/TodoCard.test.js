import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import TodoCard from '../TodoCard.vue'

const makeTodo = (overrides = {}) => ({ id: 1, text: 'Test task', done: false, ...overrides })

describe('TodoCard', () => {
  it('renders todo text via onMounted', async () => {
    const wrapper = mount(TodoCard, { props: { todo: makeTodo({ text: 'Buy milk' }) } })
    await nextTick()
    expect(wrapper.find('.todo-text').element.textContent).toBe('Buy milk')
  })

  it('applies card--done class when done is true', () => {
    const wrapper = mount(TodoCard, { props: { todo: makeTodo({ done: true }) } })
    expect(wrapper.find('.card').classes()).toContain('card--done')
  })

  it('does not apply card--done class when done is false', () => {
    const wrapper = mount(TodoCard, { props: { todo: makeTodo() } })
    expect(wrapper.find('.card').classes()).not.toContain('card--done')
  })

  it('applies card--removing class when removing prop is true', () => {
    const wrapper = mount(TodoCard, { props: { todo: makeTodo(), removing: true } })
    expect(wrapper.find('.card').classes()).toContain('card--removing')
  })

  it('does not apply card--removing by default', () => {
    const wrapper = mount(TodoCard, { props: { todo: makeTodo() } })
    expect(wrapper.find('.card').classes()).not.toContain('card--removing')
  })

  it('emits remove when delete button is clicked', async () => {
    const wrapper = mount(TodoCard, { props: { todo: makeTodo() } })
    await wrapper.find('.delete-btn').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('toggles done state via checkbox', async () => {
    const todo = makeTodo()
    const wrapper = mount(TodoCard, { props: { todo } })
    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(todo.done).toBe(true)
  })

  it('shows checkmark SVG when done', () => {
    const wrapper = mount(TodoCard, { props: { todo: makeTodo({ done: true }) } })
    expect(wrapper.find('.check-icon').exists()).toBe(true)
  })

  it('hides checkmark SVG when not done', () => {
    const wrapper = mount(TodoCard, { props: { todo: makeTodo({ done: false }) } })
    expect(wrapper.find('.check-icon').exists()).toBe(false)
  })

  it('saves edited text on blur', async () => {
    const todo = makeTodo({ text: 'Original' })
    const wrapper = mount(TodoCard, { props: { todo } })
    await nextTick()
    const textEl = wrapper.find('.todo-text')
    await textEl.trigger('focus')
    textEl.element.textContent = 'Updated'
    await textEl.trigger('blur')
    expect(todo.text).toBe('Updated')
  })

  it('trims whitespace when saving on blur', async () => {
    const todo = makeTodo({ text: 'Original' })
    const wrapper = mount(TodoCard, { props: { todo } })
    await nextTick()
    const textEl = wrapper.find('.todo-text')
    await textEl.trigger('focus')
    textEl.element.textContent = '  Trimmed  '
    await textEl.trigger('blur')
    expect(todo.text).toBe('Trimmed')
  })

  it('does not save empty text on blur', async () => {
    const todo = makeTodo({ text: 'Original' })
    const wrapper = mount(TodoCard, { props: { todo } })
    await nextTick()
    const textEl = wrapper.find('.todo-text')
    await textEl.trigger('focus')
    textEl.element.textContent = '   '
    await textEl.trigger('blur')
    expect(todo.text).toBe('Original')
    expect(textEl.element.textContent).toBe('Original')
  })

  it('restores original text on Escape', async () => {
    const todo = makeTodo({ text: 'Original' })
    const wrapper = mount(TodoCard, { props: { todo } })
    await nextTick()
    const textEl = wrapper.find('.todo-text')
    await textEl.trigger('focus')
    textEl.element.textContent = 'Changed'
    await textEl.trigger('keydown', { key: 'Escape' })
    expect(textEl.element.textContent).toBe('Original')
    expect(todo.text).toBe('Original')
  })

  it('adds todo-text--editing class while focused', async () => {
    const wrapper = mount(TodoCard, { props: { todo: makeTodo() } })
    const textEl = wrapper.find('.todo-text')
    await textEl.trigger('focus')
    expect(textEl.classes()).toContain('todo-text--editing')
    await textEl.trigger('blur')
    expect(textEl.classes()).not.toContain('todo-text--editing')
  })

  it('has card--new class initially then removes it', async () => {
    vi.useFakeTimers()
    const wrapper = mount(TodoCard, { props: { todo: makeTodo() } })
    expect(wrapper.find('.card').classes()).toContain('card--new')
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(wrapper.find('.card').classes()).not.toContain('card--new')
    vi.useRealTimers()
  })

  it('does not update textContent when watch fires during editing', async () => {
    const todo = makeTodo({ text: 'Initial' })
    const wrapper = mount(TodoCard, { props: { todo } })
    await nextTick()
    const textEl = wrapper.find('.todo-text')
    await textEl.trigger('focus')
    // Simulate parent changing text while editing — should not overwrite contenteditable
    todo.text = 'Parent changed'
    await nextTick()
    // textContent should remain what the user typed (empty/whatever), not the new prop value
    expect(textEl.element.textContent).not.toBe('Parent changed')
  })
})
