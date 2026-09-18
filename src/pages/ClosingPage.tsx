import { useMemo, useState } from 'react'
import { useAppStore, useMeeting } from '../store'
import { computeGaps, hasBlockingGaps } from '../engine'
import type { GapView } from '../engine'
import type { LoggedAction } from '../types'
import { ActionModal, DecisionModal, ExceptionModal } from '../components/modals'

const KIND_LABEL: Record<GapView['kind'], string> = {
  topic: '议题遗漏',
  speaker: '发言人未表态',
  'decision-open': '决策未讨论',
  'decision-undone': '讨论过但没决定',
  conclusion: '结论未形成',
  'action-missing': '行动项未产生',
  'action-owner': '行动项缺负责人',
  'action-due': '行动项缺截止时间',
  risk: '阻塞性问题',
}

export default function ClosingPage() {
  const meeting = useMeeting(useAppStore((s) => s.currentId))
  const go = useAppStore((s) => s.go)
  const setFocus = useAppStore((s) => s.setFocus)
  const resolveGap = useAppStore((s) => s.resolveGap)
  const unresolveGap = useAppStore((s) => s.unresolveGap)
  const overrideGap = useAppStore((s) => s.overrideGap)
  const updateAction = useAppStore((s) => s.updateAction)
  const resolveRisk = useAppStore((s) => s.resolveRisk)
  const endMeeting = useAppStore((s) => s.endMeeting)

  const [exceptionGap, setExceptionGap] = useState<GapView | null>(null)
  const [actionGap, setActionGap] = useState<GapView | null>(null)
  const [decisionGap, setDecisionGap] = useState<GapView | null>(null)
  const [showResolved, setShowResolved] = useState(false)

  const gaps = useMemo(() => (meeting ? computeGaps(meeting) : []), [meeting])

  if (!meeting) return null
  const m = meeting

  const blocking = gaps.filter((g) => g.effectiveBlocking && !g.resolved)
  const followup = gaps.filter((g) => !g.effectiveBlocking && !g.resolved)
  const resolved = gaps.filter((g) => g.resolved)
  const canEnd = !hasBlockingGaps(gaps)

  const backToDiscuss = (g: GapView) => {
    if (g.goalItemId) setFocus(g.goalItemId)
    else if (g.segmentId) setFocus(g.segmentId)
    go('live', m.id)
  }

  const gapPrefillText = (g: GapView) => {
    const item = g.goalItemId
      ? [...m.goal.decisions, ...m.goal.actionItems, ...m.goal.conclusions].find((i) => i.id === g.goalItemId)
      : undefined
    return item ? `【会后跟进】${item.text}` : `【会后跟进】${g.text}`
  }

  const GapCard = ({ g, tone }: { g: GapView; tone: 'red' | 'amber' }) => (
    <div
      className={`rounded-xl border p-3 ${
        tone === 'red' ? 'border-rose-200 bg-rose-50/60' : 'border-amber-200 bg-amber-50/60'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`chip ${tone === 'red' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'} shrink-0`}>
          {KIND_LABEL[g.kind]}
        </span>
        <div className="flex-1">
          <div className="text-sm text-slate-800 font-medium">{g.text}</div>
          {g.detail && <div className="text-xs text-slate-500 mt-0.5">{g.detail}</div>}
        </div>
        <button
          className="text-xs text-slate-400 hover:text-slate-600 shrink-0 underline"
          onClick={() => overrideGap(m.id, g.id, !g.effectiveBlocking)}
          title="主持人可改判该项是否阻塞结束"
        >
          {g.effectiveBlocking ? '改判为可跟进 ↓' : '改判为阻塞 ↑'}
        </button>
      </div>

      {/* 行动项缺 owner/due：就地补齐 */}
      {g.actionId && (g.kind === 'action-owner' || g.kind === 'action-due') && (
        <ActionFixInline
          action={m.actions.find((a) => a.id === g.actionId)!}
          onPatch={(patch) => updateAction(m.id, g.actionId!, patch)}
        />
      )}

      <div className="flex flex-wrap gap-2 mt-2">
        <button className="btn-ghost !py-1 text-xs" onClick={() => backToDiscuss(g)}>
          ↩ 返回继续讨论
        </button>
        {(g.kind === 'decision-open' || g.kind === 'decision-undone') && (
          <button className="btn-primary !py-1 text-xs" onClick={() => setDecisionGap(g)}>
            ✅ 现在拍板
          </button>
        )}
        {g.kind !== 'action-owner' && g.kind !== 'action-due' && (
          <button className="btn-soft !py-1 text-xs" onClick={() => setActionGap(g)}>
            📋 转成行动项（会后跟进）
          </button>
        )}
        {g.kind === 'risk' && (
          <button className="btn-soft !py-1 text-xs" onClick={() => resolveRisk(m.id, g.id.replace('risk:', ''))}>
            ✓ 标记已解决
          </button>
        )}
        <button className="btn-ghost !py-1 text-xs" onClick={() => setExceptionGap(g)}>
          📝 记录例外原因后跳过
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">结束前缺口检查</h1>
        <span className="text-xs text-slate-400">
          决策 {m.decisions.length} · 行动项 {m.actions.length} · 例外{' '}
          {Object.values(m.gapResolutions).filter((r) => r.type === 'exception').length}
        </span>
      </div>

      {/* 结论横幅 */}
      <div
        className={`card p-5 border-l-4 ${canEnd ? 'border-l-emerald-500' : 'border-l-rose-500'}`}
      >
        {canEnd ? (
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center text-lg shrink-0" aria-hidden>✓</span>
            <div className="flex-1">
              <h2 className="font-bold text-emerald-700 text-base">没有阻塞会议结束的问题，可以正式结束</h2>
              <p className="text-sm text-slate-500 mt-1">
                {blocking.length === 0 && followup.length === 0
                  ? '所有必须完成的目标项均已覆盖。'
                  : `剩余 ${followup.length} 项可会后跟进的问题（不阻塞散会），将写入总结的“未解决问题”。`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 grid place-items-center text-base font-bold shrink-0" aria-hidden>!</span>
            <div className="flex-1">
              <h2 className="font-bold text-rose-700 text-base">
                还有 <span className="text-2xl tabular-nums align-middle mx-0.5">{blocking.length}</span> 项阻塞会议结束的问题
                {followup.length > 0 && <span className="text-amber-600 text-sm font-medium">，另有 {followup.length} 项可会后跟进</span>}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                为了达成本次会议目标：必须讨论的议题、必须发言的人、关键决策、行动项负责人/截止时间、阻塞性问题中仍有未闭环项。
                可返回讨论、现在拍板、将缺口转为行动项，或记录例外原因后跳过；全部阻塞项处理完即可正式结束。
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <button className="btn-ghost" onClick={() => go('live', m.id)}>
            ↩ 返回会议
          </button>
          <button
            className="btn-primary"
            disabled={!canEnd}
            title={canEnd ? '' : '仍有阻塞项未处理'}
            onClick={() => endMeeting(m.id)}
          >
            正式结束会议并生成总结 →
          </button>
        </div>
      </div>

      {/* 阻塞区 */}
      <section>
        <h2 className="text-sm font-bold text-rose-700 mb-2">
          🔴 阻塞会议结束的问题（{blocking.length}）
          <span className="ml-2 text-xs font-normal text-slate-400">
            不处理则无法正式结束；不达目标不散会
          </span>
        </h2>
        {blocking.length === 0 ? (
          <div className="card p-3 text-sm text-slate-400">（无）</div>
        ) : (
          <div className="space-y-2">
            {blocking.map((g) => (
              <GapCard key={g.id} g={g} tone="red" />
            ))}
          </div>
        )}
      </section>

      {/* 跟进区 */}
      <section>
        <h2 className="text-sm font-bold text-amber-600 mb-2">
          🟡 可会后跟进的问题（{followup.length}）
          <span className="ml-2 text-xs font-normal text-slate-400">
            建议级缺口 / 不影响本次会议目标，可转行动项
          </span>
        </h2>
        {followup.length === 0 ? (
          <div className="card p-3 text-sm text-slate-400">（无）</div>
        ) : (
          <div className="space-y-2">
            {followup.map((g) => (
              <GapCard key={g.id} g={g} tone="amber" />
            ))}
          </div>
        )}
      </section>

      {/* 已处理区 */}
      {resolved.length > 0 && (
        <section>
          <button
            className="text-sm font-bold text-slate-500 mb-2"
            onClick={() => setShowResolved((v) => !v)}
          >
            {showResolved ? '▾' : '▸'} 已处理（{resolved.length}）
          </button>
          {showResolved && (
            <div className="space-y-2">
              {resolved.map((g) => (
                <div key={g.id} className="card p-3 flex items-start gap-2 text-sm">
                  <span className="tag-ok shrink-0">已处理</span>
                  <div className="flex-1">
                    <div className="text-slate-700 line-through decoration-slate-300">{g.text}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {g.resolution?.type === 'action'
                        ? `已转为行动项（会后跟进）`
                        : `例外原因：${g.resolution?.reason}`}
                    </div>
                  </div>
                  <button className="text-xs text-slate-400 hover:text-slate-600 underline shrink-0" onClick={() => unresolveGap(m.id, g.id)}>
                    撤销
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 弹窗 */}
      <ExceptionModal
        open={!!exceptionGap}
        gapText={exceptionGap?.text ?? ''}
        onClose={() => setExceptionGap(null)}
        onSubmit={(reason) => {
          if (exceptionGap) resolveGap(m.id, exceptionGap.id, { type: 'exception', reason })
          setExceptionGap(null)
        }}
      />
      {actionGap && (
        <ActionModal
          open
          onClose={() => setActionGap(null)}
          meeting={m}
          source="gap"
          prefillText={gapPrefillText(actionGap)}
          onSaved={(actionId) => resolveGap(m.id, actionGap.id, { type: 'action', actionId })}
        />
      )}
      {decisionGap && (
        <DecisionModal
          open
          onClose={() => setDecisionGap(null)}
          meeting={m}
          prefillGoalItemId={decisionGap.goalItemId}
          prefillText={
            decisionGap.goalItemId
              ? m.goal.decisions.find((i) => i.id === decisionGap.goalItemId)?.text ?? ''
              : ''
          }
        />
      )}
    </div>
  )
}

function ActionFixInline({
  action,
  onPatch,
}: {
  action: LoggedAction
  onPatch: (patch: Partial<LoggedAction>) => void
}) {
  const meeting = useMeeting(useAppStore((s) => s.currentId))!
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 bg-white rounded-lg border border-rose-100 p-2">
      <span className="text-xs text-slate-400">「{action.text}」就地处缺：</span>
      <select
        className="input !w-auto !py-1 text-xs"
        value={action.owner ?? ''}
        onChange={(e) => onPatch({ owner: e.target.value || undefined })}
      >
        <option value="">指定负责人…</option>
        {meeting.participants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}（{p.role}）
          </option>
        ))}
      </select>
      <input
        type="date"
        className="input !w-auto !py-1 text-xs"
        value={action.due ?? ''}
        onChange={(e) => onPatch({ due: e.target.value || undefined })}
      />
      <span className="text-[11px] text-slate-300">补齐后该缺口自动消除</span>
    </div>
  )
}
