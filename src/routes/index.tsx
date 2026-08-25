import { createFileRoute } from '@tanstack/react-router'
import { AppUrlForm } from '#/components/AppUrlForm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
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
    </main>
  )
}
