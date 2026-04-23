import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://organizer-app-mauve.vercel.app/sitemap.xml',
    host: 'https://organizer-app-mauve.vercel.app',
  }
}
