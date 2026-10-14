import { describe, expect, it, vi } from 'vitest'
import type { App as GooglePlayApp } from '@mradex77/google-play-scraper'

vi.mock('#/db', () => ({ prisma: {} }))

const { toGoogleRow } = await import('./google.server')

function buildDetails(overrides: Partial<GooglePlayApp> = {}): GooglePlayApp {
  return {
    title: 'Example App',
    description: 'An example app.',
    descriptionHTML: '<p>An example app.</p>',
    histogram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 10 },
    price: 0,
    free: true,
    priceText: 'Free',
    available: true,
    androidVersion: 'VARY',
    androidVersionText: 'Varies with device',
    androidMaxVersion: 'VARY',
    developer: 'Example Dev',
    developerId: 'example-dev',
    developerInternalID: '123',
    genre: 'Tools',
    genreId: 'TOOLS',
    categories: [{ name: 'Tools', id: 'TOOLS' }],
    icon: 'https://example.com/icon.png',
    screenshots: [],
    adSupported: false,
    updated: 1700000000,
    version: '1.0.0',
    comments: [],
    preregister: false,
    earlyAccessEnabled: false,
    isAvailableInPlayPass: false,
    appId: 'com.example.app',
    url: 'https://play.google.com/store/apps/details?id=com.example.app',
    ...overrides,
  } as GooglePlayApp
}

describe('toGoogleRow', () => {
  it('maps known scraper fields onto the row shape', () => {
    const details = buildDetails()

    const before = Date.now()
    const row = toGoogleRow(details)
    const after = Date.now()

    expect(row.title).toBe('Example App')
    expect(row.description).toBe('An example app.')
    expect(row.url).toBe('https://play.google.com/store/apps/details?id=com.example.app')
    expect(row.iconUrl).toBe('https://example.com/icon.png')
    expect(row.scrapedAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(row.scrapedAt.getTime()).toBeLessThanOrEqual(after)
  })

  it('rejects scraper payloads that are not JSON-serializable instead of storing them blindly', () => {
    const circular: Record<string, unknown> = { note: 'corrupted payload' }
    circular.self = circular

    const details = buildDetails({ developerAddress: circular as unknown as string })

    expect(() => toGoogleRow(details)).toThrow()
  })
})
