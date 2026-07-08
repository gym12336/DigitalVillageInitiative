import PracticeView from './PracticeView.vue'
import TeamsView from './mine/TeamsView.vue'
import TeamWorkbench from './mine/TeamWorkbench.vue'
import NewPracticeView from './mine/NewPracticeView.vue'

export default [
  { path: '/practice', name: 'practice', component: PracticeView },
  // 我的实践：队伍中枢（列表）→ 某队工作台 → 该队建档
  { path: '/practice/mine', name: 'practice-mine', component: TeamsView },
  { path: '/practice/mine/team/:teamId', name: 'practice-mine-team', component: TeamWorkbench },
  { path: '/practice/mine/team/:teamId/new', name: 'practice-mine-new', component: NewPracticeView },
]
