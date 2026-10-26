// @vitest-environment happy-dom
// The import summary's overwrite switch: off by default, says how many entries go when on, and
// Import asks once more before anything is replaced. Cancelling that question changes nothing.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { importFromApp } from './sheets.jsx'

const roots = new Map()
function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  if (roots.has(sheet.id)) return roots.get(sheet.id).host
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  roots.set(sheet.id, { root, host })
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}
const button = (host, text) => [...host.querySelectorAll('button')].find(b => b.textContent === text)

const CSV = [
  'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
  '2026-09-01 18:00:00,Push,1h,Bench Press (Barbell),1,80,5,0,0,,,',
  '2026-09-02 18:00:00,Push,1h,Bench Press (Barbell),1,82,5,0,0,,,',
].join('\n')

async function openSummary() {
  importFromApp(new File([CSV], 'strong.csv', { type: 'text/csv' }))
  for (let i = 0; i < 50 && !useUI.getState().sheets.length; i++) await new Promise(r => setTimeout(r, 10))
  return renderTop()
}

describe('import summary: overwrite days already here', () => {
  let original
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    original = useStore.getState().S
    useUI.setState({ sheets: [] })
    document.body.innerHTML = ''
    useStore.setState({ S: { ...original, unit: 'kg', workouts: [{ id: 'mine', d: '2026-09-01', name: 'Mine', start: 1, end: 2, entries: [] }] } })
  })
  afterEach(() => {
    act(() => { for (const { root } of roots.values()) root.unmount() })
    roots.clear()
    useStore.setState({ S: original })
  })

  it('off by default: the day already here keeps its workout', async () => {
    const host = await openSummary()
    expect(host.querySelector('[role="switch"]').getAttribute('aria-checked')).toBe('false')
    act(() => button(host, 'Import').click())
    const ws = useStore.getState().S.workouts
    expect(ws.map(w => w.d)).toEqual(['2026-09-01', '2026-09-02'])
    expect(ws[0].id).toBe('mine')
  })

  it('on: shows the count, asks, and replaces only after the confirmation', async () => {
    const host = await openSummary()
    act(() => host.querySelector('[role="switch"]').click())
    expect(host.textContent).toContain('1 entry already here will be replaced')
    act(() => button(host, 'Import').click())
    // nothing written yet: the question is open
    expect(useStore.getState().S.workouts.map(w => w.id)).toEqual(['mine'])
    const dialog = renderTop()
    expect(dialog.textContent).toContain('1 entry already here will be deleted')
    act(() => button(dialog, 'Replace').click())
    const ws = useStore.getState().S.workouts
    expect(ws.map(w => w.d)).toEqual(['2026-09-01', '2026-09-02'])
    expect(ws[0].id).not.toBe('mine')
  })

  it('cancelling the question changes nothing', async () => {
    const host = await openSummary()
    act(() => host.querySelector('[role="switch"]').click())
    act(() => button(host, 'Import').click())
    const dialog = renderTop()
    act(() => button(dialog, 'Cancel').click())
    expect(useStore.getState().S.workouts.map(w => w.id)).toEqual(['mine'])
  })
})
