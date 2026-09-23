import { createServerFn } from '@tanstack/react-start'
import { googlePlayUrlSchema } from '#/lib/schemas'
import { saveGooglePlayApp } from '#/lib/google.server'

export const addGooglePlayApp = createServerFn({ method: 'POST' })
  .validator(googlePlayUrlSchema)
  .handler(({ data }) => saveGooglePlayApp(data.url))
