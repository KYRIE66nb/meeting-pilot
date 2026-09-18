import { useAppStore, useMeeting } from '../store'
import { AGENDA_MODES, PriorityTag } from '../components/ui'
import type { AgendaMode, GoalItem, Priority } from '../types'
import { uid } from '../engine'

const PRIORITY_OPTIONS: Array<{ v: Priority; label: string }> = [
  { v: 'must', label: '必须完成' },
  { v: 'should', label: '建议完成' },
  { v: 'note', label: '仅供记录' },
]

export default function PreparePage() {
  const meeting = useMeeting(useAppStore((s) => s.currentId))
  const updateMeeting = useAppStore((s) => s.updateMeeting)
  const go = useAppStore((s) => s.go)

  if (!meeting) return null
  const m = meeting

  const patch = (p: Partial<typeof m>) => updateMeeting(m.id, (x) => ({ ...x, ...p }))

  // ---- 目标条目编辑 ----
  type ListKey = 'conclusions' | 'decisions' | 'actionItems'
  const editItem = (key: ListKey, id: string, p: Partial<GoalItem>) =>
    updateMeeting(m.id, (x) => ({
      ...x,
      goal: { ...x.goal, [key]: x.goal[key].map((i) => (i.id === id ? { ...i, ...p } : i)) },
    }))
  const addItem = (key: ListKey) =>
    updateMeeting(m.id, (x) => ({
      ...x,
      goal: {
        ...x.goal,
        [key]: [...x.goal[key], { id: uid('g'), text: '', priority: 'must', keywords: [] }],
      },
    }))
  const removeItem = (key: ListKey, id: string) =>
    updateMeeting(m.id, (x) => ({
      ...x,
      goal: { ...x.goal, [key]: x.goal[key].filter((i) => i.id !== id) },
    }))

  const ItemList = ({ title, hint, keyName }: { title: string; hint: string; keyName: ListKey }) => (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
        </div>
        <button className="btn-soft !py-1 text-xs" onClick={() => addItem(keyName)}>
          + 添加
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {m.goal[keyName].length === 0 && <p className="text-xs text-slate-300 py-2">（暂无条目，点“添加”）</p>}
        {m.goal[keyName].map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-2 space-y-1.5">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="条目内容，例如：是否按期上线"
                value={item.text}
                onChange={(e) => editItem(keyName, item.id, { text: e.target.value })}
              />
              <select
                className="input !w-28"
                value={item.priority}
                onChange={(e) => editItem(keyName, item.id, { priority: e.target.value as Priority })}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                className="text-slate-300 hover:text-rose-500 px-1"
                onClick={() => removeItem(keyName, item.id)}
                title="删除"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="shrink-0">匹配关键词</span>
              <input
                className="input !py-1 text-xs"
                placeholder="逗号分隔；讨论内容命中关键词即视为“已讨论”，可留空后手动标记"
                value={item.keywords.join('，')}
                onChange={(e) =>
                  editItem(keyName, item.id, {
                    keywords: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const totalPlanned = m.segments.reduce((s, x) => s + x.plannedMin, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">会前准备</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => go('home')}>
            返回首页
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              updateMeeting(m.id, (x) => ({ ...x, status: 'live' }))
              go('live', m.id)
            }}
          >
            开始会议 →
          </button>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="card p-4 grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="label">会议名称</label>
          <input className="input" value={m.title} onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div>
          <label className="label">计划时长（分钟）</label>
          <input
            type="number"
            min={5}
            className="input"
            value={m.plannedMinutes}
            onChange={(e) => patch({ plannedMinutes: Math.max(5, Number(e.target.value) || 30) })}
          />
        </div>
        <div>
          <label className="label">议程结构</label>
          <select
            className="input"
            value={m.agendaMode}
            onChange={(e) => patch({ agendaMode: e.target.value as AgendaMode })}
          >
            {AGENDA_MODES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">{AGENDA_MODES.find((x) => x.value === m.agendaMode)?.hint}</p>
        </div>
      </div>

      {/* Key Goal */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800 text-sm">Key Goal · 这场会最重要的目标</h3>
          <PriorityTag p={m.goal.keyGoal.priority} />
        </div>
        <div className="flex gap-2 mt-2">
          <input
            className="input flex-1"
            placeholder="例如：决定 v2.3 是否于 9 月 25 日按期上线"
            value={m.goal.keyGoal.text}
            onChange={(e) => patch({ goal: { ...m.goal, keyGoal: { ...m.goal.keyGoal, text: e.target.value } } })}
          />
          <select
            className="input !w-28"
            value={m.goal.keyGoal.priority}
            onChange={(e) =>
              patch({
                goal: { ...m.goal, keyGoal: { ...m.goal.keyGoal, priority: e.target.value as Priority } },
              })
            }
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          目标达成度 = 全部“必须完成”的结论 / 决策 / 行动项均已覆盖。
        </p>
      </div>

      <ItemList title="Key Conclusions · 需要形成哪些结论" hint="会中需当场形成的判断，例如：上线风险清单及等级" keyName="conclusions" />
      <ItemList title="Key Decisions · 必须做出哪些决策" hint="必须当场拍板的事项，例如：是否按期上线、灰度范围" keyName="decisions" />
      <ItemList title="Action Items · 会后必须产生哪些行动项" hint="会中应认领出来的事项，结束后检查负责人与截止时间" keyName="actionItems" />

      {/* 参会人 */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">参会人与角色</h3>
            <p className="text-xs text-slate-400 mt-0.5">“必须发言”的人若全程未表态，结束检查将报为阻塞缺口</p>
          </div>
          <button
            className="btn-soft !py-1 text-xs"
            onClick={() =>
              updateMeeting(m.id, (x) => ({
                ...x,
                participants: [...x.participants, { id: uid('p'), name: '', role: '', mustSpeak: true, attended: true }],
              }))
            }
          >
            + 添加
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {m.participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <input
                className="input !w-28"
                placeholder="姓名"
                value={p.name}
                onChange={(e) =>
                  updateMeeting(m.id, (x) => ({
                    ...x,
                    participants: x.participants.map((y) => (y.id === p.id ? { ...y, name: e.target.value } : y)),
                  }))
                }
              />
              <input
                className="input !w-36"
                placeholder="角色（如 技术负责人）"
                value={p.role}
                onChange={(e) =>
                  updateMeeting(m.id, (x) => ({
                    ...x,
                    participants: x.participants.map((y) => (y.id === p.id ? { ...y, role: e.target.value } : y)),
                  }))
                }
              />
              <label className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={p.mustSpeak}
                  onChange={(e) =>
                    updateMeeting(m.id, (x) => ({
                      ...x,
                      participants: x.participants.map((y) =>
                        y.id === p.id ? { ...y, mustSpeak: e.target.checked } : y,
                      ),
                    }))
                  }
                />
                必须发言
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={p.attended}
                  onChange={(e) =>
                    updateMeeting(m.id, (x) => ({
                      ...x,
                      participants: x.participants.map((y) =>
                        y.id === p.id ? { ...y, attended: e.target.checked } : y,
                      ),
                    }))
                  }
                />
                已出席
              </label>
              <button
                className="ml-auto text-slate-300 hover:text-rose-500"
                onClick={() =>
                  updateMeeting(m.id, (x) => ({
                    ...x,
                    participants: x.participants.filter((y) => y.id !== p.id),
                  }))
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 议程 */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              议程（{AGENDA_MODES.find((x) => x.value === m.agendaMode)?.label}）
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              计划合计 {totalPlanned} 分钟 / 会议时长 {m.plannedMinutes} 分钟
              {totalPlanned !== m.plannedMinutes && (
                <span className="text-amber-600"> （与会议时长不一致）</span>
              )}
            </p>
          </div>
          <button
            className="btn-soft !py-1 text-xs"
            onClick={() =>
              updateMeeting(m.id, (x) => ({
                ...x,
                segments: [...x.segments, { id: uid('s'), title: '', plannedMin: 5, priority: 'must', requiredSpeakerIds: [] }],
              }))
            }
          >
            + 添加环节
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {m.segments.map((s, idx) => (
            <div key={s.id} className="rounded-lg border border-slate-200 p-2 space-y-2">
              <div className="flex gap-2 items-center">
                <span className="text-xs text-slate-400 w-6 text-center shrink-0">{idx + 1}</span>
                <input
                  className="input flex-1"
                  placeholder="环节名称"
                  value={s.title}
                  onChange={(e) =>
                    updateMeeting(m.id, (x) => ({
                      ...x,
                      segments: x.segments.map((y) => (y.id === s.id ? { ...y, title: e.target.value } : y)),
                    }))
                  }
                />
                <input
                  type="number"
                  min={1}
                  className="input !w-20"
                  value={s.plannedMin}
                  onChange={(e) =>
                    updateMeeting(m.id, (x) => ({
                      ...x,
                      segments: x.segments.map((y) =>
                        y.id === s.id ? { ...y, plannedMin: Math.max(1, Number(e.target.value) || 5) } : y,
                      ),
                    }))
                  }
                />
                <span className="text-xs text-slate-400">分钟</span>
                <select
                  className="input !w-28"
                  value={s.priority}
                  onChange={(e) =>
                    updateMeeting(m.id, (x) => ({
                      ...x,
                      segments: x.segments.map((y) =>
                        y.id === s.id ? { ...y, priority: e.target.value as Priority } : y,
                      ),
                    }))
                  }
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  className="text-slate-300 hover:text-rose-500"
                  onClick={() =>
                    updateMeeting(m.id, (x) => ({ ...x, segments: x.segments.filter((y) => y.id !== s.id) }))
                  }
                >
                  ×
                </button>
              </div>
              {(m.agendaMode === 'matrix' || m.agendaMode === 'speaker') && (
                <div className="flex flex-wrap items-center gap-2 pl-8">
                  <span className="text-xs text-slate-400">本环节必须发言：</span>
                  {m.participants.map((p) => {
                    const on = s.requiredSpeakerIds.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        className={`chip border ${
                          on ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-slate-200 text-slate-400'
                        }`}
                        onClick={() =>
                          updateMeeting(m.id, (x) => ({
                            ...x,
                            segments: x.segments.map((y) =>
                              y.id === s.id
                                ? {
                                    ...y,
                                    requiredSpeakerIds: on
                                      ? y.requiredSpeakerIds.filter((i) => i !== p.id)
                                      : [...y.requiredSpeakerIds, p.id],
                                  }
                                : y,
                            ),
                          }))
                        }
                      >
                        {p.name}（{p.role}）
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pb-6">
        <button
          className="btn-primary"
          onClick={() => {
            updateMeeting(m.id, (x) => ({ ...x, status: 'live' }))
            go('live', m.id)
          }}
        >
          开始会议 →
        </button>
      </div>
    </div>
  )
}
