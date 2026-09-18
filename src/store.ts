import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DemoStep,
  LoggedAction,
  LoggedDecision,
  LoggedRisk,
  Meeting,
  MeetingTemplate,
  Priority,
  View,
} from './types'
import { TEMPLATES } from './data/templates'
import { DEMO_SCRIPTS } from './data/demoScripts'
import { detectDecisionFromEntry, meetingClock, uid } from './engine'

export const instantiateTemplate = (tpl: MeetingTemplate): Meeting => {
  const participants = tpl.participants.map((p) => ({ ...p, id: uid('p') }))
  const byRole = (role: string) => participants.find((p) => p.role === role)
  const mkItem = (text: string, priority: Priority, keywords: string[]) => ({
    id: uid('g'),
    text,
    priority,
    keywords,
  })
  return {
    id: uid('m'),
    title: tpl.id === 'tpl-blank' ? '未命名会议' : tpl.name,
    templateId: tpl.id,
    createdAt: Date.now(),
    status: 'preparing',
    plannedMinutes: tpl.plannedMinutes,
    agendaMode: tpl.agendaMode,
    participants,
    segments: tpl.segments.map((s) => ({
      id: uid('s'),
      title: s.title,
      plannedMin: s.plannedMin,
      priority: s.priority,
      requiredSpeakerIds: s.speakersByRole
        .map((r) => byRole(r)?.id)
        .filter((x): x is string => !!x),
    })),
    goal: {
      keyGoal: { ...tpl.goal.keyGoal },
      conclusions: tpl.goal.conclusions.map((i) => mkItem(i.text, i.priority, i.keywords)),
      decisions: tpl.goal.decisions.map((i) => mkItem(i.text, i.priority, i.keywords)),
      actionItems: tpl.goal.actionItems.map((i) => mkItem(i.text, i.priority, i.keywords)),
    },
    transcript: [],
    decisions: [],
    actions: [],
    risks: [],
    gapResolutions: {},
    gapOverrides: {},
  }
}

interface AppState {
  view: View
  meetings: Meeting[]
  currentId: string | null
  /** 「返回继续讨论」后需要高亮的目标（goalItemId / segmentId） */
  focusId: string | null

  go: (view: View, meetingId?: string) => void
  setFocus: (id: string | null) => void

  createFromTemplate: (templateId: string) => void
  createFromDemo: (scriptId: string) => void
  deleteMeeting: (id: string) => void
  updateMeeting: (id: string, fn: (m: Meeting) => Meeting) => void

  addEntry: (id: string, speakerId: string, text: string, t?: number) => number
  addDecision: (id: string, d: Omit<LoggedDecision, 'id' | 'createdAt'>) => void
  removeDecision: (id: string, decisionId: string) => void
  addAction: (id: string, a: Omit<LoggedAction, 'id' | 'createdAt'>) => string
  updateAction: (id: string, actionId: string, patch: Partial<LoggedAction>) => void
  addRisk: (id: string, r: Omit<LoggedRisk, 'id' | 'createdAt'>) => void
  resolveRisk: (id: string, riskId: string) => void
  resolveGap: (
    id: string,
    gapId: string,
    resolution: { type: 'action' | 'exception'; actionId?: string; reason?: string },
  ) => void
  unresolveGap: (id: string, gapId: string) => void
  overrideGap: (id: string, gapId: string, blocking: boolean) => void
  endMeeting: (id: string) => void
  /** 注入演示剧本（fromIndex 起的步骤），返回是否注入了内容 */
  applyDemoSteps: (id: string, fromIndex: number, count: number) => number
  demoProgress: Record<string, number>
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'home',
      meetings: [],
      currentId: null,
      focusId: null,
      demoProgress: {},

      go: (view, meetingId) =>
        set((s) => ({ view, currentId: meetingId ?? (view === 'home' ? null : s.currentId) })),
      setFocus: (id) => set({ focusId: id }),

      createFromTemplate: (templateId) => {
        const tpl = TEMPLATES.find((t) => t.id === templateId)
        if (!tpl) return
        const m = instantiateTemplate(tpl)
        set((s) => ({ meetings: [m, ...s.meetings], currentId: m.id, view: 'prepare' }))
      },

      createFromDemo: (scriptId) => {
        const script = DEMO_SCRIPTS.find((x) => x.id === scriptId)
        if (!script) return
        const tpl = TEMPLATES.find((t) => t.id === script.templateId)
        if (!tpl) return
        const m = { ...instantiateTemplate(tpl), title: script.meetingTitle, demoScriptId: script.id, status: 'live' as const }
        set((s) => ({
          meetings: [m, ...s.meetings],
          currentId: m.id,
          view: 'live',
          demoProgress: { ...s.demoProgress, [m.id]: 0 },
        }))
      },

      deleteMeeting: (id) =>
        set((s) => ({
          meetings: s.meetings.filter((m) => m.id !== id),
          currentId: s.currentId === id ? null : s.currentId,
          view: s.currentId === id ? 'home' : s.view,
        })),

      updateMeeting: (id, fn) =>
        set((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? fn(m) : m)) })),

      addEntry: (id, speakerId, text, t) => {
        const m = get().meetings.find((x) => x.id === id)
        if (!m) return 0
        const entry = {
          id: uid('e'),
          t: t ?? Math.min(meetingClock(m) + 60, m.plannedMinutes * 60),
          speakerId,
          text,
        }
        const auto = detectDecisionFromEntry(m, entry)
        set((s) => ({
          meetings: s.meetings.map((x) =>
            x.id === id
              ? {
                  ...x,
                  transcript: [...x.transcript, entry].sort((a, b) => a.t - b.t),
                  decisions: [...x.decisions, ...auto],
                }
              : x,
          ),
        }))
        return auto.length
      },

      addDecision: (id, d) =>
        get().updateMeeting(id, (m) => ({
          ...m,
          decisions: [...m.decisions, { ...d, id: uid('dec'), createdAt: Date.now() }],
        })),

      removeDecision: (id, decisionId) =>
        get().updateMeeting(id, (m) => ({
          ...m,
          decisions: m.decisions.filter((d) => d.id !== decisionId),
        })),

      addAction: (id, a) => {
        const act = { ...a, id: uid('act'), createdAt: Date.now() }
        set((s) => ({
          meetings: s.meetings.map((x) => (x.id === id ? { ...x, actions: [...x.actions, act] } : x)),
        }))
        return act.id
      },

      updateAction: (id, actionId, patch) =>
        get().updateMeeting(id, (m) => ({
          ...m,
          actions: m.actions.map((a) => (a.id === actionId ? { ...a, ...patch } : a)),
        })),

      addRisk: (id, r) =>
        get().updateMeeting(id, (m) => ({
          ...m,
          risks: [...m.risks, { ...r, id: uid('risk'), createdAt: Date.now() }],
        })),

      resolveRisk: (id, riskId) =>
        get().updateMeeting(id, (m) => ({
          ...m,
          risks: m.risks.map((r) => (r.id === riskId ? { ...r, resolved: true } : r)),
        })),

      resolveGap: (id, gapId, resolution) =>
        get().updateMeeting(id, (m) => ({
          ...m,
          gapResolutions: { ...m.gapResolutions, [gapId]: { ...resolution, at: Date.now() } },
        })),

      unresolveGap: (id, gapId) =>
        get().updateMeeting(id, (m) => {
          const next = { ...m.gapResolutions }
          delete next[gapId]
          return { ...m, gapResolutions: next }
        }),

      overrideGap: (id, gapId, blocking) =>
        get().updateMeeting(id, (m) => ({
          ...m,
          gapOverrides: { ...m.gapOverrides, [gapId]: blocking },
        })),

      endMeeting: (id) => {
        get().updateMeeting(id, (m) => ({ ...m, status: 'ended' }))
        set({ view: 'summary', currentId: id })
      },

      applyDemoSteps: (id, fromIndex, count) => {
        const m = get().meetings.find((x) => x.id === id)
        if (!m || !m.demoScriptId) return 0
        const script = DEMO_SCRIPTS.find((x) => x.id === m.demoScriptId)
        if (!script) return 0
        const steps = script.steps.slice(fromIndex, fromIndex + count)
        if (steps.length === 0) return 0

        let cur: Meeting = m
        const applyStep = (step: DemoStep) => {
          if (step.type === 'entry') {
            const speaker = cur.participants.find((p) => p.role === step.speakerRole)
            if (!speaker) return
            const entry = { id: uid('e'), t: step.t, speakerId: speaker.id, text: step.text }
            const auto = detectDecisionFromEntry(cur, entry)
            cur = {
              ...cur,
              transcript: [...cur.transcript, entry].sort((a, b) => a.t - b.t),
              decisions: [...cur.decisions, ...auto],
            }
          } else if (step.type === 'action') {
            const owner = step.ownerRole
              ? cur.participants.find((p) => p.role === step.ownerRole)
              : undefined
            const goalItem = step.goalItemText
              ? cur.goal.actionItems.find((i) => i.text === step.goalItemText)
              : undefined
            cur = {
              ...cur,
              actions: [
                ...cur.actions,
                {
                  id: uid('act'),
                  text: step.text,
                  owner: owner?.id,
                  due: step.due,
                  source: 'live' as const,
                  goalItemId: goalItem?.id,
                  createdAt: Date.now(),
                },
              ],
            }
          } else if (step.type === 'risk') {
            cur = {
              ...cur,
              risks: [
                ...cur.risks,
                { id: uid('risk'), text: step.text, blocking: step.blocking, resolved: false, createdAt: Date.now() },
              ],
            }
          } else if (step.type === 'decision') {
            const by = step.byRole ? cur.participants.find((p) => p.role === step.byRole) : undefined
            const goalItem = step.goalItemText
              ? cur.goal.decisions.find((i) => i.text === step.goalItemText)
              : undefined
            cur = {
              ...cur,
              decisions: [
                ...cur.decisions,
                {
                  id: uid('dec'),
                  text: step.text,
                  goalItemId: goalItem?.id,
                  evidenceIds: [],
                  auto: false,
                  decidedBy: by?.id,
                  createdAt: Date.now(),
                },
              ],
            }
          }
        }
        steps.forEach(applyStep)
        set((s) => ({
          meetings: s.meetings.map((x) => (x.id === id ? cur : x)),
          demoProgress: { ...s.demoProgress, [id]: fromIndex + steps.length },
        }))
        return steps.length
      },
    }),
    {
      name: 'meeting-pilot-store-v1',
      partialize: (s) => ({ meetings: s.meetings, currentId: s.currentId, demoProgress: s.demoProgress }),
    },
  ),
)

export const useMeeting = (id: string | null) =>
  useAppStore((s) => (id ? s.meetings.find((m) => m.id === id) : undefined))
