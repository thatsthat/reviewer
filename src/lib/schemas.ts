import { z } from 'zod'

export const appStoreUrlSchema = z.object({
  url: z.string().min(1, 'An App Store URL is required'),
})

export const googlePlayUrlSchema = z.object({
  url: z.string().min(1, 'A Google Play URL is required'),
})

export const mergeAppsSchema = z.object({
  targetAppId: z.number().int(),
  sourceAppIds: z.array(z.number().int()).min(1),
})

export const unmergeAppSchema = z.object({
  store: z.enum(['apple', 'google']),
  appId: z.string().min(1),
})

export const appIdSchema = z.object({
  appId: z.number().int().positive(),
})
