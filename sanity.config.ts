'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './sanity/schemaTypes'

export default defineConfig({
  name: 'lexreg-africa',
  title: 'LexReg Africa',
  projectId: '4npxta19',
  dataset: 'production',
  plugins: [
    structureTool(),
  ],
  schema: {
    types: schemaTypes,
  },
})
