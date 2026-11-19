import { ListingSummary } from '#/components/ListingSummary'
import { AppRelationsList } from '#/components/AppRelationsList'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { loadAppDetail } from '#/lib/apps.server'

export type AppDetail = Awaited<ReturnType<typeof loadAppDetail>>

export function AppDetailView({ app, relations, primary }: AppDetail) {
  return (
    <main className="page-wrap px-4 py-12">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>
            <h1>{app.title}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {primary && <ListingSummary listing={primary} />}
          <AppRelationsList appId={app.id} relations={relations} />
        </CardContent>
      </Card>
    </main>
  )
}
