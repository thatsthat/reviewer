import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, mocked } from 'storybook/test'
import { AppList } from './AppList.tsx'
import { mergeApps } from '#/lib/apps.functions'

const meta = {
  component: AppList,
  tags: ['ai-generated'],
} satisfies Meta<typeof AppList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    apps: [
      { id: 1, title: 'Spotify: Music and Podcasts' },
      { id: 2, title: 'Instagram' },
      { id: 3, title: 'WhatsApp Messenger' },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Spotify: Music and Podcasts')).toBeVisible()
    await expect(canvas.getByText('Instagram')).toBeVisible()
  },
}

export const Empty: Story = {
  args: { apps: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No apps yet.')).toBeVisible()
  },
}

export const MergeTwoApps: Story = {
  args: {
    apps: [
      { id: 1, title: 'Instagram (Apple)' },
      { id: 2, title: 'Instagram (Google)' },
    ],
  },
  beforeEach: async () => {
    mocked(mergeApps).mockResolvedValue(undefined)
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('checkbox', { name: /select instagram \(apple\)/i }))
    await userEvent.click(canvas.getByRole('checkbox', { name: /select instagram \(google\)/i }))
    await expect(canvas.getByText('2 selected')).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: /^merge$/i }))

    await expect(mocked(mergeApps)).toHaveBeenCalledWith({
      data: { targetAppId: 1, sourceAppIds: [2] },
    })
  },
}
