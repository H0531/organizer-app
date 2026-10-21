// S2-19、S2-20：前端純函式（案例定義見 S2 第一階段報告 B-2）
import { describe, expect, it, vi } from 'vitest'
import { parsePhotoRef } from '../../lib/photoRef'
import { storageKeyFromPhotoRef } from '../../lib/photos'

// lib/photos 會載入瀏覽器 Supabase client；這裡以空物件取代，不建立任何連線
vi.mock('../../lib/supabase', () => ({ supabase: {} }))

const SUPA = 'http://127.0.0.1:9'
const PUBLIC = `${SUPA}/storage/v1/object/public/photos`

describe('S2-19 parsePhotoRef', () => {
  it('其他網域的 URL → invalid', () => {
    expect(parsePhotoRef('https://evil.example.test/storage/v1/object/public/photos/a@example.test/checklist_1_before_0.jpg').type).toBe('invalid')
  })

  it('其他 bucket → invalid', () => {
    expect(parsePhotoRef(`${SUPA}/storage/v1/object/public/other/a@example.test/checklist_1_before_0.jpg`).type).toBe('invalid')
  })

  it('雙重編碼 %252F → invalid（只解碼一次，解碼後仍含 %）', () => {
    expect(parsePhotoRef(`${PUBLIC}/a@example.test/checklist_1%252Fbefore_0.jpg`).type).toBe('invalid')
    expect(parsePhotoRef('a@example.test/checklist_1%2Fbefore_0.jpg').type).toBe('invalid')
  })

  it('.. 段 → invalid', () => {
    expect(parsePhotoRef(`${PUBLIC}/../a@example.test/checklist_1_before_0.jpg`).type).toBe('invalid')
    expect(parsePhotoRef(`${PUBLIC}/%2e%2e/checklist_1_before_0.jpg`).type).toBe('invalid')
    expect(parsePhotoRef('../checklist_1_before_0.jpg').type).toBe('invalid')
    expect(parsePhotoRef('a@example.test/..').type).toBe('invalid')
  })

  it('%40 解碼一次 → 正確還原成 @', () => {
    expect(parsePhotoRef(`${PUBLIC}/a%40example.test/checklist_1_before_0.jpg`)).toEqual({
      type: 'storage',
      path: 'a@example.test/checklist_1_before_0.jpg',
    })
  })
})

describe('S2-20 storageKeyFromPhotoRef', () => {
  it('別人的資料夾 → null', () => {
    expect(storageKeyFromPhotoRef('b@example.test/checklist_7_before_0.jpg', 'a@example.test', 'checklist_7_')).toBeNull()
  })

  it('前綴不符 → null', () => {
    expect(storageKeyFromPhotoRef('a@example.test/checklist_8_before_0.jpg', 'a@example.test', 'checklist_7_')).toBeNull()
    expect(storageKeyFromPhotoRef('a@example.test/checklist_70_before_0.jpg', 'a@example.test', 'checklist_7_')).toBeNull()
  })

  it('exact 模式：key 必須剛好等於前綴', () => {
    expect(storageKeyFromPhotoRef('a@example.test/toss_photo_5.jpg', 'a@example.test', 'toss_photo_5', true)).toBe('toss_photo_5')
    expect(storageKeyFromPhotoRef('a@example.test/toss_photo_55.jpg', 'a@example.test', 'toss_photo_5', true)).toBeNull()
    // 對照：非 exact 時 toss_photo_55 以 toss_photo_5 開頭，會被接受
    expect(storageKeyFromPhotoRef('a@example.test/toss_photo_55.jpg', 'a@example.test', 'toss_photo_5')).toBe('toss_photo_55')
  })

  it('只有自己資料夾且前綴相符時回傳 key（email 參數不分大小寫）', () => {
    expect(storageKeyFromPhotoRef('a@example.test/checklist_7_after_2.png', 'A@Example.test', 'checklist_7_')).toBe('checklist_7_after_2')
    expect(storageKeyFromPhotoRef(`${PUBLIC}/a%40example.test/checklist_7_before_0.jpg`, 'a@example.test', 'checklist_7_')).toBe('checklist_7_before_0')
  })
})
