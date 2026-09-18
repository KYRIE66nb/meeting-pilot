import React from 'react'
import type { GoalItem, LoggedDecision, LoggedAction, LoggedRisk, Meeting, Participant } from '../types'

export const AGENDA_MODES: Array<{ value: 'timeline' | 'speaker' | 'phase' | 'matrix'; label: string; hint: string }> = [
  { value: 'timeline', label: '按时间顺序', hint: '开场 → 背景 → 讨论 → 决策 → 行动项，按时间块推进' },
  { value: 'speaker', label: '按发言人顺序', hint: '产品、技术、销售等角色依次确认，每个环节绑定必发言人' },
  { value: 'phase', label: '按环节推进', hint: '背景 → 方案 → 风险 → 决策 → 下一步，按议题环节推进' },
  { value: 'matrix', label: '环节 × 发言人矩阵', hint: '每个环节下指定哪些人必须发言，会中按矩阵检查表态情况' },
]

// ---------- 基础小组件 ----------

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="card w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button className="text-slate-400 hover:text-slate-600 text-xl leading-none" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PriorityTag({ p }: { p: 'must' | 'should' | 'note' }) {
  const map = {
    must: ['tag-must', '必须完成'],
    should: ['tag-should', '建议完成'],
    note: ['tag-note', '仅供记录'],
  } as const
  const [cls, label] = map[p]
  return <span className={cls}>{label}</span>
}

export function StatusIcon({ status }: { status: 'ok' | 'part' | 'miss' }) {
  const map = {
    ok: 'text-emerald-600',
    part: 'text-amber-500',
    miss: 'text-rose-500',
  } as const
  const icon = status === 'ok' ? '✓' : status === 'part' ? '◐' : '✗'
  return <span className={`${map[status]} font-bold select-none`} title={status === 'ok' ? '已覆盖' : status === 'part' ? '部分覆盖/讨论未决' : '未覆盖'}>{icon}</span>
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-bold text-slate-700">{children}</h3>
      {right}
    </div>
  )
}

const SPEAKER_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
]

export function SpeakerChip({ p, idx, muted }: { p: Participant; idx: number; muted?: boolean }) {
  return (
    <span className={`chip ${muted ? 'bg-slate-100 text-slate-400' : SPEAKER_COLORS[idx % SPEAKER_COLORS.length]}`}>
      {p.name}·{p.role}
    </span>
  )
}

export function speakerIdx(meeting: Meeting, id: string) {
  return meeting.participants.findIndex((p) => p.id === id)
}

export function speakerName(meeting: Meeting, id?: string) {
  if (!id) return '—'
  const p = meeting.participants.find((x) => x.id === id)
  return p ? `${p.name}（${p.role}）` : '—'
}

// ---------- 决策 / 行动项 / 风险 卡片 ----------

export function DecisionCard({
  meeting,
  d,
  onRemove,
}: {
  meeting: Meeting
  d: LoggedDecision
  onRemove?: () => void
}) {
  const item = meeting.goal.decisions.find((i) => i.id === d.goalItemId)
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          {item && <span className="tag-ok mr-1">{item.text}</span>}
          <span className="text-slate-700">{d.text}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {d.auto && <span className="text-[10px] text-emerald-600 border border-emerald-300 rounded px-1">规则自动识别</span>}
          {onRemove && (
            <button className="text-slate-300 hover:text-rose-500" title="删除（误识别时）" onClick={onRemove}>
              ×
            </button>
          )}
        </div>
      </div>
      <div className="mt-1 text-xs text-slate-500">决策人：{speakerName(meeting, d.decidedBy)}</div>
    </div>
  )
}

export function ActionRow({
  meeting,
  a,
  onUpdate,
  compact,
}: {
  meeting: Meeting
  a: LoggedAction
  onUpdate?: (patch: Partial<LoggedAction>) => void
  compact?: boolean
}) {
  const srcLabel = a.source === 'gap' ? '缺口转入' : a.source === 'live' ? '会中新增' : '预置'
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="flex-1 min-w-[12rem] text-slate-700">{a.text}</span>
      {onUpdate ? (
        <>
          <select
            className="input !w-auto !py-1 text-xs"
            value={a.owner ?? ''}
            onChange={(e) => onUpdate({ owner: e.target.value || undefined })}
          >
            <option value="">负责人：未定</option>
            {meeting.participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}（{p.role}）
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input !w-auto !py-1 text-xs"
            value={a.due ?? ''}
            onChange={(e) => onUpdate({ due: e.target.value || undefined })}
          />
        </>
      ) : (
        <span className={`chip ${a.owner ? 'bg-slate-100 text-slate-600' : 'tag-miss'}`}>
          {a.owner ? speakerName(meeting, a.owner) : '缺负责人'}
        </span>
      )}
      {compact ? (
        <span className={`chip ${a.due ? 'bg-slate-100 text-slate-600' : 'tag-miss'}`}>{a.due ?? '缺截止时间'}</span>
      ) : null}
      <span className="chip bg-slate-100 text-slate-500">{srcLabel}</span>
    </div>
  )
}

export function RiskRow({ r, onResolve }: { r: LoggedRisk; onResolve?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
      <span className="flex-1 text-slate-700">⚠️ {r.text}</span>
      {r.blocking && <span className="tag-must">阻塞</span>}
      {r.resolved ? (
        <span className="tag-ok">已解决</span>
      ) : (
        onResolve && (
          <button className="btn-ghost !py-1 text-xs" onClick={onResolve}>
            标记已解决
          </button>
        )
      )}
    </div>
  )
}

// ---------- 目标条目（会中看板用） ----------

export function GoalItemRow({
  item,
  status,
  detail,
  onManual,
  focused,
}: {
  item: GoalItem
  status: 'ok' | 'part' | 'miss'
  detail?: string
  onManual?: () => void
  focused?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
        focused ? 'ring-2 ring-brand-500 bg-brand-50' : 'hover:bg-slate-50'
      }`}
      id={`goal-${item.id}`}
    >
      <span className="mt-0.5">
        <StatusIcon status={status} />
      </span>
      <div className="flex-1">
        <div className="text-slate-700">
          {item.text} <PriorityTag p={item.priority} />
        </div>
        {detail && <div className="text-xs text-slate-400 mt-0.5">{detail}</div>}
      </div>
      {onManual && (
        <button
          className="shrink-0 text-xs text-brand-600 hover:underline"
          onClick={onManual}
          title="关键词没匹配到时，可手动标记覆盖"
        >
          {item.manualDone ? '取消手动标记' : '手动标记✓'}
        </button>
      )}
    </div>
  )
}
