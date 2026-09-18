import type { MeetingTemplate } from '../types'

/**
 * 模板中的 segments.speakersByRole / DemoStep 里的 role 均用“角色名”声明，
 * 创建会议时按 participants.role 映射为人员 id。
 */
export const TEMPLATES: MeetingTemplate[] = [
  {
    id: 'tpl-launch',
    name: '产品上线决策会',
    description: '30 分钟 · 环节 × 发言人矩阵。适用于版本上线前的多角色拍板：技术就绪、质量风险、销售准备逐项确认，当场决定是否上线与灰度方案。',
    agendaMode: 'matrix',
    plannedMinutes: 30,
    participants: [
      { name: '周明', role: '主持人', mustSpeak: false, attended: true },
      { name: '林航', role: '产品负责人', mustSpeak: true, attended: true },
      { name: '陈锐', role: '技术负责人', mustSpeak: true, attended: true },
      { name: '苏晴', role: 'QA负责人', mustSpeak: true, attended: true },
      { name: '何佳', role: '销售负责人', mustSpeak: true, attended: true },
    ],
    goal: {
      keyGoal: { text: '决定 v2.3 是否于 9 月 25 日按期上线', priority: 'must' },
      conclusions: [
        { id: '', text: '形成上线风险清单及等级', priority: 'must', keywords: ['风险', '清单'] },
        { id: '', text: '形成灰度放量方案', priority: 'must', keywords: ['灰度', '放量', '全量'] },
      ],
      decisions: [
        { id: '', text: '是否按期上线', priority: 'must', keywords: ['按期上线', '是否上线', '延期', '上线时间'] },
        { id: '', text: '灰度范围与放量节奏', priority: 'must', keywords: ['灰度', '放量', '全量'] },
        { id: '', text: '回滚预案触发条件', priority: 'must', keywords: ['回滚', '蓝绿', '回退'] },
        { id: '', text: '上线营销节奏', priority: 'should', keywords: ['营销', '宣传', '推广', '市场'] },
      ],
      actionItems: [
        { id: '', text: '上线检查清单（QA 输出）', priority: 'must', keywords: ['检查清单'] },
        { id: '', text: '客户通知文案（客户成功输出）', priority: 'must', keywords: ['客户通知', '通知文案'] },
      ],
    },
    segments: [
      { title: '开场与目标对齐', plannedMin: 3, priority: 'should', speakersByRole: ['主持人'] },
      { title: '技术就绪', plannedMin: 5, priority: 'should', speakersByRole: ['技术负责人'] },
      { title: '质量与风险', plannedMin: 5, priority: 'must', speakersByRole: ['QA负责人'] },
      { title: '销售与客户准备', plannedMin: 5, priority: 'must', speakersByRole: ['销售负责人'] },
      { title: '上线决策', plannedMin: 8, priority: 'must', speakersByRole: ['产品负责人', '技术负责人', 'QA负责人', '销售负责人'] },
      { title: '行动项确认', plannedMin: 4, priority: 'must', speakersByRole: ['主持人'] },
    ],
  },
  {
    id: 'tpl-retro',
    name: '项目复盘会',
    description: '45 分钟 · 按环节推进。回顾目标与实际差距，沉淀经验、深挖根因，当场确定采纳的改进项与负责人。',
    agendaMode: 'phase',
    plannedMinutes: 45,
    participants: [
      { name: '孙悦', role: '主持人', mustSpeak: false, attended: true },
      { name: '王磊', role: '项目经理', mustSpeak: true, attended: true },
      { name: '李婷', role: '研发代表', mustSpeak: true, attended: true },
      { name: '赵帆', role: '测试代表', mustSpeak: true, attended: true },
      { name: '高远', role: '业务方代表', mustSpeak: true, attended: true },
    ],
    goal: {
      keyGoal: { text: '就 X 项目延期的根因达成共识，并确定可落地的改进项', priority: 'must' },
      conclusions: [
        { id: '', text: '项目延期根因 TOP3', priority: 'must', keywords: ['根因', '延期'] },
        { id: '', text: '可沉淀的成功经验', priority: 'should', keywords: ['经验', '做得好', '亮点'] },
      ],
      decisions: [
        { id: '', text: '采纳哪些改进项', priority: 'must', keywords: ['改进', '采纳'] },
        { id: '', text: '是否调整下一阶段排期', priority: 'should', keywords: ['排期', '下一阶段', '里程碑'] },
      ],
      actionItems: [
        { id: '', text: '每个采纳的改进项明确 owner 与截止时间', priority: 'must', keywords: ['改进项', 'owner', '负责人'] },
        { id: '', text: '复盘文档归档并同步全员', priority: 'should', keywords: ['归档', '复盘文档'] },
      ],
    },
    segments: [
      { title: '数据回顾：目标 vs 实际', plannedMin: 5, priority: 'should', speakersByRole: ['项目经理'] },
      { title: '做得好的：可沉淀的经验', plannedMin: 8, priority: 'should', speakersByRole: ['项目经理'] },
      { title: '问题与根因分析', plannedMin: 10, priority: 'must', speakersByRole: ['项目经理', '研发代表', '测试代表'] },
      { title: '改进建议', plannedMin: 8, priority: 'must', speakersByRole: ['研发代表', '测试代表', '业务方代表'] },
      { title: '决策与行动项', plannedMin: 10, priority: 'must', speakersByRole: ['项目经理', '业务方代表'] },
      { title: '总结收尾', plannedMin: 4, priority: 'should', speakersByRole: ['主持人'] },
    ],
  },
  {
    id: 'tpl-customer',
    name: '客户推进会',
    description: '25 分钟 · 按发言人顺序推进。销售、解决方案、客户成功依次同步并当场确认范围、报价与签约时间。',
    agendaMode: 'speaker',
    plannedMinutes: 25,
    participants: [
      { name: '方楠', role: '销售负责人', mustSpeak: true, attended: true },
      { name: '郑凯', role: '解决方案顾问', mustSpeak: true, attended: true },
      { name: '孟真', role: '客户成功经理', mustSpeak: true, attended: true },
      { name: '霍然', role: '旁听记录', mustSpeak: false, attended: true },
    ],
    goal: {
      keyGoal: { text: '推动 A 客户确认二期方案范围与报价，约定签约时间', priority: 'must' },
      conclusions: [
        { id: '', text: '客户当前核心顾虑', priority: 'must', keywords: ['顾虑', '担心'] },
        { id: '', text: '竞争对手动态', priority: 'should', keywords: ['竞对', '竞争对手'] },
      ],
      decisions: [
        { id: '', text: '二期范围确认', priority: 'must', keywords: ['二期', '范围'] },
        { id: '', text: '报价与折扣', priority: 'must', keywords: ['报价', '折扣', '价格'] },
        { id: '', text: '签约时间', priority: 'must', keywords: ['签约', '合同'] },
      ],
      actionItems: [
        { id: '', text: '修订方案并发客户', priority: 'must', keywords: ['方案修订', '修订', '方案'] },
        { id: '', text: '约定下次推进会时间', priority: 'should', keywords: ['下次', '推进会时间', '再约'] },
      ],
    },
    segments: [
      { title: '销售同步：客户最新动态与诉求', plannedMin: 6, priority: 'must', speakersByRole: ['销售负责人'] },
      { title: '解决方案：二期方案与报价说明', plannedMin: 7, priority: 'must', speakersByRole: ['解决方案顾问'] },
      { title: '客户成功：交付与满意度风险', plannedMin: 5, priority: 'must', speakersByRole: ['客户成功经理'] },
      { title: '决策与下一步', plannedMin: 7, priority: 'must', speakersByRole: ['销售负责人', '解决方案顾问', '客户成功经理'] },
    ],
  },
  {
    id: 'tpl-blank',
    name: '空白会议',
    description: '从零开始：自带目标、议程与角色，按时间顺序推进，适合任意会议类型。',
    agendaMode: 'timeline',
    plannedMinutes: 30,
    participants: [
      { name: '主持人', role: '主持人', mustSpeak: false, attended: true },
      { name: '成员A', role: '成员', mustSpeak: true, attended: true },
    ],
    goal: {
      keyGoal: { text: '', priority: 'must' },
      conclusions: [],
      decisions: [],
      actionItems: [],
    },
    segments: [
      { title: '开场', plannedMin: 3, priority: 'should', speakersByRole: [] },
      { title: '背景同步', plannedMin: 7, priority: 'should', speakersByRole: [] },
      { title: '讨论', plannedMin: 10, priority: 'must', speakersByRole: [] },
      { title: '决策', plannedMin: 5, priority: 'must', speakersByRole: [] },
      { title: '行动项', plannedMin: 5, priority: 'must', speakersByRole: [] },
    ],
  },
]
