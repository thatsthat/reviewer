import { createServerFn } from '@tanstack/react-start'
import { appStoreUrlSchema } from '#/lib/schemas'
import { saveAppleApp } from '#/lib/apple.server'

export const addAppleApp = createServerFn({ method: 'POST' })
  .validator(appStoreUrlSchema)
  .handler(({ data }) => saveAppleApp(data.url))
