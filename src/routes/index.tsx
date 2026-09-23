import { createFileRoute } from '@tanstack/react-router'
import { AppList } from '#/components/AppList'
import { AppUrlForm } from '#/components/AppUrlForm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { getApps } from '#/lib/apps.functions'

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => getApps(),
})

function Home() {
  const apps = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 py-12">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Import an app</CardTitle>
          <CardDescription>
            Paste a Google Play or App Store link and we&apos;ll pull in its
            store data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppUrlForm />
        </CardContent>
      </Card>

      <Card className="mx-auto mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Your apps</CardTitle>
        </CardHeader>
        <CardContent>
          <AppList apps={apps} />
        </CardContent>
      </Card>
    </main>
  )
}
