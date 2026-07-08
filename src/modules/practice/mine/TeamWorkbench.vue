<template>
  <AuthGate>
  <section class="wb-page">
    <div class="container">
      <button class="btn back" @click="backToTeams">← 我的实践队</button>

      <!-- 队伍头部 -->
      <header class="team-head">
        <div class="th-main">
          <h1 class="th-name">{{ team?.name || '实践队' }}</h1>
          <span v-if="team" class="th-role" :class="{ owner: team.role === 'owner' }">
            {{ team.role === 'owner' ? '建队人' : '队员' }}
          </span>
        </div>
        <div class="th-actions">
          <button class="btn ghost" @click="showMembers = !showMembers">
            队员（{{ team?.memberCount ?? '—' }}）
          </button>
          <button v-if="team" class="btn ghost" @click="copyCode(team.inviteCode)">
            分享邀请码
          </button>
        </div>
      </header>

      <!-- 队员面板（可折叠）-->
      <TeamMembers v-if="showMembers && team" :team-id="teamId" @error="toast" class="members-panel" />

      <!-- ============ 列表视图 ============ -->
      <template v-if="!openedId">
        <div class="list-bar">
          <span class="list-count">共 {{ dossiers.length }} 份实践</span>
          <button class="btn primary" @click="onNew">+ 新建实践</button>
        </div>

        <div v-if="!dossiers.length" class="onboard">
          <p class="onboard-emoji">🌱</p>
          <h2>开始这支队的第一次实践</h2>
          <p>新建一份实践档案，把「实践前 → 实践中 → 实践后」串成一条线。</p>
          <button class="btn primary" @click="onNew">+ 新建实践</button>
        </div>

        <div v-else class="dossier-grid">
          <article
            v-for="d in dossiers"
            :key="d.id"
            class="dossier-card"
            tabindex="0"
            role="button"
            @click="openDossier(d.id)"
            @keydown.enter="openDossier(d.id)"
          >
            <div class="dc-head">
              <span class="dc-stage" :class="'stage-' + d.stage">{{ stageName(d.stage) }}</span>
              <button
                v-if="canDelete(d)"
                class="dc-del"
                aria-label="删除实践"
                @click.stop="onRemove(d)"
              >🗑</button>
            </div>
            <h3 class="dc-title">{{ d.title }}</h3>
            <p class="dc-meta">
              <span v-if="d.plan?.targetVillage || d.village">📍 {{ d.plan?.targetVillage || d.village }}</span>
              <span v-if="d.plan?.topic">· {{ d.plan.topic }}</span>
            </p>
            <p class="dc-idea">{{ d.idea || '还没有填写 idea' }}</p>
            <div class="dc-foot">
              <span class="dc-progress">
                <span
                  v-for="(s, i) in steps"
                  :key="s.key"
                  class="dot"
                  :class="{ on: stageIndex(d.stage) >= i }"
                />
              </span>
              <span class="dc-time">{{ formatDate(d.updatedAt) }} 更新</span>
            </div>
          </article>
        </div>
      </template>

      <!-- ============ 工作台视图 ============ -->
      <template v-else-if="active">
        <button class="btn back" @click="backToList">← 队内实践</button>

        <div class="workbench-head">
          <h2 class="wb-title">{{ active.title }}</h2>
          <span class="wb-stage" :class="'stage-' + active.stage">{{ stageName(active.stage) }}</span>
        </div>

        <nav class="stepper" aria-label="实践阶段">
          <button
            v-for="(s, i) in steps"
            :key="s.key"
            class="step"
            :class="{ active: active.stage === s.key, done: stageIndex(active.stage) > i }"
            @click="goStage(s.key)"
          >
            <span class="step-no">{{ i + 1 }}</span>
            <span class="step-text">
              <span class="step-name">{{ s.name }}</span>
              <span class="step-sub">{{ s.sub }}</span>
            </span>
          </button>
        </nav>

        <div class="stage-wrap">
          <StagePlan v-if="active.stage === 'plan'" :dossier="active" @update="applyUpdate" />
          <StageTrack v-else-if="active.stage === 'track'" :dossier="active" @update="applyUpdate" />
          <StageResult v-else :dossier="active" @update="applyUpdate" />
        </div>

        <div class="stage-nav">
          <button v-if="stageIndex(active.stage) > 0" class="btn ghost" @click="prevStage">← 上一阶段</button>
          <button v-if="stageIndex(active.stage) < steps.length - 1" class="btn primary" @click="nextStage">
            下一阶段 →
          </button>
        </div>
      </template>
    </div>

    <AppToast ref="toastRef" />
  </section>
  </AuthGate>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import AuthGate from './AuthGate.vue'
import TeamMembers from './TeamMembers.vue'
import StagePlan from './StagePlan.vue'
import StageTrack from './StageTrack.vue'
import StageResult from './StageResult.vue'
import { currentUser } from './auth.js'
import { apiGetTeam } from './api.js'
import { loadDossiers, getDossier, updateDossier, removeDossier, setStage, STAGES } from './dossier.js'

const steps = [
  { key: 'plan', name: '实践前', sub: '帮策划' },
  { key: 'track', name: '实践中', sub: '督进度' },
  { key: 'result', name: '实践后', sub: '出成果' },
]
const STAGE_NAMES = { plan: '实践前', track: '实践中', result: '实践后' }

const route = useRoute()
const router = useRouter()

const teamId = computed(() => Number(route.params.teamId))
const team = ref(null) // { id, name, inviteCode, role, memberCount }
const dossiers = ref([])
const openedId = ref('')
const active = ref(null)
const showMembers = ref(false)
const toastRef = ref(null)

function toast(msg) {
  toastRef.value?.show(msg)
}

async function loadTeam() {
  try {
    team.value = await apiGetTeam(teamId.value)
  } catch (e) {
    toast(e.message || '加载队伍失败')
    // 非成员/不存在：退回队列表
    if (e.status === 403 || e.status === 404) router.replace('/practice/mine')
  }
}

async function refresh() {
  try {
    dossiers.value = await loadDossiers(teamId.value)
  } catch (e) {
    toast(e.message || '加载失败')
  }
}

async function init() {
  await loadTeam()
  if (!team.value) return
  await refresh()
  const openId = route.query.open
  if (openId && dossiers.value.some((d) => d.id === String(openId))) {
    await openDossier(String(openId))
  }
}

onMounted(init)
// 队切换时重载（同一组件不同 teamId）
watch(teamId, async () => {
  openedId.value = ''
  active.value = null
  showMembers.value = false
  await init()
})

function stageIndex(stage) {
  return STAGES.indexOf(stage)
}
function stageName(stage) {
  return STAGE_NAMES[stage] || stage
}
function formatDate(iso) {
  if (!iso) return ''
  return String(iso).slice(0, 10)
}
function canDelete(d) {
  return currentUser.value && d.createdBy === currentUser.value.id
}

async function openDossier(id) {
  try {
    const full = await getDossier(id)
    if (!full) {
      toast('档案不存在')
      await refresh()
      return
    }
    active.value = full
    openedId.value = id
  } catch (e) {
    toast(e.message || '打开失败')
  }
}
async function backToList() {
  openedId.value = ''
  active.value = null
  await refresh()
}
function backToTeams() {
  router.push('/practice/mine')
}

function onNew() {
  router.push(`/practice/mine/team/${teamId.value}/new`)
}

async function onRemove(d) {
  if (!window.confirm(`确认删除实践「${d.title}」？此操作不可撤销。`)) return
  try {
    await removeDossier(d.id)
    if (openedId.value === d.id) {
      openedId.value = ''
      active.value = null
    }
    await refresh()
  } catch (e) {
    toast(e.message || '删除失败')
  }
}

async function applyUpdate(patch) {
  if (!active.value) return
  try {
    const updated = await updateDossier(active.value.id, patch)
    if (updated) active.value = updated
  } catch (e) {
    toast(e.message || '保存失败')
  }
}

async function goStage(key) {
  if (!active.value) return
  try {
    const updated = await setStage(active.value.id, key)
    if (updated) active.value = updated
  } catch (e) {
    toast(e.message || '切换阶段失败')
  }
}
function nextStage() {
  const next = STAGES[stageIndex(active.value.stage) + 1]
  if (next) goStage(next)
}
function prevStage() {
  const prev = STAGES[stageIndex(active.value.stage) - 1]
  if (prev) goStage(prev)
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code)
    toast('邀请码已复制，发给队友即可加入')
  } catch {
    toast(`邀请码：${code}`)
  }
}
</script>

<style scoped>
.wb-page { padding: 2.6rem 0 3rem; }
.container { max-width: 1080px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .6rem 1.4rem; background: var(--color-primary); color: #fff; font-size: .9rem; }
.btn.primary:hover { background: var(--color-primary-dark); transform: translateY(-1px); }
.btn.ghost { padding: .5rem 1.2rem; background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: .86rem; }
.btn.ghost:hover { border-color: var(--color-primary); color: var(--color-primary); }
.btn.back { margin-bottom: 1.2rem; padding: .45rem 1.1rem; background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: .86rem; }
.btn.back:hover { border-color: var(--color-primary); color: var(--color-primary); }

.team-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
.th-main { display: flex; align-items: center; gap: .8rem; }
.th-name { margin: 0; font-size: clamp(22px, 3.5vw, 30px); font-weight: 700; color: var(--color-primary-dark); }
.th-role { font-size: .76rem; font-weight: 600; padding: .18rem .8rem; border-radius: 50px; background: var(--color-bg); color: var(--color-text-secondary); }
.th-role.owner { background: var(--color-accent); color: var(--color-primary-dark); }
.th-actions { display: flex; gap: .6rem; }
.members-panel { margin-bottom: 1.6rem; }

.list-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.4rem; }
.list-count { font-size: .9rem; color: var(--color-text-light); }

.onboard { text-align: center; padding: 3.5rem 1rem; background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }
.onboard-emoji { font-size: 2.6rem; margin: 0; }
.onboard h2 { margin: .6rem 0 .4rem; color: var(--color-primary-dark); }
.onboard p { margin: 0 0 1.4rem; color: var(--color-text-secondary); }

.dossier-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.2rem; }
.dossier-card {
  display: flex; flex-direction: column; gap: .5rem;
  padding: 1.3rem 1.4rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
  cursor: pointer; transition: transform var(--transition), box-shadow var(--transition);
}
.dossier-card:hover, .dossier-card:focus-visible { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); outline: none; }
.dc-head { display: flex; align-items: center; justify-content: space-between; }
.dc-stage { font-size: .74rem; font-weight: 600; padding: .16rem .7rem; border-radius: 50px; }
.stage-plan { background: var(--color-accent); color: var(--color-primary-dark); }
.stage-track { background: #e3f2fd; color: #4a8fbf; }
.stage-result { background: #e8f5e9; color: var(--color-primary); }
.dc-del { border: none; background: transparent; cursor: pointer; font-size: .95rem; opacity: .5; transition: opacity var(--transition); }
.dc-del:hover { opacity: 1; }
.dc-title { margin: .1rem 0 0; font-size: 1.1rem; color: var(--color-text); }
.dc-meta { margin: 0; font-size: .82rem; color: var(--color-text-secondary); display: flex; flex-wrap: wrap; gap: .3rem; }
.dc-idea {
  margin: .2rem 0 0; font-size: .86rem; color: var(--color-text-light); line-height: 1.5; flex: 1;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.dc-foot { display: flex; align-items: center; justify-content: space-between; margin-top: .4rem; }
.dc-progress { display: inline-flex; gap: .35rem; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-border); }
.dot.on { background: var(--color-primary); }
.dc-time { font-size: .76rem; color: var(--color-text-light); }

.workbench-head { display: flex; align-items: center; gap: .8rem; margin-bottom: 1.4rem; flex-wrap: wrap; }
.wb-title { margin: 0; font-size: 1.5rem; color: var(--color-primary-dark); }
.wb-stage { font-size: .78rem; font-weight: 600; padding: .18rem .8rem; border-radius: 50px; }

.stepper { display: flex; gap: .8rem; margin-bottom: 1.8rem; flex-wrap: wrap; }
.step {
  flex: 1; min-width: 150px; display: flex; align-items: center; gap: .7rem;
  padding: .9rem 1.1rem; text-align: left; cursor: pointer;
  background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px;
  transition: all var(--transition);
}
.step:hover { border-color: var(--color-primary); }
.step.active { border-color: var(--color-primary); background: var(--color-accent); box-shadow: var(--shadow-card); }
.step-no {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%;
  display: grid; place-items: center; font-size: .85rem; font-weight: 700;
  background: var(--color-bg); color: var(--color-text-secondary);
}
.step.active .step-no { background: var(--color-primary); color: #fff; }
.step.done .step-no { background: var(--color-primary); color: #fff; }
.step-text { display: flex; flex-direction: column; }
.step-name { font-size: .95rem; font-weight: 700; color: var(--color-text); }
.step-sub { font-size: .78rem; color: var(--color-text-light); }

.stage-wrap { margin-bottom: 1.8rem; }
.stage-nav { display: flex; justify-content: space-between; gap: 1rem; }
.stage-nav .btn { padding: .65rem 1.6rem; }
.stage-nav > .btn:only-child { margin-left: auto; }
</style>
