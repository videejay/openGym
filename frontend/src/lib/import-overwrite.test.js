/* Overwriting days already in the history with the file's: all shared days or none, counted
   beforehand (importOverlap) so the sheet can say what goes before anything does. */
import { describe, expect, it } from 'vitest'
import { importOverlap, mergeImport, parseBodyweight, parseWorkoutCSV } from './import-csv.js'

const base = () => ({ _ts: 1, workouts: [], customEx: [], bodyweight: [], exWeights: {}, routines: [] })

const CSV = rows => [
  'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
  ...rows.map(([day, w]) => `${day} 18:00:00,Push,1h,Bench Press (Barbell),1,${w},5,0,0,,,`),
].join('\n')

const mine = (id, d) => ({ id, d, name: 'Mine', start: 1, end: 2, entries: [] })

describe('importOverlap', () => {
  it('counts the shared days, the entries on them and what replaces them', () => {
    const S = base()
    S.workouts = [mine('a', '2026-09-01'), mine('b', '2026-09-01'), mine('c', '2026-09-03')]
    const parsed = parseWorkoutCSV(CSV([['2026-09-01', 80], ['2026-09-02', 82]]), { unit: 'kg' })
    expect(importOverlap(S, parsed)).toEqual({ days: 1, replaced: 2, incoming: 1 })
  })

  it('nothing shared, nothing to replace', () => {
    const parsed = parseWorkoutCSV(CSV([['2026-09-02', 80]]), { unit: 'kg' })
    expect(importOverlap(base(), parsed)).toEqual({ days: 0, replaced: 0, incoming: 0 })
  })

  it('weigh-ins are counted by day too', () => {
    const S = base()
    S.bodyweight = [{ d: '2026-09-01', w: 70, t: 1 }]
    const parsed = parseBodyweight('Date,Weight\n2026-09-01,71\n2026-09-02,72', { unit: 'kg' })
    expect(importOverlap(S, parsed)).toEqual({ days: 1, replaced: 1, incoming: 1 })
  })
})

describe('mergeImport with overwrite', () => {
  it('without it, a day already here keeps what it has', () => {
    const S = base()
    S.workouts = [mine('a', '2026-09-01')]
    const res = mergeImport(S, parseWorkoutCSV(CSV([['2026-09-01', 80], ['2026-09-02', 82]]), { unit: 'kg' }))
    expect(res).toEqual({ added: 1, skipped: 1 })
    expect(S.workouts.find(w => w.d === '2026-09-01').id).toBe('a')
  })

  it('replaces every workout on a shared day with the file’s, and leaves other days alone', () => {
    const S = base()
    S.workouts = [mine('a', '2026-09-01'), mine('b', '2026-09-01'), mine('c', '2026-09-03')]
    const res = mergeImport(S, parseWorkoutCSV(CSV([['2026-09-01', 80], ['2026-09-02', 82]]), { unit: 'kg' }), { overwrite: true, now: 5000 })
    expect(res).toEqual({ added: 2, skipped: 0, replaced: 2 })
    expect(S.workouts.map(w => w.d)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
    const day1 = S.workouts.find(w => w.d === '2026-09-01')
    expect(day1.id).not.toBe('a')
    expect(day1.entries[0].sets[0].w).toBe(80)
    // stamped now, so an older copy on another device loses the sync
    expect(day1._ts).toBe(5000)
    expect(S.workouts.find(w => w.d === '2026-09-02')._ts).toBeUndefined()
    expect(S.workouts.find(w => w.d === '2026-09-03').id).toBe('c')
  })

  it('a weigh-in on a shared day takes the file’s weight, stamped now', () => {
    const S = base()
    S.bodyweight = [{ d: '2026-09-01', w: 70, t: 1 }, { d: '2026-09-05', w: 69, t: 2 }]
    const parsed = parseBodyweight('Date,Weight\n2026-09-01,71\n2026-09-02,72', { unit: 'kg' })
    const res = mergeImport(S, parsed, { overwrite: true, now: 5000 })
    expect(res).toEqual({ added: 2, skipped: 0, replaced: 1 })
    expect(S.bodyweight.map(b => [b.d, b.w])).toEqual([['2026-09-01', 71], ['2026-09-02', 72], ['2026-09-05', 69]])
    expect(S.bodyweight[0].t).toBe(5000)
  })

  it('the same file twice with overwrite still leaves one workout per day', () => {
    const S = base()
    const csv = CSV([['2026-09-01', 80]])
    mergeImport(S, parseWorkoutCSV(csv, { unit: 'kg' }), { overwrite: true })
    mergeImport(S, parseWorkoutCSV(csv, { unit: 'kg' }), { overwrite: true })
    expect(S.workouts).toHaveLength(1)
  })
})
