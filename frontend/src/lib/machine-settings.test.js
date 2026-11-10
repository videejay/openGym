import { describe, expect, it } from 'vitest'
import { cleanSettings, settingsFor, withSettings, settingLabel, knownKeys, SETTINGS_MAX, KEY_MAX, VALUE_MAX } from './machine-settings.js'

describe('cleanSettings', () => {
  it('trims both halves and drops a pair missing either', () => {
    expect(cleanSettings([{ k: '  Seat ', v: ' 5 ' }, { k: 'Pad', v: '' }, { k: '', v: '3' }, null, 'x', { k: 'Leg  position', v: 'M' }]))
      .toEqual([{ k: 'Seat', v: '5' }, { k: 'Leg position', v: 'M' }])
  })

  it('keeps a name given twice once, in its first place with its last value', () => {
    expect(cleanSettings([{ k: 'Seat', v: '5' }, { k: 'Pad', v: '2' }, { k: 'seat', v: '6' }]))
      .toEqual([{ k: 'Seat', v: '6' }, { k: 'Pad', v: '2' }])
  })

  it('cuts names and values to length, and keeps at most the maximum', () => {
    const [p] = cleanSettings([{ k: 'x'.repeat(40), v: 'y'.repeat(40) }])
    expect(p.k).toHaveLength(KEY_MAX)
    expect(p.v).toHaveLength(VALUE_MAX)
    const many = Array.from({ length: 12 }, (_, i) => ({ k: 'K' + i, v: String(i) }))
    expect(cleanSettings(many)).toHaveLength(SETTINGS_MAX)
  })

  it('takes numbers as text', () => {
    expect(cleanSettings([{ k: 'Seat', v: 5 }])).toEqual([{ k: 'Seat', v: '5' }])
  })

  it('reads anything that is not a list as none', () => {
    expect(cleanSettings(undefined)).toEqual([])
    expect(cleanSettings({ k: 'Seat', v: '5' })).toEqual([])
  })
})

describe('settingsFor / withSettings', () => {
  it('reads one exercise, none for another or without the map', () => {
    const S = { exSettings: { '0025': [{ k: 'Seat', v: '5' }] } }
    expect(settingsFor(S, '0025')).toEqual([{ k: 'Seat', v: '5' }])
    expect(settingsFor(S, '0043')).toEqual([])
    expect(settingsFor({}, '0025')).toEqual([])
  })

  it('writes a new map, and leaves no key for an exercise with none', () => {
    const before = { '0025': [{ k: 'Seat', v: '5' }] }
    const next = withSettings(before, '0043', [{ k: 'Pad', v: '3' }, { k: 'Seat', v: '' }])
    expect(next).toEqual({ '0025': [{ k: 'Seat', v: '5' }], '0043': [{ k: 'Pad', v: '3' }] })
    expect(before).toEqual({ '0025': [{ k: 'Seat', v: '5' }] })
    expect(withSettings(next, '0025', [])).toEqual({ '0043': [{ k: 'Pad', v: '3' }] })
    expect(withSettings(undefined, '0025', [{ k: 'Seat', v: '5' }])).toEqual({ '0025': [{ k: 'Seat', v: '5' }] })
  })
})

describe('settingLabel / knownKeys', () => {
  it('labels a pair as a tag shows it', () => {
    expect(settingLabel({ k: 'Seat', v: '5' })).toBe('Seat: 5')
  })

  it('lists the names used elsewhere, most used first, without the given ones', () => {
    const S = { exSettings: {
      a: [{ k: 'Seat', v: '5' }, { k: 'Pad', v: '2' }],
      b: [{ k: 'seat', v: '3' }, { k: 'Backrest', v: '1' }],
      c: [{ k: 'Seat', v: '4' }, { k: 'Pad', v: '1' }],
    } }
    expect(knownKeys(S)).toEqual(['Seat', 'Pad', 'Backrest'])
    expect(knownKeys(S, ['SEAT'])).toEqual(['Pad', 'Backrest'])
    expect(knownKeys({})).toEqual([])
  })
})
