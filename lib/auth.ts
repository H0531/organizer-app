export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export type OAuthUser = {
  name: string
  email: string
  picture?: string
  provider: 'google'
}

export function getUserFromCookie(): OAuthUser | null {
  if (typeof document === 'undefined') return null
  try {
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith('organizer_user='))
    if (!match) return null
    return JSON.parse(decodeURIComponent(match.split('=')[1]))
  } catch {
    return null
  }
}

export function clearUserCookie() {
  document.cookie = 'organizer_user=; Max-Age=0; path=/'
}
