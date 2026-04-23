import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'photos'

export async function POST(req: NextRequest) {
  try {
    const { email, key, dataUrl } = await req.json()
    if (!email || !key || !dataUrl) {
      return NextResponse.json({ error: 'missing params' }, { status: 400 })
    }

    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')

    const mimeMatch = dataUrl.match(/^data:(image\/\w+);base64,/)
    const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const ext = contentType === 'image/png' ? 'png' : 'jpg'

    // 不 encode email，讓資料夾名稱與 public URL 一致
    const path = `${email}/${key}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    console.error('POST /api/photos error:', err)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { email, key } = await req.json()
    if (!email || !key) {
      return NextResponse.json({ error: 'missing params' }, { status: 400 })
    }

    const paths = [
      `${email}/${key}.jpg`,
      `${email}/${key}.png`,
    ]
    await supabaseAdmin.storage.from(BUCKET).remove(paths)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/photos error:', err)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
