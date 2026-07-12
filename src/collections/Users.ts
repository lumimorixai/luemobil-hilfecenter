import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Benutzer', plural: 'Benutzer' },
  auth: true,
  admin: {
    useAsTitle: 'email',
    group: 'System',
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
    },
  ],
}
