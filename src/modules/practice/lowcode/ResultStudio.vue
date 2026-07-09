<template>
  <section class="studio">
    <!-- 顶部工具条 -->
    <header class="toolbar">
      <button class="btn back" @click="goBack">← 我的作品</button>
      <input v-model="work.title" class="title-input" placeholder="成果标题" />
      <div class="src">
        <span class="src-label">数据源</span>
        <select v-model="sourceId" class="src-select" @change="onSourceChange">
          <option value="__sample__">示例档案（小朱湾）</option>
          <option v-for="d in dossierList" :key="d.id" :value="d.id">{{ d.title }}</option>
        </select>
      </div>
      <div class="tb-actions">
        <button class="btn ghost" :class="{ on: preview }" @click="preview = !preview">
          {{ preview ? '✎ 编辑' : '👁 预览' }}
        </button>
        <button class="btn ghost" @click="onSave">💾 保存</button>
        <button class="btn ghost" @click="onExportJSON">⬇ JSON</button>
        <button class="btn primary" @click="onExportSite">🌐 导出网站</button>
      </div>
    </header>

    <div class="cols">
      <!-- 左栏：组件面板 + AI 助手（预留） -->
      <aside class="col-left" :class="{ hidden: preview }">
        <div class="panel-scroll">
          <h4 class="panel-h">基础组件</h4>
          <div class="comp-list">
            <button
              v-for="p in basicPresets"
              :key="p.key"
              class="comp-item"
              draggable="true"
              @dragstart="onDragStart(p)"
              @click="addByClick(p)"
            >
              <span class="comp-icon">{{ p.icon }}</span>{{ p.name }}
            </button>
          </div>

          <h4 class="panel-h">大组件</h4>
          <div class="comp-list">
            <button
              v-for="p in compositePresets"
              :key="p.key"
              class="comp-item"
              draggable="true"
              @dragstart="onDragStart(p)"
              @click="addByClick(p)"
            >
              <span class="comp-icon">{{ p.icon }}</span>{{ p.name }}
            </button>
          </div>
        </div>

        <!-- AI 助手：本期预留接缝，不实现 -->
        <div class="ai-seam">
          <div class="ai-head">🤖 AI 助手</div>
          <p class="ai-note">一句话生成布局、填充文案——骨架已留好接缝，本期先手动搭建。</p>
          <div class="ai-input-row">
            <input class="ai-input" disabled placeholder="（本期未启用）帮我排一版电商帮扶成果…" />
            <button class="ai-send" disabled>发送</button>
          </div>
        </div>
      </aside>

      <!-- 中栏：栅格画布 -->
      <main class="col-canvas" :class="{ full: preview }">
        <div
          class="grid"
          :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }"
          @dragover.prevent
          @drop="onDrop"
        >
          <div
            v-for="node in rendered.nodes"
            :key="node.id"
            class="cell"
            :class="{ selected: node.id === selectedId && !preview }"
            :style="cellStyle(node)"
            @click="!preview && select(node.id)"
          >
            <WorkRenderer :node="node" />
            <div v-if="!preview" class="cell-tools">
              <button class="ct-btn" title="上移" @click.stop="move(node.id, -1)">↑</button>
              <button class="ct-btn" title="下移" @click.stop="move(node.id, 1)">↓</button>
              <button class="ct-btn del" title="删除" @click.stop="remove(node.id)">🗑</button>
            </div>
          </div>

          <div v-if="!work.blocks.length" class="canvas-empty">
            <p>🌱 从左侧把组件拖进来，或点击组件即可加入画布</p>
          </div>
        </div>
      </main>

      <!-- 右栏：属性面板 -->
      <aside class="col-right" :class="{ hidden: preview }">
        <template v-if="selectedBlock">
          <h4 class="panel-h">{{ defOf(selectedBlock.type).name }} · 属性</h4>

          <!-- 属性编辑 -->
          <div v-for="p in defOf(selectedBlock.type).props" :key="p.key" class="field">
            <label>{{ p.label }}</label>
            <textarea
              v-if="p.type === 'textarea'"
              v-model="selectedBlock.props[p.key]"
              rows="3"
            />
            <select v-else-if="p.type === 'select'" v-model="selectedBlock.props[p.key]">
              <option v-for="o in p.options" :key="o" :value="o">{{ o }}</option>
            </select>
            <input v-else v-model="selectedBlock.props[p.key]" :type="p.type === 'number' ? 'number' : 'text'" />
          </div>

          <!-- 数据绑定 -->
          <template v-if="defOf(selectedBlock.type).slots.length">
            <h4 class="panel-h sub">数据绑定</h4>
            <div v-for="s in defOf(selectedBlock.type).slots" :key="s.key" class="field">
              <label>{{ s.label }}</label>
              <select v-model="selectedBlock.bindings[s.key]">
                <option v-for="src in s.accepts" :key="src" :value="src">
                  {{ sourceLabel(src) }}
                </option>
              </select>
            </div>
          </template>

          <!-- 宽度（栅格列数） -->
          <div class="field">
            <label>宽度（{{ selectedBlock.w }} / {{ cols }} 列）</label>
            <input v-model.number="selectedBlock.w" type="range" :min="1" :max="cols" />
          </div>
        </template>

        <p v-else class="prop-empty">点击画布里的组件，在这里改文字、换数据源、调宽度。</p>
      </aside>
    </div>

    <AppToast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import WorkRenderer from './WorkRenderer.vue'
import { PRESETS, createEmptyWork } from './presets.js'
import { getDef, DATA_SOURCES } from './registry.js'
import { resolveBindings } from './binding.js'
import { renderWork } from './renderer.js'
import { validateWork } from './validate.js'
import { toJSON, toStaticSite } from './exportSite.js'
import { saveWork, loadWork } from './worksStore.js'
import { loadDossiers, getDossier } from '../mine/dossier.js'

const route = useRoute()
const router = useRouter()
const toastRef = ref(null)
const toast = (m) => toastRef.value?.show(m)

// —— 示例档案：无后端数据时也能演示 ——
const SAMPLE_DOSSIER = {
  id: '__sample__',
  title: '示例档案（小朱湾）',
  village: '小朱湾村',
  plan: { topic: '电商帮扶', targetVillage: '小朱湾村' },
  collected: {
    metricValues: [
      { name: '月销售额', unit: '万元', before: '2', after: '8' },
      { name: '就业人数', unit: '人', before: '10', after: '35' },
      { name: '农户覆盖', unit: '户', before: '5', after: '30' },
    ],
    materials: [
      { name: '走访农户', note: '记录 30 户基本情况', type: '调研' },
      { name: '直播带货培训', note: '培训 20 人', type: '活动' },
      { name: '设计包装', note: '完成 3 款农产品包装', type: '产出' },
    ],
    people: [
      { name: '朱大姐', role: '合作社社长', quote: '日子越来越有奔头了' },
      { name: '王同学', role: '实践队队长', quote: '把课堂学的用到了田间地头' },
    ],
  },
}

const work = reactive(createEmptyWork({ id: newId(), title: '实践成果作品' }))
const dossier = ref(SAMPLE_DOSSIER)
const dossierList = ref([])
const sourceId = ref('__sample__')
const selectedId = ref('')
const preview = ref(false)
// 归属队：有则作品走后端持久化（团队共享），无则纯本地暂存。
const teamId = ref(null)

const cols = computed(() => work.layout.cols)
const basicPresets = PRESETS.filter((p) => p.category === 'basic')
const compositePresets = PRESETS.filter((p) => p.category === 'composite')

// 渲染描述：绑定解析 → 渲染。响应式，改属性即时反映。
const rendered = computed(() => renderWork(resolveBindings(work, dossier.value)))
const selectedBlock = computed(() => work.blocks.find((b) => b.id === selectedId.value) || null)

function newId() {
  return `w${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}
function defOf(type) {
  return getDef(type) || { name: type, props: [], slots: [] }
}
function sourceLabel(key) {
  return DATA_SOURCES[key]?.label || key
}

// —— 载入：?team=<队id> 决定持久化归属 + 可选档案源，?work=<id> 续编，?source=<dossierId> 指定数据源 ——
onMounted(async () => {
  const t = route.query.team
  if (t) teamId.value = Number(t)

  const wid = route.query.work
  if (wid) {
    try {
      const saved = await loadWork(String(wid), teamId.value)
      if (saved) Object.assign(work, saved)
    } catch (e) {
      toast(e.message || '作品读取失败')
    }
  }
  try {
    if (teamId.value) dossierList.value = await loadDossiers(teamId.value)
  } catch {
    /* 未登录/无队：只用示例档案，不阻断 */
  }
  const src = route.query.source
  if (src) {
    sourceId.value = String(src)
    await onSourceChange()
  }
})

async function onSourceChange() {
  if (sourceId.value === '__sample__') {
    dossier.value = SAMPLE_DOSSIER
    return
  }
  try {
    const full = await getDossier(sourceId.value)
    dossier.value = full || SAMPLE_DOSSIER
    if (!full) toast('该档案读取失败，已回落示例数据')
  } catch (e) {
    dossier.value = SAMPLE_DOSSIER
    toast(e.message || '档案读取失败')
  }
}

// —— 增删组件 ——
let dragging = null
function onDragStart(preset) {
  dragging = preset
}
function onDrop() {
  if (dragging) {
    addBlock(dragging)
    dragging = null
  }
}
function addByClick(preset) {
  addBlock(preset)
}
function addBlock(preset) {
  const block = preset.make()
  block.id = newId()
  block.y = work.blocks.length // 追加到末尾
  block.x = 0
  work.blocks.push(block)
  selectedId.value = block.id
}
function select(id) {
  selectedId.value = id
}
function remove(id) {
  const i = work.blocks.findIndex((b) => b.id === id)
  if (i >= 0) work.blocks.splice(i, 1)
  if (selectedId.value === id) selectedId.value = ''
}
function move(id, dir) {
  const i = work.blocks.findIndex((b) => b.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= work.blocks.length) return
  const [b] = work.blocks.splice(i, 1)
  work.blocks.splice(j, 0, b)
}

// —— 栅格样式：追加流式布局，每个组件占一行、按宽度跨列 ——
function cellStyle(node) {
  return { gridColumn: `span ${Math.min(node.grid.w, cols.value)}` }
}

// —— 保存 / 导出 ——
async function onSave() {
  const r = validateWork(work)
  if (!r.valid) {
    toast(`有 ${r.errors.length} 处不合法，已阻止保存`)
    return
  }
  const snapshot = JSON.parse(JSON.stringify(work))
  // 记录数据源档案 id（示例源不落库归属），供后端 source_dossier 冗余。
  snapshot.source = sourceId.value === '__sample__' ? '' : sourceId.value
  try {
    await saveWork(snapshot, teamId.value)
    toast(teamId.value ? '已保存到云端（本队共享）' : '已保存到本地')
  } catch (e) {
    toast(e.message || '保存失败')
  }
}
function onExportJSON() {
  download(`${work.title || 'work'}.json`, toJSON(work), 'application/json')
  toast('已导出 JSON')
}
function onExportSite() {
  const r = validateWork(work)
  if (!r.valid) {
    toast(`作品有 ${r.errors.length} 处不合法，已阻止导出`)
    return
  }
  const html = toStaticSite(rendered.value)
  download(`${work.title || 'work'}.html`, html, 'text/html')
  toast('已导出静态网站')
}
function download(filename, content, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function goBack() {
  // 回作品列表，带上队归属，保持同一上下文。
  router.push({ path: '/practice/studio', query: teamId.value ? { team: teamId.value } : {} })
}
</script>

<style scoped>
.studio { display: flex; flex-direction: column; height: 100vh; background: var(--color-bg); }

/* 工具条 */
.toolbar { display: flex; align-items: center; gap: .8rem; padding: .7rem 1.2rem; background: var(--color-card); border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
.title-input { flex: 0 1 240px; padding: .45rem .8rem; border: 1px solid var(--color-border); border-radius: 8px; font-size: .95rem; font-weight: 600; color: var(--color-primary-dark); }
.title-input:focus { outline: none; border-color: var(--color-primary); }
.src { display: flex; align-items: center; gap: .4rem; }
.src-label { font-size: .8rem; color: var(--color-text-light); }
.src-select, .src-select { padding: .4rem .6rem; border: 1px solid var(--color-border); border-radius: 8px; font-size: .84rem; background: var(--color-bg); }
.tb-actions { margin-left: auto; display: flex; gap: .5rem; }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); font-size: .84rem; padding: .5rem 1.1rem; }
.btn.primary { background: var(--color-primary); color: #fff; }
.btn.primary:hover { background: var(--color-primary-dark); }
.btn.ghost { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); }
.btn.ghost:hover, .btn.ghost.on { border-color: var(--color-primary); color: var(--color-primary); }
.btn.back { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); }

/* 三栏 */
.cols { flex: 1; display: flex; min-height: 0; }
.col-left { flex: 0 0 220px; display: flex; flex-direction: column; background: var(--color-card); border-right: 1px solid var(--color-border); }
.col-right { flex: 0 0 240px; padding: 1rem; background: var(--color-card); border-left: 1px solid var(--color-border); overflow-y: auto; }
.col-canvas { flex: 1; overflow-y: auto; padding: 1.4rem; }
.col-canvas.full { padding: 2rem clamp(1rem, 6vw, 4rem); }
.hidden { display: none; }

.panel-scroll { flex: 1; overflow-y: auto; padding: 1rem; }
.panel-h { margin: 0 0 .6rem; font-size: .8rem; color: var(--color-text-light); font-weight: 700; letter-spacing: .04em; }
.panel-h.sub { margin-top: 1.2rem; padding-top: 1rem; border-top: 1px dashed var(--color-border); }
.comp-list { display: flex; flex-direction: column; gap: .4rem; margin-bottom: 1rem; }
.comp-item { display: flex; align-items: center; gap: .5rem; padding: .55rem .7rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 10px; cursor: grab; font-size: .84rem; color: var(--color-text); text-align: left; transition: all var(--transition-fast); }
.comp-item:hover { border-color: var(--color-primary); transform: translateX(2px); }
.comp-icon { font-size: 1rem; }

/* AI 接缝 */
.ai-seam { padding: 1rem; border-top: 1px solid var(--color-border); background: var(--color-bg); }
.ai-head { font-size: .84rem; font-weight: 700; color: var(--color-primary-dark); margin-bottom: .4rem; }
.ai-note { margin: 0 0 .6rem; font-size: .74rem; color: var(--color-text-light); line-height: 1.5; }
.ai-input-row { display: flex; gap: .4rem; }
.ai-input { flex: 1; padding: .4rem .6rem; border: 1px solid var(--color-border); border-radius: 8px; font-size: .76rem; background: #fff; }
.ai-send { padding: .4rem .7rem; border: none; border-radius: 8px; background: var(--color-border); color: var(--color-text-light); font-size: .76rem; cursor: not-allowed; }

/* 画布 */
.grid { display: grid; gap: 1rem; align-content: start; min-height: 100%; position: relative; }
.cell { position: relative; min-width: 0; border-radius: 14px; transition: box-shadow var(--transition-fast); }
.cell.selected { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.cell:hover .cell-tools { opacity: 1; }
.cell-tools { position: absolute; top: 6px; right: 6px; display: flex; gap: 3px; opacity: 0; transition: opacity var(--transition-fast); }
.ct-btn { width: 26px; height: 26px; border: none; border-radius: 7px; background: var(--glass-bg-strong); backdrop-filter: blur(4px); cursor: pointer; font-size: .78rem; box-shadow: var(--shadow-sm); }
.ct-btn:hover { background: var(--color-accent); }
.ct-btn.del:hover { background: var(--color-highlight-soft); }
.canvas-empty { grid-column: 1 / -1; display: grid; place-items: center; min-height: 60vh; color: var(--color-text-light); border: 2px dashed var(--color-border); border-radius: var(--radius); }

/* 属性面板 */
.field { margin-bottom: .9rem; }
.field label { display: block; font-size: .78rem; color: var(--color-text-secondary); margin-bottom: .3rem; }
.field input, .field select, .field textarea { width: 100%; padding: .45rem .6rem; border: 1px solid var(--color-border); border-radius: 8px; font-size: .84rem; font-family: inherit; }
.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--color-primary); }
.field input[type=range] { padding: 0; }
.prop-empty { font-size: .82rem; color: var(--color-text-light); line-height: 1.6; }

@media (max-width: 860px) {
  .col-left { flex-basis: 170px; }
  .col-right { flex-basis: 190px; }
}
</style>
