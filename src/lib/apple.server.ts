import { app as fetchAppleApp, type App as AppleApp } from '@perttu/app-store-scraper'
import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client'
import { detectAppStorePlatform } from '#/lib/app-store'
import { ensureAppleAppLink } from '#/lib/apps.server'

function extractAppleAppId(rawUrl: string): number {
  const platform = detectAppStorePlatform(rawUrl)
  if (platform !== 'apple') {
    throw new Error('That looks like a Google Play link, not an App Store link.')
  }

  const idSegment = new URL(rawUrl).pathname
    .split('/')
    .find((segment) => /^id\d+$/.test(segment))
  if (!idSegment) {
    throw new Error('URL is missing an "id<number>" path segment.')
  }

  return Number(idSegment.slice(2))
}

export function toAppleRow(details: AppleApp) {
  return {
    title: details.title,
    description: details.description,
    url: details.url,
    iconUrl: details.icon,
    scrapedAt: new Date(),
    data: JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue,
  }
}

export async function saveAppleApp(url: string) {
  const id = extractAppleAppId(url)

  let details: AppleApp
  try {
    details = await fetchAppleApp({ id })
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      throw new Error(`No App Store app found for id "${id}".`)
    }
    throw error
  }

  const appId = String(details.id)
  const row = toAppleRow(details)

  return prisma.$transaction(async (tx) => {
    const record = await tx.apple.upsert({
      where: { appId },
      create: { appId, ...row },
      update: row,
      select: { appId: true, title: true },
    })

    await ensureAppleAppLink(tx, appId, record.title)

    return record
  })
}
