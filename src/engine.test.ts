import { describe, expect, it } from 'vitest'
import { TEMPLATES } from './data/templates'
import { DEMO_SCRIPTS } from './data/demoScripts'
import { instantiateTemplate } from './store'
import type { Meeting } from './types'
import {
  computeCoverage,
  computeGaps,
  containsDecisionVerb,
  hasBlockingGaps,
  meetingClock,
} from './engine'

const buildDemo = (scriptId: string): Meeting => {
  const script = DEMO_SCRIPTS.find((s) => s.id === scriptId)!
  const tpl = TEMPLATES.find((t) => t.id === script.templateId)!
  let m: Meeting = { ...instantiateTemplate(tpl), demoScriptId: script.id }
  // 复刻 applyDemoSteps 的注入逻辑（避免引入 store 单例）
  for (let i = 0; i < script.steps.length; i++) {
    const step = script.steps[i]
    if (step.type === 'entry') {
      const speaker = m.participants.find((p) => p.role === step.speakerRole)!
      const entry = { id: `e${i}`, t: step.t, speakerId: speaker.id, text: step.text }
      m = { ...m, transcript: [...m.transcript, entry].sort((a, b) => a.t - b.t) }
      // 决策自动识别
      for (const item of m.goal.decisions) {
        const decided = m.decisions.some((d) => d.goalItemId === item.id)
        if (decided) continue
        if (containsDecisionVerb(entry.text) && item.keywords.some((k) => entry.text.includes(k))) {
          m = {
            ...m,
            decisions: [
              ...m.decisions,
              { id: `d${i}-${item.id}`, text: entry.text, goalItemId: item.id, evidenceIds: [entry.id], auto: true, decidedBy: speaker.id, createdAt: 0 },
            ],
          }
        }
      }
    } else if (step.type === 'action') {
      const owner = step.ownerRole ? m.participants.find((p) => p.role === step.ownerRole) : undefined
      const goalItem = step.goalItemText ? m.goal.actionItems.find((x) => x.text === step.goalItemText) : undefined
      m = {
        ...m,
        actions: [...m.actions, { id: `a${i}`, text: step.text, owner: owner?.id, due: step.due, source: 'live' as const, goalItemId: goalItem?.id, createdAt: 0 }],
      }
    } else if (step.type === 'risk') {
      m = { ...m, risks: [...m.risks, { id: `r${i}`, text: step.text, blocking: step.blocking, resolved: false, createdAt: 0 }] }
    }
  }
  return m
}

describe('决策动词识别', () => {
  it('肯定例句', () => {
    expect(containsDecisionVerb('技术同意按期上线')).toBe(true)
    expect(containsDecisionVerb('我们正式决定：v2.3 于 9 月 25 日上线')).toBe(true)
    expect(containsDecisionVerb('那我们先定：二期范围按精简版推进')).toBe(true)
  })
  it('否定例句（避免误判）', () => {
    expect(containsDecisionVerb('性能压测达标')).toBe(false)
    expect(containsDecisionVerb('触发条件待定后补充纪要')).toBe(false)
    expect(containsDecisionVerb('折扣低于 9 折要走特批，我今天给不了最终答复')).toBe(false)
  })
})

describe('演示 A：产品上线决策会', () => {
  const m = buildDemo('demo-launch')
  const coverage = computeCoverage(m)
  const gaps = computeGaps(m)
  const byId = (needle: string) => gaps.filter((g) => g.id.startsWith(needle))

  it('关键决策按剧本拍板/未决', () => {
    const d1 = coverage.decisions.find((d) => d.item.text === '是否按期上线')!
    const d2 = coverage.decisions.find((d) => d.item.text === '灰度范围与放量节奏')!
    const d3 = coverage.decisions.find((d) => d.item.text === '回滚预案触发条件')!
    const d4 = coverage.decisions.find((d) => d.item.text === '上线营销节奏')!
    expect(d1.decided).toBe(true)
    expect(d1.decision?.auto).toBe(true)
    expect(d2.decided).toBe(true)
    expect(d3.decided).toBe(false)
    expect(d3.discussed).toBe(true) // 讨论过但没决定
    expect(d4.discussed).toBe(false)
  })

  it('结论与行动项覆盖', () => {
    expect(coverage.conclusions.every((c) => c.covered)).toBe(true)
    expect(coverage.actions.every((a) => a.produced)).toBe(true)
  })

  it('缺口画像：4 阻塞 + 1 跟进', () => {
    const blocking = gaps.filter((g) => g.effectiveBlocking && !g.resolved)
    const followup = gaps.filter((g) => !g.effectiveBlocking && !g.resolved)
    expect(blocking).toHaveLength(4)
    expect(followup).toHaveLength(1)
    expect(byId('decision-undone:')).toHaveLength(1) // 回滚预案
    expect(byId('speaker:')).toHaveLength(1) // 苏晴
    expect(byId('action-due:')).toHaveLength(1) // 客户通知文案缺截止
    expect(byId('risk:')).toHaveLength(1) // 客服排班
    expect(followup[0].kind).toBe('decision-open') // 营销节奏
    expect(hasBlockingGaps(gaps)).toBe(true)
  })

  it('记录例外后阻塞清零', () => {
    const blocking = gaps.filter((g) => g.effectiveBlocking && !g.resolved)
    const resolved: Meeting = {
      ...m,
      gapResolutions: Object.fromEntries(
        blocking.map((g) => [g.id, { type: 'exception' as const, reason: '测试例外', at: 0 }]),
      ),
    }
    expect(hasBlockingGaps(computeGaps(resolved))).toBe(false)
  })
})

describe('演示 B：客户推进会', () => {
  const m = buildDemo('demo-customer')
  const coverage = computeCoverage(m)
  const gaps = computeGaps(m)

  it('关键决策画像', () => {
    expect(coverage.decisions.find((d) => d.item.text === '二期范围确认')!.decided).toBe(true)
    expect(coverage.decisions.find((d) => d.item.text === '报价与折扣')!.decided).toBe(false)
    expect(coverage.decisions.find((d) => d.item.text === '签约时间')!.decided).toBe(false)
  })

  it('缺口画像：3 阻塞 + 2 跟进', () => {
    const blocking = gaps.filter((g) => g.effectiveBlocking && !g.resolved)
    const followup = gaps.filter((g) => !g.effectiveBlocking && !g.resolved)
    expect(blocking).toHaveLength(3)
    expect(followup).toHaveLength(2)
  })
})

describe('空会议（未开始讨论）', () => {
  it('所有必须项均报阻塞', () => {
    const tpl = TEMPLATES.find((t) => t.id === 'tpl-launch')!
    const m = instantiateTemplate(tpl)
    const gaps = computeGaps(m)
    expect(gaps.length).toBeGreaterThan(5)
    expect(gaps.filter((g) => g.effectiveBlocking).length).toBeGreaterThanOrEqual(6)
    expect(meetingClock(m)).toBe(0)
  })
})
