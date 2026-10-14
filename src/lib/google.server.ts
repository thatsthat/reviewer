import {
  app as fetchGooglePlayApp,
  NotFoundError,
  type App as GooglePlayApp,
} from '@mradex77/google-play-scraper'
import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client'
import { detectAppStorePlatform } from '#/lib/app-store'
import { ensureGoogleAppLink } from '#/lib/apps.server'

function extractGooglePlayAppId(rawUrl: string): string {
  const platform = detectAppStorePlatform(rawUrl)
  if (platform !== 'google') {
    throw new Error('That looks like an App Store link, not a Google Play link.')
  }

  const appId = new URL(rawUrl).searchParams.get('id')
  if (!appId) {
    throw new Error('URL is missing the "id" query parameter.')
  }

  return appId
}

export function toGoogleRow(details: GooglePlayApp) {
  return {
    title: details.title,
    description: details.description,
    url: details.url,
    iconUrl: details.icon,
    scrapedAt: new Date(),
    data: JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue,
  }
}

export async function saveGooglePlayApp(url: string) {
  const appId = extractGooglePlayAppId(url)

  let details: GooglePlayApp
  try {
    details = await fetchGooglePlayApp({ appId })
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new Error(`No Google Play app found for id "${appId}".`)
    }
    throw error
  }

  const row = toGoogleRow(details)

  return prisma.$transaction(async (tx) => {
    const record = await tx.google.upsert({
      where: { appId: details.appId },
      create: { appId: details.appId, ...row },
      update: row,
      select: { appId: true, title: true },
    })

    await ensureGoogleAppLink(tx, record.appId, record.title)

    return record
  })
}
