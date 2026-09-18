import { TEMPLATES } from '../data/templates'
import { useAppStore } from '../store'
import type { Meeting } from '../types'
import { AGENDA_MODES } from '../components/ui'

const STATUS_LABEL: Record<Meeting['status'], { text: string; cls: string }> = {
  preparing: { text: '会前准备中', cls: 'bg-slate-200 text-slate-600' },
  live: { text: '会中', cls: 'bg-emerald-100 text-emerald-700' },
  closing: { text: '结束检查', cls: 'bg-amber-100 text-amber-700' },
  ended: { text: '已结束', cls: 'bg-brand-100 text-brand-700' },
}

export default function HomePage() {
  const meetings = useAppStore((s) => s.meetings)
  const createFromTemplate = useAppStore((s) => s.createFromTemplate)
  const createFromDemo = useAppStore((s) => s.createFromDemo)
  const go = useAppStore((s) => s.go)
  const deleteMeeting = useAppStore((s) => s.deleteMeeting)

  const continueMeeting = (m: Meeting) => {
    if (m.status === 'ended') go('summary', m.id)
    else if (m.status === 'preparing') go('prepare', m.id)
    else go('live', m.id)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Hero */}
      <section className="card p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-brand-50 rounded-full -mr-28 -mt-28 pointer-events-none" />
        <div className="absolute right-16 bottom-0 w-40 h-40 bg-brand-50/70 rounded-full -mb-20 pointer-events-none" />
        <div className="relative">
          <span className="chip bg-brand-100 text-brand-700 mb-3">笔试题 3 · 有效会议助手 · Mock 数据演示</span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
            开会前先回答：<span className="text-brand-600">这场会必须达成什么？</span>
          </h1>
          <p className="mt-2.5 text-slate-500 max-w-3xl text-sm leading-6">
            现有会议工具只解决“记录了什么”。MeetingPilot 把会议目标结构化（Key Goal / Conclusions / Decisions /
            Action Items），会中实时检查覆盖情况，并在<span className="font-semibold text-slate-700">会议结束前</span>
            回答：为了达成本次会议目标，还有什么没有讨论、没有确认、没有决定？
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => createFromDemo('demo-launch')}
              className="group text-left rounded-xl bg-brand-600 text-white px-5 py-4 shadow-sm hover:bg-brand-700 hover:shadow-card-hover transition-all duration-200 cursor-pointer"
            >
              <div className="font-semibold">▶ 一键演示：6 分钟产品上线决策会</div>
              <div className="text-xs text-brand-100 mt-1">模拟转写 · 预埋缺口 · 约 30 秒跑完覆盖检查全流程</div>
            </button>
            <button
              onClick={() => createFromDemo('demo-customer')}
              className="group text-left rounded-xl border-2 border-brand-300 bg-white px-5 py-4 hover:border-brand-500 hover:bg-brand-50/50 transition-all duration-200 cursor-pointer"
            >
              <div className="font-semibold text-brand-700">▶ 一键演示：5 分钟客户推进会</div>
              <div className="text-xs text-slate-500 mt-1">发言人顺序议程 · 另一种缺口画像</div>
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            评审者 30 秒路径：点上面任一演示 → 「一键载入全部」→「准备结束会议」→ 逐项处理缺口 → 正式结束看总结。
          </p>
        </div>
      </section>

      {/* 模板 */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-3">从会议模板创建</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => createFromTemplate(t.id)}
              className="card card-clickable p-4 text-left flex flex-col"
            >
              <div className="font-semibold text-slate-800">{t.name}</div>
              <div className="text-xs text-slate-500 mt-2 flex-1 leading-5">{t.description}</div>
              <div className="mt-3 flex flex-wrap gap-1 text-xs text-slate-400">
                <span className="chip bg-slate-100 text-slate-500">{AGENDA_MODES.find((x) => x.value === t.agendaMode)?.label}</span>
                <span className="chip bg-slate-100 text-slate-500">{t.plannedMinutes} 分钟</span>
                <span className="chip bg-slate-100 text-slate-500">{t.participants.length} 个角色</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 我的会议 */}
      {meetings.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3">我的会议（本浏览器保存）</h2>
          <div className="space-y-2">
            {meetings.map((m) => {
              const st = STATUS_LABEL[m.status]
              const tplName = TEMPLATES.find((t) => t.id === m.templateId)?.name ?? '—'
              return (
                <div key={m.id} className="card px-4 py-3 flex items-center gap-3">
                  <span className={`chip ${st.cls}`}>{st.text}</span>
                  <span className="font-medium text-slate-700 flex-1 truncate">{m.title}</span>
                  <span className="text-xs text-slate-400 hidden sm:inline">{tplName}</span>
                  <span className="text-xs text-slate-400 hidden md:inline">
                    {new Date(m.createdAt).toLocaleString('zh-CN')}
                  </span>
                  <button className="btn-soft" onClick={() => continueMeeting(m)}>
                    {m.status === 'ended' ? '查看总结' : m.status === 'preparing' ? '继续准备' : '回到会议'}
                  </button>
                  <button
                    className="text-slate-300 hover:text-rose-500 text-lg px-1"
                    title="删除"
                    onClick={() => {
                      if (window.confirm('删除这场会议？')) deleteMeeting(m.id)
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 说明区 */}
      <section className="grid md:grid-cols-3 gap-4">
        <details className="card p-4" open>
          <summary className="font-semibold text-slate-700 cursor-pointer">功能说明</summary>
          <div className="mt-3 text-sm text-slate-600 space-y-2 leading-6">
            <p>
              主流程：<b>创建会议</b> → <b>选择模板</b> → <b>录入目标与议程</b> → <b>录入/加载讨论内容</b> →{' '}
              <b>检查覆盖</b> → <b>结束前缺口检查</b> → <b>生成总结</b>。
            </p>
            <p>
              会前：录入 Key Goal / 关键结论 / 关键决策 / 行动项预期，每项可标记“必须完成 / 建议完成 /
              仅供记录”；支持 4 种议程结构（时间顺序 / 发言人顺序 / 环节推进 / 环节 × 发言人矩阵）。
            </p>
            <p>
              会中：录入或加载讨论记录，看板实时显示议题、发言人、决策、行动项覆盖状态；规则引擎从发言中自动识别决策。
            </p>
            <p>
              结束前：一键检查“还有什么没讨论、没确认、没决定”，区分<b>阻塞结束</b>与<b>可会后跟进</b>；可返回讨论、缺口转行动项、或记录例外原因后结束。
            </p>
          </div>
        </details>
        <details className="card p-4">
          <summary className="font-semibold text-slate-700 cursor-pointer">Mock 数据说明</summary>
          <div className="mt-3 text-sm text-slate-600 space-y-2 leading-6">
            <p>本工具未接入真实会议软件与语音转写，全部数据为本地 Mock：</p>
            <p>
              · 「一键演示」预置了两段带发言人/时间戳的模拟转写（产品上线决策会 19 条、客户推进会 10
              条），可逐条“播放”或一键载入；
            </p>
            <p>· 会中“AI 主动提示”由本地规则引擎触发（必须发言人零发言、临近结束仍未决策、环节必发言人未表态等），非大模型调用；</p>
            <p>· 决策自动识别基于“决策动词 + 议题关键词”同条命中，误识别可删除；</p>
            <p>· 也可以全程手动录入自己的会议内容，流程完全一致。</p>
          </div>
        </details>
        <details className="card p-4">
          <summary className="font-semibold text-slate-700 cursor-pointer">已知限制</summary>
          <div className="mt-3 text-sm text-slate-600 space-y-2 leading-6">
            <p>· 未接入飞书 / 腾讯会议 / Zoom 等真实会议软件，不支持实时语音转写；</p>
            <p>· 关键词匹配为子串命中，无法完全理解语义；漏匹配时可用“手动标记 ✓”兜底，误匹配的自动决策可删除；</p>
            <p>· 会议数据仅保存在当前浏览器 localStorage，清除浏览器数据会丢失，不支持多端同步与多人协同；</p>
            <p>· “会议时钟”取自最新一条讨论记录的时间戳，播放模拟讨论即推进时钟；</p>
            <p>· 行动项通知、日历集成等会后联动未实现。</p>
          </div>
        </details>
      </section>
    </div>
  )
}

