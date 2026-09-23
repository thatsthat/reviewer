import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { useLongPress } from '#/hooks/useLongPress'
import { cn } from '#/lib/utils'
import { mergeApps } from '#/lib/apps.functions'

interface App {
  id: number
  title: string
}

export function AppList({ apps }: { apps: Array<App> }) {
  const router = useRouter()
  const callMergeApps = useServerFn(mergeApps)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isMerging, setIsMerging] = useState(false)
  const isSelecting = selectedIds.size > 0

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleMerge() {
    if (selectedIds.size < 2) return
    const [targetAppId, ...sourceAppIds] = Array.from(selectedIds)
    setIsMerging(true)
    try {
      await callMergeApps({ data: { targetAppId, sourceAppIds } })
      clearSelection()
      router.invalidate()
    } finally {
      setIsMerging(false)
    }
  }

  if (apps.length === 0) {
    return <p className="text-sm text-muted-foreground">No apps yet.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2 pl-3',
          !isSelecting && 'invisible pointer-events-none',
        )}
        aria-hidden={!isSelecting}
      >
        <p className="text-sm text-muted-foreground">{selectedIds.size} selected</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            tabIndex={isSelecting ? 0 : -1}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={selectedIds.size < 2 || isMerging}
            onClick={handleMerge}
            tabIndex={isSelecting ? 0 : -1}
          >
            {isMerging ? 'Merging...' : 'Merge'}
          </Button>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {apps.map((app) => (
          <AppListRow
            key={app.id}
            app={app}
            isSelecting={isSelecting}
            isSelected={selectedIds.has(app.id)}
            onToggle={() => toggle(app.id)}
          />
        ))}
      </ul>
    </div>
  )
}

function AppListRow({
  app,
  isSelecting,
  isSelected,
  onToggle,
}: {
  app: App
  isSelecting: boolean
  isSelected: boolean
  onToggle: () => void
}) {
  const longPress = useLongPress(onToggle)

  function handleLinkClick(event: React.MouseEvent) {
    if (longPress.consumeLongPress()) {
      event.preventDefault()
      return
    }
    if (isSelecting) {
      event.preventDefault()
      onToggle()
    }
  }

  return (
    <li
      className={cn(
        'group relative flex items-center gap-2 rounded-lg border p-2 text-sm select-none',
        isSelected && 'border-primary bg-primary/5',
      )}
      onTouchStart={longPress.onTouchStart}
      onTouchMove={longPress.onTouchMove}
      onTouchEnd={longPress.onTouchEnd}
      onTouchCancel={longPress.onTouchCancel}
    >
      <Link
        to="/apps/$appId"
        params={{ appId: String(app.id) }}
        className="min-w-0 flex-1 truncate after:absolute after:inset-0 hover:underline"
        onClick={handleLinkClick}
      >
        {app.title}
      </Link>
      <div className="size-4 shrink-0">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          aria-label={`Select ${app.title}`}
          className={cn(
            'hidden relative z-10 md:block',
            isSelecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        />
      </div>
    </li>
  )
}
