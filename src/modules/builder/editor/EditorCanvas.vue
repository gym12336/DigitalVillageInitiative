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

    <!-- Status Bar -->
    <div class="ec-statusbar">
      <span>{{ state.pageWidth }} × {{ state.pageHeight }}</span>
      <span v-if="state.selectedId">选中: #{{ state.selectedId }}</span>
      <span>{{ state.components.length }} 个组件</span>
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
  copySelected, pasteClipboard, undo, redo, setZoom, pushHistory, save, getSelected,
} from './stageEditor.js'
import { renderChartSvg } from './chartRenderer.js'
import { renderSensorMarkup } from './sensorRenderer.js'

const router = useRouter()
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
        inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:var(--color-bg);color:var(--color-text-light);font-size:13px;border-radius:${p.borderRadius}px;">🖼 图片占位</div>`
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

function onSave() { save() }
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
  addComponentAt(info.type, Math.round(x), Math.round(y))
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
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('click', onGlobalClick)
})
</script>

<style scoped>
.ec-root { display: flex; flex-direction: column; height: 100%; outline: none; }

/* Toolbar */
.ec-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: .4rem .8rem; background: var(--color-card);
  border-bottom: 1px solid var(--color-border); flex-shrink: 0; gap: .5rem; flex-wrap: wrap;
}
.ec-tb-left, .ec-tb-center, .ec-tb-right { display: flex; align-items: center; gap: .3rem; }
.tb-btn {
  padding: .35rem .7rem; border: 1px solid var(--color-border); border-radius: 6px;
  background: var(--color-card); color: var(--color-text-secondary); font-size: .78rem;
  font-weight: 500; cursor: pointer; transition: all var(--transition-fast); white-space: nowrap;
}
.tb-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.tb-btn:disabled { opacity: .35; cursor: default; }
.tb-btn.primary { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.tb-btn.primary:hover { background: var(--color-primary-dark); }
.tb-sep { width: 1px; height: 20px; background: var(--color-border); margin: 0 .2rem; }
.tb-select {
  padding: .35rem .5rem; border: 1px solid var(--color-border); border-radius: 6px;
  font-size: .78rem; background: var(--color-card); color: var(--color-text-secondary); cursor: pointer;
}

/* Viewport */
.ec-viewport {
  flex: 1; overflow: auto; position: relative; outline: none;
  background: #d5d1c8;
  background-image: radial-gradient(circle, #c8c4bb 1px, transparent 1px);
  background-size: 20px 20px;
}
.ec-stage-wrap { margin: 40px auto; }
.ec-stage {
  transform-origin: 0 0; box-shadow: 0 4px 30px rgba(0,0,0,.12);
  position: relative;
}

/* Components rendered via innerHTML — deep styles for innerHTML elements */
:deep(.ec-component) { transition: box-shadow .15s; }
:deep(.ec-component.ec-sel) { outline: 2px solid #3b82f6; outline-offset: 1px; z-index: 100; }

/* Resize handles rendered via innerHTML */
:deep(.ec-handle) {
  position: absolute; width: 10px; height: 10px; background: #fff;
  border: 2px solid #3b82f6; border-radius: 2px; z-index: 10;
}
:deep(.ec-handle-nw) { top: -5px; left: -5px; cursor: nw-resize; }
:deep(.ec-handle-n)  { top: -5px; left: 50%; margin-left: -5px; cursor: n-resize; }
:deep(.ec-handle-ne) { top: -5px; right: -5px; cursor: ne-resize; }
:deep(.ec-handle-e)  { top: 50%; margin-top: -5px; right: -5px; cursor: e-resize; }
:deep(.ec-handle-se) { bottom: -5px; right: -5px; cursor: se-resize; }
:deep(.ec-handle-s)  { bottom: -5px; left: 50%; margin-left: -5px; cursor: s-resize; }
:deep(.ec-handle-sw) { bottom: -5px; left: -5px; cursor: sw-resize; }
:deep(.ec-handle-w)  { top: 50%; margin-top: -5px; left: -5px; cursor: w-resize; }

/* Box selection */
.ec-box-select {
  position: absolute; border: 1px dashed #3b82f6;
  background: rgba(59, 130, 246, .08); pointer-events: none; z-index: 999;
}

/* Context menu */
.ec-ctxmenu {
  position: fixed; z-index: 1000; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: 10px;
  box-shadow: var(--shadow-lg); padding: .3rem 0; min-width: 140px;
}
.ec-ctxmenu button {
  display: block; width: 100%; padding: .45rem 1rem; border: none; background: transparent;
  text-align: left; font-size: .82rem; color: var(--color-text-secondary); cursor: pointer;
  transition: background var(--transition-fast);
}
.ec-ctxmenu button:hover { background: var(--color-bg); color: var(--color-text); }

/* Status bar */
.ec-statusbar {
  display: flex; align-items: center; gap: 1.2rem; padding: .3rem .8rem;
  background: var(--color-card); border-top: 1px solid var(--color-border);
  font-size: .74rem; color: var(--color-text-light); flex-shrink: 0;
}
</style>
