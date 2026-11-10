// An exercise's machine settings (S.exSettings): short name/value pairs such as "Seat: 5" or
// "Leg position: M", shown as tags beside the exercise's muscle and equipment so the machine is
// set in seconds. They belong to the exercise, like its standing note (S.exNotes), and sync per
// exercise the same way (lib/sync-merge.js PER_KEY, api/sync-stamps.js).
//
// Stored as { [exerciseId]: [{ k, v }, …] } in the order they were entered; an exercise with
// none has no key at all.

export const SETTINGS_MAX = 8
export const KEY_MAX = 24
export const VALUE_MAX = 16

// Offered as names to start from, in English; the sheet shows them translated and saves what it
// shows, so a German profile keeps "Sitz".
export const SUGGESTED_KEYS = ['Seat', 'Backrest', 'Leg position', 'Pad', 'Handles', 'Foot plate']

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max)

/**
 * The pairs worth keeping, in order: both halves trimmed and cut to length, a pair missing either
 * half dropped, a name given twice kept once (its first place, its last value), at most
 * SETTINGS_MAX.
 */
export function cleanSettings(pairs) {
  const out = []
  const at = new Map()
  for (const p of Array.isArray(pairs) ? pairs : []) {
    if (!p || typeof p !== 'object') continue
    const k = text(p.k, KEY_MAX), v = text(p.v, VALUE_MAX)
    if (!k || !v) continue
    const id = k.toLocaleLowerCase()
    if (at.has(id)) { out[at.get(id)] = { k: out[at.get(id)].k, v }; continue }
    if (out.length >= SETTINGS_MAX) continue
    at.set(id, out.length)
    out.push({ k, v })
  }
  return out
}

/** An exercise's settings, cleaned; [] when it has none. */
export function settingsFor(S, exId) {
  const m = isMap(S?.exSettings) ? S.exSettings : {}
  return exId == null ? [] : cleanSettings(m[exId])
}

/** The map with the exercise's settings replaced (a new object); no key left when there are none. */
export function withSettings(map, exId, pairs) {
  const next = isMap(map) ? { ...map } : {}
  const clean = cleanSettings(pairs)
  if (clean.length) next[exId] = clean
  else delete next[exId]
  return next
}

/** "Seat: 5", the way a tag shows it. */
export const settingLabel = p => `${p.k}: ${p.v}`

/**
 * Names already used on other exercises, most used first (ties by name), without the ones listed
 * in `except`: a gym's machines tend to share their dials.
 */
export function knownKeys(S, except = []) {
  const skip = new Set(except.map(k => String(k).toLocaleLowerCase()))
  const count = new Map()
  for (const pairs of Object.values(isMap(S?.exSettings) ? S.exSettings : {})) {
    for (const { k } of cleanSettings(pairs)) {
      const id = k.toLocaleLowerCase()
      if (skip.has(id)) continue
      const c = count.get(id) || { k, n: 0 }
      c.n++
      count.set(id, c)
    }
  }
  return [...count.values()].sort((a, b) => b.n - a.n || a.k.localeCompare(b.k)).map(c => c.k)
}
