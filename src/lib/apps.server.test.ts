import { describe, expect, it, vi } from 'vitest'

const prisma = {
  app: { findUnique: vi.fn() },
  appsAppleLink: { findMany: vi.fn() },
  appsGoogleLink: { findMany: vi.fn() },
}

vi.mock('#/db', () => ({ prisma }))

const { compareAppRelations, loadAppDetail } = await import('./apps.server')
type AppRelation = import('./apps.server').AppRelation

function relation(overrides: Partial<AppRelation>): AppRelation {
  return {
    store: 'google',
    storeAppId: 'id',
    name: 'Name',
    url: 'https://example.com',
    ...overrides,
  }
}

describe('compareAppRelations', () => {
  it('puts Google listings before Apple listings regardless of title', () => {
    const apple = relation({ store: 'apple', storeAppId: '1', name: 'Alpha' })
    const google = relation({ store: 'google', storeAppId: 'a', name: 'Zeta' })

    expect([apple, google].sort(compareAppRelations)).toEqual([google, apple])
  })

  it('orders by title within a store', () => {
    const b = relation({ store: 'apple', storeAppId: '1', name: 'Bravo' })
    const a = relation({ store: 'apple', storeAppId: '2', name: 'Alpha' })

    expect([b, a].sort(compareAppRelations)).toEqual([a, b])
  })

  it('breaks title ties by store app id', () => {
    const second = relation({ storeAppId: 'com.example.b', name: 'Same' })
    const first = relation({ storeAppId: 'com.example.a', name: 'Same' })

    expect([second, first].sort(compareAppRelations)).toEqual([first, second])
  })
})

describe('loadAppDetail', () => {
  it('returns relations sorted with Google first, using the url column', async () => {
    prisma.app.findUnique.mockResolvedValue({ id: 1, title: 'Group' })
    prisma.appsAppleLink.findMany.mockResolvedValue([
      { appleAppId: '42', apple: { title: 'Alpha', url: 'https://apps.apple.com/app/id42' } },
    ])
    prisma.appsGoogleLink.findMany.mockResolvedValue([
      { googleAppId: 'com.z', google: { title: 'Zeta', url: 'https://play.google.com/z' } },
    ])

    const result = await loadAppDetail(1)

    expect(result.app).toEqual({ id: 1, title: 'Group' })
    expect(result.relations).toEqual([
      { store: 'google', storeAppId: 'com.z', name: 'Zeta', url: 'https://play.google.com/z' },
      { store: 'apple', storeAppId: '42', name: 'Alpha', url: 'https://apps.apple.com/app/id42' },
    ])
    expect(prisma.appsAppleLink.findMany.mock.calls[0][0].select.apple.select).toEqual({
      title: true,
      url: true,
    })
  })
})
