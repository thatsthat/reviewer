import { beforeEach, describe, expect, it, vi } from 'vitest'

const tx = {
  app: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    delete: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  appLabel: { findMany: vi.fn(), createMany: vi.fn() },
  appsAppleLink: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
  },
  appsGoogleLink: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
  },
}

const prisma = {
  app: { findUnique: vi.fn(), update: vi.fn() },
  appLabel: { findMany: vi.fn() },
  label: { findMany: vi.fn() },
  appsAppleLink: { findMany: vi.fn() },
  appsGoogleLink: { findMany: vi.fn() },
  google: { findUnique: vi.fn() },
  apple: { findUnique: vi.fn() },
  $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
}

vi.mock('#/db', () => ({ prisma }))

const {
  compareAppRelations,
  pickDefaultPrimary,
  loadAppDetail,
  setPrimaryListing,
  splitAppFromGroup,
  mergeAppGroups,
  ensureGoogleAppLink,
  ensureAppleAppLink,
} = await import('./apps.server')
type AppRelation = import('./apps.server').AppRelation

function relation(overrides: Partial<AppRelation>): AppRelation {
  return {
    store: 'google',
    storeAppId: 'id',
    name: 'Name',
    url: 'https://example.com',
    isPrimary: false,
    ...overrides,
  }
}

function mockLinks(
  client: { appsAppleLink: { findMany: any }; appsGoogleLink: { findMany: any } },
  apple: Array<[string, string]>,
  google: Array<[string, string]>,
) {
  client.appsAppleLink.findMany.mockResolvedValue(
    apple.map(([id, title]) => ({ appleAppId: id, apple: { title, url: `https://apple/${id}` } })),
  )
  client.appsGoogleLink.findMany.mockResolvedValue(
    google.map(([id, title]) => ({ googleAppId: id, google: { title, url: `https://google/${id}` } })),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.appLabel.findMany.mockResolvedValue([])
  prisma.label.findMany.mockResolvedValue([])
  tx.appLabel.findMany.mockResolvedValue([])
})

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

describe('pickDefaultPrimary', () => {
  it('prefers Google over Apple', () => {
    const apple = relation({ store: 'apple', storeAppId: '1', name: 'Alpha' })
    const google = relation({ store: 'google', storeAppId: 'z', name: 'Zeta' })
    expect(pickDefaultPrimary([apple, google])).toBe(google)
  })

  it('picks "Foo" over "Foo Pro" within a store', () => {
    const pro = relation({ storeAppId: 'a', name: 'Foo Pro' })
    const foo = relation({ storeAppId: 'b', name: 'Foo' })
    expect(pickDefaultPrimary([pro, foo])).toBe(foo)
  })

  it('returns null for an empty list', () => {
    expect(pickDefaultPrimary([])).toBeNull()
  })
})

describe('loadAppDetail', () => {
  function setup(primaryStore: string, primaryStoreAppId: string) {
    prisma.app.findUnique.mockResolvedValue({
      id: 1,
      title: 'Group',
      primaryStore,
      primaryStoreAppId,
    })
    mockLinks(prisma, [['42', 'Alpha']], [['com.z', 'Zeta']])
    prisma.google.findUnique.mockResolvedValue({
      title: 'Zeta',
      iconUrl: 'z.png',
      description: 'Z desc',
      updatedAt: new Date('2026-11-12'),
    })
    prisma.apple.findUnique.mockResolvedValue({
      title: 'Alpha',
      iconUrl: null,
      description: null,
      updatedAt: null,
    })
  }

  it('returns sorted relations using the url column, with the saved main listing marked', async () => {
    setup('apple', '42')

    const result = await loadAppDetail(1)

    expect(result.app).toEqual({ id: 1, title: 'Group' })
    expect(result.relations).toEqual([
      { store: 'google', storeAppId: 'com.z', name: 'Zeta', url: 'https://google/com.z', isPrimary: false },
      { store: 'apple', storeAppId: '42', name: 'Alpha', url: 'https://apple/42', isPrimary: true },
    ])
    expect(result.primary).toEqual({
      store: 'apple',
      storeAppId: '42',
      title: 'Alpha',
      iconUrl: null,
      description: null,
      updatedAt: null,
    })
    expect(prisma.appsAppleLink.findMany.mock.calls[0][0].select.apple.select).toEqual({
      title: true,
      url: true,
    })
  })

  it('falls back to the default without writing when the saved pair matches nothing', async () => {
    setup('google', 'gone')

    const result = await loadAppDetail(1)

    expect(result.relations.filter((r) => r.isPrimary).map((r) => r.storeAppId)).toEqual(['com.z'])
    expect(result.primary?.storeAppId).toBe('com.z')
    expect(prisma.app.update).not.toHaveBeenCalled()
    expect(tx.app.update).not.toHaveBeenCalled()
  })

  it('returns a null primary for an app with no relations', async () => {
    prisma.app.findUnique.mockResolvedValue({
      id: 1,
      title: 'Empty',
      primaryStore: 'google',
      primaryStoreAppId: 'x',
    })
    mockLinks(prisma, [], [])

    const result = await loadAppDetail(1)

    expect(result.relations).toEqual([])
    expect(result.primary).toBeNull()
  })
})

describe('loadAppDetail labels', () => {
  it('returns the group labels sorted by name and every label including unused ones', async () => {
    prisma.app.findUnique.mockResolvedValue({
      id: 1,
      title: 'Group',
      primaryStore: 'google',
      primaryStoreAppId: 'x',
    })
    mockLinks(prisma, [], [])
    prisma.appLabel.findMany.mockResolvedValue([
      { label: { id: 1, name: 'Kids' } },
      { label: { id: 2, name: 'Education' } },
    ])
    prisma.label.findMany.mockResolvedValue([
      { id: 3, name: 'Puzzle' },
      { id: 1, name: 'Kids' },
      { id: 2, name: 'Education' },
    ])

    const result = await loadAppDetail(1)

    expect(result.labels).toEqual([
      { id: 2, name: 'Education' },
      { id: 1, name: 'Kids' },
    ])
    expect(result.allLabels.map((l) => l.name)).toEqual(['Education', 'Kids', 'Puzzle'])
  })
})

describe('setPrimaryListing', () => {
  it('saves a listing linked to the app', async () => {
    mockLinks(tx, [['42', 'Alpha']], [['com.z', 'Zeta']])

    await setPrimaryListing(1, 'apple', '42')

    expect(tx.app.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ primaryStore: 'apple', primaryStoreAppId: '42' }),
    })
  })

  it('rejects a listing not linked to the app and writes nothing', async () => {
    mockLinks(tx, [['42', 'Alpha']], [])

    await expect(setPrimaryListing(1, 'google', 'other')).rejects.toThrow(/not linked/)
    expect(tx.app.update).not.toHaveBeenCalled()
  })
})

describe('creating apps', () => {
  it('imports a Google listing as its new app\'s main listing', async () => {
    tx.appsGoogleLink.findUnique.mockResolvedValue(null)
    tx.app.create.mockResolvedValue({ id: 7 })

    await ensureGoogleAppLink(tx as never, 'com.z', 'Zeta')

    expect(tx.app.create).toHaveBeenCalledWith({
      data: { title: 'Zeta', primaryStore: 'google', primaryStoreAppId: 'com.z' },
    })
  })

  it('imports an Apple listing as its new app\'s main listing', async () => {
    tx.appsAppleLink.findUnique.mockResolvedValue(null)
    tx.app.create.mockResolvedValue({ id: 8 })

    await ensureAppleAppLink(tx as never, '42', 'Alpha')

    expect(tx.app.create).toHaveBeenCalledWith({
      data: { title: 'Alpha', primaryStore: 'apple', primaryStoreAppId: '42' },
    })
  })
})

describe('splitAppFromGroup', () => {
  function setupSplit(primary: { primaryStore: string; primaryStoreAppId: string }) {
    tx.appsAppleLink.findUniqueOrThrow.mockResolvedValue({
      appleAppId: '42',
      appId: 1,
      apple: { title: 'Alpha' },
    })
    tx.app.findUniqueOrThrow.mockResolvedValue(primary)
    tx.app.create.mockResolvedValue({ id: 2 })
    tx.appsAppleLink.findFirst.mockResolvedValue(null)
    tx.appsGoogleLink.findFirst.mockResolvedValue({ google: { title: 'Zeta' } })
  }

  it('rejects unmerging the main listing and changes nothing', async () => {
    setupSplit({ primaryStore: 'apple', primaryStoreAppId: '42' })

    await expect(splitAppFromGroup('apple', '42')).rejects.toThrow(/main listing cannot be unmerged/)
    expect(tx.appsAppleLink.delete).not.toHaveBeenCalled()
    expect(tx.app.create).not.toHaveBeenCalled()
  })

  it('unmerges a non-main listing into a new app where it is the main listing', async () => {
    setupSplit({ primaryStore: 'google', primaryStoreAppId: 'com.z' })

    await splitAppFromGroup('apple', '42')

    expect(tx.app.create).toHaveBeenCalledWith({
      data: { title: 'Alpha', primaryStore: 'apple', primaryStoreAppId: '42' },
    })
    const sourceUpdate = tx.app.update.mock.calls[0][0]
    expect(sourceUpdate.where).toEqual({ id: 1 })
    expect(sourceUpdate.data).not.toHaveProperty('primaryStore')
  })

  it('creates the new app without label writes and leaves the original labels alone', async () => {
    setupSplit({ primaryStore: 'google', primaryStoreAppId: 'com.z' })

    await splitAppFromGroup('apple', '42')

    expect(tx.appLabel.createMany).not.toHaveBeenCalled()
    expect(tx.app.create.mock.calls[0][0].data).not.toHaveProperty('labels')
    expect(tx.app.delete).not.toHaveBeenCalled()
  })
})

describe('mergeAppGroups', () => {
  it('saves the default main listing over the merged listings', async () => {
    mockLinks(tx, [['42', 'Foo']], [['com.pro', 'Foo Pro']])

    await mergeAppGroups(1, [2])

    expect(tx.app.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ primaryStore: 'google', primaryStoreAppId: 'com.pro' }),
    })
  })

  it('gives the same default whichever group is the target', async () => {
    mockLinks(tx, [['42', 'Foo']], [['com.pro', 'Foo Pro']])

    await mergeAppGroups(2, [1])

    expect(tx.app.update.mock.calls[0][0].data).toMatchObject({
      primaryStore: 'google',
      primaryStoreAppId: 'com.pro',
    })
  })

  it('copies the source labels onto the target before deleting the sources', async () => {
    mockLinks(tx, [['42', 'Foo']], [])
    tx.appLabel.findMany.mockResolvedValue([{ labelId: 1 }, { labelId: 3 }])

    await mergeAppGroups(1, [2])

    expect(tx.appLabel.findMany).toHaveBeenCalledWith({
      where: { appId: { in: [2] } },
      select: { labelId: true },
    })
    expect(tx.appLabel.createMany).toHaveBeenCalledWith({
      data: [
        { appId: 1, labelId: 1 },
        { appId: 1, labelId: 3 },
      ],
      skipDuplicates: true,
    })
    expect(tx.appLabel.createMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.app.deleteMany.mock.invocationCallOrder[0],
    )
  })

  it('skips the label copy when the sources have no labels', async () => {
    mockLinks(tx, [['42', 'Foo']], [])

    await mergeAppGroups(1, [2])

    expect(tx.appLabel.createMany).not.toHaveBeenCalled()
  })
})
