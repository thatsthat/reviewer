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
        apple: { select: { trackName: true, averageUserRating: true, userRatingCount: true } },
      },
    }),
    prisma.appsGoogleLink.findMany({
      where: { appId },
      select: {
        googleAppId: true,
        google: { select: { title: true, score: true, ratings: true } },
      },
    }),
  ])

  const relations: Array<AppRelation> = [
    ...appleLinks.map((link) => ({
      store: 'apple' as const,
      storeAppId: link.appleAppId,
      name: link.apple.trackName,
      rating: link.apple.averageUserRating,
      ratingCount: link.apple.userRatingCount,
    })),
    ...googleLinks.map((link) => ({
      store: 'google' as const,
      storeAppId: link.googleAppId,
      name: link.google.title,
      rating: link.google.score,
      ratingCount: link.google.ratings,
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
        include: { apple: { select: { trackName: true } } },
      })
      title = link.apple.trackName
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
        include: { apple: { select: { trackName: true } } },
      }),
      tx.appsGoogleLink.findFirst({
        where: { appId: sourceAppId },
        include: { google: { select: { title: true } } },
      }),
    ])
    const remainingTitle = remainingApple?.apple.trackName ?? remainingGoogle?.google.title

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
