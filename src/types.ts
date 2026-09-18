export type Priority = 'must' | 'should' | 'note'

export type MeetingStatus = 'preparing' | 'live' | 'closing' | 'ended'
export type View = 'home' | 'prepare' | 'live' | 'closing' | 'summary'

export type AgendaMode = 'timeline' | 'speaker' | 'phase' | 'matrix'

export interface GoalItem {
  id: string
  text: string
  priority: Priority
  keywords: string[]
  /** 主持人手动标记“已覆盖/已达成”，覆盖规则引擎判定 */
  manualDone?: boolean
}

export interface AgendaSegment {
  id: string
  title: string
  plannedMin: number
  priority: Priority
  /** matrix / speaker 模式下，本环节必须发言的人 */
  requiredSpeakerIds: string[]
}

export interface Participant {
  id: string
  name: string
  role: string
  mustSpeak: boolean
  attended: boolean
}

export interface TranscriptEntry {
  id: string
  /** 会议开始后经过的秒数 */
  t: number
  speakerId: string
  text: string
}

export interface LoggedDecision {
  id: string
  text: string
  /** 关联的预置 Key Decision 条目 */
  goalItemId?: string
  /** 支撑证据（讨论记录 id） */
  evidenceIds: string[]
  /** 规则引擎自动识别（而非主持人手动记录） */
  auto: boolean
  decidedBy?: string
  createdAt: number
}

export interface LoggedAction {
  id: string
  text: string
  owner?: string
  /** YYYY-MM-DD */
  due?: string
  source: 'preset' | 'live' | 'gap'
  goalItemId?: string
  createdAt: number
}

export interface LoggedRisk {
  id: string
  text: string
  /** 是否阻塞会议结束 */
  blocking: boolean
  resolved: boolean
  createdAt: number
}

export interface MeetingException {
  id: string
  gapText: string
  reason: string
}

export interface GoalSection {
  keyGoal: { text: string; priority: Priority }
  conclusions: GoalItem[]
  decisions: GoalItem[]
  actionItems: GoalItem[]
}

/** 缺口的处理记录：转成行动项 / 记录例外（key 为稳定 gap id） */
export interface GapResolution {
  type: 'action' | 'exception'
  actionId?: string
  reason?: string
  at: number
}

export interface Meeting {
  id: string
  title: string
  templateId: string
  createdAt: number
  status: MeetingStatus
  plannedMinutes: number
  goal: GoalSection
  agendaMode: AgendaMode
  segments: AgendaSegment[]
  participants: Participant[]
  transcript: TranscriptEntry[]
  decisions: LoggedDecision[]
  actions: LoggedAction[]
  risks: LoggedRisk[]
  gapResolutions: Record<string, GapResolution>
  /** 用户对单个缺口的阻塞/跟进改判（key 为稳定 gap id） */
  gapOverrides: Record<string, boolean>
  /** 演示剧本 id（有值时会中页提供一键载入/播放） */
  demoScriptId?: string
}

export interface MeetingTemplate {
  id: string
  name: string
  description: string
  agendaMode: AgendaMode
  plannedMinutes: number
  goal: GoalSection
  segments: Array<Omit<AgendaSegment, 'id' | 'requiredSpeakerIds'> & { speakersByRole: string[] }>
  participants: Array<Omit<Participant, 'id'>>
}

/** 演示剧本：按顺序注入的会中事件 */
export type DemoStep =
  | { type: 'entry'; t: number; speakerRole: string; text: string }
  | { type: 'decision'; text: string; byRole: string; goalItemText?: string; evidenceText?: string }
  | { type: 'action'; text: string; ownerRole?: string; due?: string; goalItemText?: string }
  | { type: 'risk'; text: string; blocking: boolean }

export interface DemoScript {
  id: string
  title: string
  templateId: string
  meetingTitle: string
  /** 剧本设计说明（页面上展示） */
  note: string
  steps: DemoStep[]
}

export interface Gap {
  id: string
  kind:
    | 'topic' // 必须讨论的议题遗漏
    | 'speaker' // 必须发言人未表态
    | 'decision-open' // 必须决策未决定
    | 'decision-undone' // 讨论过但没决定
    | 'action-missing' // 预置行动项未产生
    | 'action-owner' // 行动项缺负责人
    | 'action-due' // 行动项缺截止时间
    | 'risk' // 未解决的阻塞性问题
    | 'conclusion' // 必须结论未形成
  /** 默认是否阻塞（按优先级规则推导，用户可改判） */
  blocking: boolean
  text: string
  detail?: string
  priority: Priority
  goalItemId?: string
  segmentId?: string
  participantId?: string
  actionId?: string
}
