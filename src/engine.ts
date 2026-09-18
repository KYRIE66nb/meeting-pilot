import type {
  AgendaSegment,
  GoalItem,
  LoggedAction,
  LoggedDecision,
  Meeting,
  Participant,
  Priority,
  TranscriptEntry,
  Gap,
} from './types'

// ---------- 基础工具 ----------

let counter = 0
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`

export const fmtClock = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

const normalize = (s: string) =>
  s.toLowerCase().replace(/[\s，。、,．.;；:：!！?？()（）[\]【】「」《》“”‘’"']/g, '')

/** 关键词命中（任一关键词为原文子串即命中） */
export const containsKeyword = (text: string, keywords: string[]): boolean => {
  const n = normalize(text)
  return keywords.some((k) => {
    const nk = normalize(k)
    return nk.length >= 2 && n.includes(nk)
  })
}

/** 决策动词：同一条发言同时命中决策动词 + 议题关键词 → 自动识别为一条决策 */
export const DECISION_VERBS = [
  '决定', '敲定', '拍板', '定下来', '一致同意', '同意', '批准', '采纳',
  '先定', '我们定', '就这么定', '确认通过', '一致通过', '定了',
]
export const containsDecisionVerb = (text: string) => DECISION_VERBS.some((v) => text.includes(v))

export const PRIORITY_LABEL: Record<Priority, string> = {
  must: '必须完成',
  should: '建议完成',
  note: '仅供记录',
}

// ---------- 议程时间窗 ----------

export interface SegmentWindow {
  segment: AgendaSegment
  startSec: number
  endSec: number
}

export const segmentWindows = (segments: AgendaSegment[]): SegmentWindow[] => {
  let acc = 0
  return segments.map((s) => {
    const w = { segment: s, startSec: acc * 60, endSec: (acc + s.plannedMin) * 60 }
    acc += s.plannedMin
    return w
  })
}

export const entriesInWindow = (transcript: TranscriptEntry[], w: SegmentWindow) =>
  transcript.filter((e) => e.t >= w.startSec && e.t < w.endSec)

// ---------- 覆盖计算 ----------

export const evidenceFor = (m: Meeting, item: GoalItem) =>
  m.transcript.filter((e) => containsKeyword(e.text, item.keywords))

/** 与某条预置决策关联的决策记录（显式关联，或自定义决策文本命中关键词） */
export const decisionsFor = (m: Meeting, item: GoalItem): LoggedDecision[] =>
  m.decisions.filter(
    (d) => d.goalItemId === item.id || (!d.goalItemId && containsKeyword(d.text, item.keywords)),
  )

/** 与某条预置行动项关联的行动记录 */
export const actionsFor = (m: Meeting, item: GoalItem): LoggedAction[] =>
  m.actions.filter(
    (a) => a.goalItemId === item.id || containsKeyword(a.text, item.keywords),
  )

export const isItemDiscussed = (m: Meeting, item: GoalItem) =>
  item.manualDone === true || evidenceFor(m, item).length > 0

export const isDecisionMade = (m: Meeting, item: GoalItem) =>
  item.manualDone === true || decisionsFor(m, item).length > 0

export const isConclusionFormed = isItemDiscussed

export const isActionProduced = (m: Meeting, item: GoalItem) =>
  item.manualDone === true || actionsFor(m, item).length > 0

export const speakerCount = (m: Meeting, p: Participant) =>
  m.transcript.filter((e) => e.speakerId === p.id).length

/** 会议时钟：最新一条讨论记录的时间（无记录则为 0） */
export const meetingClock = (m: Meeting) =>
  m.transcript.reduce((mx, e) => Math.max(mx, e.t), 0)

export interface CoverageReport {
  clock: number
  plannedSec: number
  keyGoal: { done: number; total: number }
  conclusions: Array<{ item: GoalItem; covered: boolean; evidence: TranscriptEntry[] }>
  decisions: Array<{
    item: GoalItem
    discussed: boolean
    decided: boolean
    decision?: LoggedDecision
    evidence: TranscriptEntry[]
  }>
  actions: Array<{
    item: GoalItem
    discussed: boolean
    produced: boolean
    action?: LoggedAction
    evidence: TranscriptEntry[]
  }>
  segments: Array<{
    window: SegmentWindow
    entries: TranscriptEntry[]
    discussed: boolean
    speakersSpoken: Participant[]
    speakersMissing: Participant[]
  }>
  speakers: Array<{
    participant: Participant
    count: number
    missingMustSegments: AgendaSegment[]
  }>
}

export function computeCoverage(m: Meeting): CoverageReport {
  const windows = segmentWindows(m.segments)
  const clock = meetingClock(m)

  const conclusions = m.goal.conclusions.map((item) => ({
    item,
    covered: isConclusionFormed(m, item),
    evidence: evidenceFor(m, item),
  }))

  const decisions = m.goal.decisions.map((item) => {
    const evidence = evidenceFor(m, item)
    const dec = decisionsFor(m, item)
    return {
      item,
      discussed: item.manualDone === true || evidence.length > 0 || dec.length > 0,
      decided: isDecisionMade(m, item),
      decision: dec[dec.length - 1],
      evidence,
    }
  })

  const actions = m.goal.actionItems.map((item) => {
    const matched = actionsFor(m, item)
    return {
      item,
      discussed: isItemDiscussed(m, item),
      produced: isActionProduced(m, item),
      action: matched[matched.length - 1],
      evidence: evidenceFor(m, item),
    }
  })

  const mustAll = [
    ...m.goal.conclusions.filter((i) => i.priority === 'must').map((i) => isConclusionFormed(m, i)),
    ...m.goal.decisions.filter((i) => i.priority === 'must').map((i) => isDecisionMade(m, i)),
    ...m.goal.actionItems.filter((i) => i.priority === 'must').map((i) => isActionProduced(m, i)),
  ]
  const keyGoal = { done: mustAll.filter(Boolean).length, total: mustAll.length }

  const segments = windows.map((window) => {
    const entries = entriesInWindow(m.transcript, window)
    const required = m.participants.filter((p) =>
      window.segment.requiredSpeakerIds.includes(p.id),
    )
    return {
      window,
      entries,
      discussed: entries.length > 0,
      speakersSpoken: required.filter((p) => entries.some((e) => e.speakerId === p.id)),
      speakersMissing: required.filter((p) => !entries.some((e) => e.speakerId === p.id)),
    }
  })

  const speakers = m.participants.map((participant) => {
    const count = speakerCount(m, participant)
    const requiredWindows = windows.filter((w) =>
      w.segment.requiredSpeakerIds.includes(participant.id),
    )
    const missingMustSegments = requiredWindows
      .filter(
        (w) =>
          w.segment.priority === 'must' &&
          !m.transcript.some(
            (e) => e.speakerId === participant.id && e.t >= w.startSec && e.t < w.endSec,
          ),
      )
      .map((w) => w.segment)
    return { participant, count, missingMustSegments }
  })

  return {
    clock,
    plannedSec: m.plannedMinutes * 60,
    keyGoal,
    conclusions,
    decisions,
    actions,
    segments,
    speakers,
  }
}

// ---------- 决策自动识别 ----------

/** 从一条新增讨论记录中自动识别决策：命中“决策动词 + 某条预置决策关键词”且该决策尚未有结论 */
export function detectDecisionFromEntry(m: Meeting, entry: TranscriptEntry): LoggedDecision[] {
  if (!containsDecisionVerb(entry.text)) return []
  const found: LoggedDecision[] = []
  for (const item of m.goal.decisions) {
    if (isDecisionMade(m, item)) continue
    if (!containsKeyword(entry.text, item.keywords)) continue
    const dup = found.concat(m.decisions).some(
      (d) => d.goalItemId === item.id,
    )
    if (dup) continue
    found.push({
      id: uid('dec'),
      text: entry.text,
      goalItemId: item.id,
      evidenceIds: [entry.id],
      auto: true,
      decidedBy: entry.speakerId,
      createdAt: Date.now(),
    })
  }
  return found
}

// ---------- 缺口检查（核心） ----------

export interface GapView extends Gap {
  resolution?: { type: 'action' | 'exception'; actionId?: string; reason?: string }
  overriddenBlocking?: boolean
  effectiveBlocking: boolean
  resolved: boolean
}

export function computeGaps(m: Meeting): GapView[] {
  const gaps: Gap[] = []
  const windows = segmentWindows(m.segments)
  const coverage = computeCoverage(m)

  // 1. 必须讨论的议题是否遗漏
  for (const s of coverage.segments) {
    if (s.discussed || s.window.segment.priority === 'note') continue
    gaps.push({
      id: `topic:${s.window.segment.id}`,
      kind: 'topic',
      blocking: s.window.segment.priority === 'must',
      priority: s.window.segment.priority,
      text: `${s.window.segment.priority === 'must' ? '必须' : '建议'}议题未讨论：「${s.window.segment.title}」（计划 ${s.window.segment.plannedMin} 分钟）`,
      segmentId: s.window.segment.id,
    })
  }

  // 2. 必须发言的人是否缺席表达
  for (const s of coverage.speakers) {
    const p = s.participant
    if (!p.attended) {
      if (p.mustSpeak)
        gaps.push({
          id: `speaker:${p.id}`,
          kind: 'speaker',
          blocking: true,
          priority: 'must',
          text: `必须发言人缺席：${p.name}（${p.role}）标记为未出席`,
          participantId: p.id,
        })
      continue
    }
    if (p.mustSpeak && s.count === 0) {
      gaps.push({
        id: `speaker:${p.id}`,
        kind: 'speaker',
        blocking: true,
        priority: 'must',
        text: `必须发言人未表态：${p.name}（${p.role}）全程未发言`,
        detail: s.missingMustSegments.length
          ? `应发言环节：${s.missingMustSegments.map((x) => x.title).join('、')}`
          : undefined,
        participantId: p.id,
      })
    } else if (s.missingMustSegments.length > 0) {
      gaps.push({
        id: `speaker:${p.id}`,
        kind: 'speaker',
        blocking: p.mustSpeak,
        priority: p.mustSpeak ? 'must' : 'should',
        text: `发言人未表态：${p.name}（${p.role}）在「${s.missingMustSegments
          .map((x) => x.title)
          .join('」「')}」环节未发言`,
        participantId: p.id,
      })
    }
  }

  // 3. Key Decisions 是否已有明确结论 / 讨论过但没决定
  for (const d of coverage.decisions) {
    const item = d.item
    if (item.priority === 'note' || d.decided) continue
    if (d.discussed) {
      gaps.push({
        id: `decision-undone:${item.id}`,
        kind: 'decision-undone',
        blocking: item.priority === 'must',
        priority: item.priority,
        text: `讨论过但没决定：「${item.text}」已有讨论（${d.evidence.length} 条记录），但没有形成明确决策`,
        detail: d.evidence[0] ? `相关记录：${d.evidence[0].text}` : undefined,
        goalItemId: item.id,
      })
    } else {
      gaps.push({
        id: `decision-open:${item.id}`,
        kind: 'decision-open',
        blocking: item.priority === 'must',
        priority: item.priority,
        text: `${item.priority === 'must' ? '关键决策' : '建议决策'}未讨论：「${item.text}」`,
        goalItemId: item.id,
      })
    }
  }

  // 4. 必须形成的结论是否形成
  for (const c of coverage.conclusions) {
    if (c.item.priority === 'note' || c.covered) continue
    gaps.push({
      id: `conclusion:${c.item.id}`,
      kind: 'conclusion',
      blocking: c.item.priority === 'must',
      priority: c.item.priority,
      text: `${c.item.priority === 'must' ? '必须' : '建议'}结论未形成：「${c.item.text}」`,
      goalItemId: c.item.id,
    })
  }

  // 5. 预置行动项是否已产生
  for (const a of coverage.actions) {
    if (a.item.priority === 'note' || a.produced) continue
    gaps.push({
      id: `action-missing:${a.item.id}`,
      kind: 'action-missing',
      blocking: a.item.priority === 'must',
      priority: a.item.priority,
      text: `${a.item.priority === 'must' ? '必须' : '建议'}行动项未产生：「${a.item.text}」`,
      detail: a.discussed ? '已有相关讨论，但没有人认领为行动项' : undefined,
      goalItemId: a.item.id,
    })
  }

  // 6. 已有行动项是否完整（负责人 / 截止时间）
  for (const a of m.actions) {
    if (!a.owner)
      gaps.push({
        id: `action-owner:${a.id}`,
        kind: 'action-owner',
        blocking: true,
        priority: 'must',
        text: `行动项缺负责人：「${a.text}」`,
        actionId: a.id,
      })
    if (!a.due)
      gaps.push({
        id: `action-due:${a.id}`,
        kind: 'action-due',
        blocking: true,
        priority: 'must',
        text: `行动项缺截止时间：「${a.text}」`,
        actionId: a.id,
      })
  }

  // 7. 未解决的阻塞性问题
  for (const r of m.risks) {
    if (r.resolved || !r.blocking) continue
    gaps.push({
      id: `risk:${r.id}`,
      kind: 'risk',
      blocking: true,
      priority: 'must',
      text: `未解决的阻塞性问题：${r.text}`,
    })
  }

  return gaps.map((g) => {
    const resolution = m.gapResolutions?.[g.id]
    const overriddenBlocking = m.gapOverrides?.[g.id]
    return {
      ...g,
      resolution,
      overriddenBlocking,
      effectiveBlocking: overriddenBlocking ?? g.blocking,
      resolved: !!resolution,
    }
  })
}

export const hasBlockingGaps = (gaps: GapView[]) =>
  gaps.some((g) => g.effectiveBlocking && !g.resolved)

// ---------- 会中 AI 提示（规则引擎模拟） ----------

export interface Hint {
  id: string
  severity: 'info' | 'warn' | 'danger'
  text: string
}

export function computeHints(m: Meeting, dismissed: string[]): Hint[] {
  const clock = meetingClock(m)
  const total = m.plannedMinutes * 60
  const pct = total > 0 ? clock / total : 0
  const hints: Hint[] = []
  const windows = segmentWindows(m.segments)

  // 必须发言人至今 0 发言
  for (const p of m.participants) {
    if (!p.mustSpeak || !p.attended) continue
    if (speakerCount(m, p) === 0 && pct > 0.3 && clock > 0) {
      hints.push({
        id: `hint-speaker:${p.id}`,
        severity: 'danger',
        text: `${p.role || p.name}还没有表达意见，其必须确认的事项可能被遗漏，建议主持人点名确认。`,
      })
    }
  }

  // 临近会议结束仍未决的关键决策
  for (const item of m.goal.decisions) {
    if (item.priority !== 'must' || isDecisionMade(m, item)) continue
    if (pct > 0.55 && clock > 0) {
      hints.push({
        id: `hint-decision:${item.id}`,
        severity: 'danger',
        text: `临近会议结束，关键决策「${item.text}」仍未形成结论，建议现在收敛讨论。`,
      })
    }
  }

  // 必须行动项尚未产生
  for (const item of m.goal.actionItems) {
    if (item.priority !== 'must' || isActionProduced(m, item)) continue
    if (pct > 0.55 && clock > 0) {
      hints.push({
        id: `hint-action:${item.id}`,
        severity: 'warn',
        text: `必须行动项「${item.text}」尚未产生，请明确负责人与截止时间。`,
      })
    }
  }

  // 当前环节（matrix/speaker 模式）必发言人还没发言
  const cur = windows.find((w) => clock >= w.startSec && clock < w.endSec)
  if (cur && cur.segment.requiredSpeakerIds.length > 0) {
    const missing = m.participants.filter(
      (p) =>
        cur.segment.requiredSpeakerIds.includes(p.id) &&
        !m.transcript.some(
          (e) => e.speakerId === p.id && e.t >= cur.startSec && e.t < cur.endSec,
        ),
    )
    if (missing.length > 0) {
      const names = missing.map((p) => `${p.name}（${p.role}）`).join('、')
      hints.push({
        id: `hint-matrix:${cur.segment.id}:${missing.map((p) => p.id).join(',')}`,
        severity: 'warn',
        text: `当前环节「${cur.segment.title}」需要 ${names} 发言，目前还没有发言记录。`,
      })
    }
  }

  // 未解决的阻塞性问题
  for (const r of m.risks) {
    if (r.resolved || !r.blocking) continue
    hints.push({
      id: `hint-risk:${r.id}`,
      severity: 'warn',
      text: `存在未解决的阻塞性问题：${r.text}`,
    })
  }

  if (clock > total) {
    hints.push({
      id: 'hint-overtime',
      severity: 'warn',
      text: `会议已超出预定时长（计划 ${m.plannedMinutes} 分钟），建议进入结束检查。`,
    })
  }

  return hints.filter((h) => !dismissed.includes(h.id)).slice(0, 4)
}

// ---------- 会议总结 ----------

export function buildSummaryMarkdown(m: Meeting): string {
  const coverage = computeCoverage(m)
  const gaps = computeGaps(m)
  const nameOf = (id?: string) =>
    m.participants.find((p) => p.id === id)?.name ?? '—'
  const dateStr = new Date(m.createdAt).toLocaleString('zh-CN')
  const lines: string[] = []

  lines.push(`# 会议总结：${m.title}`)
  lines.push('')
  lines.push(`- 时间：${dateStr} ｜ 计划时长：${m.plannedMinutes} 分钟 ｜ 实际推进至：${fmtClock(coverage.clock)}`)
  lines.push(`- 参会人：${m.participants.map((p) => `${p.name}（${p.role}）`).join('、')}`)
  lines.push('')
  lines.push(`## 一、原会议目标`)
  lines.push(`- Key Goal（${PRIORITY_LABEL[m.goal.keyGoal.priority]}）：${m.goal.keyGoal.text || '（未填写）'}`)
  lines.push(
    `- 目标达成度（必须项）：${coverage.keyGoal.done}/${coverage.keyGoal.total}`,
  )
  lines.push('')
  lines.push('## 二、已达成的结论')
  if (coverage.conclusions.filter((c) => c.covered).length === 0) lines.push('- （无）')
  for (const c of coverage.conclusions.filter((x) => x.covered)) {
    const ev = c.evidence[0]
    lines.push(
      `- ✅ ${c.item.text}${ev ? `（证据：${ev.text.slice(0, 60)}）` : ''}${c.item.manualDone ? '（手动标记）' : ''}`,
    )
  }
  lines.push('')
  lines.push('## 三、已做出的决策')
  if (m.decisions.length === 0) lines.push('- （无）')
  for (const d of m.decisions) {
    const item = m.goal.decisions.find((i) => i.id === d.goalItemId)
    lines.push(
      `- ✅ ${item ? `【${item.text}】` : ''}${d.text}${d.decidedBy ? `（决策人：${nameOf(d.decidedBy)}）` : ''}${d.auto ? '（规则自动识别）' : ''}`,
    )
  }
  lines.push('')
  lines.push('## 四、未解决的问题')
  const open = gaps.filter((g) => !g.resolved)
  if (open.length === 0) lines.push('- （无）')
  for (const g of open) {
    lines.push(`- ${g.effectiveBlocking ? '⛔' : '🟡'} ${g.text}${g.resolution ? '' : ''}`)
  }
  lines.push('')
  lines.push('## 五、行动项')
  if (m.actions.length === 0) lines.push('- （无）')
  for (const a of m.actions) {
    const src = a.source === 'gap' ? '（由缺口转入）' : a.source === 'live' ? '（会中新增）' : ''
    lines.push(`- [ ] ${a.text} ｜ 负责人：${nameOf(a.owner)} ｜ 截止：${a.due ?? '未定'} ${src}`)
  }
  lines.push('')
  lines.push('## 六、保留的风险与例外记录')
  const openRisks = m.risks.filter((r) => !r.resolved)
  const exceptions = Object.entries(m.gapResolutions).filter(([, v]) => v.type === 'exception')
  if (openRisks.length === 0 && exceptions.length === 0) lines.push('- （无）')
  for (const r of openRisks) lines.push(`- ⚠️ 风险：${r.text}${r.blocking ? '（阻塞）' : ''}`)
  for (const [gid, ex] of exceptions) {
    void gid
    lines.push(`- 📝 例外：${ex.reason}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('> 由 MeetingPilot 有效会议助手生成')
  return lines.join('\n')
}
