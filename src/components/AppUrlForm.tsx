import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { detectAppStorePlatform } from '#/lib/app-store'

export function AppUrlForm({ defaultValue }: { defaultValue?: string }) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('url')
    if (typeof value !== 'string' || !value) return

    try {
      const platform = detectAppStorePlatform(value)
      setError(null)
      navigate({
        to: platform === 'google' ? '/google' : '/apple',
        search: { url: value },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
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
            defaultValue={defaultValue}
            placeholder="Paste a Google Play or App Store link..."
            aria-invalid={error ? true : undefined}
            className="min-w-0 flex-1"
          />
          <Button type="submit">Import</Button>
        </div>
        {error && <FieldError>{error}</FieldError>}
      </Field>
    </form>
  )
}
