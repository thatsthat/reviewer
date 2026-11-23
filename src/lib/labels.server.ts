import { prisma } from '#/db'
import { labelNameKey, normalizeLabelName } from '#/lib/schemas'

function prismaCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined
}

function foreignKeyMessage(error: unknown): string {
  const detail = JSON.stringify((error as { meta?: unknown }).meta ?? '') + String(error)
  return /label/i.test(detail) && !/app_id/i.test(detail)
    ? 'That label no longer exists.'
    : 'That app no longer exists.'
}

async function withFriendlyErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (prismaCode(error) === 'P2003') throw new Error(foreignKeyMessage(error))
    throw error
  }
}

export async function assignLabel(appId: number, labelId: number) {
  await withFriendlyErrors(() =>
    prisma.appLabel.createMany({ data: [{ appId, labelId }], skipDuplicates: true }),
  )
}

export async function createAndAssignLabel(appId: number, rawName: string) {
  const name = normalizeLabelName(rawName)
  const nameKey = labelNameKey(name)

  await withFriendlyErrors(async () => {
    let labelId: number
    try {
      labelId = await prisma.$transaction(async (tx) => {
        const label = await tx.label.upsert({
          where: { nameKey },
          create: { name, nameKey },
          update: {},
        })
        await tx.appLabel.createMany({ data: [{ appId, labelId: label.id }], skipDuplicates: true })
        return label.id
      })
    } catch (error) {
      if (prismaCode(error) !== 'P2002') throw error
      // A concurrent request created the same name first: reuse its label.
      const existing = await prisma.label.findUniqueOrThrow({ where: { nameKey } })
      labelId = existing.id
      await prisma.appLabel.createMany({ data: [{ appId, labelId }], skipDuplicates: true })
    }
  })
}

export async function unassignLabel(appId: number, labelId: number) {
  await prisma.appLabel.deleteMany({ where: { appId, labelId } })
}
