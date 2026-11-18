import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect } from 'storybook/test'
import { AppDetailView } from './AppDetailView.tsx'

const meta = {
  component: AppDetailView,
  tags: ['ai-generated'],
} satisfies Meta<typeof AppDetailView>

export default meta
type Story = StoryObj<typeof meta>

export const TwoStores: Story = {
  args: {
    app: { id: 1, title: 'Instagram (merged)' },
    // Same order loadAppDetail returns: Google listings first.
    relations: [
      {
        store: 'google',
        storeAppId: 'com.instagram.android',
        name: 'Instagram',
        url: 'https://play.google.com/store/apps/details?id=com.instagram.android',
      },
      {
        store: 'apple',
        storeAppId: '389801252',
        name: 'Instagram',
        url: 'https://apps.apple.com/app/id389801252',
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Instagram (merged)' })).toBeVisible()

    const logos = canvas.getAllByRole('img')
    await expect(logos.map((img) => img.getAttribute('alt'))).toEqual([
      'Google Play',
      'App Store',
    ])

    const links = canvas.getAllByRole('link')
    await expect(links[0]).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.instagram.android',
    )
    await expect(links[0]).toHaveAttribute('target', '_blank')
    await expect(canvas.queryByText(/★/)).not.toBeInTheDocument()
  },
}

export const SingleListing: Story = {
  args: {
    app: { id: 2, title: 'WhatsApp Messenger' },
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
    await expect(canvas.getByRole('heading', { name: 'WhatsApp Messenger' })).toBeVisible()
    await expect(canvas.getByRole('img', { name: 'Google Play' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /unmerge/i })).not.toBeInTheDocument()
  },
}

export const Empty: Story = {
  args: {
    app: { id: 3, title: 'Orphaned group' },
    relations: [],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Orphaned group' })).toBeVisible()
    await expect(canvas.getByText('No linked store listings.')).toBeVisible()
  },
}
