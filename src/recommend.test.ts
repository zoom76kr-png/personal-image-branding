import { describe, expect, it } from 'vitest'
import { suggestProfile, type Observations } from './recommend'

const observed: Observations = {
  skin: { hex: '#D6AA8D', source: 'photo', quality: '사진에서 추출' },
  hair: { hex: '#2B2425', source: 'photo', quality: '사진에서 추출' },
  eyes: { hex: '#49332D', source: 'photo', quality: '사진에서 추출' },
}

describe('recommendations', () => {
  it('uses observed contrast for a clear palette when all parts are available', () => {
    const result = suggestProfile(observed, 'warm', 'auto')
    expect(result.contrast).toBe('높음')
    expect(result.profile).toBe('clear-warm')
  })

  it('allows explicit preferences to override photographic ambiguity', () => {
    const result = suggestProfile(observed, 'cool', 'soft')
    expect(result.profile).toBe('soft-cool')
    expect(result.reasons.some((reason) => reason.includes('직접 선택'))).toBe(true)
  })

  it('keeps a neutral preference in a neutral palette', () => {
    expect(suggestProfile(observed, 'neutral', 'soft').profile).toBe('soft-neutral')
    expect(suggestProfile(observed, 'neutral', 'clear').profile).toBe('clear-neutral')
  })

  it('keeps a missing skin observation provisional', () => {
    const result = suggestProfile({ ...observed, skin: { hex: null, source: 'unavailable', quality: '판단 어려움' } }, 'auto', 'auto')
    expect(result.provisional).toBe(true)
  })
})
