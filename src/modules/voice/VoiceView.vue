<template>
  <section class="voice-page">
    <div class="container">
      <!-- 页面头部 -->
      <header class="page-head">
        <p class="kicker">乡村之声</p>
        <div class="head-row">
          <div class="head-text">
            <h1>乡村之声 —— 乡村出题，青年回应</h1>
            <p class="desc">
              乡村出题，青年回应。乡镇团委发布真实需求，高校团队精准响应；乡村提问，青年作答并沉淀为知识库。
            </p>
            <p class="stat">共 {{ totalCount }} 条需求</p>
          </div>
          <button class="btn-publish" @click="onPublish">发布需求</button>
        </div>
      </header>

      <!-- 窄屏筛选按钮 -->
      <button class="filter-toggle" aria-label="打开筛选" @click="filterOpen = true">
        🔍 筛选 / 搜索<template v-if="hasActiveFilter"> · 已启用</template>
      </button>

      <!-- 左栏筛选 + 右结果 两栏布局 -->
      <div class="voice-body">
        <!-- 左侧筛选侧栏（窄屏为抽屉） -->
        <aside class="filter-sidebar" :class="{ open: filterOpen }" aria-label="筛选">
          <div class="sidebar-head">
            <span class="sidebar-title">筛选</span>
            <button class="sidebar-close" aria-label="关闭筛选" @click="filterOpen = false">✕</button>
          </div>

          <!-- 搜索 -->
          <div class="search-bar">
            <span class="search-ic">🔍</span>
            <input
              v-model="keyword"
              type="text"
              placeholder="搜索需求标题、关键词..."
              aria-label="搜索需求"
            />
          </div>

          <!-- 排序（竖向单选） -->
          <div class="fgroup">
            <p class="fgroup-title">排序</p>
            <div class="sort-list" role="radiogroup" aria-label="排序方式">
              <button
                v-for="o in sortOptions"
                :key="o.value"
                class="sort-item"
                :class="{ active: sortBy === o.value }"
                role="radio"
                :aria-checked="sortBy === o.value"
                @click="sortBy = o.value"
              >{{ o.label }}</button>
            </div>
          </div>

          <!-- 需求类型 -->
          <div class="fgroup">
            <p class="fgroup-title">需求类型</p>
            <div class="chip-wall" role="group" aria-label="需求类型">
              <button
                v-for="t in typeOptions"
                :key="t"
                class="fchip"
                :class="{ active: typeFilter === t }"
                @click="typeFilter = t"
              >{{ t }}</button>
            </div>
          </div>

          <!-- 状态 -->
          <div class="fgroup">
            <p class="fgroup-title">状态</p>
            <div class="chip-wall" role="group" aria-label="状态">
              <button
                v-for="s in statusOptions"
                :key="s"
                class="fchip"
                :class="{ active: statusFilter === s }"
                @click="statusFilter = s"
              >{{ s }}</button>
            </div>
          </div>

          <button v-if="hasActiveFilter" class="btn-clear" @click="clearFilters">清除全部筛选</button>
        </aside>

        <!-- 窄屏抽屉遮罩 -->
        <div v-if="filterOpen" class="filter-backdrop" @click="filterOpen = false" />

        <!-- 右侧结果区 -->
        <div class="result-area">
          <!-- 已选条件面包屑 -->
          <div v-if="activeChips.length" class="crumbs">
            <button v-for="(chip, i) in activeChips" :key="i" class="crumb" @click="removeChip(chip)">
              {{ chip.label }} <span class="crumb-x">✕</span>
            </button>
            <button class="crumb-clear" @click="clearFilters">清空全部</button>
          </div>

          <p class="result-count">筛选到 {{ filteredDemands.length }} 条需求</p>

          <div v-if="loading" class="empty">加载中…</div>
          <div v-else-if="loadError" class="empty">{{ loadError }}，请刷新重试。</div>
          <div v-else-if="filteredDemands.length" class="demand-list">
            <article
              v-for="d in filteredDemands"
              :key="d.id"
              class="demand-card" :class="statusClass(d.status)"
              tabindex="0"
              role="button"
              @click="openDetail(d)"
              @keydown.enter="openDetail(d)"
            >
              <div class="demand-main">
                <h2 class="demand-title">{{ d.title }}</h2>
                <div class="demand-meta">
                  <span class="meta">📍 {{ d.town }} · {{ d.village }}</span>
                  <span class="meta">🏷️ {{ d.majors.join(' / ') }}</span>
                </div>
                <div class="demand-badges">
                  <span class="cert-badge">✓ {{ d.certBy }}审核发布</span>
                  <span class="time">{{ d.publishTime }} 发布</span>
                </div>
              </div>
              <span class="status" :class="statusClass(d.status)">{{ d.status }}</span>
            </article>
          </div>
          <p v-else class="empty">没有匹配的需求，试试调整筛选或搜索关键词。</p>
        </div>
      </div>

      <!-- 问答互动区 -->
      <section class="qa-section">
        <div class="qa-head">
          <h2>💬 问答互动区</h2>
          <p>乡村提问，青年作答。真实的问题，沉淀为一座可检索的知识库。</p>
        </div>
        <div class="qa-list">
          <article v-for="q in qaList" :key="q.id" class="qa-card">
            <div class="qa-question">
              <span class="q-mark">问</span>
              <div class="q-body">
                <p class="q-text">{{ q.question }}</p>
                <p class="q-meta">{{ q.asker }} · {{ q.askTime }} · {{ q.answers.length }} 个回答</p>
              </div>
            </div>
            <div class="qa-answers">
              <div v-for="a in q.answers" :key="a.id" class="qa-answer">
                <span class="a-mark">答</span>
                <div class="a-body">
                  <p class="a-author">{{ a.author }}</p>
                  <p class="a-text">{{ a.content }}</p>
                  <button class="a-like" @click="likeAnswer(a)">👍 {{ a.likes }}</button>
                </div>
              </div>
            </div>
            <button class="btn-answer" @click="onAnswer(q)">我来回答</button>
          </article>
        </div>
      </section>
    </div>

    <!-- 全站共享 Toast -->
    <AppToast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import { listDemands, listQa } from './api.js'

const router = useRouter()

// —— 数据（从后端拉取；reactive 便于问答区点赞本地生效） ——
const demands = reactive([])
const qaList = reactive([])
const loading = ref(true)
const loadError = ref('')
const totalCount = computed(() => demands.length)

async function loadData() {
  loading.value = true
  loadError.value = ''
  try {
    const [dRes, qa] = await Promise.all([listDemands({ pageSize: 1000 }), listQa()])
    demands.splice(0, demands.length, ...(dRes.demands || []))
    qaList.splice(0, qaList.length, ...qa.map((q) => ({ ...q, answers: (q.answers || []).map((a) => ({ ...a })) })))
  } catch (e) {
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(loadData)

// —— Toast ——
const toastRef = ref(null)
function toast(text) {
  toastRef.value?.show(text)
}

// —— 窄屏筛选抽屉开关 ——
const filterOpen = ref(false)

// —— 搜索 / 排序 / 筛选 状态 ——
const keyword = ref('')
const sortBy = ref('latest')
const typeFilter = ref('全部')
const statusFilter = ref('全部')

const sortOptions = [
  { value: 'latest', label: '最新发布' },
  { value: 'views', label: '最热浏览' },
  { value: 'favorites', label: '最多收藏' },
  { value: 'deadline', label: '即将截止' },
]
const typeOptions = ['全部', '产业帮扶', '文化挖掘', '教育支援', '乡村规划', '科技助农', '医疗健康', '志愿服务']
const statusOptions = ['全部', '待响应', '响应中', '已完成']

const sortLabel = computed(() => sortOptions.find((o) => o.value === sortBy.value)?.label ?? '')
const hasActiveFilter = computed(
  () => keyword.value || typeFilter.value !== '全部' || statusFilter.value !== '全部' || sortBy.value !== 'latest'
)

function clearFilters() {
  keyword.value = ''
  typeFilter.value = '全部'
  statusFilter.value = '全部'
  sortBy.value = 'latest'
}

// —— 已选条件面包屑 ——
const activeChips = computed(() => {
  const chips = []
  if (keyword.value) chips.push({ type: 'keyword', label: `关键词“${keyword.value}”` })
  if (typeFilter.value !== '全部') chips.push({ type: 'type', label: typeFilter.value })
  if (statusFilter.value !== '全部') chips.push({ type: 'status', label: statusFilter.value })
  if (sortBy.value !== 'latest') chips.push({ type: 'sort', label: sortLabel.value })
  return chips
})
function removeChip(chip) {
  if (chip.type === 'keyword') keyword.value = ''
  else if (chip.type === 'type') typeFilter.value = '全部'
  else if (chip.type === 'status') statusFilter.value = '全部'
  else if (chip.type === 'sort') sortBy.value = 'latest'
}

// —— 筛选 + 排序（真实生效） ——
const filteredDemands = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  let list = demands.filter((d) => {
    if (typeFilter.value !== '全部' && d.type !== typeFilter.value) return false
    if (statusFilter.value !== '全部' && d.status !== statusFilter.value) return false
    if (kw) {
      const hay = [d.title, d.town, d.village, d.desc, ...d.majors].join(' ').toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
  list = [...list]
  if (sortBy.value === 'views') list.sort((a, b) => b.views - a.views)
  else if (sortBy.value === 'favorites') list.sort((a, b) => b.favorites - a.favorites)
  else if (sortBy.value === 'deadline') list.sort((a, b) => a.deadline.localeCompare(b.deadline))
  else list.sort((a, b) => b.publishTime.localeCompare(a.publishTime)) // latest
  return list
})

// —— 状态标签配色 ——
function statusClass(status) {
  if (status === '待响应') return 'st-pending'
  if (status === '响应中') return 'st-doing'
  return 'st-done'
}

// —— 点击卡片跳转独立详情页 ——
function openDetail(d) {
  router.push({ name: 'voice-detail', params: { id: d.id } })
}

// —— 头部发布按钮 ——
function onPublish() {
  toast('请以乡镇团委身份登录后发布')
}

// —— 问答互动区 ——
function likeAnswer(a) {
  a.likes += 1
}
function onAnswer(q) {
  toast('回答已提交，感谢你的青年智慧')
}
</script>

<style scoped>
.voice-page { padding: 2.6rem 0 3rem; }
.container { max-width: none; margin: 0; padding: 0 clamp(1rem, 4vw, 2.5rem); }

/* —— 页面头部 —— */
.page-head { margin-bottom: 1.6rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; }
.head-text h1 { font-size: clamp(28px, 4vw, 38px); font-weight: 700; color: var(--color-primary-dark); }
.desc { max-width: 720px; margin: .8rem 0 0; color: var(--color-text-secondary); font-size: 1rem; }
.stat { margin: .7rem 0 0; font-size: 14px; color: var(--color-text-light); }
.btn-publish {
  flex-shrink: 0; margin-top: .3rem;
  padding: .7rem 1.6rem; border: none; border-radius: 50px; cursor: pointer;
  background: var(--color-highlight); color: #fff; font-size: .95rem; font-weight: 600;
  transition: transform var(--transition), box-shadow var(--transition);
}
.btn-publish:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(224, 122, 95, .3); }

/* —— 两栏布局 —— */
.voice-body { display: grid; grid-template-columns: 260px 1fr; gap: 1.8rem; align-items: start; }

/* —— 左侧筛选侧栏 —— */
.filter-sidebar {
  position: sticky; top: 88px;
  display: flex; flex-direction: column; gap: 1.2rem;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius); padding: 1.2rem 1.2rem 1.4rem; box-shadow: var(--shadow-sm);
}
.sidebar-head { display: none; align-items: center; justify-content: space-between; }
.sidebar-title { font-weight: 700; color: var(--color-primary-dark); font-size: 1.1rem; }
.sidebar-close { border: none; background: transparent; font-size: 1.2rem; cursor: pointer; color: var(--color-text-light); }

.fgroup { display: flex; flex-direction: column; gap: .6rem; }
.fgroup-title { margin: 0; font-size: .82rem; font-weight: 700; color: var(--color-text-secondary); letter-spacing: .04em; }

/* 搜索 */
.search-bar { display: flex; align-items: center; gap: .5rem; padding: .2rem .9rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 50px; }
.search-ic { font-size: 1rem; }
.search-bar input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; padding: .55rem 0; font-size: .9rem; color: var(--color-text); }

/* 排序（竖向单选） */
.sort-list { display: flex; flex-direction: column; gap: .4rem; }
.sort-item { text-align: left; padding: .45rem .8rem; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-text-secondary); font-size: .86rem; cursor: pointer; transition: all var(--transition); }
.sort-item:hover { border-color: var(--color-primary); color: var(--color-primary); }
.sort-item.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

/* 类型 / 状态胶囊墙 */
.chip-wall { display: flex; flex-wrap: wrap; gap: .45rem; }
.fchip { padding: .32rem .9rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-bg); color: var(--color-text-secondary); font-size: .8rem; cursor: pointer; transition: all var(--transition); }
.fchip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.fchip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

.btn-clear { border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-highlight); padding: .5rem .8rem; border-radius: 8px; font-size: .84rem; cursor: pointer; }
.btn-clear:hover { border-color: var(--color-highlight); }

/* —— 右侧结果区 —— */
.crumbs { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: .9rem; }
.crumb { display: inline-flex; align-items: center; gap: .35rem; padding: .3rem .8rem; border: 1px solid var(--color-primary); border-radius: 50px; background: var(--color-primary); color: #fff; font-size: .8rem; cursor: pointer; }
.crumb-x { font-size: .72rem; opacity: .85; }
.crumb:hover { background: var(--color-primary-dark); border-color: var(--color-primary-dark); }
.crumb-clear { padding: .3rem .8rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-card); color: var(--color-highlight); font-size: .8rem; cursor: pointer; }
.crumb-clear:hover { border-color: var(--color-highlight); }
.result-count { font-size: .82rem; color: var(--color-text-light); margin: 0 0 1rem; }

/* —— 需求列表 —— */
.demand-list { display: flex; flex-direction: column; gap: 1rem; }
.demand-card {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 1.3rem 1.5rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius);
  box-shadow: var(--shadow-card); cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.demand-card:hover, .demand-card:focus-visible { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); outline: none; }
.demand-title { font-size: 16px; font-weight: 600; color: var(--color-text); }
.demand-meta { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: .6rem; }
.meta { font-size: .85rem; color: var(--color-text-secondary); }
.demand-badges { display: flex; flex-wrap: wrap; align-items: center; gap: .8rem; margin-top: .7rem; }
.cert-badge {
  display: inline-block; padding: .2rem .7rem; border-radius: 50px;
  background: #e8f5e9; color: var(--color-primary); font-size: .78rem; font-weight: 600;
}
.time { font-size: .8rem; color: var(--color-text-light); }

/* 状态色条 */
.demand-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 5px; border-radius: 0 3px 3px 0; transition: background var(--transition);
}
.demand-card.st-pending::before { background: var(--color-highlight); }
.demand-card.st-doing::before { background: #4a8fbf; }
.demand-card.st-done::before { background: #aaa; }
.demand-card.st-pending, .demand-card.st-doing, .demand-card.st-done { padding-left: 1.8rem; }

/* —— 状态标签配色 —— */
.status { flex-shrink: 0; padding: .35rem .9rem; border-radius: 50px; font-size: .82rem; font-weight: 600; white-space: nowrap; }
.st-pending { background: #fff3e0; color: var(--color-highlight); }
.st-doing { background: #e3f2fd; color: #4a8fbf; }
.st-done { background: #f0f0f0; color: #888; }

.empty { padding: 2.5rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }

/* —— 问答互动区（整宽，位于两栏下方） —— */
.qa-section { margin-top: 3rem; }
.qa-head h2 { font-size: 1.5rem; color: var(--color-primary-dark); }
.qa-head p { margin: .5rem 0 1.4rem; color: var(--color-text-secondary); font-size: .95rem; }
.qa-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.2rem; }
.qa-card {
  display: flex; flex-direction: column; gap: 1rem;
  padding: 1.4rem 1.5rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.qa-question { display: flex; gap: .8rem; }
.q-mark, .a-mark {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: .82rem; font-weight: 700;
}
.q-mark { background: var(--color-highlight); color: #fff; }
.a-mark { background: var(--color-accent); color: var(--color-primary-dark); }
.q-text { font-size: 1rem; font-weight: 600; color: var(--color-text); line-height: 1.5; }
.q-meta { margin-top: .4rem; font-size: .8rem; color: var(--color-text-light); }
.qa-answers { display: flex; flex-direction: column; gap: .9rem; padding-left: .3rem; border-top: 1px solid var(--color-border); padding-top: 1rem; }
.qa-answer { display: flex; gap: .8rem; }
.a-author { font-size: .85rem; font-weight: 600; color: var(--color-primary); }
.a-text { margin: .3rem 0 .5rem; font-size: .9rem; color: var(--color-text-secondary); line-height: 1.6; }
.a-like {
  border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text-secondary);
  padding: .2rem .7rem; border-radius: 50px; font-size: .78rem; cursor: pointer; transition: all var(--transition);
}
.a-like:hover { border-color: var(--color-primary); color: var(--color-primary); }
.btn-answer {
  align-self: flex-start; margin-top: .2rem;
  padding: .5rem 1.3rem; border: none; border-radius: 50px; cursor: pointer;
  background: var(--color-primary); color: #fff; font-size: .85rem; font-weight: 600;
  transition: background var(--transition);
}
.btn-answer:hover { background: var(--color-primary-dark); }

/* —— 窄屏筛选按钮 + 抽屉 —— */
.filter-toggle { display: none; width: 100%; margin-bottom: 1rem; padding: .7rem 1rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-card); color: var(--color-primary-dark); font-size: .9rem; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-sm); }
.filter-backdrop { display: none; }

@media (max-width: 960px) {
  .voice-body { grid-template-columns: 1fr; }
  .filter-toggle { display: block; }
  .filter-backdrop { display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, .4); z-index: 60; }
  .filter-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; z-index: 70;
    width: min(320px, 86vw); border-radius: 0; overflow-y: auto;
    transform: translateX(-100%); transition: transform var(--transition);
  }
  .filter-sidebar.open { transform: translateX(0); }
  .sidebar-head { display: flex; }
}
</style>
