import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('simple-todo-items')
    localStorage.removeItem('simple-todo-name')
  })
  await page.reload()
})

// ─── Empty state ────────────────────────────────────────────────────────────

test('shows empty state on first visit', async ({ page }) => {
  await expect(page.locator('.empty-state')).toBeVisible()
  await expect(page.locator('.empty-state')).toContainText('No tasks yet')
  await expect(page.locator('.subtitle')).toContainText('0 remaining')
})

test('add button is disabled when input is empty', async ({ page }) => {
  await expect(page.locator('.add-btn')).toBeDisabled()
})

// ─── Adding todos ────────────────────────────────────────────────────────────

test('adds a todo and shows it in the list', async ({ page }) => {
  await page.fill('.add-input', 'Buy groceries')
  await page.keyboard.press('Enter')
  await expect(page.locator('.todo-list')).toContainText('Buy groceries')
  await expect(page.locator('.empty-state')).not.toBeVisible()
  await expect(page.locator('.subtitle')).toContainText('1 remaining')
})

test('clears input after adding a todo', async ({ page }) => {
  await page.fill('.add-input', 'Task')
  await page.keyboard.press('Enter')
  await expect(page.locator('.add-input')).toHaveValue('')
})

test('does not add a whitespace-only todo', async ({ page }) => {
  await page.fill('.add-input', '   ')
  // Button stays disabled for whitespace-only input — no click needed
  await expect(page.locator('.add-btn')).toBeDisabled()
  await expect(page.locator('.empty-state')).toBeVisible()
})

test('shows correct remaining count for multiple todos', async ({ page }) => {
  await page.fill('.add-input', 'Task 1')
  await page.keyboard.press('Enter')
  await page.fill('.add-input', 'Task 2')
  await page.keyboard.press('Enter')
  await page.fill('.add-input', 'Task 3')
  await page.keyboard.press('Enter')
  await expect(page.locator('.subtitle')).toContainText('3 remaining')
})

// ─── Completing todos ────────────────────────────────────────────────────────

test('marks a todo as done via checkbox', async ({ page }) => {
  await page.fill('.add-input', 'Read a book')
  await page.keyboard.press('Enter')
  await page.locator('.card:not(.card--new)').waitFor()
  await page.locator('.checkbox-wrap').click()
  await expect(page.locator('.card--done')).toBeVisible()
  await expect(page.locator('.subtitle')).toContainText('All done')
})

test('unchecking a done todo decrements remaining count', async ({ page }) => {
  await page.fill('.add-input', 'Task')
  await page.keyboard.press('Enter')
  await page.locator('.card:not(.card--new)').waitFor()
  await page.locator('.checkbox-wrap').click()
  await expect(page.locator('.subtitle')).toContainText('All done')
  await page.locator('.checkbox-wrap').click()
  await expect(page.locator('.subtitle')).toContainText('1 remaining')
})

// ─── Deleting todos ──────────────────────────────────────────────────────────

test('deletes a todo via the delete button', async ({ page }) => {
  await page.fill('.add-input', 'Delete me')
  await page.keyboard.press('Enter')
  await page.locator('.card:not(.card--new)').waitFor()
  await page.hover('.card')
  await page.locator('.delete-btn').click()
  await expect(page.locator('.empty-state')).toBeVisible()
})

// ─── Editing todos ───────────────────────────────────────────────────────────

test('edits todo text inline and saves on Enter', async ({ page }) => {
  await page.fill('.add-input', 'Original text')
  await page.keyboard.press('Enter')
  await page.locator('.card:not(.card--new)').waitFor()
  await page.locator('.todo-text').click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('Edited text')
  await page.keyboard.press('Enter')
  await expect(page.locator('.todo-list')).toContainText('Edited text')
  await expect(page.locator('.todo-list')).not.toContainText('Original text')
})

test('cancels todo edit on Escape and restores original text', async ({ page }) => {
  await page.fill('.add-input', 'Keep this')
  await page.keyboard.press('Enter')
  await page.locator('.card:not(.card--new)').waitFor()
  await page.locator('.todo-text').click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('Discard me')
  await page.keyboard.press('Escape')
  await expect(page.locator('.todo-list')).toContainText('Keep this')
  await expect(page.locator('.todo-list')).not.toContainText('Discard me')
})

// ─── List name editing ───────────────────────────────────────────────────────

test('renames the list by clicking the title', async ({ page }) => {
  await page.click('h1.title')
  await page.fill('.title-input', 'Work Tasks')
  await page.keyboard.press('Enter')
  await expect(page.locator('h1.title')).toContainText('Work Tasks')
})

test('cancels list rename on Escape', async ({ page }) => {
  await page.click('h1.title')
  await page.fill('.title-input', 'Discard me')
  await page.keyboard.press('Escape')
  await expect(page.locator('h1.title')).toContainText('Todo')
})

// ─── Danger actions ──────────────────────────────────────────────────────────

test('reset requires double-click confirmation', async ({ page }) => {
  await page.fill('.add-input', 'Important task')
  await page.keyboard.press('Enter')
  await page.locator('.card:not(.card--new)').waitFor()
  await page.hover('header')
  const resetBtn = page.locator('[data-action="reset"]')
  await resetBtn.click()
  // After first click the todo is still there
  await expect(page.locator('.todo-list')).toContainText('Important task')
  // Second click confirms and wipes everything
  await resetBtn.click()
  await expect(page.locator('.empty-state')).toBeVisible()
  await expect(page.locator('h1.title')).toContainText('Todo')
})

test('pending confirmation is cancelled by Escape', async ({ page }) => {
  await page.fill('.add-input', 'Task')
  await page.keyboard.press('Enter')
  await page.locator('.card:not(.card--new)').waitFor()
  await page.hover('header')
  await page.locator('[data-action="reset"]').click()
  await expect(page.locator('[data-action="reset"]')).toHaveClass(/reset-btn--confirm/)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-action="reset"]')).not.toHaveClass(/reset-btn--confirm/)
})

test('clear done removes completed todos', async ({ page }) => {
  await page.fill('.add-input', 'Active task')
  await page.keyboard.press('Enter')
  await page.fill('.add-input', 'Done task')
  await page.keyboard.press('Enter')
  // "Done task" is at the top (unshift)
  await page.locator('.card:not(.card--new)').first().waitFor()
  await page.locator('.checkbox-wrap').first().click()
  await page.hover('header')
  const clearDoneBtn = page.locator('[data-action="clearDone"]')
  await clearDoneBtn.click()
  await clearDoneBtn.click()
  await expect(page.locator('.todo-list')).not.toContainText('Done task')
  await expect(page.locator('.todo-list')).toContainText('Active task')
})

// ─── Persistence ─────────────────────────────────────────────────────────────

test('persists todos across page reloads', async ({ page }) => {
  await page.fill('.add-input', 'Persisted task')
  await page.keyboard.press('Enter')
  await page.reload()
  await expect(page.locator('.todo-list')).toContainText('Persisted task')
})

test('persists list name across page reloads', async ({ page }) => {
  await page.click('h1.title')
  await page.fill('.title-input', 'My List')
  await page.keyboard.press('Enter')
  await page.reload()
  await expect(page.locator('h1.title')).toContainText('My List')
})

// ─── Export ──────────────────────────────────────────────────────────────────

test('export button triggers a JSON file download', async ({ page }) => {
  await page.fill('.add-input', 'Exported task')
  await page.keyboard.press('Enter')
  await page.hover('header')
  const downloadPromise = page.waitForEvent('download')
  await page.locator('[title="Export tasks to JSON"]').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.json$/)
})
