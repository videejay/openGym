import { describe, expect, it } from 'vitest'
import { bodyScaleOn, featureOn, lifeFitnessOn, qrScanOn, workoutScanOn } from './features.js'

describe('instance features', () => {
  it('each is on unless the server says it is off', () => {
    for (const config of [null, {}, { features: {} }]) {
      expect(qrScanOn(config)).toBe(true)
      expect(lifeFitnessOn(config)).toBe(true)
      expect(bodyScaleOn(config)).toBe(true)
    }
    expect(featureOn({ features: { qr: true } }, 'qr')).toBe(true)
    expect(qrScanOn({ features: { qr: false } })).toBe(false)
  })

  it('switch independently', () => {
    const config = { features: { qr: false, bodyScale: false } }
    expect(qrScanOn(config)).toBe(false)
    expect(lifeFitnessOn(config)).toBe(true)
    expect(bodyScaleOn(config)).toBe(false)
  })

  it('the workout scan stays while any of the three is on', () => {
    expect(workoutScanOn({ features: { qr: false, bodyScale: false } })).toBe(true)
    expect(workoutScanOn({ features: { qr: false, lifeFitness: false, bodyScale: false } })).toBe(false)
  })
})
