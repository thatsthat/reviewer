import { createServerFn } from '@tanstack/react-start'
import { appIdSchema, mergeAppsSchema, unmergeAppSchema } from '#/lib/schemas'
import { listApps, loadAppDetail, mergeAppGroups, splitAppFromGroup } from '#/lib/apps.server'

export const getApps = createServerFn({ method: 'GET' }).handler(() => listApps())

export const getAppDetail = createServerFn({ method: 'GET' })
  .validator(appIdSchema)
  .handler(({ data }) => loadAppDetail(data.appId))

export const mergeApps = createServerFn({ method: 'POST' })
  .validator(mergeAppsSchema)
  .handler(({ data }) => mergeAppGroups(data.targetAppId, data.sourceAppIds))

export const unmergeApp = createServerFn({ method: 'POST' })
  .validator(unmergeAppSchema)
  .handler(({ data }) => splitAppFromGroup(data.store, data.appId))
