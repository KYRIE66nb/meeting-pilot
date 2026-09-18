import { useMemo, useState } from 'react'
import { useAppStore, useMeeting } from '../store'
import { TEMPLATES } from '../data/templates'
import { buildSummaryMarkdown, computeCoverage, computeGaps, fmtClock, PRIORITY_LABEL } from '../engine'
import { ActionRow, DecisionCard, PriorityTag, StatusIcon } from '../components/ui'

export default function SummaryPage() {
  const meeting = useMeeting(useAppStore((s) => s.currentId))
  const go = useAppStore((s) => s.go)
  const createFromTemplate = useAppStore((s) => s.createFromTemplate)
  const [copied, setCopied] = useState(false)
  const [showMd, setShowMd] = useState(false)

  const coverage = useMemo(() => (meeting ? computeCoverage(meeting) : null), [meeting])
  const gaps = useMemo(() => (meeting ? computeGaps(meeting) : []), [meeting])
  const md = useMemo(() => (meeting ? buildSummaryMarkdown(meeting) : ''), [meeting])

  if (!meeting || !coverage) return null
  const m = meeting

  const openGaps = gaps.filter((g) => !g.resolved)
  const exceptions = Object.entries(m.gapResolutions).filter(([, v]) => v.type === 'exception')
  const openRisks = m.risks.filter((r) => !r.resolved)
  const tplName = TEMPLATES.find((t) => t.id === m.templateId)?.name ?? '—'

  const copyMd = async () => {
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = md
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const checklist = [
    ...coverage.conclusions.map((c) => ({
      kind: '结论',
      text: c.item.text,
      priority: c.item.priority,
      ok: c.covered,
      note: c.evidence[0]?.text,
    })),
    ...coverage.decisions.map((d) => ({
      kind: '决策',
      text: d.item.text,
      priority: d.item.priority,
      ok: d.decided,
      note: d.decision?.text,
    })),
    ...coverage.actions.map((a) => ({
      kind: '行动项',
      text: a.item.text,
      priority: a.item.priority,
      ok: a.produced,
      note: a.action ? `${a.action.owner ? '' : '缺负责人 '}${a.action.due ?? '缺截止'}` : undefined,
    })),
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-slate-800">会议总结：{m.title}</h1>
        <span className="chip bg-brand-100 text-brand-700">已正式结束</span>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost" onClick={() => createFromTemplate(m.templateId)}>
            再开一场（{tplName}）
          </button>
          <button className="btn-ghost" onClick={() => go('home')}>
            返回首页
          </button>
          <button className="btn-primary" onClick={copyMd}>
            {copied ? '✓ 已复制' : '复制 Markdown 总结'}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {new Date(m.createdAt).toLocaleString('zh-CN')} · 计划 {m.plannedMinutes} 分钟 · 实际推进至{' '}
        {fmtClock(coverage.clock)} · 模板：{tplName}
      </p>

      {/* 一、原目标 vs 达成 */}
      <section className="card p-4">
        <h2 className="font-bold text-slate-800 text-sm mb-2">一、原会议目标与达成情况</h2>
        <div className="text-sm text-slate-700 mb-2">
          Key Goal：{m.goal.keyGoal.text || '（未填写）'} <PriorityTag p={m.goal.keyGoal.priority} />
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500"
            style={{
              width: `${coverage.keyGoal.total ? (coverage.keyGoal.done / coverage.keyGoal.total) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="text-xs text-slate-500 mb-3">
          必须项达成 {coverage.keyGoal.done}/{coverage.keyGoal.total}
        </div>
        <div className="space-y-1">
          {checklist.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-sm rounded px-2 py-1 hover:bg-slate-50">
              <span className="mt-0.5">
                <StatusIcon status={c.ok ? 'ok' : 'miss'} />
              </span>
              <span className="chip bg-slate-100 text-slate-500 shrink-0">{c.kind}</span>
              <span className={`flex-1 ${c.ok ? 'text-slate-700' : 'text-slate-500'}`}>{c.text}</span>
              <span className="text-xs text-slate-400 truncate max-w-[40%]" title={c.ok ? c.note : undefined}>
                {c.ok ? c.note : `未达成（${PRIORITY_LABEL[c.priority]}）`}
              </span>
            </div>
          ))}
          {checklist.length === 0 && <p className="text-xs text-slate-300">（未预设检查项）</p>}
        </div>
      </section>

      {/* 二、结论 / 决策 */}
      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-4">
          <h2 className="font-bold text-slate-800 text-sm mb-2">二、已达成的结论</h2>
          <div className="space-y-1.5">
            {coverage.conclusions.filter((c) => c.covered).length === 0 && (
              <p className="text-xs text-slate-300">（无）</p>
            )}
            {coverage.conclusions
              .filter((c) => c.covered)
              .map((c) => (
                <div key={c.item.id} className="text-sm">
                  <span className="text-emerald-600 font-bold">✓</span> {c.item.text}
                  {c.evidence[0] && (
                    <div className="text-xs text-slate-400 mt-0.5 pl-4">证据：{c.evidence[0].text}</div>
                  )}
                </div>
              ))}
          </div>
        </section>
        <section className="card p-4">
          <h2 className="font-bold text-slate-800 text-sm mb-2">三、已做出的决策</h2>
          <div className="space-y-1.5">
            {m.decisions.length === 0 && <p className="text-xs text-slate-300">（无）</p>}
            {m.decisions.map((d) => (
              <DecisionCard key={d.id} meeting={m} d={d} />
            ))}
          </div>
        </section>
      </div>

      {/* 四、未解决 */}
      <section className="card p-4">
        <h2 className="font-bold text-slate-800 text-sm mb-2">四、未解决的问题</h2>
        <div className="space-y-1">
          {openGaps.length === 0 && <p className="text-xs text-slate-300">（无）</p>}
          {openGaps.map((g) => (
            <div key={g.id} className="text-sm flex items-start gap-2">
              <span>{g.effectiveBlocking ? '⛔' : '🟡'}</span>
              <span className="text-slate-700 flex-1">{g.text}</span>
              <span className={`chip ${g.effectiveBlocking ? 'tag-must' : 'tag-should'} shrink-0`}>
                {g.effectiveBlocking ? '仍阻塞' : '可跟进'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 五、行动项 */}
      <section className="card p-4">
        <h2 className="font-bold text-slate-800 text-sm mb-2">五、行动项（{m.actions.length}）</h2>
        <div className="space-y-1.5">
          {m.actions.length === 0 && <p className="text-xs text-slate-300">（无）</p>}
          {m.actions.map((a) => (
            <ActionRow key={a.id} meeting={m} a={a} compact />
          ))}
        </div>
      </section>

      {/* 六、风险与例外 */}
      <section className="card p-4">
        <h2 className="font-bold text-slate-800 text-sm mb-2">六、保留的风险与例外记录</h2>
        <div className="space-y-1">
          {openRisks.length === 0 && exceptions.length === 0 && <p className="text-xs text-slate-300">（无）</p>}
          {openRisks.map((r) => (
            <div key={r.id} className="text-sm text-slate-700">
              ⚠️ {r.text}
              {r.blocking && <span className="tag-must ml-2">阻塞</span>}
            </div>
          ))}
          {exceptions.map(([gid, ex]) => (
            <div key={gid} className="text-sm text-slate-600">
              📝 例外原因：{ex.reason}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <button className="text-sm text-brand-600 hover:underline" onClick={() => setShowMd((v) => !v)}>
          {showMd ? '▾ 收起' : '▸ 展开'} Markdown 原文（可复制到飞书 / 邮件 / Notion）
        </button>
        {showMd && (
          <pre className="mt-3 text-xs bg-slate-50 rounded-lg p-3 whitespace-pre-wrap text-slate-600 max-h-96 overflow-y-auto">
            {md}
          </pre>
        )}
      </section>
    </div>
  )
}
