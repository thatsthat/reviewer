import { beforeEach, describe, expect, it, vi } from 'vitest'

const tx = {
  label: { upsert: vi.fn() },
  appLabel: { createMany: vi.fn() },
}

const prisma = {
  label: { findUniqueOrThrow: vi.fn() },
  appLabel: { createMany: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
}

vi.mock('#/db', () => ({ prisma }))

const { assignLabel, createAndAssignLabel, unassignLabel } = await import('./labels.server')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('assignLabel', () => {
  it('skips duplicates so a repeated assignment succeeds', async () => {
    await assignLabel(1, 7)

    expect(prisma.appLabel.createMany).toHaveBeenCalledWith({
      data: [{ appId: 1, labelId: 7 }],
      skipDuplicates: true,
    })
  })

  it('turns a foreign-key violation into a plain message', async () => {
    prisma.appLabel.createMany.mockRejectedValueOnce({ code: 'P2003', meta: { field_name: 'app_labels_app_id_fkey' } })

    await expect(assignLabel(1, 7)).rejects.toThrow('That app no longer exists.')
  })
})

describe('createAndAssignLabel', () => {
  it('reuses the existing label when only the case differs', async () => {
    tx.label.upsert.mockResolvedValue({ id: 5, name: 'Kids' })

    await createAndAssignLabel(1, '  kids ')

    expect(tx.label.upsert).toHaveBeenCalledWith({
      where: { nameKey: 'kids' },
      create: { name: 'kids', nameKey: 'kids' },
      update: {},
    })
    expect(tx.appLabel.createMany).toHaveBeenCalledWith({
      data: [{ appId: 1, labelId: 5 }],
      skipDuplicates: true,
    })
  })

  it('re-reads the label by nameKey and assigns it after a concurrent create (P2002)', async () => {
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2002' })
    prisma.label.findUniqueOrThrow.mockResolvedValue({ id: 9 })

    await createAndAssignLabel(2, 'Puzzle')

    expect(prisma.label.findUniqueOrThrow).toHaveBeenCalledWith({ where: { nameKey: 'puzzle' } })
    expect(prisma.appLabel.createMany).toHaveBeenCalledWith({
      data: [{ appId: 2, labelId: 9 }],
      skipDuplicates: true,
    })
  })

  it('rethrows other errors', async () => {
    prisma.$transaction.mockRejectedValueOnce(new Error('boom'))

    await expect(createAndAssignLabel(2, 'Puzzle')).rejects.toThrow('boom')
  })
})

describe('unassignLabel', () => {
  it('resolves when nothing was assigned', async () => {
    prisma.appLabel.deleteMany.mockResolvedValue({ count: 0 })

    await expect(unassignLabel(1, 7)).resolves.toBeUndefined()
    expect(prisma.appLabel.deleteMany).toHaveBeenCalledWith({ where: { appId: 1, labelId: 7 } })
  })
})
