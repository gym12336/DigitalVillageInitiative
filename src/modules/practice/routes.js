import PracticeView from './PracticeView.vue'
import TeamsView from './mine/TeamsView.vue'
import TeamWorkbench from './mine/TeamWorkbench.vue'
import NewPracticeView from './mine/NewPracticeView.vue'
import WorksList from './lowcode/WorksList.vue'
import ResultStudio from './lowcode/ResultStudio.vue'

export default [
  { path: '/practice', name: 'practice', component: PracticeView },
  // 我的实践：队伍中枢（列表）→ 某队工作台 → 该队建档
  { path: '/practice/mine', name: 'practice-mine', component: TeamsView },
  { path: '/practice/mine/team/:teamId', name: 'practice-mine-team', component: TeamWorkbench },
  { path: '/practice/mine/team/:teamId/new', name: 'practice-mine-new', component: NewPracticeView },
  // 成果搭建台（低代码工作台二）：列表落地页 + 编辑器
  //   /practice/studio       作品列表（?team=<队id> 归属；无则本机暂存）
  //   /practice/studio/edit  编辑器（?team=<队id> ?work=<作品id> 续编 ?source=<档案id> 数据源）
  { path: '/practice/studio', name: 'practice-studio', component: WorksList },
  { path: '/practice/studio/edit', name: 'practice-studio-edit', component: ResultStudio },
]
