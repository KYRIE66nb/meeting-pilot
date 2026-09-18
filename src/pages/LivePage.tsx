import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore, useMeeting } from '../store'
import { DEMO_SCRIPTS } from '../data/demoScripts'
import { computeCoverage, computeHints, fmtClock } from '../engine'
import type { GapView } from '../engine'
import {
  ActionRow,
  DecisionCard,
  GoalItemRow,
  PriorityTag,
  RiskRow,
  SectionTitle,
  StatusIcon,
  speakerDot,
  speakerName,
} from '../components/ui'
import { ActionModal, DecisionModal, RiskModal } from '../components/modals'

export default function LivePage() {
  const meeting = useMeeting(useAppStore((s) => s.currentId))
  const go = useAppStore((s) => s.go)
  const addEntry = useAppStore((s) => s.addEntry)
  const removeDecision = useAppStore((s) => s.removeDecision)
  const updateAction = useAppStore((s) => s.updateAction)
  const resolveRisk = useAppStore((s) => s.resolveRisk)
  const updateMeeting = useAppStore((s) => s.updateMeeting)
  const applyDemoSteps = useAppStore((s) => s.applyDemoSteps)
  const demoProgress = useAppStore((s) => s.demoProgress)
  const focusId = useAppStore((s) => s.focusId)
  const setFocus = useAppStore((s) => s.setFocus)

  // 手动录入
  const [speakerId, setSpeakerId] = useState('')
  const [text, setText] = useState('')
  const [timeStr, setTimeStr] = useState('')
  const [toast, setToast] = useState('')

  // 快捷记录弹窗
  const [modal, setModal] = useState<'decision' | 'action' | 'risk' | null>(null)

  // 播放
  const [playing, setPlaying] = useState(false)

  // AI 提示的关闭记录
  const [dismissed, setDismissed] = useState<string[]>([])

  // 结构化记录折叠
  const [showStruct, setShowStruct] = useState(true)

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (meeting && !speakerId && meeting.participants[0]) setSpeakerId(meeting.participants[0].id)
  }, [meeting, speakerId])

  // focus 高亮 12 秒后清除
  useEffect(() => {
    if (!focusId) return
    const t = setTimeout(() => setFocus(null), 12000)
    return () => clearTimeout(t)
  }, [focusId, setFocus])

  const script = meeting?.demoScriptId ? DEMO_SCRIPTS.find((s) => s.id === meeting.demoScriptId) : undefined
  const progress = meeting ? demoProgress[meeting.id] ?? 0 : 0
  const total = script?.steps.length ?? 0

  // 播放：每 1.2s 注入一步
  useEffect(() => {
    if (!playing || !meeting || !script) return
    if (progress >= total) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => {
      applyDemoSteps(meeting.id, progress, 1)
    }, 1200)
    return () => clearTimeout(t)
  }, [playing, progress, total, meeting, script, applyDemoSteps])

  const coverage = useMemo(() => (meeting ? computeCoverage(meeting) : null), [meeting])
  const hints = useMemo(
    () => (meeting ? computeHints(meeting, dismissed) : []),
    [meeting, dismissed],
  )

  // 新记录滚动到底
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [meeting?.transcript.length])

  if (!meeting || !coverage) return null
  const m = meeting

  const parseTime = (s: string): number | null => {
    const v = s.trim()
    if (!v) return null
    if (v.includes(':')) {
      const [mm, ss] = v.split(':')
      const sec = Number(mm) * 60 + Number(ss || 0)
      return Number.isFinite(sec) ? sec : null
    }
    const n = Number(v)
    return Number.isFinite(n) ? n * 60 : null
  }

  const submitEntry = () => {
    if (!text.trim()) return
    const t = parseTime(timeStr) ?? Math.min(coverage.clock + 60, m.plannedMinutes * 60 + 300)
    const auto = addEntry(m.id, speakerId, text.trim(), t)
    setText('')
    if (auto > 0) {
      setToast(`✓ 规则引擎从这条发言中识别到 ${auto} 条决策，已自动记录（误识别可删除）`)
      setTimeout(() => setToast(''), 5000)
    }
  }

  const clock = coverage.clock

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
      {/* 顶部：目标条 */}
      <div className="card overflow-hidden">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-bold text-slate-800 text-base">{m.title}</h1>
            <span className="chip bg-slate-100 text-slate-600 tabular-nums">
              进行至 {fmtClock(clock)} / 计划 {fmtClock(m.plannedMinutes * 60)}
            </span>
            <span className="chip bg-slate-100 text-slate-600">讨论记录 {m.transcript.length} 条</span>
            <button className="btn-primary ml-auto" onClick={() => go('closing', m.id)}>
              准备结束会议 →
            </button>
          </div>
        </div>
        <div className="bg-brand-50 border-t border-brand-100 px-4 py-2.5 text-sm text-slate-700 flex items-start gap-2">
          <span className="shrink-0" aria-hidden>🎯</span>
          <span className="flex items-start gap-1.5">
            <span className="font-semibold text-brand-700 shrink-0">本会目标：</span>
            <span>
              {m.goal.keyGoal.text || '（未填写）'} <PriorityTag p={m.goal.keyGoal.priority} />
            </span>
          </span>
        </div>
      </div>

      {/* AI 提示条（规则引擎模拟） */}
      {hints.length > 0 && (
        <div className="card p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">🤖 AI 提示（{hints.length}）</span>
            <span className="text-xs text-slate-400">本地规则引擎实时触发（Mock，非大模型），逐条关闭</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {hints.map((h) => (
              <li
                key={h.id}
                className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm border ${
                  h.severity === 'danger'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : h.severity === 'warn'
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="shrink-0">{h.severity === 'danger' ? '🔴' : h.severity === 'warn' ? '🟡' : 'ℹ️'}</span>
                <span className="flex-1">{h.text}</span>
                <button
                  className="shrink-0 opacity-50 hover:opacity-100"
                  title="关闭该提示"
                  onClick={() => setDismissed((d) => [...d, h.id])}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-3">
        {/* 左：讨论记录 + 结构化记录 */}
        <div className="lg:col-span-5 space-y-3">
          <div className="card p-4">
            <SectionTitle
              right={
                script ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      剧本 {Math.min(progress, total)}/{total}
                    </span>
                    <button
                      className="btn-soft !py-1 text-xs"
                      disabled={playing || progress >= total}
                      onClick={() => setPlaying(true)}
                    >
                      ▶ 播放模拟讨论
                    </button>
                    <button
                      className="btn-ghost !py-1 text-xs"
                      disabled={playing || progress >= total}
                      onClick={() => applyDemoSteps(m.id, progress, total - progress)}
                    >
                      一键载入全部
                    </button>
                  </div>
                ) : undefined
              }
            >
              讨论记录（Mock 转写 / 手动录入）
            </SectionTitle>

            {script && (
              <details className="mb-2 rounded-lg bg-brand-50/70 border border-brand-100 px-3 py-2">
                <summary className="text-xs text-brand-700 cursor-pointer font-medium">
                  📋 本剧本预埋的缺口设计（点开看设计意图）
                </summary>
                <p className="text-xs text-slate-600 mt-1 leading-5">{script.note}</p>
              </details>
            )}

            {/* 手动录入 */}
            <div className="flex gap-2 items-start">
              <select className="input !w-36" value={speakerId} onChange={(e) => setSpeakerId(e.target.value)}>
                {m.participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{p.role}）
                  </option>
                ))}
              </select>
              <input
                className="input !w-20"
                placeholder={`≈${fmtClock(Math.min(clock + 60, m.plannedMinutes * 60))}`}
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                title="时间点，格式 mm:ss（留空=自动顺延 1 分钟）"
              />
              <input
                className="input flex-1"
                placeholder="输入这条发言内容，回车添加"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitEntry()}
              />
              <button className="btn-soft" onClick={submitEntry} disabled={!text.trim()}>
                添加
              </button>
            </div>
            {toast && <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1">{toast}</div>}

            <div ref={listRef} className="mt-3 space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {m.transcript.length === 0 && (
                <p className="text-xs text-slate-300 py-6 text-center">
                  还没有讨论记录{script ? '，点上方「播放」或「一键载入」注入模拟讨论' : '，在上方手动录入'}
                </p>
              )}
              {m.transcript.map((e) => (
                <div key={e.id} className="flex gap-2 text-sm rounded-lg px-1 py-1 hover:bg-slate-50 transition-colors">
                  <span className="text-xs text-slate-400 w-10 shrink-0 tabular-nums pt-0.5">{fmtClock(e.t)}</span>
                  <span
                    className="w-24 shrink-0 truncate pt-0.5 flex items-center gap-1.5"
                    title={speakerName(m, e.speakerId)}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ background: speakerDot(m, e.speakerId) }}
                      aria-hidden
                    />
                    <span className="truncate">{speakerName(m, e.speakerId)}</span>
                  </span>
                  <span className="flex-1 text-slate-700">{e.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 快捷记录 */}
          <div className="card p-4">
            <SectionTitle right={<span className="text-xs text-slate-400">也可由引擎从讨论中自动识别决策</span>}>
              主持人快捷记录
            </SectionTitle>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={() => setModal('decision')}>
                ✅ 记录决策
              </button>
              <button className="btn-soft flex-1" onClick={() => setModal('action')}>
                📋 记录行动项
              </button>
              <button className="btn-ghost flex-1" onClick={() => setModal('risk')}>
                ⚠️ 记录风险
              </button>
            </div>

            <button
              className="w-full text-left mt-3 text-xs text-slate-500 hover:text-slate-700"
              onClick={() => setShowStruct((v) => !v)}
            >
              {showStruct ? '▾' : '▸'} 已记录：决策 {m.decisions.length} · 行动项 {m.actions.length} · 风险{' '}
              {m.risks.length}
            </button>
            {showStruct && (
              <div className="mt-2 space-y-2">
                {m.decisions.map((d) => (
                  <DecisionCard key={d.id} meeting={m} d={d} onRemove={() => removeDecision(m.id, d.id)} />
                ))}
                {m.actions.map((a) => (
                  <ActionRow
                    key={a.id}
                    meeting={m}
                    a={a}
                    onUpdate={(patch) => updateAction(m.id, a.id, patch)}
                    compact
                  />
                ))}
                {m.risks.map((r) => (
                  <RiskRow key={r.id} r={r} onResolve={() => resolveRisk(m.id, r.id)} />
                ))}
                {m.decisions.length + m.actions.length + m.risks.length === 0 && (
                  <p className="text-xs text-slate-300 py-2">（还没有结构化记录）</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 中：议程推进 */}
        <div className="lg:col-span-3">
          <div className="card p-4">
            <SectionTitle>议程推进</SectionTitle>
            <div className="space-y-2">
              {coverage.segments.map((s, idx) => {
                const active = clock >= s.window.startSec && clock < s.window.endSec
                const focused = focusId === s.window.segment.id
                return (
                  <div
                    key={s.window.segment.id}
                    className={`rounded-lg border p-2 ${
                      focused
                        ? 'border-brand-500 ring-2 ring-brand-500'
                        : active
                          ? 'border-brand-300 bg-brand-50/50'
                          : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs text-slate-400 w-4 text-center shrink-0">{idx + 1}</span>
                      <span className="font-medium text-slate-700 flex-1 truncate">{s.window.segment.title}</span>
                      <StatusIcon status={s.discussed ? 'ok' : 'miss'} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="tabular-nums">
                        {fmtClock(s.window.startSec)}–{fmtClock(s.window.endSec)}
                      </span>
                      <span>计划 {s.window.segment.plannedMin}′</span>
                      <span>实际 {s.entries.length} 条</span>
                      {s.window.segment.priority === 'must' && <span className="text-rose-500">必须</span>}
                    </div>
                    {s.window.segment.requiredSpeakerIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.speakersSpoken.map((p) => (
                          <span key={p.id} className="chip bg-emerald-100 text-emerald-700">
                            {p.name} ✓
                          </span>
                        ))}
                        {s.speakersMissing.map((p) => (
                          <span key={p.id} className="chip bg-rose-100 text-rose-600">
                            {p.name} 未发言
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 右：覆盖看板 */}
        <div className="lg:col-span-4">
          <div className="card p-4 space-y-4">
            <div>
              <SectionTitle
                right={
                  <span className="text-xs text-slate-400">
                    {coverage.keyGoal.done}/{coverage.keyGoal.total} 必须项
                  </span>
                }
              >
                目标达成度
              </SectionTitle>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{
                    width: `${coverage.keyGoal.total ? (coverage.keyGoal.done / coverage.keyGoal.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <SectionTitle>Key Conclusions</SectionTitle>
              <div className="space-y-0.5">
                {coverage.conclusions.map((c) => (
                  <GoalItemRow
                    key={c.item.id}
                    item={c.item}
                    status={c.covered ? 'ok' : 'miss'}
                    detail={c.evidence[0] ? `证据：${c.evidence[0].text.slice(0, 40)}` : undefined}
                    focused={focusId === c.item.id}
                    onManual={() =>
                      updateMeeting(m.id, (x) => ({
                        ...x,
                        goal: {
                          ...x.goal,
                          conclusions: x.goal.conclusions.map((i) =>
                            i.id === c.item.id ? { ...i, manualDone: !i.manualDone } : i,
                          ),
                        },
                      }))
                    }
                  />
                ))}
                {coverage.conclusions.length === 0 && <p className="text-xs text-slate-300">（未预设）</p>}
              </div>
            </div>

            <div>
              <SectionTitle>Key Decisions</SectionTitle>
              <div className="space-y-0.5">
                {coverage.decisions.map((d) => (
                  <GoalItemRow
                    key={d.item.id}
                    item={d.item}
                    status={d.decided ? 'ok' : d.discussed ? 'part' : 'miss'}
                    detail={
                      d.decided
                        ? `决策：${(d.decision?.text ?? '').slice(0, 40)}${d.decision?.auto ? '（自动识别）' : ''}`
                        : d.evidence[0]
                          ? `已讨论 ${d.evidence.length} 条，未拍板`
                          : undefined
                    }
                    focused={focusId === d.item.id}
                    onManual={() =>
                      updateMeeting(m.id, (x) => ({
                        ...x,
                        goal: {
                          ...x.goal,
                          decisions: x.goal.decisions.map((i) =>
                            i.id === d.item.id ? { ...i, manualDone: !i.manualDone } : i,
                          ),
                        },
                      }))
                    }
                  />
                ))}
                {coverage.decisions.length === 0 && <p className="text-xs text-slate-300">（未预设）</p>}
              </div>
            </div>

            <div>
              <SectionTitle>Action Items</SectionTitle>
              <div className="space-y-0.5">
                {coverage.actions.map((a) => (
                  <GoalItemRow
                    key={a.item.id}
                    item={a.item}
                    status={a.produced ? (a.action?.owner && a.action?.due ? 'ok' : 'part') : a.discussed ? 'part' : 'miss'}
                    detail={
                      a.action
                        ? `${speakerName(m, a.action.owner)} · ${a.action.due ?? '缺截止时间'}`
                        : a.evidence[0]
                          ? '已有讨论，无人认领'
                          : undefined
                    }
                    focused={focusId === a.item.id}
                    onManual={() =>
                      updateMeeting(m.id, (x) => ({
                        ...x,
                        goal: {
                          ...x.goal,
                          actionItems: x.goal.actionItems.map((i) =>
                            i.id === a.item.id ? { ...i, manualDone: !i.manualDone } : i,
                          ),
                        },
                      }))
                    }
                  />
                ))}
                {coverage.actions.length === 0 && <p className="text-xs text-slate-300">（未预设）</p>}
              </div>
            </div>

            <div>
              <SectionTitle>发言人覆盖</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {coverage.speakers.map((s) => (
                  <span
                    key={s.participant.id}
                    className={`chip ${
                      s.count > 0 ? 'bg-emerald-100 text-emerald-700' : s.participant.mustSpeak ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                    }`}
                    title={
                      s.missingMustSegments.length
                        ? `在必发言环节未表态：${s.missingMustSegments.map((x) => x.title).join('、')}`
                        : `${s.count} 条发言`
                    }
                  >
                    {s.participant.name}·{s.participant.role} {s.count > 0 ? `${s.count}条` : s.participant.mustSpeak ? '未发言' : '0条'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DecisionModal open={modal === 'decision'} onClose={() => setModal(null)} meeting={m} />
      <ActionModal open={modal === 'action'} onClose={() => setModal(null)} meeting={m} source="live" />
      <RiskModal open={modal === 'risk'} onClose={() => setModal(null)} meeting={m} />
    </div>
  )
}

// 保留类型引用（供未来扩展提示面板使用）
export type { GapView }
