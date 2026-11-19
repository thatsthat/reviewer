import { ListingSummary } from '#/components/ListingSummary'
import { AppRelationsList } from '#/components/AppRelationsList'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { loadAppDetail } from '#/lib/apps.server'

export type AppDetail = Awaited<ReturnType<typeof loadAppDetail>>

export function AppDetailView({ app, relations, primary }: AppDetail) {
  return (
    <main className="page-wrap px-4 py-12">
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>
            <h1>App details: {app.title}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 md:flex-row">
          {primary && (
            <div className="min-w-0 md:flex-1">
              <ListingSummary listing={primary} />
            </div>
          )}
          <div className="min-w-0 md:w-80 md:shrink-0">
            <h2 className="mb-2 text-sm font-semibold">App versions included</h2>
            <AppRelationsList appId={app.id} relations={relations} />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
