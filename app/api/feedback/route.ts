import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_BODY_BYTES = 16 * 1024
const MAX_MESSAGE_LENGTH = 2000
const MAX_EMAIL_LENGTH = 254

const invalid = () => NextResponse.json({ error: 'invalid request' }, { status: 400 })

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'request too large' }, { status: 413 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return invalid()
    }
    if (!body || typeof body !== 'object') return invalid()
    const { message, contact_email } = body as Record<string, unknown>

    if (typeof message !== 'string') return invalid()
    const trimmedMessage = message.trim()
    if (trimmedMessage.length < 1 || trimmedMessage.length > MAX_MESSAGE_LENGTH) return invalid()

    let email: string | null = null
    if (contact_email !== undefined && contact_email !== null) {
      if (typeof contact_email !== 'string') return invalid()
      const trimmedEmail = contact_email.trim()
      if (trimmedEmail.length > MAX_EMAIL_LENGTH) return invalid()
      email = trimmedEmail || null
    }

    const { error } = await supabaseAdmin
      .from('feedback')
      .insert({ message: trimmedMessage, contact_email: email, submitted_at: new Date().toISOString() })
    if (error) {
      console.error('POST /api/feedback insert error:', error)
      return NextResponse.json({ error: 'failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/feedback error:', err)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
