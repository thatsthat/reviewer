import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldDescription, FieldError, FieldLabel } from '#/components/ui/field'
import { detectAppStorePlatform } from '#/lib/app-store'
import { addAppleApp } from '#/lib/apple.functions'
import { addGooglePlayApp } from '#/lib/google.functions'

export function AppUrlForm() {
  const router = useRouter()
  const callAddAppleApp = useServerFn(addAppleApp)
  const callAddGooglePlayApp = useServerFn(addGooglePlayApp)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const value = new FormData(form).get('url')
    if (typeof value !== 'string' || !value) return

    setError(null)
    setSuccess(null)

    try {
      const platform = detectAppStorePlatform(value)
      setIsSubmitting(true)
      const record =
        platform === 'google'
          ? await callAddGooglePlayApp({ data: { url: value } })
          : await callAddAppleApp({ data: { url: value } })
      const name = 'trackName' in record ? record.trackName : record.title
      setSuccess(`Saved ${name}.`)
      form.reset()
      router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="app-url" className="sr-only">
          Google Play or App Store URL
        </FieldLabel>
        <div className="flex gap-2">
          <Input
            id="app-url"
            type="url"
            name="url"
            placeholder="Paste a Google Play or App Store link..."
            aria-invalid={error ? true : undefined}
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Importing...' : 'Import'}
          </Button>
        </div>
        {error && <FieldError>{error}</FieldError>}
        {success && <FieldDescription>{success}</FieldDescription>}
      </Field>
    </form>
  )
}
