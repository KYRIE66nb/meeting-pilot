import React, { useState } from 'react'
import { Modal } from './ui'
import { useAppStore } from '../store'
import type { Meeting } from '../types'

/** 记录决策（手动拍板 / 结束检查页“现在拍板”） */
export function DecisionModal({
  open,
  onClose,
  meeting,
  prefillGoalItemId,
  prefillText,
}: {
  open: boolean
  onClose: () => void
  meeting: Meeting
  prefillGoalItemId?: string
  prefillText?: string
}) {
  const addDecision = useAppStore((s) => s.addDecision)
  const [goalItemId, setGoalItemId] = useState(prefillGoalItemId ?? '')
  const [text, setText] = useState(prefillText ?? '')
  const [by, setBy] = useState('')

  React.useEffect(() => {
    if (open) {
      setGoalItemId(prefillGoalItemId ?? '')
      setText(prefillText ?? '')
      setBy('')
    }
  }, [open, prefillGoalItemId, prefillText])

  const save = () => {
    if (!text.trim()) return
    addDecision(meeting.id, {
      text: text.trim(),
      goalItemId: goalItemId || undefined,
      evidenceIds: [],
      auto: false,
      decidedBy: by || undefined,
    })
    onClose()
  }

  return (
    <Modal open={open} title="记录决策" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">对应的关键决策（可选）</label>
          <select className="input" value={goalItemId} onChange={(e) => setGoalItemId(e.target.value)}>
            <option value="">（自定义决策，不对应预置项）</option>
            {meeting.goal.decisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.text}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">决策内容</label>
          <textarea
            className="input min-h-[4rem]"
            placeholder="例如：v2.3 于 9 月 25 日按期上线，灰度首日 10%"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div>
          <label className="label">决策人</label>
          <select className="input" value={by} onChange={(e) => setBy(e.target.value)}>
            <option value="">（未指定）</option>
            {meeting.participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}（{p.role}）
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={save} disabled={!text.trim()}>
            保存决策
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** 记录行动项（会中快捷记录 / 缺口转行动项） */
export function ActionModal({
  open,
  onClose,
  meeting,
  prefillText,
  source,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  meeting: Meeting
  prefillText?: string
  source: 'live' | 'gap'
  onSaved?: (actionId: string) => void
}) {
  const addAction = useAppStore((s) => s.addAction)
  const [text, setText] = useState('')
  const [owner, setOwner] = useState('')
  const [due, setDue] = useState('')
  const [goalItemId, setGoalItemId] = useState('')

  React.useEffect(() => {
    if (open) {
      setText(prefillText ?? '')
      setOwner('')
      setDue('')
      setGoalItemId('')
    }
  }, [open, prefillText])

  const save = () => {
    if (!text.trim()) return
    const id = addAction(meeting.id, {
      text: text.trim(),
      owner: owner || undefined,
      due: due || undefined,
      source,
      goalItemId: goalItemId || undefined,
    })
    onSaved?.(id)
    onClose()
  }

  return (
    <Modal open={open} title={source === 'gap' ? '将缺口转为行动项' : '记录行动项'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">行动内容</label>
          <textarea
            className="input min-h-[3.5rem]"
            placeholder="例如：细化回滚预案触发条件并在群里评审"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">负责人</label>
            <select className="input" value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">（未定 —— 将记为缺口）</option>
              {meeting.participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}（{p.role}）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">截止时间</label>
            <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">对应的预置行动项（可选）</label>
          <select className="input" value={goalItemId} onChange={(e) => setGoalItemId(e.target.value)}>
            <option value="">（无）</option>
            {meeting.goal.actionItems.map((a) => (
              <option key={a.id} value={a.id}>
                {a.text}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={save} disabled={!text.trim()}>
            保存行动项
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** 记录风险 / 阻塞问题 */
export function RiskModal({
  open,
  onClose,
  meeting,
}: {
  open: boolean
  onClose: () => void
  meeting: Meeting
}) {
  const addRisk = useAppStore((s) => s.addRisk)
  const [text, setText] = useState('')
  const [blocking, setBlocking] = useState(true)

  React.useEffect(() => {
    if (open) {
      setText('')
      setBlocking(true)
    }
  }, [open])

  return (
    <Modal open={open} title="记录风险 / 阻塞问题" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">描述</label>
          <textarea
            className="input min-h-[3.5rem]"
            placeholder="例如：上线首周客服咨询量可能激增，现有排班接不住"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={blocking} onChange={(e) => setBlocking(e.target.checked)} />
          属于阻塞会议结束的问题（不解决不能散会）
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="btn-primary"
            disabled={!text.trim()}
            onClick={() => {
              addRisk(meeting.id, { text: text.trim(), blocking, resolved: false })
              onClose()
            }}
          >
            保存
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** 记录例外原因后结束（阻塞缺口的出路之一） */
export function ExceptionModal({
  open,
  onClose,
  gapText,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  gapText: string
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  React.useEffect(() => {
    if (open) setReason('')
  }, [open])

  return (
    <Modal open={open} title="记录例外原因" onClose={onClose}>
      <p className="text-sm text-slate-600 mb-3">
        缺口：<span className="text-slate-800 font-medium">{gapText}</span>
        <br />
        记录例外意味着：<b>此项不再阻塞结束</b>，但会如实写入会议总结的“例外记录”，供会后追溯。
      </p>
      <textarea
        className="input min-h-[4rem]"
        placeholder="例如：负责人今明两天休假，9/20 前单独补确认"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex justify-end gap-2 mt-3">
        <button className="btn-ghost" onClick={onClose}>
          取消
        </button>
        <button className="btn-primary" disabled={!reason.trim()} onClick={() => onSubmit(reason.trim())}>
          确认记录例外
        </button>
      </div>
    </Modal>
  )
}
