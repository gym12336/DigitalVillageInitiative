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

      <!-- 搜索栏 -->
      <div class="search-bar">
        <span class="search-ic">🔍</span>
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索需求标题、关键词..."
          aria-label="搜索需求"
        />
      </div>

      <!-- 排序胶囊 -->
      <div class="chips" role="tablist" aria-label="排序方式">
        <button
          v-for="opt in sortOptions"
          :key="opt.value"
          class="chip"
          :class="{ active: sortBy === opt.value }"
          @click="sortBy = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- 筛选器：需求类型 + 状态 -->
      <div class="filters">
        <div class="filter-group">
          <span class="filter-label">需求类型</span>
          <div class="tags">
            <button
              v-for="t in typeOptions"
              :key="t"
              class="tag"
              :class="{ active: typeFilter === t }"
              @click="typeFilter = t"
            >
              {{ t }}
            </button>
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">状态</span>
          <div class="tags">
            <button
              v-for="s in statusOptions"
              :key="s"
              class="tag"
              :class="{ active: statusFilter === s }"
              @click="statusFilter = s"
            >
              {{ s }}
            </button>
          </div>
        </div>
      </div>

      <!-- 当前筛选路径 + 清除 -->
      <div class="filter-path">
        <span>
          当前筛选：{{ typeFilter }} · {{ statusFilter }} · {{ sortLabel }}
          <template v-if="keyword">· 关键词“{{ keyword }}”</template>
        </span>
        <button v-if="hasActiveFilter" class="btn-clear" @click="clearFilters">清除筛选</button>
      </div>

      <!-- 需求列表 -->
      <p class="result-count">筛选到 {{ filteredDemands.length }} 条需求</p>
      <div v-if="filteredDemands.length" class="demand-list">
        <article
          v-for="d in filteredDemands"
          :key="d.id"
          class="demand-card"
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

    <!-- 需求详情模态框 -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="activeDemand"
          class="modal-mask"
          @click.self="closeDetail"
        >
          <div class="modal" role="dialog" aria-modal="true" :aria-label="activeDemand.title">
            <button class="modal-close" aria-label="关闭" @click="closeDetail">×</button>
            <span class="status modal-status" :class="statusClass(activeDemand.status)">
              {{ activeDemand.status }}
            </span>
            <h2 class="modal-title">{{ activeDemand.title }}</h2>
            <p class="modal-sub">
              📍 {{ activeDemand.town }} · {{ activeDemand.village }}　·　{{ activeDemand.publishTime }} 发布
            </p>
            <p class="cert-badge modal-cert">✓ {{ activeDemand.certBy }}审核发布</p>

            <h3 class="modal-h3">需求详情</h3>
            <p class="modal-desc">{{ activeDemand.desc }}</p>

            <h3 class="modal-h3">所需专业 / 技能</h3>
            <div class="modal-majors">
              <span v-for="m in activeDemand.majors" :key="m" class="tag active">{{ m }}</span>
            </div>

            <h3 class="modal-h3">预期成果</h3>
            <p class="modal-desc">{{ activeDemand.expected }}</p>

            <h3 class="modal-h3">联系人</h3>
            <p class="modal-desc">{{ activeDemand.contact }}　{{ activeDemand.phone }}</p>

            <div class="modal-actions">
              <div class="modal-counts">
                <button class="count-btn" @click="toggleLike(activeDemand)">
                  {{ likedIds.has(activeDemand.id) ? '❤️' : '🤍' }} 点赞
                </button>
                <button class="count-btn" @click="toggleFav(activeDemand)">
                  {{ favIds.has(activeDemand.id) ? '⭐' : '☆' }} 收藏
                </button>
              </div>
              <button
                class="btn-respond"
                :disabled="activeDemand.status === '已完成'"
                @click="onRespond(activeDemand)"
              >
                {{ activeDemand.status === '已完成' ? '需求已完成' : '我要响应' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 全站共享 Toast -->
    <AppToast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import AppToast from '@/components/AppToast.vue'
import voiceData from './voice-data.json'

// —— 数据（reactive 便于问答区点赞本地生效） ——
const demands = reactive(voiceData.demands.map((d) => ({ ...d })))
const qaList = reactive(voiceData.qa.map((q) => ({ ...q, answers: q.answers.map((a) => ({ ...a })) })))
const totalCount = 89

// —— Toast ——
const toastRef = ref(null)
function toast(text) {
  toastRef.value?.show(text)
}

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

// —— 需求详情模态框 ——
const activeDemand = ref(null)
const likedIds = reactive(new Set())
const favIds = reactive(new Set())

function openDetail(d) {
  activeDemand.value = d
}
function closeDetail() {
  activeDemand.value = null
}
function toggleLike(d) {
  likedIds.has(d.id) ? likedIds.delete(d.id) : likedIds.add(d.id)
}
function toggleFav(d) {
  favIds.has(d.id) ? favIds.delete(d.id) : favIds.add(d.id)
}
function onRespond(d) {
  if (d.status === '已完成') return
  if (window.confirm(`确认响应「${d.title}」？提交后将等待团委确认。`)) {
    toast('响应成功，等待团委确认')
    closeDetail()
  }
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

// —— ESC 关闭模态框 ——
function onKeydown(e) {
  if (e.key === 'Escape' && activeDemand.value) closeDetail()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.voice-page { padding: 2.6rem 0 3rem; }
.container { max-width: 1180px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }

/* —— 页面头部 —— */
.page-head { margin-bottom: 1.8rem; }
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

/* —— 搜索栏 —— */
.search-bar {
  display: flex; align-items: center; gap: .6rem;
  padding: .3rem 1.2rem; margin-bottom: 1.2rem;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: 50px; box-shadow: var(--shadow-card);
}
.search-ic { font-size: 1rem; }
.search-bar input { flex: 1; border: none; outline: none; background: transparent; padding: .6rem 0; font-size: .95rem; color: var(--color-text); }

/* —— 排序胶囊 —— */
.chips { display: flex; flex-wrap: wrap; gap: .6rem; margin-bottom: 1.2rem; }
.chip {
  padding: .45rem 1.1rem; border: 1px solid var(--color-border); border-radius: 50px;
  background: var(--color-card); color: var(--color-text-secondary); font-size: .88rem; cursor: pointer;
  transition: all var(--transition);
}
.chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

/* —— 筛选器 —— */
.filters { display: flex; flex-direction: column; gap: .9rem; margin-bottom: 1rem; }
.filter-group { display: flex; align-items: baseline; gap: .8rem; flex-wrap: wrap; }
.filter-label { flex-shrink: 0; font-size: .85rem; font-weight: 600; color: var(--color-text); }
.tags { display: flex; flex-wrap: wrap; gap: .5rem; }
.tag {
  padding: .3rem .85rem; border: 1px solid var(--color-border); border-radius: 50px;
  background: var(--color-bg); color: var(--color-text-secondary); font-size: .82rem; cursor: pointer;
  transition: all var(--transition);
}
.tag:hover { border-color: var(--color-secondary); }
.tag.active { background: var(--color-accent); border-color: var(--color-secondary); color: var(--color-primary-dark); font-weight: 600; }

/* —— 筛选路径 —— */
.filter-path {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  font-size: .85rem; color: var(--color-text-light); margin-bottom: .4rem;
}
.btn-clear {
  border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-highlight);
  padding: .25rem .8rem; border-radius: 50px; font-size: .8rem; cursor: pointer;
}
.btn-clear:hover { border-color: var(--color-highlight); }
.result-count { font-size: .82rem; color: var(--color-text-light); margin: 0 0 1rem; }

/* —— 需求列表 —— */
.demand-list { display: flex; flex-direction: column; gap: 1rem; }
.demand-card {
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

/* —— 状态标签配色 —— */
.status { flex-shrink: 0; padding: .35rem .9rem; border-radius: 50px; font-size: .82rem; font-weight: 600; white-space: nowrap; }
.st-pending { background: #fff3e0; color: var(--color-highlight); }
.st-doing { background: #e3f2fd; color: #4a8fbf; }
.st-done { background: #f0f0f0; color: #888; }

.empty { padding: 2.5rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }

/* —— 问答互动区 —— */
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

/* —— 模态框 —— */
.modal-mask {
  position: fixed; inset: 0; z-index: 2000;
  display: flex; align-items: center; justify-content: center; padding: 1.5rem;
  background: rgba(30, 30, 30, .5);
}
.modal {
  position: relative; width: 100%; max-width: 640px; max-height: 88vh; overflow-y: auto;
  padding: 2rem 2.2rem; background: var(--color-card); border-radius: var(--radius);
  box-shadow: 0 20px 60px rgba(0, 0, 0, .25);
}
.modal-close {
  position: absolute; top: 1rem; right: 1.2rem; border: none; background: transparent;
  font-size: 1.8rem; line-height: 1; color: var(--color-text-light); cursor: pointer;
}
.modal-close:hover { color: var(--color-text); }
.modal-status { display: inline-block; }
.modal-title { margin: .8rem 0 .5rem; font-size: 1.5rem; color: var(--color-primary-dark); }
.modal-sub { font-size: .88rem; color: var(--color-text-secondary); }
.modal-cert { margin-top: .8rem; }
.modal-h3 { margin: 1.4rem 0 .5rem; font-size: 1rem; color: var(--color-text); }
.modal-desc { font-size: .92rem; color: var(--color-text-secondary); line-height: 1.8; }
.modal-majors { display: flex; flex-wrap: wrap; gap: .5rem; }
.modal-actions {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  margin-top: 1.8rem; padding-top: 1.4rem; border-top: 1px solid var(--color-border);
}
.modal-counts { display: flex; gap: .7rem; }
.count-btn {
  border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text-secondary);
  padding: .45rem 1rem; border-radius: 50px; font-size: .85rem; cursor: pointer; transition: all var(--transition);
}
.count-btn:hover { border-color: var(--color-highlight); color: var(--color-highlight); }
.btn-respond {
  padding: .7rem 1.8rem; border: none; border-radius: 50px; cursor: pointer;
  background: var(--color-highlight); color: #fff; font-size: .95rem; font-weight: 600;
  transition: transform var(--transition), box-shadow var(--transition);
}
.btn-respond:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(224, 122, 95, .3); }
.btn-respond:disabled { background: #cfcfcf; cursor: not-allowed; }

/* —— 过渡动画 —— */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity var(--transition); }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
