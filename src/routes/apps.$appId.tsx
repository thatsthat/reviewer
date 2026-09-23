import { createFileRoute } from '@tanstack/react-router'
import { AppRelationsList } from '#/components/AppRelationsList'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { getAppDetail } from '#/lib/apps.functions'

export const Route = createFileRoute('/apps/$appId')({
  component: AppDetail,
  loader: ({ params }) => {
    const appId = Number(params.appId)
    if (!Number.isInteger(appId)) {
      throw new Error(`"${params.appId}" is not a valid app id.`)
    }
    return getAppDetail({ data: { appId } })
  },
  errorComponent: ({ error }) => (
    <main className="page-wrap px-4 py-12">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>App not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </p>
        </CardContent>
      </Card>
    </main>
  ),
})

function AppDetail() {
  const { app, relations } = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 py-12">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>{app.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <AppRelationsList relations={relations} />
        </CardContent>
      </Card>
    </main>
  )
}
