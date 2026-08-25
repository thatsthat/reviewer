import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  app as fetchGooglePlayApp,
  NotFoundError,
  type App as GooglePlayApp,
} from '@mradex77/google-play-scraper'
import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client'

const googlePlayUrlSchema = z.object({
  url: z.string().min(1, 'A Google Play URL is required'),
})

function extractGooglePlayAppId(rawUrl: string): string {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('That is not a valid URL.')
  }

  if (!/(^|\.)play\.google\.com$/.test(parsed.hostname)) {
    throw new Error('URL must be a play.google.com app link.')
  }

  const appId = parsed.searchParams.get('id')
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
    price: details.price,
    currency: details.currency,
    priceText: details.priceText,
    free: details.free,
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
    })

    return { ...record, price: record.price?.toNumber() ?? null }
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
  const navigate = useNavigate({ from: Route.fullPath })
  const { url } = Route.useSearch()
  const record = Route.useLoaderData()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const value = new FormData(form).get('url')
    if (typeof value !== 'string' || !value) return
    navigate({ search: { url: value } })
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Google Play</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Import an app
        </h1>

        <form onSubmit={handleSubmit} className="mb-8 flex gap-2">
          <input
            type="url"
            name="url"
            defaultValue={url}
            placeholder="https://play.google.com/store/apps/details?id=..."
            className="demo-input min-w-0 flex-1"
          />
          <button type="submit" className="demo-button whitespace-nowrap">
            Import
          </button>
        </form>

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
