<template>
  <AuthGate>
  <section class="teams-page tool-interface">
    <div class="container">
      <header class="page-head">
        <p class="kicker">乡村实践 · 我的实践</p>
        <h1>我的实践队</h1>
        <p class="desc">
          你好 {{ currentUser?.displayName || currentUser?.username }}，这里是你加入的所有实践队。
          进入某个队即可查看队内实践、队员，并新建实践。
        </p>
      </header>

      <div class="list-bar">
        <span class="list-count">共 {{ teams.length }} 支队</span>
        <div class="bar-actions">
          <button class="btn ghost" @click="openJoin = true">输邀请码加入</button>
          <button class="btn primary" @click="openCreate = true">+ 建队</button>
        </div>
      </div>

      <!-- 空态引导 -->
      <div v-if="!teams.length && loaded" class="onboard">
        <div class="onboard-icon"><AppIcon name="users" :size="32" /></div>
        <h2>创建你的第一个实践队</h2>
        <p>建队后会拿到一个邀请码，分享给队友即可一起协作实践。也可以用别人的邀请码加入现有队。</p>
        <div class="onboard-actions">
          <button class="btn primary" @click="openCreate = true">+ 建队</button>
          <button class="btn ghost" @click="openJoin = true">输邀请码加入</button>
        </div>
      </div>

      <!-- 队卡片墙 -->
      <div v-else-if="teams.length" class="team-grid">
        <article
          v-for="t in teams"
          :key="t.id"
          class="team-card"
          tabindex="0"
          role="button"
          @click="enterTeam(t.id)"
          @keydown.enter="enterTeam(t.id)"
        >
          <div class="tc-head">
            <h3 class="tc-name">{{ t.name }}</h3>
            <span class="tc-role" :class="{ owner: t.role === 'owner' }">
              {{ t.role === 'owner' ? '建队人' : '队员' }}
            </span>
          </div>
          <div class="tc-stats">
            <span><AppIcon name="users" :size="13" />{{ t.memberCount }} 名队员</span>
            <span><AppIcon name="document" :size="13" />我建了 {{ t.myDossierCount }} 份</span>
          </div>
          <div class="tc-foot">进入工作台 →</div>
        </article>
      </div>

      <!-- 建队弹层 -->
      <div v-if="openCreate" class="modal-mask" @click.self="closeCreate">
        <div class="modal">
          <h2 class="modal-title">建立实践队</h2>
          <template v-if="!createdTeam">
            <form class="modal-form" @submit.prevent="onCreate">
              <label class="gate-field">
                <span>队名</span>
                <input v-model.trim="createName" placeholder="如 浙大三下乡实践团" />
              </label>
              <div class="modal-actions">
                <button type="button" class="btn ghost" @click="closeCreate">取消</button>
                <button type="submit" class="btn primary" :disabled="busy">
                  {{ busy ? '创建中…' : '创建' }}
                </button>
              </div>
            </form>
          </template>
          <!-- 建队成功：展示邀请码供复制分享 -->
          <template v-else>
            <p class="modal-hint">「{{ createdTeam.name }}」创建成功！把下面的邀请码分享给队友：</p>
            <div class="invite-box">
              <code class="invite-code">{{ createdTeam.inviteCode }}</code>
              <button class="btn ghost" @click="copyCode(createdTeam.inviteCode)">复制</button>
            </div>
            <div class="modal-actions">
              <button class="btn ghost" @click="closeCreate">留在这里</button>
              <button class="btn primary" @click="enterTeam(createdTeam.id)">进入该队</button>
            </div>
          </template>
        </div>
      </div>

      <!-- 加入弹层 -->
      <div v-if="openJoin" class="modal-mask" @click.self="openJoin = false">
        <div class="modal">
          <h2 class="modal-title">用邀请码加入</h2>
          <form class="modal-form" @submit.prevent="onJoin">
            <label class="gate-field">
              <span>邀请码</span>
              <input v-model.trim="joinCode" placeholder="向队友索取" />
            </label>
            <div class="modal-actions">
              <button type="button" class="btn ghost" @click="openJoin = false">取消</button>
              <button type="submit" class="btn primary" :disabled="busy">
                {{ busy ? '加入中…' : '加入' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <AppToast ref="toastRef" />
  </section>
  </AuthGate>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import AppIcon from '@/components/AppIcon.vue'
import AuthGate from './AuthGate.vue'
import { currentUser, loadMyTeams, createTeam, joinTeam } from './auth.js'
import { hasPendingMigration, migrateLegacyDossiers, readLegacyDossiers } from './dossier.js'

const router = useRouter()

const teams = ref([])
const loaded = ref(false)
const busy = ref(false)
const openCreate = ref(false)
const openJoin = ref(false)
const createName = ref('')
const joinCode = ref('')
const createdTeam = ref(null) // 建队成功后暂存，用于展示邀请码
const toastRef = ref(null)

function toast(msg) {
  toastRef.value?.show(msg)
}

async function refresh() {
  try {
    teams.value = await loadMyTeams()
  } catch (e) {
    toast(e.message || '加载队伍失败')
  } finally {
    loaded.value = true
  }
}

onMounted(refresh)

function closeCreate() {
  openCreate.value = false
  createName.value = ''
  createdTeam.value = null
}

async function onCreate() {
  if (busy.value) return
  if (!createName.value) {
    toast('请填写队名')
    return
  }
  busy.value = true
  try {
    createdTeam.value = await createTeam(createName.value)
    teams.value = await loadMyTeams()
    toast('建队成功')
    await maybeMigrate(createdTeam.value.id)
  } catch (e) {
    toast(e.message || '建队失败')
  } finally {
    busy.value = false
  }
}

async function onJoin() {
  if (busy.value) return
  if (!joinCode.value) {
    toast('请填写邀请码')
    return
  }
  busy.value = true
  try {
    const team = await joinTeam(joinCode.value)
    teams.value = await loadMyTeams()
    toast(`已加入「${team.name}」`)
    openJoin.value = false
    joinCode.value = ''
    await maybeMigrate(team.id)
  } catch (e) {
    toast(e.message || '加入失败')
  } finally {
    busy.value = false
  }
}

// 首次进队后若检测到本机旧档案，提示一次性迁移到该队。
async function maybeMigrate(teamId) {
  if (!hasPendingMigration()) return
  const legacyCount = readLegacyDossiers().length
  if (!window.confirm(`检测到本机 ${legacyCount} 份旧档案，是否上传到该队？`)) return
  try {
    const { imported } = await migrateLegacyDossiers(teamId)
    toast(`已迁移 ${imported} 份旧档案`)
  } catch (e) {
    toast(`迁移失败：${e.message || '稍后再试'}`)
  }
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code)
    toast('邀请码已复制')
  } catch {
    toast('复制失败，请手动选择')
  }
}

function enterTeam(teamId) {
  router.push(`/practice/mine/team/${teamId}`)
}
</script>

<style scoped>
.teams-page { padding: 2.6rem 0 3rem; }
.container { max-width: 1080px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }

.page-head { margin-bottom: 1.6rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.page-head h1 { font-size: clamp(26px, 4vw, 36px); font-weight: 700; color: var(--color-primary-dark); margin: 0; }
.desc { max-width: 780px; margin: .8rem 0 0; color: var(--color-text-secondary); font-size: .98rem; line-height: 1.7; }

.list-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.4rem; }
.list-count { font-size: .9rem; color: var(--color-text-light); }
.bar-actions { display: flex; gap: .6rem; }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .6rem 1.4rem; background: var(--color-primary); color: #fff; font-size: .9rem; }
.btn.primary:hover:not(:disabled) { background: var(--color-primary-dark); transform: translateY(-1px); }
.btn.primary:disabled { opacity: .6; cursor: default; }
.btn.ghost { padding: .55rem 1.2rem; background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: .86rem; }
.btn.ghost:hover { border-color: var(--color-primary); color: var(--color-primary); }

.onboard { text-align: center; padding: 3.5rem 1rem; background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }
.onboard-icon { display: grid; place-items: center; width: 64px; height: 64px; margin: 0 auto; color: var(--jade); border: 1px solid var(--color-border); background: var(--paper-light); }
.onboard h2 { margin: .6rem 0 .4rem; color: var(--color-primary-dark); }
.onboard p { margin: 0 auto 1.4rem; max-width: 460px; color: var(--color-text-secondary); line-height: 1.6; }
.onboard-actions { display: flex; gap: .8rem; justify-content: center; }

.team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.2rem; }
.team-card {
  display: flex; flex-direction: column; gap: .7rem;
  padding: 1.3rem 1.4rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
  cursor: pointer; transition: transform var(--transition), box-shadow var(--transition);
}
.team-card:hover, .team-card:focus-visible { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); outline: none; }
.tc-head { display: flex; align-items: center; justify-content: space-between; gap: .6rem; }
.tc-name { margin: 0; font-size: 1.15rem; color: var(--color-text); }
.tc-role { font-size: .74rem; font-weight: 600; padding: .16rem .7rem; border-radius: 50px; background: var(--color-bg); color: var(--color-text-secondary); white-space: nowrap; }
.tc-role.owner { background: var(--color-accent); color: var(--color-primary-dark); }
.tc-stats { display: flex; flex-direction: column; gap: .3rem; font-size: .84rem; color: var(--color-text-secondary); }
.tc-stats span { display: inline-flex; align-items: center; gap: .35rem; }
.tc-foot { margin-top: .2rem; font-size: .84rem; font-weight: 600; color: var(--color-primary); }

/* 弹层 */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: grid; place-items: center; padding: 1rem; z-index: 50; }
.modal { width: 100%; max-width: 400px; padding: 1.8rem; background: var(--color-card); border-radius: var(--radius); box-shadow: var(--shadow-card-hover); }
.modal-title { margin: 0 0 1.2rem; font-size: 1.25rem; color: var(--color-primary-dark); }
.modal-hint { margin: 0 0 1rem; font-size: .9rem; color: var(--color-text-secondary); line-height: 1.6; }
.modal-form { display: flex; flex-direction: column; gap: 1.1rem; }
.gate-field { display: flex; flex-direction: column; gap: .4rem; }
.gate-field span { font-size: .85rem; font-weight: 600; color: var(--color-text); }
.gate-field input {
  padding: .7rem .9rem; font-size: .92rem; color: var(--color-text);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 10px; outline: none;
  transition: border-color var(--transition);
}
.gate-field input:focus { border-color: var(--color-primary); }
.modal-actions { display: flex; justify-content: flex-end; gap: .7rem; margin-top: .4rem; }
.invite-box { display: flex; align-items: center; gap: .8rem; padding: .8rem 1rem; margin-bottom: 1.2rem; background: var(--color-bg); border: 1px dashed var(--color-border); border-radius: 10px; }
.invite-code { flex: 1; font-size: 1.2rem; font-weight: 700; letter-spacing: .12em; color: var(--color-primary-dark); font-family: monospace; }
</style>
