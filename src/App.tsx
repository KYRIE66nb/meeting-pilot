import { useAppStore } from './store'
import HomePage from './pages/HomePage'
import PreparePage from './pages/PreparePage'
import LivePage from './pages/LivePage'
import ClosingPage from './pages/ClosingPage'
import SummaryPage from './pages/SummaryPage'

const STEPS: Array<{ view: string; label: string }> = [
  { view: 'prepare', label: '① 会前准备' },
  { view: 'live', label: '② 会中推进' },
  { view: 'closing', label: '③ 结束检查' },
  { view: 'summary', label: '④ 会议总结' },
]

export default function App() {
  const view = useAppStore((s) => s.view)
  const go = useAppStore((s) => s.go)
  const meeting = useAppStore((s) =>
    s.currentId ? s.meetings.find((m) => m.id === s.currentId) : undefined,
  )

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <button className="flex items-center gap-2 font-bold text-slate-800 hover:opacity-80 transition-opacity" onClick={() => go('home')}>
            <span className="w-7 h-7 rounded-lg bg-brand-600 text-white grid place-items-center text-sm shadow-sm">✓</span>
            MeetingPilot<span className="hidden sm:inline text-slate-400 font-normal">有效会议助手</span>
          </button>
          {meeting && view !== 'home' && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-sm text-slate-600 truncate max-w-[16rem]">{meeting.title}</span>
              <div className="ml-auto hidden md:flex items-center gap-1">
                {STEPS.map((s) => (
                  <span
                    key={s.view}
                    className={`text-xs px-2 py-1 rounded-full ${
                      view === s.view ? 'bg-brand-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </>
          )}
          {!meeting || view === 'home' ? (
            <span className="ml-auto text-xs text-slate-500 hidden sm:block">
              会前定目标 · 会中查覆盖 · 结束前查缺口 · 会后出总结
            </span>
          ) : null}
        </div>
      </header>

      <main className="flex-1">
        {view === 'home' && <HomePage />}
        {view === 'prepare' && <PreparePage />}
        {view === 'live' && <LivePage />}
        {view === 'closing' && <ClosingPage />}
        {view === 'summary' && <SummaryPage />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-3">
        <div className="max-w-7xl mx-auto px-4 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          <span>MeetingPilot 有效会议助手 · 笔试演示作品</span>
          <span>讨论转写与 AI 提示均为本地规则引擎 + Mock 数据，未接入真实会议软件</span>
          <span>数据仅保存在当前浏览器（localStorage）</span>
        </div>
      </footer>
    </div>
  )
}
