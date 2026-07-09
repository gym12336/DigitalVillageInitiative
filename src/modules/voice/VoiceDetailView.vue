<template>
  <section class="detail-page">
    <div class="container">
      <!-- 面包屑 + 返回 -->
      <nav class="crumb">
        <RouterLink to="/voice">🏠 乡村之声</RouterLink>
        <span class="sep">/</span>
        <span class="cur">需求详情</span>
        <RouterLink to="/voice" class="back">← 返回列表</RouterLink>
      </nav>

      <!-- 加载态 -->
      <div v-if="loading" class="state">加载中…</div>

      <!-- 错误 / 404 -->
      <div v-else-if="error" class="state error">
        <p>{{ error }}</p>
        <RouterLink to="/voice" class="btn-ghost">返回需求列表</RouterLink>
      </div>

      <!-- 详情主体 -->
      <template v-else-if="demand">
        <header class="head" :class="statusClass(demand.status)">
          <div class="badges">
            <span class="status" :class="statusClass(demand.status)">{{ demand.status }}</span>
            <span v-if="demand.certBy" class="cert-badge">✓ {{ demand.certBy }}审核发布</span>
          </div>
          <h1>{{ demand.title }}</h1>
          <p class="sub">
            📍 {{ demand.town }} · {{ demand.village }}
            <span v-if="demand.publishTime">　·　{{ demand.publishTime }} 发布</span>
            <span class="counts">　·　👁 {{ demand.views }}　⭐ {{ demand.favorites }}</span>
          </p>
        </header>

        <div class="body">
          <!-- 左主栏 -->
          <div class="main">
            <h2 class="h3">需求详情</h2>
            <p class="desc">{{ demand.desc }}</p>

            <h2 class="h3">所需专业 / 技能</h2>
            <div class="majors">
              <span v-for="m in demand.majors" :key="m" class="tag">{{ m }}</span>
            </div>

            <h2 class="h3">预期成果</h2>
            <p class="desc">{{ demand.expected }}</p>
          </div>

          <!-- 右侧栏 -->
          <aside class="side">
            <div class="side-card">
              <div class="label">联系人</div>
              <p class="contact">{{ demand.contact }}<br />{{ demand.phone }}</p>
              <button
                class="btn-respond"
                :disabled="demand.status === '已完成'"
                @click="onRespond"
              >
                {{ demand.status === '已完成' ? '需求已完成' : '我要响应' }}
              </button>
              <div class="mini-actions">
                <button class="count-btn" @click="toggleLike">
                  {{ liked ? '❤️' : '🤍' }} 点赞
                </button>
                <button class="count-btn" @click="toggleFav">
                  {{ faved ? '⭐' : '☆' }} 收藏
                </button>
              </div>
            </div>
          </aside>
        </div>

        <!-- 相关推荐 -->
        <section v-if="related.length" class="related">
          <h2 class="h3">相关需求</h2>
          <div class="related-grid">
            <RouterLink
              v-for="r in related"
              :key="r.id"
              :to="`/voice/${r.id}`"
              class="related-card"
              :class="statusClass(r.status)"
            >
              <span class="status sm" :class="statusClass(r.status)">{{ r.status }}</span>
              <p class="rc-title">{{ r.title }}</p>
              <p class="rc-meta">📍 {{ r.town }} · {{ r.village }}</p>
            </RouterLink>
          </div>
        </section>
      </template>
    </div>

    <AppToast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import { getDemand, incrementView, adjustFavorite, listDemands } from './api.js'
import { relatedDemands } from './related.js'

const route = useRoute()
const router = useRouter()

const demand = ref(null)
const allDemands = ref([])
const loading = ref(true)
const error = ref('')

const toastRef = ref(null)
function toast(t) {
  toastRef.value?.show(t)
}

// —— 点赞/收藏本地态(localStorage 防重复) ——
const LIKE_KEY = 'sx.voice.liked'
const FAV_KEY = 'sx.voice.faved'
function loadSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'))
  } catch {
    return new Set()
  }
}
function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]))
  } catch {
    /* 隐私模式忽略 */
  }
}
const likedIds = ref(loadSet(LIKE_KEY))
const favedIds = ref(loadSet(FAV_KEY))
const liked = computed(() => demand.value && likedIds.value.has(demand.value.id))
const faved = computed(() => demand.value && favedIds.value.has(demand.value.id))

function statusClass(status) {
  if (status === '待响应') return 'st-pending'
  if (status === '响应中') return 'st-doing'
  return 'st-done'
}

const related = computed(() =>
  demand.value ? relatedDemands(demand.value, allDemands.value, 3) : [],
)

async function load(id) {
  loading.value = true
  error.value = ''
  demand.value = null
  try {
    // 并行:拉详情 + 全量列表(供相关推荐)。详情顺带 +1 浏览。
    const [d, listRes] = await Promise.all([
      getDemand(id),
      listDemands({ pageSize: 1000 }).catch(() => ({ demands: [] })),
    ])
    demand.value = d
    allDemands.value = listRes.demands || []
    // 浏览 +1(失败不影响展示)
    incrementView(id)
      .then((updated) => {
        if (updated && demand.value) demand.value.views = updated.views
      })
      .catch(() => {})
  } catch (e) {
    error.value = e.status === 404 ? '该需求不存在或已下线' : e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function toggleLike() {
  if (!demand.value) return
  const id = demand.value.id
  if (likedIds.value.has(id)) likedIds.value.delete(id)
  else likedIds.value.add(id)
  likedIds.value = new Set(likedIds.value)
  saveSet(LIKE_KEY, likedIds.value)
}

async function toggleFav() {
  if (!demand.value) return
  const id = demand.value.id
  const willFav = !favedIds.value.has(id)
  if (willFav) favedIds.value.add(id)
  else favedIds.value.delete(id)
  favedIds.value = new Set(favedIds.value)
  saveSet(FAV_KEY, favedIds.value)
  try {
    const updated = await adjustFavorite(id, willFav ? 1 : -1)
    if (updated) demand.value.favorites = updated.favorites
  } catch {
    toast('操作失败,请稍后再试')
  }
}

function onRespond() {
  if (demand.value?.status === '已完成') return
  if (window.confirm(`确认响应「${demand.value.title}」?提交后将等待团委确认。`)) {
    toast('响应成功,等待团委确认')
  }
}

onMounted(() => load(route.params.id))
// 相关需求点进来时 id 变化,重新加载
watch(
  () => route.params.id,
  (id) => {
    if (id) load(id)
  },
)
</script>

<style scoped>
.detail-page { padding: 2.2rem 0 3rem; }
.container { max-width: 1120px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }

/* 面包屑 */
.crumb { display: flex; align-items: center; gap: .5rem; font-size: .85rem; margin-bottom: 1.4rem; color: var(--color-text-light); }
.crumb a { color: var(--color-primary); text-decoration: none; }
.crumb a:hover { text-decoration: underline; }
.crumb .sep { color: var(--color-text-light); }
.crumb .cur { color: var(--color-text-secondary); }
.crumb .back { margin-left: auto; }

/* 状态 */
.state { padding: 3rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }
.state.error p { margin: 0 0 1rem; color: var(--color-highlight); }
.btn-ghost { display: inline-block; padding: .5rem 1.2rem; border: 1px solid var(--color-border); border-radius: 50px; color: var(--color-primary); text-decoration: none; }

/* 头部 */
.head { position: relative; padding: 1.4rem 1.6rem; background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card); border-left: 5px solid var(--color-border); }
.head.st-pending { border-left-color: var(--color-highlight); }
.head.st-doing { border-left-color: #4a8fbf; }
.head.st-done { border-left-color: #aaa; }
.badges { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-bottom: .7rem; }
.head h1 { font-size: clamp(22px, 3vw, 30px); font-weight: 700; color: var(--color-primary-dark); margin: 0; }
.sub { margin: .6rem 0 0; font-size: .88rem; color: var(--color-text-secondary); }
.counts { color: var(--color-text-light); }

/* 状态徽章 */
.status { padding: .3rem .85rem; border-radius: 50px; font-size: .8rem; font-weight: 600; white-space: nowrap; }
.status.sm { font-size: .72rem; padding: .2rem .6rem; }
.st-pending { background: #fff3e0; color: var(--color-highlight); }
.st-doing { background: #e3f2fd; color: #4a8fbf; }
.st-done { background: #f0f0f0; color: #888; }
.cert-badge { display: inline-block; padding: .2rem .7rem; border-radius: 50px; background: #e8f5e9; color: var(--color-primary); font-size: .78rem; font-weight: 600; }

/* 两栏主体 */
.body { display: flex; gap: 1.4rem; margin-top: 1.4rem; align-items: flex-start; flex-wrap: wrap; }
.main { flex: 2; min-width: 300px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1.4rem 1.6rem; box-shadow: var(--shadow-card); }
.h3 { margin: 1.2rem 0 .5rem; font-size: 1rem; color: var(--color-text); }
.h3:first-child { margin-top: 0; }
.desc { font-size: .92rem; color: var(--color-text-secondary); line-height: 1.85; margin: 0; }
.majors { display: flex; flex-wrap: wrap; gap: .5rem; }
.tag { padding: .3rem .85rem; border-radius: 50px; background: var(--color-accent); color: var(--color-primary-dark); font-size: .82rem; font-weight: 600; }

/* 右侧栏 */
.side { flex: 1; min-width: 240px; }
.side-card { position: sticky; top: 1rem; background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1.3rem 1.4rem; box-shadow: var(--shadow-card); }
.label { font-size: .8rem; font-weight: 600; color: var(--color-text-light); margin-bottom: .4rem; }
.contact { font-size: .92rem; color: var(--color-text); line-height: 1.7; margin: 0 0 1rem; }
.btn-respond { width: 100%; padding: .7rem; border: none; border-radius: 50px; cursor: pointer; background: var(--color-highlight); color: #fff; font-size: .95rem; font-weight: 600; transition: transform var(--transition), box-shadow var(--transition); }
.btn-respond:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(224, 122, 95, .3); }
.btn-respond:disabled { background: #cfcfcf; cursor: not-allowed; }
.mini-actions { display: flex; gap: .5rem; margin-top: .7rem; }
.count-btn { flex: 1; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text-secondary); padding: .45rem; border-radius: 50px; font-size: .82rem; cursor: pointer; transition: all var(--transition); }
.count-btn:hover { border-color: var(--color-highlight); color: var(--color-highlight); }

/* 相关推荐 */
.related { margin-top: 2rem; }
.related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.related-card { position: relative; display: block; padding: 1.1rem 1.2rem; background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card); text-decoration: none; transition: transform var(--transition), box-shadow var(--transition); }
.related-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); }
.related-card .status.sm { position: absolute; top: .8rem; right: .8rem; }
.rc-title { margin: 0 3rem .5rem 0; font-size: .95rem; font-weight: 600; color: var(--color-text); line-height: 1.5; }
.rc-meta { margin: 0; font-size: .8rem; color: var(--color-text-secondary); }
</style>
