import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, key, dataUrl } = await req.json()
    if (!email || !key || !dataUrl) {
      return NextResponse.json({ error: 'missing params' }, { status: 400 })
    }

    const base64 = dataUrl.split(',')[1]
    if (!base64) return NextResponse.json({ error: 'invalid dataUrl' }, { status: 400 })

    const buf = Buffer.from(base64, 'base64')
    const path = `${email}/${key}.jpg`

    const { error } = await admin.storage
      .from('photos')
      .upload(path, buf, { contentType: 'image/jpeg', upsert: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data } = admin.storage.from('photos').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { email, key } = await req.json()
    if (!email || !key) return NextResponse.json({ error: 'missing params' }, { status: 400 })
    await admin.storage.from('photos').remove([`${email}/${key}.jpg`])
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
