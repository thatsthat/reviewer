import { describe, expect, it, vi } from 'vitest'
import type { App as AppleApp } from '@perttu/app-store-scraper'

vi.mock('#/db', () => ({ prisma: {} }))

const { toAppleRow } = await import('./apple.server')

function buildDetails(overrides: Partial<AppleApp> = {}): AppleApp {
  return {
    id: 123456789,
    appId: 'com.example.app',
    title: 'Example App',
    url: 'https://apps.apple.com/us/app/example-app/id123456789',
    description: 'An example app.',
    icon: 'https://example.com/icon.png',
    genres: ['Utilities'],
    genreIds: ['6002'],
    primaryGenre: 'Utilities',
    primaryGenreId: '6002',
    contentRating: '4+',
    languages: ['EN'],
    size: '12345678',
    requiredOsVersion: '14.0',
    released: '2020-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    releaseNotes: 'Bug fixes.',
    version: '1.0.0',
    price: 0,
    currency: 'USD',
    free: true,
    developerId: 987654321,
    developer: 'Example Dev',
    developerUrl: 'https://apps.apple.com/developer/example-dev/id987654321',
    score: 4.5,
    reviews: 100,
    currentVersionScore: 4.5,
    currentVersionReviews: 100,
    screenshots: [],
    ipadScreenshots: [],
    appletvScreenshots: [],
    supportedDevices: [],
    ...overrides,
  } as AppleApp
}

describe('toAppleRow', () => {
  it('maps known scraper fields onto the row shape', () => {
    const details = buildDetails()

    const before = Date.now()
    const row = toAppleRow(details)
    const after = Date.now()

    expect(row.title).toBe('Example App')
    expect(row.description).toBe('An example app.')
    expect(row.url).toBe('https://apps.apple.com/us/app/example-app/id123456789')
    expect(row.iconUrl).toBe('https://example.com/icon.png')
    expect(row.scrapedAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(row.scrapedAt.getTime()).toBeLessThanOrEqual(after)
  })

  it('rejects scraper payloads that are not JSON-serializable instead of storing them blindly', () => {
    const circular: Record<string, unknown> = { note: 'corrupted payload' }
    circular.self = circular

    const details = buildDetails({ developerUrl: circular as unknown as string })

    expect(() => toAppleRow(details)).toThrow()
  })
})
