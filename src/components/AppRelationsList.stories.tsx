import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, mocked } from 'storybook/test'
import { AppRelationsList } from './AppRelationsList.tsx'
import { unmergeApp } from '#/lib/apps.functions'

const meta = {
  component: AppRelationsList,
  tags: ['ai-generated'],
} satisfies Meta<typeof AppRelationsList>

export default meta
type Story = StoryObj<typeof meta>

export const MergedGroup: Story = {
  args: {
    relations: [
      {
        store: 'apple',
        storeAppId: '389801252',
        name: 'Instagram',
        url: 'https://apps.apple.com/app/id389801252',
      },
      {
        store: 'google',
        storeAppId: 'com.instagram.android',
        name: 'Instagram',
        url: 'https://play.google.com/store/apps/details?id=com.instagram.android',
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'App Store' })).toBeVisible()
    await expect(canvas.getByRole('img', { name: 'Google Play' })).toBeVisible()
    await expect(canvas.getAllByText('Instagram')).toHaveLength(2)
    // Ratings are left to the store pages.
    await expect(canvas.queryByText(/★/)).not.toBeInTheDocument()
    // Unmerge only makes sense when there's more than one linked listing.
    await expect(canvas.getAllByRole('button', { name: /unmerge/i })).toHaveLength(2)
  },
}

export const UnmergeListing: Story = {
  args: {
    relations: [
      {
        store: 'apple',
        storeAppId: '389801252',
        name: 'Instagram',
        url: 'https://apps.apple.com/app/id389801252',
      },
      {
        store: 'google',
        storeAppId: 'com.instagram.android',
        name: 'Instagram',
        url: 'https://play.google.com/store/apps/details?id=com.instagram.android',
      },
    ],
  },
  beforeEach: async () => {
    mocked(unmergeApp).mockResolvedValue(undefined)
  },
  play: async ({ canvas, userEvent }) => {
    const [appleUnmerge] = canvas.getAllByRole('button', { name: /unmerge/i })
    await userEvent.click(appleUnmerge)

    await expect(mocked(unmergeApp)).toHaveBeenCalledWith({
      data: { store: 'apple', appId: '389801252' },
    })
  },
}

export const SingleListing: Story = {
  args: {
    relations: [
      {
        store: 'google',
        storeAppId: 'com.whatsapp',
        name: 'WhatsApp Messenger',
        url: 'https://play.google.com/store/apps/details?id=com.whatsapp',
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Google Play' })).toBeVisible()
    await expect(canvas.getByText('WhatsApp Messenger')).toBeVisible()
    await expect(canvas.queryByText(/★/)).not.toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: /unmerge/i })).not.toBeInTheDocument()
  },
}

export const Empty: Story = {
  args: { relations: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No linked store listings.')).toBeVisible()
  },
}
