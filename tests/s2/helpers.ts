import path from 'node:path'
import { NextRequest } from 'next/server'

// 預設測試 repo 內的正式 route；S2_PHOTOS_API_DIR 只用於檢查測試靈敏度的暫時變異版本
const API_DIR = process.env.S2_PHOTOS_API_DIR ?? path.resolve(process.cwd(), 'app/api/photos')

type PhotosRoute = typeof import('../../app/api/photos/route')
type SignRoute = typeof import('../../app/api/photos/sign/route')

export const loadPhotosRoute = () => import(/* @vite-ignore */ path.join(API_DIR, 'route.ts')) as Promise<PhotosRoute>
export const loadSignRoute = () => import(/* @vite-ignore */ path.join(API_DIR, 'sign/route.ts')) as Promise<SignRoute>

export function makeRequest(
  pathname: string,
  method: 'POST' | 'DELETE',
  opts: { token?: string; body?: unknown } = {}
): NextRequest {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`)
  const body = opts.body === undefined ? undefined : JSON.stringify(opts.body)
  return new NextRequest(new URL(pathname, 'http://localhost'), { method, headers, body })
}

// 合法的極小 PNG：8 bytes PNG signature + 4 bytes 0
export const TINY_PNG_DATA_URL =
  'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString('base64')

export const A = 'a@example.test'
export const B = 'b@example.test'
export const OWN = `${A}/checklist_1_before_0.jpg`
export const OTHER = `${B}/checklist_1_before_0.jpg`
