import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { app as fetchAppleApp, type App as AppleApp } from '@perttu/app-store-scraper'
import { AppUrlForm } from '#/components/AppUrlForm'
import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client'
import { detectAppStorePlatform } from '#/lib/app-store'

const appStoreUrlSchema = z.object({
  url: z.string().min(1, 'An App Store URL is required'),
})

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

function toAppleRow(details: AppleApp) {
  return {
    trackName: details.title,
    description: details.description,
    artistName: details.developer,
    primaryGenreName: details.primaryGenre,
    version: details.version,
    averageUserRating: details.score,
    userRatingCount: details.reviews,
    releaseDate: details.released ? new Date(details.released) : null,
    currentVersionReleaseDate: details.updated ? new Date(details.updated) : null,
    artworkUrl: details.icon,
    data: details as unknown as Prisma.InputJsonValue,
  }
}

export const addAppleApp = createServerFn({ method: 'POST' })
  .validator(appStoreUrlSchema)
  .handler(async ({ data }) => {
    const id = extractAppleAppId(data.url)

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

    const record = await prisma.apple.upsert({
      where: { appId },
      create: { appId, ...row },
      update: row,
      select: {
        appId: true,
        trackName: true,
        averageUserRating: true,
        userRatingCount: true,
      },
    })

    return record
  })

export const Route = createFileRoute('/apple')({
  component: AppleImport,
  validateSearch: (search) => appStoreUrlSchema.partial().parse(search),
  loaderDeps: ({ search }) => ({ url: search.url }),
  loader: ({ deps }) => (deps.url ? addAppleApp({ data: { url: deps.url } }) : null),
  errorComponent: ({ error }) => (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">App Store</p>
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

function AppleImport() {
  const { url } = Route.useSearch()
  const record = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">App Store</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Import an app
        </h1>

        <div className="mb-8">
          <AppUrlForm defaultValue={url} />
        </div>

        {record && (
          <div className="demo-card">
            <h2 className="demo-section-title mb-2">{record.trackName}</h2>
            <p className="demo-muted text-sm">{record.appId}</p>
            <p className="demo-muted text-sm">
              Score: {record.averageUserRating ?? 'n/a'} &middot; Ratings:{' '}
              {record.userRatingCount ?? 'n/a'}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
