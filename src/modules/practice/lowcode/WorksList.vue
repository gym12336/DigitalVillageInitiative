<template>
  <section class="works-page tool-interface">
    <div class="container">
      <button class="btn back" @click="goBack">← 返回</button>

      <header class="page-head">
        <p class="kicker">乡村实践 · 成果搭建台</p>
        <h1>我的成果作品</h1>
        <p class="desc">
          这里是用低代码搭建台做出的成果作品。点开可继续编辑、导出 JSON 或静态网站。
          <template v-if="!teamId">当前未指定实践队，展示的是本机暂存的作品。</template>
        </p>
      </header>

      <div class="list-bar">
        <span class="list-count">共 {{ works.length }} 份作品</span>
        <button class="btn primary" @click="onNew">+ 新建成果</button>
      </div>

      <!-- 空态 -->
      <div v-if="!works.length && loaded" class="onboard">
        <div class="onboard-icon"><AppIcon name="chart" :size="32" /></div>
        <h2>还没有成果作品</h2>
        <p>从一份实践档案的数据出发，拖几个组件就能拼出一份可视化成果，并导出成可传播的网站。</p>
        <button class="btn primary" @click="onNew">+ 新建成果</button>
      </div>

      <!-- 作品卡片墙 -->
      <div v-else-if="works.length" class="work-grid">
        <article
          v-for="w in works"
          :key="w.id"
          class="work-card"
          tabindex="0"
          role="button"
          @click="openWork(w.id)"
          @keydown.enter="openWork(w.id)"
        >
          <div class="wc-head">
            <h3 class="wc-title">{{ w.title || '未命名成果' }}</h3>
            <button
              v-if="canDelete(w)"
              class="wc-del"
              aria-label="删除作品"
              @click.stop="onRemove(w)"
            ><AppIcon name="close" :size="14" /></button>
          </div>
          <p class="wc-meta">
            <span v-if="w.source"><AppIcon name="document" :size="13" />数据源已绑定</span>
            <span v-else><AppIcon name="document" :size="13" />示例 / 未绑定数据源</span>
          </p>
          <div class="wc-foot">
            <span class="wc-open">打开编辑 →</span>
            <span class="wc-time">{{ formatDate(w.updatedAt || w.updated_at) }}</span>
          </div>
        </article>
      </div>
    </div>

    <AppToast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import AppIcon from '@/components/AppIcon.vue'
import { listWorks, removeWork } from './worksStore.js'
import { currentUser } from '../mine/auth.js'

const route = useRoute()
const router = useRouter()
const toastRef = ref(null)
const toast = (m) => toastRef.value?.show(m)

const works = ref([])
const loaded = ref(false)
const teamId = computed(() => (route.query.team ? Number(route.query.team) : null))

function formatDate(iso) {
  return iso ? String(iso).slice(0, 10) : ''
}
// 后端列表带 created_by；本地暂存无。仅在能判定时限制删除按钮，其余放行（本地场景）。
function canDelete(w) {
  if (w.created_by === undefined) return true
  return currentUser.value && w.created_by === currentUser.value.id
}

async function refresh() {
  try {
    works.value = await listWorks(teamId.value)
  } catch (e) {
    toast(e.message || '加载作品失败')
  } finally {
    loaded.value = true
  }
}
onMounted(refresh)

function withTeam(query = {}) {
  return teamId.value ? { ...query, team: teamId.value } : query
}

function onNew() {
  router.push({ path: '/practice/studio/edit', query: withTeam() })
}
function openWork(id) {
  router.push({ path: '/practice/studio/edit', query: withTeam({ work: id }) })
}
async function onRemove(w) {
  if (!window.confirm(`确认删除作品「${w.title || '未命名成果'}」？此操作不可撤销。`)) return
  try {
    await removeWork(w.id, teamId.value)
    await refresh()
  } catch (e) {
    toast(e.message || '删除失败')
  }
}
function goBack() {
  if (teamId.value) router.push(`/practice/mine/team/${teamId.value}`)
  else if (window.history.length > 1) router.back()
  else router.push('/practice/mine')
}
</script>

<style scoped>
.works-page { padding: 2.6rem 0 3rem; }
.container { max-width: 1080px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .6rem 1.4rem; background: var(--color-primary); color: #fff; font-size: .9rem; }
.btn.primary:hover { background: var(--color-primary-dark); transform: translateY(-1px); }
.btn.back { margin-bottom: 1.2rem; padding: .45rem 1.1rem; background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: .86rem; }
.btn.back:hover { border-color: var(--color-primary); color: var(--color-primary); }

.page-head { margin-bottom: 1.6rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.page-head h1 { font-size: clamp(26px, 4vw, 36px); font-weight: 700; color: var(--color-primary-dark); margin: 0; }
.desc { max-width: 780px; margin: .8rem 0 0; color: var(--color-text-secondary); font-size: .98rem; line-height: 1.7; }

.list-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.4rem; }
.list-count { font-size: .9rem; color: var(--color-text-light); }

.onboard { text-align: center; padding: 3.5rem 1rem; background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }
.onboard-icon { display: grid; place-items: center; width: 64px; height: 64px; margin: 0 auto; color: var(--jade); border: 1px solid var(--color-border); background: var(--paper-light); }
.onboard h2 { margin: .6rem 0 .4rem; color: var(--color-primary-dark); }
.onboard p { margin: 0 auto 1.4rem; max-width: 460px; color: var(--color-text-secondary); line-height: 1.6; }

.work-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.2rem; }
.work-card {
  display: flex; flex-direction: column; gap: .6rem;
  padding: 1.3rem 1.4rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
  cursor: pointer; transition: transform var(--transition), box-shadow var(--transition);
}
.work-card:hover, .work-card:focus-visible { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); outline: none; }
.wc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: .6rem; }
.wc-title { margin: 0; font-size: 1.12rem; color: var(--color-text); }
.wc-del { border: none; background: transparent; cursor: pointer; font-size: .95rem; opacity: .5; transition: opacity var(--transition); }
.wc-del:hover { opacity: 1; }
.wc-meta, .wc-meta span { display: inline-flex; align-items: center; gap: .35rem; margin: 0; font-size: .82rem; color: var(--color-text-secondary); }
.wc-foot { display: flex; align-items: center; justify-content: space-between; margin-top: .2rem; }
.wc-open { font-size: .84rem; font-weight: 600; color: var(--color-primary); }
.wc-time { font-size: .76rem; color: var(--color-text-light); }
</style>
