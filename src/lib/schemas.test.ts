import { describe, expect, it } from 'vitest'
import {
  createLabelSchema,
  labelNameKey,
  normalizeLabelName,
} from './schemas'

describe('label names', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeLabelName('  Kids   games ')).toBe('Kids games')
    expect(createLabelSchema.parse({ appId: 1, name: '  Kids   games ' }).name).toBe('Kids games')
  })

  it('keys names case-insensitively', () => {
    expect(labelNameKey('Kids')).toBe(labelNameKey(' kids '))
  })

  it('rejects a name of only spaces', () => {
    expect(createLabelSchema.safeParse({ appId: 1, name: '   ' }).success).toBe(false)
  })

  it('rejects 51 characters with the limit message and accepts 50', () => {
    const tooLong = createLabelSchema.safeParse({ appId: 1, name: 'a'.repeat(51) })
    expect(tooLong.success).toBe(false)
    expect(tooLong.error?.issues[0].message).toBe('Label names can be at most 50 characters.')
    expect(createLabelSchema.safeParse({ appId: 1, name: 'a'.repeat(50) }).success).toBe(true)
  })
})
