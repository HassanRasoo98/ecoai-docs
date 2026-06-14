import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'EcoAI',
  description: 'Stop paying for the same AI response twice — open-source caching SDK for AI apps.',
  // Set base to '/ecoai-docs/' if deploying to GitHub Pages under a subpath.
  // Change to '/' if using a custom domain.
  base: '/ecoai-docs/',

  head: [['link', { rel: 'icon', href: '/ecoai-docs/favicon.ico' }]],

  themeConfig: {
    logo: null,
    siteTitle: 'EcoAI',

    nav: [
      { text: 'npm SDK', link: '/npm/getting-started' },
      { text: 'Python SDK', link: '/python/getting-started' },
      { text: 'Dashboard', link: '/shared/dashboard' },
      {
        text: 'GitHub',
        items: [
          { text: 'JS SDK', link: 'https://github.com/HassanRasoo98/ecoai' },
          { text: 'Python SDK', link: 'https://github.com/HassanRasoo98/ecoai-python' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'npm SDK (eco-ai)',
        items: [
          { text: 'Getting Started', link: '/npm/getting-started' },
          { text: 'API Reference', link: '/npm/api-reference' },
        ],
      },
      {
        text: 'Python SDK (ecoai)',
        items: [
          { text: 'Getting Started', link: '/python/getting-started' },
          { text: 'API Reference', link: '/python/api-reference' },
        ],
      },
      {
        text: 'Shared',
        items: [
          { text: 'Prompt Types', link: '/shared/prompt-types' },
          { text: 'Dashboard', link: '/shared/dashboard' },
          { text: 'Semantic Caching', link: '/shared/semantic-caching' },
        ],
      },
      {
        text: 'Publishing',
        items: [{ text: 'Publishing Guide', link: '/publishing' }],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/HassanRasoo98/ecoai' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Hassan Rasool',
    },

    editLink: {
      pattern: 'https://github.com/HassanRasoo98/ecoai-docs/edit/main/:path',
      text: 'Edit this page on GitHub',
    },
  },
})
