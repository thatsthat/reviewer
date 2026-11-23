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

export const setPrimaryListingSchema = z.object({
  appId: z.number().int().positive(),
  store: z.enum(['apple', 'google']),
  storeAppId: z.string().min(1),
})

export const LABEL_NAME_MAX_LENGTH = 50

/** Trims a label name and collapses runs of whitespace to a single space. */
export function normalizeLabelName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** The case-insensitive identity of a label name. */
export function labelNameKey(name: string): string {
  return normalizeLabelName(name).toLowerCase()
}

const labelNameSchema = z
  .string()
  .transform(normalizeLabelName)
  .pipe(
    z
      .string()
      .min(1, 'Enter a label name.')
      .max(LABEL_NAME_MAX_LENGTH, `Label names can be at most ${LABEL_NAME_MAX_LENGTH} characters.`),
  )

export const assignLabelSchema = z.object({
  appId: z.number().int().positive(),
  labelId: z.number().int().positive(),
})

export const unassignLabelSchema = assignLabelSchema

export const createLabelSchema = z.object({
  appId: z.number().int().positive(),
  name: labelNameSchema,
})
