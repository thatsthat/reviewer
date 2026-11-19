import { useLayoutEffect, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import type { ListingSummary as ListingSummaryData } from '#/lib/apps.server'

function Description({
  text,
  expanded,
  setExpanded,
}: {
  text: string
  expanded: boolean
  setExpanded: (value: boolean) => void
}) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [isClamped, setIsClamped] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (el && !expanded) setIsClamped(el.scrollHeight > el.clientHeight + 1)
  }, [text, expanded])

  return (
    <div className="mt-2">
      <p
        ref={ref}
        className={cn(
          'text-sm whitespace-pre-line [overflow-wrap:anywhere]',
          !expanded && 'line-clamp-5',
        )}
      >
        {text}
      </p>
      {(isClamped || expanded) && (
        <Button
          variant="link"
          size="sm"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="h-auto px-0"
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </div>
  )
}

export function ListingSummary({ listing }: { listing: ListingSummaryData }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="flex gap-3" aria-label="Main listing">
      {listing.iconUrl && (
        <img
          src={listing.iconUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="size-16 shrink-0 rounded-xl"
        />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{listing.title}</h2>
        {listing.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Updated {listing.updatedAt.toLocaleDateString('en', { dateStyle: 'medium' })}
          </p>
        )}
        {listing.description && (
          <Description
            text={listing.description}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        )}
      </div>
    </section>
  )
}
