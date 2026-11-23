import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client'

type Tx = Prisma.TransactionClient

export async function listApps() {
  return prisma.app.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  })
}

export interface AppRelation {
  store: 'apple' | 'google'
  storeAppId: string
  name: string
  url: string
  isPrimary: boolean
}

export interface ListingSummary {
  store: 'apple' | 'google'
  storeAppId: string
  title: string
  iconUrl: string | null
  description: string | null
  updatedAt: Date | null
}

const STORE_ORDER: Record<AppRelation['store'], number> = { google: 0, apple: 1 }

export function compareAppRelations(a: AppRelation, b: AppRelation): number {
  return (
    STORE_ORDER[a.store] - STORE_ORDER[b.store] ||
    a.name.localeCompare(b.name, 'en') ||
    (a.storeAppId < b.storeAppId ? -1 : a.storeAppId > b.storeAppId ? 1 : 0)
  )
}

/** The first relation in the page's listing order, or null for an empty list. */
export function pickDefaultPrimary(relations: Array<AppRelation>): AppRelation | null {
  return [...relations].sort(compareAppRelations)[0] ?? null
}

export interface LabelOption {
  id: number
  name: string
}

function compareLabels(a: LabelOption, b: LabelOption): number {
  return a.name.localeCompare(b.name, 'en')
}

type Db = Prisma.TransactionClient | typeof prisma

export async function loadRelations(db: Db, appId: number): Promise<Array<AppRelation>> {
  const [appleLinks, googleLinks] = await Promise.all([
    db.appsAppleLink.findMany({
      where: { appId },
      select: {
        appleAppId: true,
        apple: { select: { title: true, url: true } },
      },
    }),
    db.appsGoogleLink.findMany({
      where: { appId },
      select: {
        googleAppId: true,
        google: { select: { title: true, url: true } },
      },
    }),
  ])

  return [
    ...appleLinks.map((link) => ({
      store: 'apple' as const,
      storeAppId: link.appleAppId,
      name: link.apple.title,
      url: link.apple.url,
      isPrimary: false,
    })),
    ...googleLinks.map((link) => ({
      store: 'google' as const,
      storeAppId: link.googleAppId,
      name: link.google.title,
      url: link.google.url,
      isPrimary: false,
    })),
  ].sort(compareAppRelations)
}

async function loadListingSummary(
  store: 'apple' | 'google',
  storeAppId: string,
): Promise<ListingSummary | null> {
  const select = { title: true, iconUrl: true, description: true, updatedAt: true }
  const row =
    store === 'apple'
      ? await prisma.apple.findUnique({ where: { appId: storeAppId }, select })
      : await prisma.google.findUnique({ where: { appId: storeAppId }, select })
  return row ? { store, storeAppId, ...row } : null
}

export async function loadAppDetail(appId: number) {
  const found = await prisma.app.findUnique({
    where: { id: appId },
    select: { id: true, title: true, primaryStore: true, primaryStoreAppId: true },
  })
  if (!found) {
    throw new Error(`No app found with id ${appId}.`)
  }
  const { primaryStore, primaryStoreAppId, ...app } = found

  const loaded = await loadRelations(prisma, appId)
  const saved = loaded.find(
    (r) => r.store === primaryStore && r.storeAppId === primaryStoreAppId,
  )
  // Safety net: a saved pair that matches no listing falls back to the default, without writing.
  const main = saved ?? pickDefaultPrimary(loaded)
  const relations = loaded.map((r) => ({ ...r, isPrimary: r === main }))
  const primary = main ? await loadListingSummary(main.store, main.storeAppId) : null

  const [assigned, everyLabel] = await Promise.all([
    prisma.appLabel.findMany({
      where: { appId },
      select: { label: { select: { id: true, name: true } } },
    }),
    prisma.label.findMany({ select: { id: true, name: true } }),
  ])
  const labels = assigned.map((row) => row.label).sort(compareLabels)
  const allLabels = [...everyLabel].sort(compareLabels)

  return { app, relations, primary, labels, allLabels }
}

export async function setPrimaryListing(
  appId: number,
  store: 'apple' | 'google',
  storeAppId: string,
) {
  await prisma.$transaction(async (tx) => {
    const relations = await loadRelations(tx, appId)
    if (!relations.some((r) => r.store === store && r.storeAppId === storeAppId)) {
      throw new Error('That listing is not linked to this app.')
    }
    await tx.app.update({
      where: { id: appId },
      data: { primaryStore: store, primaryStoreAppId: storeAppId, updatedAt: new Date() },
    })
  })
}

export async function ensureAppleAppLink(tx: Tx, appleAppId: string, title: string) {
  const existing = await tx.appsAppleLink.findUnique({ where: { appleAppId } })
  if (existing) return existing.appId

  const app = await tx.app.create({
    data: { title, primaryStore: 'apple', primaryStoreAppId: appleAppId },
  })
  await tx.appsAppleLink.create({ data: { appleAppId, appId: app.id } })
  return app.id
}

export async function ensureGoogleAppLink(tx: Tx, googleAppId: string, title: string) {
  const existing = await tx.appsGoogleLink.findUnique({ where: { googleAppId } })
  if (existing) return existing.appId

  const app = await tx.app.create({
    data: { title, primaryStore: 'google', primaryStoreAppId: googleAppId },
  })
  await tx.appsGoogleLink.create({ data: { googleAppId, appId: app.id } })
  return app.id
}

export async function mergeAppGroups(targetAppId: number, sourceAppIds: Array<number>) {
  if (sourceAppIds.length === 0) return

  await prisma.$transaction(async (tx) => {
    await tx.appsAppleLink.updateMany({
      where: { appId: { in: sourceAppIds } },
      data: { appId: targetAppId },
    })
    await tx.appsGoogleLink.updateMany({
      where: { appId: { in: sourceAppIds } },
      data: { appId: targetAppId },
    })
    const sourceLabels = await tx.appLabel.findMany({
      where: { appId: { in: sourceAppIds } },
      select: { labelId: true },
    })
    if (sourceLabels.length > 0) {
      await tx.appLabel.createMany({
        data: [...new Set(sourceLabels.map((l) => l.labelId))].map((labelId) => ({
          appId: targetAppId,
          labelId,
        })),
        skipDuplicates: true,
      })
    }
    await tx.app.deleteMany({ where: { id: { in: sourceAppIds } } })
    const merged = pickDefaultPrimary(await loadRelations(tx, targetAppId))
    await tx.app.update({
      where: { id: targetAppId },
      data: {
        updatedAt: new Date(),
        ...(merged && { primaryStore: merged.store, primaryStoreAppId: merged.storeAppId }),
      },
    })
  })
}

async function assertNotPrimary(
  tx: Tx,
  appId: number,
  store: 'apple' | 'google',
  storeAppId: string,
) {
  const app = await tx.app.findUniqueOrThrow({
    where: { id: appId },
    select: { primaryStore: true, primaryStoreAppId: true },
  })
  if (app.primaryStore === store && app.primaryStoreAppId === storeAppId) {
    throw new Error('The main listing cannot be unmerged. Choose another main listing first.')
  }
}

export async function splitAppFromGroup(store: 'apple' | 'google', storeAppId: string) {
  await prisma.$transaction(async (tx) => {
    let title: string
    let sourceAppId: number

    if (store === 'apple') {
      const link = await tx.appsAppleLink.findUniqueOrThrow({
        where: { appleAppId: storeAppId },
        include: { apple: { select: { title: true } } },
      })
      title = link.apple.title
      sourceAppId = link.appId
      await assertNotPrimary(tx, sourceAppId, store, storeAppId)
      await tx.appsAppleLink.delete({ where: { appleAppId: storeAppId } })
    } else {
      const link = await tx.appsGoogleLink.findUniqueOrThrow({
        where: { googleAppId: storeAppId },
        include: { google: { select: { title: true } } },
      })
      title = link.google.title
      sourceAppId = link.appId
      await assertNotPrimary(tx, sourceAppId, store, storeAppId)
      await tx.appsGoogleLink.delete({ where: { googleAppId: storeAppId } })
    }

    const newApp = await tx.app.create({
      data: { title, primaryStore: store, primaryStoreAppId: storeAppId },
    })

    if (store === 'apple') {
      await tx.appsAppleLink.create({ data: { appleAppId: storeAppId, appId: newApp.id } })
    } else {
      await tx.appsGoogleLink.create({ data: { googleAppId: storeAppId, appId: newApp.id } })
    }

    const [remainingApple, remainingGoogle] = await Promise.all([
      tx.appsAppleLink.findFirst({
        where: { appId: sourceAppId },
        include: { apple: { select: { title: true } } },
      }),
      tx.appsGoogleLink.findFirst({
        where: { appId: sourceAppId },
        include: { google: { select: { title: true } } },
      }),
    ])
    const remainingTitle = remainingApple?.apple.title ?? remainingGoogle?.google.title

    if (remainingTitle) {
      await tx.app.update({
        where: { id: sourceAppId },
        data: { title: remainingTitle, updatedAt: new Date() },
      })
    } else {
      await tx.app.delete({ where: { id: sourceAppId } })
    }
  })
}
