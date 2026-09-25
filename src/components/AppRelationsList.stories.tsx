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
        rating: 4.7,
        ratingCount: 29486620,
      },
      {
        store: 'google',
        storeAppId: 'com.instagram.android',
        name: 'Instagram',
        rating: 4.0,
        ratingCount: 169241933,
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('App Store · 4.7★ (29,486,620)')).toBeVisible()
    await expect(canvas.getByText('Google Play · 4.0★ (169,241,933)')).toBeVisible()
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
        rating: 4.7,
        ratingCount: 29486620,
      },
      {
        store: 'google',
        storeAppId: 'com.instagram.android',
        name: 'Instagram',
        rating: 4.0,
        ratingCount: 169241933,
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
        rating: 4.6,
        ratingCount: 10000000,
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: /unmerge/i })).not.toBeInTheDocument()
  },
}

export const Empty: Story = {
  args: { relations: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No linked store listings.')).toBeVisible()
  },
}
