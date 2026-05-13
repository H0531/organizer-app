import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://iamych.app/sitemap.xml',
    host: 'https://iamych.app',
  }
}
