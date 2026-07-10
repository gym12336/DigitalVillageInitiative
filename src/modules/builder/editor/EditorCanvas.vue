<!-- src/modules/builder/editor/EditorCanvas.vue -->
<template>
  <div class="ec-root">
    <!-- Toolbar -->
    <div class="ec-toolbar">
      <div class="ec-tb-left">
        <button class="tb-btn" @click="goBack" title="返回Hub">← 返回</button>
        <span class="tb-sep"></span>
        <button class="tb-btn" @click="addToCanvas('text')">T 文本</button>
        <button class="tb-btn" @click="addToCanvas('chart')">📊 图表</button>
        <button class="tb-btn" @click="addToCanvas('image')">🖼 图片</button>
        <button class="tb-btn" @click="addToCanvas('agri-sensor')">🌡 传感器</button>
      </div>
      <div class="ec-tb-center">
        <button class="tb-btn" @click="undo" :disabled="state.historyIndex <= 0" title="撤销">↩</button>
        <button class="tb-btn" @click="redo" :disabled="state.historyIndex >= state.history.length - 1" title="重做">↪</button>
      </div>
      <div class="ec-tb-right">
        <button class="tb-btn" @click="onSaveAsBigComponent" :disabled="state.selectedId === null" title="将选中的组件保存为大组件">📦 保存为大组件</button>
        <span class="tb-sep"></span>
        <select class="tb-select" :value="state.zoom" @change="onZoomChange">
          <option v-for="z in ZOOM_OPTIONS" :key="z" :value="z">{{ Math.round(z * 100) }}%</option>
        </select>
        <span class="tb-sep"></span>
        <button class="tb-btn primary" @click="onSave">💾 保存</button>
        <button class="tb-btn primary" @click="onPreview">👁 预览</button>
      </div>
    </div>

    <!-- Canvas Viewport -->
    <div
      ref="viewportRef"
      class="ec-viewport"
      @drop="onDrop"
      @dragover.prevent="onDragOver"
      @mousedown="onStageMouseDown"
      @mousemove="onStageMouseMove"
      @mouseup="onStageMouseUp"
      @wheel.prevent="onWheel"
      tabindex="0"
    >
      <div class="ec-stage-wrap" :style="{ width: state.pageWidth * state.zoom + 'px', height: state.pageHeight * state.zoom + 'px' }">
        <div
          ref="stageRef"
          class="ec-stage"
          :style="{
            width: state.pageWidth + 'px',
            height: state.pageHeight + 'px',
            background: state.pageBackground,
            transform: 'scale(' + state.zoom + ')',
          }"
          v-html="stageHtml"
        ></div>
      </div>

      <!-- Box selection overlay -->
      <div v-if="boxSelect.active" class="ec-box-select" :style="boxSelectStyle"></div>
    </div>

    <!-- Context menu -->
    <div v-if="ctxMenu.show" class="ec-ctxmenu" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }" @click.stop>
      <button @click="ctxDelete">删除</button>
      <button @click="ctxBringToFront">置于顶层</button>
      <button @click="ctxClone">复制</button>
      <button @click="ctxMenu.show = false">取消</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  state, addComponentAt, selectComponent,
  selectByRect, deleteComponent, bringToFront, cloneComponent,
  copySelected, pasteClipboard, undo, redo, setZoom, pushHistory, save, getSelected, load,
} from './stageEditor.js'
import { renderChartSvg } from './chartRenderer.js'
import { renderSensorMarkup } from './sensorRenderer.js'
import { getBigComponent, saveBigComponent } from '../display/bigComponentStore.js'

const router = useRouter()

const props = defineProps({
  saveKey: {
    type: String,
    default: 'builder-save',
  },
})
const ZOOM_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

// Refs
const viewportRef = ref(null)
const stageRef = ref(null)

// Drag state (non-reactive for performance)
let dragState = null
let resizeState = null
let dragOrigComponents = null

// Box select
const boxSelect = ref({ active: false, x: 0, y: 0, w: 0, h: 0 })
const boxSelectStyle = computed(() => ({
  left: boxSelect.value.x + 'px',
  top: boxSelect.value.y + 'px',
  width: boxSelect.value.w + 'px',
  height: boxSelect.value.h + 'px',
}))

// Context menu
const ctxMenu = ref({ show: false, x: 0, y: 0, id: null })

// Resize handles
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

// ---- Rendering ----

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderComponentMarkup(c) {
  const selected = state.selectedId === c.id
  const selClass = selected ? ' ec-sel' : ''
  const handles = selected ? HANDLES.map(h => `<div class="ec-handle ec-handle-${h}" data-handle="${h}"></div>`).join('') : ''

  let inner = ''
  switch (c.type) {
    case 'text': {
      const p = c.props
      inner = `<div style="width:100%;height:100%;display:flex;align-items:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};padding:12px;box-sizing:border-box;font-size:${p.fontSize}px;color:${p.color};font-weight:${p.fontWeight};text-align:${p.textAlign};background:${p.backgroundColor};border-radius:4px;overflow:hidden;">${esc(p.text)}</div>`
      break
    }
    case 'image': {
      const p = c.props
      if (p.src) {
        inner = `<img src="${esc(p.src)}" alt="${esc(p.alt)}" style="width:100%;height:100%;object-fit:${p.objectFit};border-radius:${p.borderRadius}px;"/>`
      } else {
        inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:#f2f6f8;color:#687b8b;font-size:13px;border:1px solid rgba(44,125,160,0.08);border-radius:${p.borderRadius}px;">🖼 图片占位</div>`
      }
      break
    }
    case 'chart':
      inner = renderChartSvg(c)
      break
    case 'agri-sensor':
      inner = renderSensorMarkup(c)
      break
  }

  return `<div class="ec-component${selClass}" data-component-id="${c.id}" style="position:absolute;left:${c.x}px;top:${c.y}px;width:${c.width}px;height:${c.height}px;overflow:hidden;">${inner}${handles}</div>`
}

const stageHtml = computed(() => {
  return state.components.map(c => renderComponentMarkup(c)).join('')
})

// ---- Actions ----

function goBack() { router.push('/builder') }
function addToCanvas(type) {
  const cx = state.pageWidth / 2 - 200
  const cy = state.pageHeight / 2 - 150
  addComponentAt(type, cx + Math.random() * 200, cy + Math.random() * 150)
}

function onSave() { save(props.saveKey) }
function onSaveAsBigComponent() {
  if (state.selectedId === null) return
  const selected = state.components.filter(c => c.id === state.selectedId)
  if (!selected.length) return

  const name = window.prompt('请输入大组件名称：', '我的大组件')
  if (!name || !name.trim()) return

  saveBigComponent(name.trim(), selected)
  alert('✅ 已收录到自定义大组件库')
}
function onPreview() {
  import('./buildPreview.js').then(m => m.buildAndOpen(state))
}

function onZoomChange(e) { setZoom(parseFloat(e.target.value)) }

// ---- Drag from library ----

function onDragOver(e) {
  e.dataTransfer.dropEffect = 'copy'
}

function onDrop(e) {
  e.preventDefault()
  const raw = e.dataTransfer.getData('text/plain')
  if (!raw) return
  let info
  try { info = JSON.parse(raw) } catch { return }
  const rect = viewportRef.value.getBoundingClientRect()
  const x = (e.clientX - rect.left + viewportRef.value.scrollLeft) / state.zoom
  const y = (e.clientY - rect.top + viewportRef.value.scrollTop) / state.zoom

  if (info.type === 'big-component' && info.bigComponentId) {
    const bc = getBigComponent(info.bigComponentId)
    if (!bc) return
    const baseX = Math.round(x)
    const baseY = Math.round(y)
    bc.children.forEach(child => {
      const comp = JSON.parse(JSON.stringify(child))
      comp.id = state.nextId++
      comp.x = baseX + (comp.x || 0)
      comp.y = baseY + (comp.y || 0)
      state.components.push(comp)
    })
    if (bc.children.length > 0) {
      state.selectedId = state.components[state.components.length - 1].id
    }
    pushHistory()
  } else {
    addComponentAt(info.type, Math.round(x), Math.round(y))
  }
}

// ---- Stage mouse events ----

function getCanvasCoords(e) {
  const rect = viewportRef.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left + viewportRef.value.scrollLeft) / state.zoom,
    y: (e.clientY - rect.top + viewportRef.value.scrollTop) / state.zoom,
  }
}

function findTarget(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el) return null
  // Check for resize handle
  const handleEl = el.closest('[data-handle]')
  if (handleEl) return { type: 'handle', handle: handleEl.dataset.handle }
  // Check for component
  const compEl = el.closest('[data-component-id]')
  if (compEl) return { type: 'component', id: Number(compEl.dataset.componentId) }
  // Check if on stage
  if (el.closest('.ec-stage')) return { type: 'stage' }
  return null
}

function onStageMouseDown(e) {
  if (e.button !== 0) return // left click only
  const target = findTarget(e)
  if (!target) return

  if (target.type === 'handle') {
    // Resize
    const id = Number(document.elementFromPoint(e.clientX, e.clientY).closest('[data-component-id]').dataset.componentId)
    const c = state.components.find(c => c.id === id)
    if (!c) return
    resizeState = { id, handle: target.handle, startX: e.clientX, startY: e.clientY, origW: c.width, origH: c.height, origX: c.x, origY: c.y }
    selectComponent(id)
  } else if (target.type === 'component') {
    // Move
    const c = state.components.find(c => c.id === target.id)
    if (!c) return
    dragState = { id: target.id, startX: e.clientX, startY: e.clientY, origX: c.x, origY: c.y }
    selectComponent(target.id)
    if (e.shiftKey) {
      bringToFront(target.id)
    }
  } else if (target.type === 'stage') {
    // Box select
    const coords = getCanvasCoords(e)
    boxSelect.value = { active: true, x: coords.x, y: coords.y, w: 0, h: 0 }
    selectComponent(null)
  }

  // Close context menu
  ctxMenu.value.show = false
}

function onStageMouseMove(e) {
  if (dragState) {
    const dx = (e.clientX - dragState.startX) / state.zoom
    const dy = (e.clientY - dragState.startY) / state.zoom
    const c = state.components.find(c => c.id === dragState.id)
    if (c) {
      c.x = Math.max(0, dragState.origX + dx)
      c.y = Math.max(0, dragState.origY + dy)
    }
  }

  if (resizeState) {
    const dx = (e.clientX - resizeState.startX) / state.zoom
    const dy = (e.clientY - resizeState.startY) / state.zoom
    const c = state.components.find(c => c.id === resizeState.id)
    if (!c) return
    const MIN_SIZE = 20
    const { origX, origY, origW, origH, handle } = resizeState
    switch (handle) {
      case 'se': c.width  = Math.max(MIN_SIZE, origW + dx);  c.height = Math.max(MIN_SIZE, origH + dy);  break
      case 'sw': c.x = origX + dx; c.width  = Math.max(MIN_SIZE, origW - dx);  c.height = Math.max(MIN_SIZE, origH + dy);  break
      case 'ne': c.width  = Math.max(MIN_SIZE, origW + dx);  c.y = origY + dy; c.height = Math.max(MIN_SIZE, origH - dy);  break
      case 'nw': c.x = origX + dx; c.width  = Math.max(MIN_SIZE, origW - dx);  c.y = origY + dy; c.height = Math.max(MIN_SIZE, origH - dy);  break
      case 'e':  c.width  = Math.max(MIN_SIZE, origW + dx);  break
      case 'w':  c.x = origX + dx; c.width  = Math.max(MIN_SIZE, origW - dx);  break
      case 's':  c.height = Math.max(MIN_SIZE, origH + dy);  break
      case 'n':  c.y = origY + dy; c.height = Math.max(MIN_SIZE, origH - dy);  break
    }
  }

  if (boxSelect.value.active) {
    const coords = getCanvasCoords(e)
    if (coords) {
      const mousedownX = boxSelect.value.x
      const mousedownY = boxSelect.value.y
      const x1 = Math.min(mousedownX, coords.x)
      const y1 = Math.min(mousedownY, coords.y)
      boxSelect.value = { active: true, x: x1, y: y1, w: Math.abs(coords.x - mousedownX), h: Math.abs(coords.y - mousedownY) }
    }
  }
}

function onStageMouseUp(e) {
  if (dragState) {
    pushHistory()
    dragState = null
  }
  if (resizeState) {
    pushHistory()
    resizeState = null
  }
  if (boxSelect.value.active) {
    const b = boxSelect.value
    selectByRect(b.x, b.y, b.x + b.w, b.y + b.h)
    boxSelect.value = { active: false, x: 0, y: 0, w: 0, h: 0 }
  }
}

function onWheel(e) {
  if (e.ctrlKey) {
    const delta = e.deltaY > 0 ? -0.25 : 0.25
    setZoom(state.zoom + delta)
  }
}

// ---- Keyboard ----

function onKeyDown(e) {
  // Don't intercept when typing in input fields
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.selectedId) deleteComponent(state.selectedId)
  } else if (e.ctrlKey && e.key === 'd') {
    e.preventDefault()
    if (state.selectedId) cloneComponent(state.selectedId)
  } else if (e.ctrlKey && e.key === 'c') {
    copySelected()
  } else if (e.ctrlKey && e.key === 'v') {
    pasteClipboard()
  } else if (e.ctrlKey && e.key === 'z') {
    e.preventDefault()
    undo()
  } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
    e.preventDefault()
    redo()
  }
}

// ---- Context menu ----

function ctxDelete() {
  if (ctxMenu.value.id) deleteComponent(ctxMenu.value.id)
  ctxMenu.value.show = false
}
function ctxBringToFront() {
  if (ctxMenu.value.id) bringToFront(ctxMenu.value.id)
  ctxMenu.value.show = false
}
function ctxClone() {
  if (ctxMenu.value.id) cloneComponent(ctxMenu.value.id)
  ctxMenu.value.show = false
}

function onStageContextMenu(e) {
  const target = findTarget(e)
  if (target && target.type === 'component') {
    e.preventDefault()
    ctxMenu.value = { show: true, x: e.clientX, y: e.clientY, id: target.id }
  }
}

function onGlobalClick() {
  ctxMenu.value.show = false
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  if (viewportRef.value) {
    viewportRef.value.addEventListener('contextmenu', onStageContextMenu)
  }
  document.addEventListener('click', onGlobalClick)
  load(props.saveKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('click', onGlobalClick)
})
</script>

<style scoped>
.ec-root { display: flex; flex-direction: column; height: 100%; outline: none; }

/* ============ 顶栏 ============ */
.ec-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 1rem; gap: 0.5rem; flex-wrap: wrap; flex-shrink: 0;
  background: var(--editor-topbar-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--editor-topbar-shadow);
  border-radius: 20px;
}
.ec-tb-left, .ec-tb-center, .ec-tb-right {
  display: flex; align-items: center; gap: 0.35rem;
}

/* 小标签 SCREEN BUILDER */
.ec-tb-left::before {
  content: 'SCREEN BUILDER';
  font-size: 11px; font-weight: 700; color: #2c7da0;
  text-transform: uppercase; letter-spacing: 0.1em;
  margin-right: 0.5rem;
  opacity: 0.85;
}

.tb-btn {
  padding: 0.4rem 0.9rem;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 999px;
  background: transparent;
  color: rgba(255,255,255,0.85);
  font-size: 0.78rem; font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.tb-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.25);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.tb-btn:disabled { opacity: 0.3; cursor: default; transform: none; box-shadow: none; }
.tb-btn.primary {
  background: #2c7da0;
  color: #fff;
  border-color: #2c7da0;
}
.tb-btn.primary:hover {
  background: #245a73;
  border-color: #245a73;
}
.tb-sep {
  width: 1px; height: 20px;
  background: rgba(255,255,255,0.12);
  margin: 0 0.25rem;
}
.tb-select {
  padding: 0.4rem 0.6rem;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px;
  font-size: 0.78rem;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.85);
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast);
}
.tb-select:hover, .tb-select:focus {
  border-color: rgba(255,255,255,0.3);
}
.tb-select option { background: #1c2834; color: #fff; }

/* ============ 画布视口 ============ */
.ec-viewport {
  flex: 1; overflow: auto; position: relative; outline: none;
  margin: 12px 0;
  border-radius: 20px;
  padding: 24px;
  background:
    linear-gradient(90deg, var(--editor-canvas-grid-line) 1px, transparent 1px),
    linear-gradient(var(--editor-canvas-grid-line) 1px, transparent 1px),
    linear-gradient(145deg, #f8fbfd, #edf3f7);
  background-size: 24px 24px, 24px 24px, auto;
}

/* ============ Stage ============ */
.ec-stage-wrap { margin: 0 auto; }
.ec-stage {
  transform-origin: 0 0;
  position: relative;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,0.04),
    0 26px 60px rgba(36,90,115,0.18);
}

/* ============ 画布中组件（innerHTML 全局样式） ============ */
:deep(.ec-component) {
  border-radius: 18px;
  transition: box-shadow 0.18s, transform 0.18s;
}
:deep(.ec-component:hover) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(36,90,115,0.12);
}
:deep(.ec-component.ec-sel) {
  box-shadow: 0 0 0 3px var(--editor-select-glow);
  z-index: 100;
}

/* ============ 缩放手柄 ============ */
:deep(.ec-handle) {
  position: absolute; width: 10px; height: 10px;
  background: #ffffff;
  border: 2px solid #2c7da0;
  border-radius: 4px;
  z-index: 10;
}
:deep(.ec-handle-nw) { top: -5px; left: -5px; cursor: nw-resize; }
:deep(.ec-handle-n)  { top: -5px; left: 50%; margin-left: -5px; cursor: n-resize; }
:deep(.ec-handle-ne) { top: -5px; right: -5px; cursor: ne-resize; }
:deep(.ec-handle-e)  { top: 50%; margin-top: -5px; right: -5px; cursor: e-resize; }
:deep(.ec-handle-se) { bottom: -5px; right: -5px; cursor: se-resize; }
:deep(.ec-handle-s)  { bottom: -5px; left: 50%; margin-left: -5px; cursor: s-resize; }
:deep(.ec-handle-sw) { bottom: -5px; left: -5px; cursor: sw-resize; }
:deep(.ec-handle-w)  { top: 50%; margin-top: -5px; left: -5px; cursor: w-resize; }

/* ============ 框选矩形 ============ */
.ec-box-select {
  position: absolute;
  border: 1px dashed #2c7da0;
  background: var(--editor-select-bg);
  pointer-events: none;
  z-index: 999;
  border-radius: 4px;
}

/* ============ 右键菜单 ============ */
.ec-ctxmenu {
  position: fixed; z-index: 1000;
  background: var(--color-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  box-shadow: var(--shadow-lg);
  padding: 0.35rem 0;
  min-width: 150px;
}
.ec-ctxmenu button {
  display: block; width: 100%;
  padding: 0.5rem 1.2rem;
  border: none; background: transparent;
  text-align: left;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.ec-ctxmenu button:hover {
  background: rgba(44,125,160,0.06);
  color: var(--color-text);
}

</style>
