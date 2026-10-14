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
  rating: number | null
  ratingCount: number | null
  url: string
}

function getStoredUrl(data: Prisma.JsonValue): string {
  return (data as { url: string }).url
}

function getStoredRating(data: Prisma.JsonValue): number | null {
  return (data as { score?: number }).score ?? null
}

function getStoredRatingCount(data: Prisma.JsonValue): number | null {
  return (data as { reviews?: number }).reviews ?? null
}

export async function loadAppDetail(appId: number) {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    select: { id: true, title: true },
  })
  if (!app) {
    throw new Error(`No app found with id ${appId}.`)
  }

  const [appleLinks, googleLinks] = await Promise.all([
    prisma.appsAppleLink.findMany({
      where: { appId },
      select: {
        appleAppId: true,
        apple: { select: { title: true, data: true } },
      },
    }),
    prisma.appsGoogleLink.findMany({
      where: { appId },
      select: {
        googleAppId: true,
        google: { select: { title: true, data: true } },
      },
    }),
  ])

  const relations: Array<AppRelation> = [
    ...appleLinks.map((link) => ({
      store: 'apple' as const,
      storeAppId: link.appleAppId,
      name: link.apple.title,
      rating: getStoredRating(link.apple.data),
      ratingCount: getStoredRatingCount(link.apple.data),
      url: getStoredUrl(link.apple.data),
    })),
    ...googleLinks.map((link) => ({
      store: 'google' as const,
      storeAppId: link.googleAppId,
      name: link.google.title,
      rating: getStoredRating(link.google.data),
      ratingCount: getStoredRatingCount(link.google.data),
      url: getStoredUrl(link.google.data),
    })),
  ]

  return { app, relations }
}

export async function ensureAppleAppLink(tx: Tx, appleAppId: string, title: string) {
  const existing = await tx.appsAppleLink.findUnique({ where: { appleAppId } })
  if (existing) return existing.appId

  const app = await tx.app.create({ data: { title } })
  await tx.appsAppleLink.create({ data: { appleAppId, appId: app.id } })
  return app.id
}

export async function ensureGoogleAppLink(tx: Tx, googleAppId: string, title: string) {
  const existing = await tx.appsGoogleLink.findUnique({ where: { googleAppId } })
  if (existing) return existing.appId

  const app = await tx.app.create({ data: { title } })
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
    await tx.app.deleteMany({ where: { id: { in: sourceAppIds } } })
    await tx.app.update({
      where: { id: targetAppId },
      data: { updatedAt: new Date() },
    })
  })
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
      await tx.appsAppleLink.delete({ where: { appleAppId: storeAppId } })
    } else {
      const link = await tx.appsGoogleLink.findUniqueOrThrow({
        where: { googleAppId: storeAppId },
        include: { google: { select: { title: true } } },
      })
      title = link.google.title
      sourceAppId = link.appId
      await tx.appsGoogleLink.delete({ where: { googleAppId: storeAppId } })
    }

    const newApp = await tx.app.create({ data: { title } })

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
