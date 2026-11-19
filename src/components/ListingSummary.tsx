import type { ListingSummary as ListingSummaryData } from '#/lib/apps.server'

export function ListingSummary({ listing }: { listing: ListingSummaryData }) {
  return (
    <section className="mb-4 flex gap-3" aria-label="Main listing">
      {listing.iconUrl && (
        <img src={listing.iconUrl} alt="" className="size-16 shrink-0 rounded-xl" />
      )}
      <div className="min-w-0">
        <h2 className="font-semibold">{listing.title}</h2>
        {listing.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Updated {listing.updatedAt.toLocaleDateString('en', { dateStyle: 'medium' })}
          </p>
        )}
        {listing.description && (
          <p className="mt-2 text-sm whitespace-pre-line [overflow-wrap:anywhere]">{listing.description}</p>
        )}
      </div>
    </section>
  )
}
