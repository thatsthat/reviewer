export type AppStorePlatform = 'google' | 'apple'

export function detectAppStorePlatform(rawUrl: string): AppStorePlatform {
  let hostname: string
  try {
    hostname = new URL(rawUrl).hostname
  } catch {
    throw new Error('That is not a valid URL.')
  }

  if (/(^|\.)play\.google\.com$/.test(hostname)) return 'google'
  if (/(^|\.)apps\.apple\.com$/.test(hostname)) return 'apple'

  throw new Error('URL must be a play.google.com or apps.apple.com app link.')
}
