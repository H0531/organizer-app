'use client'
import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { ChecklistLog, DeclutterRecord } from '@/lib/types'

const sg = '#7A9E8A', ink = '#2C2820', ml = '#6B6358', mf = '#A39B8E', ww = '#FAF8F4', bd = '#DDD8CF', cr = '#EDE8DD'
const PIE_COLORS = ['#7A9E8A', '#C4A882', '#C47B5A', '#4285F4', '#A8C4D8', '#D4A5C9']

type Props = { checklistLogs: ChecklistLog[]; declutterRecords: DeclutterRecord[] }

export default function StatsCharts({ checklistLogs, declutterRecords }: Props) {
  // 近 6 個月：整理次數 + 斷捨離件數
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; sessions: number; items: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months[key] = { month: `${d.getMonth() + 1}月`, sessions: 0, items: 0 }
    }
    checklistLogs.forEach(log => {
      // date 格式：YYYY/MM/DD 或 YYYY-MM-DD
      const key = log.date.slice(0, 7).replace('/', '-')
      if (months[key]) months[key].sessions++
    })
    declutterRecords.forEach(r => {
      // savedAt 格式：YYYY/MM/DD HH:MM
      const key = r.savedAt.slice(0, 7).replace('/', '-')
      if (months[key]) months[key].items += r.items.length
    })
    return Object.values(months)
  }, [checklistLogs, declutterRecords])

  // 空間分布
  const spaceData = useMemo(() => {
    const counts: Record<string, number> = {}
    checklistLogs.forEach(log => {
      counts[log.space] = (counts[log.space] ?? 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
  }, [checklistLogs])

  // 斷捨離決策比例
  const decisionData = useMemo(() => {
    let keep = 0, donate = 0, toss = 0
    declutterRecords.forEach(r =>
      r.items.forEach(item => {
        if (item.decision === 'keep') keep++
        else if (item.decision === 'donate') donate++
        else if (item.decision === 'toss') toss++
      })
    )
    return [
      { name: '留', value: keep },
      { name: '送', value: donate },
      { name: '丟', value: toss },
    ].filter(d => d.value > 0)
  }, [declutterRecords])

  const totalSessions = checklistLogs.length
  const totalItems = declutterRecords.reduce((a, r) => a + r.items.length, 0)
  const totalMins = checklistLogs.reduce((a, l) => a + l.duration, 0)
  const totalHours = Math.floor(totalMins / 60)
  const remMins = Math.floor((totalMins % 3600) / 60)

  const hasAnyData = totalSessions > 0 || totalItems > 0

  return (
    <div>
      {/* 摘要卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: '整理次數', value: totalSessions, unit: '次' },
          { label: '斷捨離件', value: totalItems, unit: '件' },
          { label: '整理時間', value: totalHours > 0 ? totalHours : remMins, unit: totalHours > 0 ? 'hr' : 'min' },
        ].map(s => (
          <div key={s.label} style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '14px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: sg, lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: mf }}>{s.unit}</div>
            <div style={{ fontSize: 11, color: ml, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {!hasAnyData && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 14, color: ml }}>還沒有紀錄，開始整理後圖表就會出現 ✨</div>
        </div>
      )}

      {/* 月份趨勢 */}
      {hasAnyData && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 12px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 14 }}>近 6 個月趨勢</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: mf }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: mf }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: ww, border: `1px solid ${bd}`, borderRadius: 8, fontSize: 12, color: ink }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any, name: any) => [val, name === 'sessions' ? '整理次數' : '斷捨離件'] as [any, string]}
              />
              <Bar dataKey="sessions" fill={sg} radius={[4, 4, 0, 0]} name="sessions" />
              <Bar dataKey="items" fill="#C4A882" radius={[4, 4, 0, 0]} name="items" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
            {[{ color: sg, label: '整理次數' }, { color: '#C4A882', label: '斷捨離件數' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: ml }}>
                <div style={{ width: 10, height: 10, background: l.color, borderRadius: 2 }} />{l.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 整理空間分布 */}
      {spaceData.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 12px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 14 }}>整理空間分布</div>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie
                data={spaceData}
                cx="50%" cy="50%"
                outerRadius={72}
                dataKey="value"
                label={(props: { name?: string; percent?: number }) =>
                  `${props.name ?? ''} ${Math.round((props.percent ?? 0) * 100)}%`
                }
                labelLine={false}
                fontSize={11}
              >
                {spaceData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: ww, border: `1px solid ${bd}`, borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          {/* 圖例 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', marginTop: 4 }}>
            {spaceData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: ml }}>
                <div style={{ width: 10, height: 10, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 2 }} />{d.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 斷捨離決策比例 */}
      {decisionData.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 12px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 14 }}>斷捨離決策比例</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={decisionData}
                cx="50%" cy="50%"
                outerRadius={62}
                dataKey="value"
                label={(props: { name?: string; percent?: number }) =>
                  `${props.name ?? ''} ${Math.round((props.percent ?? 0) * 100)}%`
                }
                labelLine={false}
                fontSize={11}
              >
                {decisionData.map((_, i) => (
                  <Cell key={i} fill={[sg, '#4285F4', '#C47B5A'][i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: ww, border: `1px solid ${bd}`, borderRadius: 8, fontSize: 12 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: ml }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 整理紀錄 — 最近 5 筆 */}
      {checklistLogs.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>最近整理紀錄</div>
          {checklistLogs.slice(0, 5).map((log, i) => {
            const mins = Math.floor(log.duration / 60)
            const secs = log.duration % 60
            const timeStr = mins > 0 ? `${mins}分${secs > 0 ? `${secs}秒` : ''}` : `${secs}秒`
            return (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < Math.min(checklistLogs.length, 5) - 1 ? `1px solid ${cr}` : 'none' }}>
                <div>
                  <span style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{log.space}</span>
                  <span style={{ fontSize: 11, color: mf, marginLeft: 8 }}>{log.date}</span>
                </div>
                <span style={{ fontSize: 12, color: sg, fontWeight: 500 }}>{timeStr}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
