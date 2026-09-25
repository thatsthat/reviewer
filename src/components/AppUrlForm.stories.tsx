import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, mocked } from 'storybook/test'
import { AppUrlForm } from './AppUrlForm.tsx'
import { addGooglePlayApp } from '#/lib/google.functions'
import { addAppleApp } from '#/lib/apple.functions'

// @storybook/tanstack-react auto-converts createServerFn(...).handler(...)
// results (addGooglePlayApp, addAppleApp) into spies, so they can be
// overridden per story with mocked(serverFn).mockResolvedValue/mockRejectedValue
// in beforeEach — no vi.mock() needed.
const meta = {
  component: AppUrlForm,
  tags: ['ai-generated'],
} satisfies Meta<typeof AppUrlForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText(/google play or app store url/i)
    await userEvent.type(input, 'https://play.google.com/store/apps/details?id=com.spotify.music')
    await expect(input).toHaveValue(
      'https://play.google.com/store/apps/details?id=com.spotify.music',
    )
    await expect(canvas.getByRole('button', { name: /import/i })).toBeVisible()
  },
}

export const SubmitSuccess: Story = {
  beforeEach: async () => {
    mocked(addGooglePlayApp).mockResolvedValue({
      appId: 'com.spotify.music',
      title: 'Spotify: Music and Podcasts',
      score: 4.34,
      installs: '1,000,000,000+',
    })
  },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText(/google play or app store url/i)
    await userEvent.type(input, 'https://play.google.com/store/apps/details?id=com.spotify.music')
    await userEvent.click(canvas.getByRole('button', { name: /import/i }))

    await expect(await canvas.findByText(/saved spotify: music and podcasts/i)).toBeVisible()
    await expect(input).toHaveValue('')
  },
}

export const SubmitError: Story = {
  beforeEach: async () => {
    mocked(addAppleApp).mockRejectedValue(new Error('No App Store app found for id "999999999".'))
  },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText(/google play or app store url/i)
    await userEvent.type(input, 'https://apps.apple.com/us/app/x/id999999999')
    await userEvent.click(canvas.getByRole('button', { name: /import/i }))

    await expect(
      await canvas.findByText(/no app store app found for id "999999999"/i),
    ).toBeVisible()
  },
}
