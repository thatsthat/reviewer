import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '#/components/ui/button'
import { useLongPress } from '#/hooks/useLongPress'
import { cn } from '#/lib/utils'
import type { AppRelation } from '#/lib/apps.server'
import { unmergeApp } from '#/lib/apps.functions'

const STORE_LABEL: Record<AppRelation['store'], string> = {
  apple: 'App Store',
  google: 'Google Play',
}

export function AppRelationsList({ relations }: { relations: Array<AppRelation> }) {
  if (relations.length === 0) {
    return <p className="text-sm text-muted-foreground">No linked store listings.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {relations.map((relation) => (
        <AppRelationRow
          key={`${relation.store}-${relation.storeAppId}`}
          relation={relation}
          canUnmerge={relations.length > 1}
        />
      ))}
    </ul>
  )
}

function AppRelationRow({
  relation,
  canUnmerge,
}: {
  relation: AppRelation
  canUnmerge: boolean
}) {
  const router = useRouter()
  const callUnmergeApp = useServerFn(unmergeApp)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isUnmerging, setIsUnmerging] = useState(false)
  const longPress = useLongPress(() => setIsRevealed(true))

  async function handleUnmerge() {
    if (longPress.consumeLongPress()) return
    setIsUnmerging(true)
    try {
      await callUnmergeApp({ data: { store: relation.store, appId: relation.storeAppId } })
      router.invalidate()
    } finally {
      setIsUnmerging(false)
    }
  }

  return (
    <li
      className="group flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
      onTouchStart={longPress.onTouchStart}
      onTouchMove={longPress.onTouchMove}
      onTouchEnd={longPress.onTouchEnd}
      onTouchCancel={longPress.onTouchCancel}
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{relation.name}</span>
        <span className="text-xs text-muted-foreground">
          {STORE_LABEL[relation.store]}
          {relation.rating != null && ` · ${relation.rating.toFixed(1)}★`}
          {relation.ratingCount != null && ` (${relation.ratingCount.toLocaleString()})`}
        </span>
      </div>
      {canUnmerge && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isUnmerging}
          onClick={handleUnmerge}
          className={cn(
            'shrink-0 transition-opacity',
            isRevealed
              ? 'inline-flex opacity-100'
              : 'hidden opacity-0 md:inline-flex md:group-hover:opacity-100',
          )}
        >
          {isUnmerging ? 'Unmerging...' : 'Unmerge'}
        </Button>
      )}
    </li>
  )
}
