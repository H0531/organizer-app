import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { message, contact_email, submitted_at } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'empty message' }, { status: 400 })
    }
    await supabaseAdmin
      .from('feedback')
      .insert({ message: message.trim(), contact_email: contact_email || null, submitted_at })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/feedback error:', err)
    return NextResponse.json({ ok: true })
  }
}
