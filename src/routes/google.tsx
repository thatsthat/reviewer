import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  app as fetchGooglePlayApp,
  NotFoundError,
  type App as GooglePlayApp,
} from '@mradex77/google-play-scraper'
import { AppUrlForm } from '#/components/AppUrlForm'
import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client'
import { detectAppStorePlatform } from '#/lib/app-store'

const googlePlayUrlSchema = z.object({
  url: z.string().min(1, 'A Google Play URL is required'),
})

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

function toGoogleRow(details: GooglePlayApp) {
  return {
    title: details.title,
    description: details.description,
    summary: details.summary,
    developer: details.developer,
    developerId: details.developerId,
    genre: details.genre,
    genreId: details.genreId,
    score: details.score,
    ratings: details.ratings,
    reviews: details.reviews,
    installs: details.installs,
    minInstalls:
      details.minInstalls != null ? BigInt(details.minInstalls) : null,
    version: details.version,
    androidVersion: details.androidVersion,
    contentRating: details.contentRating,
    adSupported: details.adSupported,
    iconUrl: details.icon,
    storeUrl: details.url,
    storeUpdatedAt: new Date(details.updated),
    data: details as unknown as Prisma.InputJsonValue,
  }
}

export const addGooglePlayApp = createServerFn({ method: 'POST' })
  .validator(googlePlayUrlSchema)
  .handler(async ({ data }) => {
    const appId = extractGooglePlayAppId(data.url)

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

    const record = await prisma.google.upsert({
      where: { appId: details.appId },
      create: { appId: details.appId, ...row },
      update: row,
      select: { appId: true, title: true, score: true, installs: true },
    })

    return record
  })

export const Route = createFileRoute('/google')({
  component: GooglePlayImport,
  validateSearch: (search) => googlePlayUrlSchema.partial().parse(search),
  loaderDeps: ({ search }) => ({ url: search.url }),
  loader: ({ deps }) =>
    deps.url ? addGooglePlayApp({ data: { url: deps.url } }) : null,
  errorComponent: ({ error }) => (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Google Play</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Import an app
        </h1>
        <p className="demo-muted text-sm">
          {error instanceof Error ? error.message : 'Something went wrong.'}
        </p>
      </section>
    </main>
  ),
})

function GooglePlayImport() {
  const { url } = Route.useSearch()
  const record = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Google Play</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Import an app
        </h1>

        <div className="mb-8">
          <AppUrlForm defaultValue={url} />
        </div>

        {record && (
          <div className="demo-card">
            <h2 className="demo-section-title mb-2">{record.title}</h2>
            <p className="demo-muted text-sm">{record.appId}</p>
            <p className="demo-muted text-sm">
              Score: {record.score ?? 'n/a'} &middot; Installs:{' '}
              {record.installs ?? 'n/a'}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
