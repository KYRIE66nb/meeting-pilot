import type { DemoScript } from '../types'

/**
 * 演示剧本（Mock 数据）：讨论记录会触发规则引擎自动识别决策；
 * action / risk 步骤模拟“会中被记录下来的结构化事件”。
 * 剧本刻意预埋缺口，用于演示“结束前缺口检查”。
 */
export const DEMO_SCRIPTS: DemoScript[] = [
  {
    id: 'demo-launch',
    templateId: 'tpl-launch',
    meetingTitle: '演示 · v2.3 产品上线决策会（预埋缺口）',
    title: '6 分钟产品上线决策会（模拟转写 · 预埋缺口）',
    note: '剧本设计：是否上线、灰度范围两项关键决策当场拍板（规则引擎自动识别），风险清单与灰度方案两条结论有证据支撑；同时预埋 4 项阻塞缺口——QA 负责人全程未发言、回滚预案“讨论过但没决定”、客户通知文案缺截止时间、客服排班风险未解决；另有 1 项可会后跟进（营销节奏未讨论）。载入后点击「准备结束会议」查看缺口报告。',
    steps: [
      { type: 'entry', t: 10, speakerRole: '主持人', text: '欢迎各位。今天这场会只有一个目标：确认 v2.3 是否在 9 月 25 日按期上线。先过数据，再分角色确认，最后形成结论。' },
      { type: 'entry', t: 70, speakerRole: '主持人', text: '内测数据：次周留存环比提升 6%，崩溃率降到 0.3%，整体达标。' },
      { type: 'entry', t: 200, speakerRole: '技术负责人', text: '技术侧开发全部完成，性能压测达标，发布流水线就绪，技术就绪。' },
      { type: 'entry', t: 310, speakerRole: '技术负责人', text: '灰度建议：首日放量 10%，观察一个交易日无异常后全量。' },
      { type: 'entry', t: 500, speakerRole: '主持人', text: '质量报告苏晴会前已经发到群里了，今天时间紧，测试这块就不逐条过，直接看结论页。' },
      { type: 'entry', t: 800, speakerRole: '销售负责人', text: '销售侧：Top 20 客户已逐一沟通，普遍可以接受，两家提出上线首周驻场支持。' },
      { type: 'entry', t: 870, speakerRole: '销售负责人', text: '客户成功已经准备好客户通知的初稿，上线当天推送。' },
      { type: 'entry', t: 1090, speakerRole: '产品负责人', text: '从产品和数据看，我认为具备按期上线条件。风险清单会前已按高、中、低整理，高风险项均已关闭。' },
      { type: 'entry', t: 1170, speakerRole: '技术负责人', text: '技术同意按期上线，灰度按刚才说的 10% 起步。' },
      { type: 'entry', t: 1230, speakerRole: '销售负责人', text: '销售同意按期上线，客户沟通没有障碍。' },
      { type: 'entry', t: 1290, speakerRole: '主持人', text: '好，我们正式决定：v2.3 于 9 月 25 日按期上线；灰度范围首日 10%，次日评估全量。' },
      { type: 'entry', t: 1350, speakerRole: '产品负责人', text: '回滚方面，之前讨论过蓝绿切换的思路，触发条件还需要陈锐团队细化，待定后补充纪要。' },
      { type: 'entry', t: 1500, speakerRole: '主持人', text: '客服侧反馈：如果上线首周咨询量涨 50%，现有客服排班可能接不住，这个先记为风险。' },
      { type: 'risk', text: '上线首周咨询量可能激增，现有客服排班接不住', blocking: true },
      { type: 'entry', t: 1580, speakerRole: '主持人', text: '行动项确认：上线检查清单由苏晴负责，9 月 24 日中午前完成并同步发布群。' },
      { type: 'action', text: '输出上线检查清单并同步发布群', ownerRole: 'QA负责人', due: '2026-09-24', goalItemText: '上线检查清单（QA 输出）' },
      { type: 'entry', t: 1650, speakerRole: '销售负责人', text: '客户通知文案我来盯，上线前两天发出去。' },
      { type: 'action', text: '定稿并推送客户通知文案', ownerRole: '销售负责人', goalItemText: '客户通知文案（客户成功输出）' },
      { type: 'entry', t: 1720, speakerRole: '主持人', text: '时间差不多了，我们收尾。我现在跑一下结束前的缺口检查。' },
    ],
  },
  {
    id: 'demo-customer',
    templateId: 'tpl-customer',
    meetingTitle: '演示 · A 客户二期推进会（预埋缺口）',
    title: '5 分钟客户推进会（模拟转写 · 预埋缺口）',
    note: '剧本设计：二期范围当场定案（精简版），报价折扣与签约时间被明确“下周内部对齐后再答复”——两项必须决策停在“讨论过但没决定”；客户成功经理在「决策与下一步」环节未表态。共 3 项阻塞缺口 + 2 项可跟进缺口。演示“发言人顺序”议程模式下的覆盖检查。',
    steps: [
      { type: 'entry', t: 20, speakerRole: '销售负责人', text: 'A 客户上周试用二期原型，整体满意，但新财年预算被砍了 15%。' },
      { type: 'entry', t: 120, speakerRole: '销售负责人', text: '客户现在最担心交付周期，怕赶不上他们双十一活动的中期档期。' },
      { type: 'entry', t: 420, speakerRole: '解决方案顾问', text: '二期方案建议砍掉数据大屏模块、保核心流程，报价从 80 万调整到 68 万。' },
      { type: 'entry', t: 500, speakerRole: '解决方案顾问', text: '折扣低于 9 折要走总部特批，我今天给不了最终答复。' },
      { type: 'entry', t: 810, speakerRole: '客户成功经理', text: '客户成功侧：当前满意度 92%，没有交付红灯；唯一风险是客户侧对接人下个月换人。' },
      { type: 'entry', t: 900, speakerRole: '客户成功经理', text: '建议尽早锁定客户侧新的对接人，避免信息断层。' },
      { type: 'entry', t: 1140, speakerRole: '销售负责人', text: '那我们先定：二期范围按砍掉数据大屏的精简版推进，这个方向客户已经点头。' },
      { type: 'entry', t: 1170, speakerRole: '解决方案顾问', text: '方案侧没问题，修订版两天内能出。' },
      { type: 'action', text: '输出修订版二期方案（精简版）并发送客户', ownerRole: '销售负责人', due: '2026-09-22', goalItemText: '修订方案并发客户' },
      { type: 'entry', t: 1230, speakerRole: '销售负责人', text: '报价折扣和签约时间，我们下周内部对齐后再正式答复客户，今天先到这。' },
    ],
  },
]
