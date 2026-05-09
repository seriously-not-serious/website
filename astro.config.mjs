// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

import react from '@astrojs/react';

import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  server: {
    allowedHosts: ['x-dev2']
  },

  adapter: node({
    mode: 'standalone'
  }),

  fonts: [{
    provider: fontProviders.google(),
    name: 'Inter',
    cssVariable: '--font-inter',
    options: {
      variants: [{
        weight: 700,
        style: 'normal'
      }]
    }
  },
{
    provider: fontProviders.google(),
    name: 'Outfit',
    cssVariable: '--font-outfit',
    options: {
      variants: [{
        weight: 700,
        style: 'normal'
      }]
    }
}],

  integrations: [react(), starlight({
    title: "Seriously not Serious",
  })]
});