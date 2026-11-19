import { createServerFn } from '@tanstack/react-start'
import { appIdSchema, mergeAppsSchema, setPrimaryListingSchema, unmergeAppSchema } from '#/lib/schemas'
import {
  listApps,
  loadAppDetail,
  mergeAppGroups,
  setPrimaryListing as savePrimaryListing,
  splitAppFromGroup,
} from '#/lib/apps.server'

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

export const setPrimaryListing = createServerFn({ method: 'POST' })
  .validator(setPrimaryListingSchema)
  .handler(({ data }) => savePrimaryListing(data.appId, data.store, data.storeAppId))
