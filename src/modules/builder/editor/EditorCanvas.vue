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
        <button class="tb-btn" @click="addToCanvas('timeline')">⏱ 时间轴</button>
        <button class="tb-btn" @click="addToCanvas('datatable')">📋 数据表</button>
        <button class="tb-btn" @click="addToCanvas('layout-box')">📦 多组件框</button>
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
  saveToDB, loadFromDB,
} from './stageEditor.js'
import { renderChartSvg } from './chartRenderer.js'
import { renderSensorMarkup } from './sensorRenderer.js'
import { renderTimelineMarkup } from './timelineRenderer.js'
import { renderDatatableMarkup } from './datatableRenderer.js'
import { calcLayoutSlots } from './layoutBoxEngine.js'
import { createComponent } from './componentFactory.js'

const router = useRouter()

const props = defineProps({
  documentType: {
    type: String,
    default: 'editor',   // 'editor' | 'display'
  },
  dossierId: {
    type: String,
    default: '',
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
let dividerDrag = null
// Shape: { containerId, layout, index, dir, startX, startY, origRatios }

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

function renderLayoutBoxMarkup(comp) {
  const p = comp.props
  const layout = p.layout || 'horizontal'
  const ratios = p.splitRatios || []
  const slotCount = p.slotCount || 2
  const children = p.children || []

  const { slots, dividers } = calcLayoutSlots(comp.width, comp.height, layout, ratios, slotCount)

  // Render slot cards
  let slotHtml = ''
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]
    const child = children[i] || null
    const widthPx = Math.round(s.w)
    const heightPx = Math.round(s.h)
    const leftPx = Math.round(s.x)
    const topPx = Math.round(s.y)
    if (child) {
      // Construct a temp component for the child and render its inner markup
      const childComp = {
        id: child.id,
        type: child.type,
        x: s.x + 4,
        y: s.y + 4,
        width: s.w - 8,
        height: s.h - 8,
        props: child.props,
      }
      const innerMarkup = renderComponentMarkup(childComp)
      slotHtml += `<div style="position:absolute;left:${leftPx}px;top:${topPx}px;width:${widthPx}px;height:${heightPx}px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">${innerMarkup}</div>`
    } else {
      slotHtml += `<div data-slot-index="${i}" style="position:absolute;left:${leftPx}px;top:${topPx}px;width:${widthPx}px;height:${heightPx}px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;border:2px dashed #d0dbe3;display:flex;align-items:center;justify-content:center;color:#8ea3b2;font-size:14px;">拖入组件</div>`
    }
  }

  // Render dividers
  let dividerHtml = ''
  for (const d of dividers) {
    const cursor = d.dir === 'h' ? 'col-resize' : 'row-resize'
    dividerHtml += `<div data-divider data-divider-layout="${layout}" data-divider-index="${d.index}" data-divider-dir="${d.dir}" style="position:absolute;left:${Math.round(d.x)}px;top:${Math.round(d.y)}px;width:${Math.round(d.w)}px;height:${Math.round(d.h)}px;cursor:${cursor};background:#d0dbe3;" onmouseover="this.style.background='#2c7da0'" onmouseout="this.style.background='#d0dbe3'"></div>`
  }

  return `<div style="position:relative;width:100%;height:100%;border:1px solid #e8edf2;border-radius:16px;background:#fafdfe;overflow:hidden;" data-layout-box>${slotHtml}${dividerHtml}</div>`
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
    case 'timeline':
      inner = renderTimelineMarkup(c)
      break
    case 'datatable':
      inner = renderDatatableMarkup(c)
      break
    case 'layout-box':
      inner = renderLayoutBoxMarkup(c)
      break
  }

  return `<div class="ec-component${selClass}" data-component-id="${c.id}" style="position:absolute;left:${c.x}px;top:${c.y}px;width:${c.width}px;height:${c.height}px;overflow:hidden;">${inner}${handles}</div>`
}

const stageHtml = computed(() => {
  return state.components.map(c => renderComponentMarkup(c)).join('')
})

// ---- Actions ----

function goBack() { router.push(props.dossierId ? `/builder?dossierId=${props.dossierId}` : '/builder') }
function addToCanvas(type) {
  const cx = state.pageWidth / 2 - 200
  const cy = state.pageHeight / 2 - 150
  addComponentAt(type, cx + Math.random() * 200, cy + Math.random() * 150)
}

async function onSave() {
  if (props.dossierId) {
    try {
      await saveToDB(props.dossierId, props.documentType)
      alert('✅ 已保存到数据库')
    } catch (e) {
      alert('❌ 保存失败：' + (e.message || '未知错误'))
    }
  } else {
    // 无 dossierId 时回退到 localStorage（向后兼容）
    save(props.documentType === 'display' ? 'builder-display-save' : 'builder-save')
    alert('⚠️ 已保存到本地（请先选择实践档案以保存到数据库）')
  }
}
async function onSaveAsBigComponent() {
  if (state.selectedId === null) return
  if (!props.dossierId) {
    alert('⚠️ 请先选择实践档案')
    return
  }
  const selected = state.components.filter(c => c.id === state.selectedId)
  if (!selected.length) return

  const name = window.prompt('请输入大组件名称：', '我的大组件')
  if (!name || !name.trim()) return

  const { saveBigComponent } = await import('../display/bigComponentStore.js')
  try {
    await saveBigComponent(props.dossierId, name.trim(), selected)
    alert('✅ 已收录到自定义大组件库')
  } catch (e) {
    alert('❌ 保存大组件失败：' + (e.message || '未知错误'))
  }
}
function onPreview() {
  import('./buildPreview.js').then(m => m.buildAndOpen(state))
}

function onZoomChange(e) { setZoom(parseFloat(e.target.value)) }

// ---- Drag from library ----

function onDragOver(e) {
  e.dataTransfer.dropEffect = 'copy'
}

async function onDrop(e) {
  e.preventDefault()
  const raw = e.dataTransfer.getData('text/plain')
  if (!raw) return
  let info
  try { info = JSON.parse(raw) } catch { return }
  const rect = viewportRef.value.getBoundingClientRect()
  const x = (e.clientX - rect.left + viewportRef.value.scrollLeft) / state.zoom
  const y = (e.clientY - rect.top + viewportRef.value.scrollTop) / state.zoom

  if (info.type === 'big-component' && info.bigComponentId) {
    const { loadBigComponents } = await import('../display/bigComponentStore.js')
    const all = await loadBigComponents(props.dossierId)
    const bc = all.find(b => b.id === info.bigComponentId)
    if (!bc) return
    const baseX = Math.round(x)
    const baseY = Math.round(y)
    const children = JSON.parse(bc.payload).children
    children.forEach(child => {
      const comp = JSON.parse(JSON.stringify(child))
      comp.id = state.nextId++
      comp.x = baseX + (comp.x || 0)
      comp.y = baseY + (comp.y || 0)
      state.components.push(comp)
    })
    if (children.length > 0) {
      state.selectedId = state.components[state.components.length - 1].id
    }
    pushHistory()
  } else {
    // Check if dropping into a layout-box slot
    const dropEl = document.elementFromPoint(e.clientX, e.clientY)
    const slotEl = dropEl ? dropEl.closest('[data-slot-index]') : null
    if (slotEl) {
      const layoutBoxEl = slotEl.closest('[data-layout-box]')
      const compEl = layoutBoxEl ? layoutBoxEl.closest('[data-component-id]') : null
      if (compEl) {
        const containerId = Number(compEl.dataset.componentId)
        const container = state.components.find(c => c.id === containerId)
        if (container && container.type === 'layout-box') {
          const slotIndex = parseInt(slotEl.dataset.slotIndex, 10)
          const child = createComponent(info.type, 0, 0, info.chartType)
          child.id = state.nextId++
          child.x = 0
          child.y = 0
          child.width = 0
          child.height = 0
          container.props.children[slotIndex] = child
          pushHistory()
          return
        }
      }
    }
    addComponentAt(info.type, Math.round(x), Math.round(y), info.chartType)
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
  // Check for divider
  const dividerEl = el.closest('[data-divider]')
  if (dividerEl) {
    const compEl = dividerEl.closest('[data-component-id]')
    if (compEl) {
      return {
        type: 'divider',
        containerId: Number(compEl.dataset.componentId),
        layout: dividerEl.dataset.dividerLayout,
        index: parseInt(dividerEl.dataset.dividerIndex, 10),
        dir: dividerEl.dataset.dividerDir,
      }
    }
  }
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

  // Clear child selection on any layout-box when clicking elsewhere
  const clearEl = document.elementFromPoint(e.clientX, e.clientY)
  const insideLayoutBox = clearEl ? clearEl.closest('[data-layout-box]') : null
  if (!insideLayoutBox) {
    for (const comp of state.components) {
      if (comp.type === 'layout-box' && comp._selectedChildIndex !== undefined) {
        comp._selectedChildIndex = undefined
      }
    }
  }

  if (target.type === 'divider') {
    const comp = state.components.find(c => c.id === target.containerId)
    if (!comp || comp.type !== 'layout-box') return
    dividerDrag = {
      containerId: target.containerId,
      layout: target.layout,
      index: target.index,
      dir: target.dir,
      startX: e.clientX,
      startY: e.clientY,
      origRatios: [...comp.props.splitRatios],
    }
    selectComponent(target.containerId)
  } else if (target.type === 'handle') {
    // Resize
    const id = Number(document.elementFromPoint(e.clientX, e.clientY).closest('[data-component-id]').dataset.componentId)
    const c = state.components.find(c => c.id === id)
    if (!c) return
    resizeState = { id, handle: target.handle, startX: e.clientX, startY: e.clientY, origW: c.width, origH: c.height, origX: c.x, origY: c.y }
    selectComponent(id)
  } else if (target.type === 'component') {
    // Check if click is inside a layout-box child slot
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const layoutBoxEl = el ? el.closest('[data-layout-box]') : null
    if (layoutBoxEl) {
      const containerCompEl = layoutBoxEl.closest('[data-component-id]')
      if (containerCompEl) {
        const containerId = Number(containerCompEl.dataset.componentId)
        const container = state.components.find(c => c.id === containerId)
        if (container && container.type === 'layout-box') {
          // Determine which slot was clicked by walking up to slot card
          // The slot card is a direct child of the layout-box div
          const slotCard = el.closest('[data-layout-box] > div')
          // Find which child index: iterate children to find matching slot
          if (slotCard) {
            const slotIndexEl = slotCard.getAttribute('data-slot-index')
            if (slotIndexEl !== null) {
              container._selectedChildIndex = parseInt(slotIndexEl, 10)
            }
          }
          state.selectedId = containerId
          // Close context menu
          ctxMenu.value.show = false
          return
        }
      }
    }
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

  if (dividerDrag) {
    const comp = state.components.find(c => c.id === dividerDrag.containerId)
    if (!comp || comp.type !== 'layout-box') { dividerDrag = null; return }
    const PAD = 12
    const DIV = 4
    const MIN_SLOT = 120
    const layout = dividerDrag.layout
    const dir = dividerDrag.dir
    const ratios = comp.props.splitRatios
    const orig = dividerDrag.origRatios

    if (dir === 'h') {
      // Horizontal drag (col-resize) — adjusts left/right ratios
      const rawDx = (e.clientX - dividerDrag.startX) / state.zoom
      let availDim, idxA, idxB
      switch (layout) {
        case 'horizontal':
        case 'main-right':
        case 'main-left':
          availDim = comp.width - PAD * 2 - (comp.props.slotCount - 1) * DIV
          idxA = dividerDrag.index
          idxB = dividerDrag.index + 1
          break
        case 'grid-2x2':
          availDim = comp.width - PAD * 2 - DIV
          idxA = 0; idxB = 1
          break
        case '1+2-right':
          availDim = comp.width - PAD * 2 - DIV
          idxA = 0; idxB = -1
          break
        case '2+1-right':
          availDim = comp.width - PAD * 2 - DIV
          idxA = 1; idxB = -1
          break
        case '1+2-bottom':
          availDim = comp.width - PAD * 2 - DIV
          idxA = 1; idxB = -1
          break
        case '2+1-top':
          availDim = comp.width - PAD * 2 - DIV
          idxA = 0; idxB = -1
          break
        default:
          availDim = comp.width - PAD * 2
          idxA = dividerDrag.index; idxB = dividerDrag.index + 1
      }
      if (availDim <= 0) return
      const deltaRatio = rawDx / availDim * 100
      const newVal = orig[idxA] + deltaRatio
      const minRatio = MIN_SLOT / availDim * 100
      if (idxB >= 0) {
        // Paired ratio adjustment
        const newValB = orig[idxB] - deltaRatio
        if (newVal < minRatio || newValB < minRatio) return
        ratios[idxA] = Math.round(newVal * 10) / 10
        ratios[idxB] = Math.round(newValB * 10) / 10
      } else {
        // Single ratio adjustment (other side is remainder)
        const maxRatio = 100 - minRatio
        if (newVal < minRatio || newVal > maxRatio) return
        ratios[idxA] = Math.round(newVal * 10) / 10
      }
    } else {
      // dir === 'v': Vertical drag (row-resize) — adjusts top/bottom ratios
      const rawDy = (e.clientY - dividerDrag.startY) / state.zoom
      let availDim, idxA, idxB
      switch (layout) {
        case 'vertical':
        case 'main-bottom':
        case 'main-top':
          availDim = comp.height - PAD * 2 - (comp.props.slotCount - 1) * DIV
          idxA = dividerDrag.index
          idxB = dividerDrag.index + 1
          break
        case 'grid-2x2':
          availDim = comp.height - PAD * 2 - DIV
          idxA = 2; idxB = 3
          break
        case '1+2-right':
          availDim = comp.height - PAD * 2 - DIV
          idxA = 1; idxB = -1
          break
        case '2+1-right':
          availDim = comp.height - PAD * 2 - DIV
          idxA = 0; idxB = -1
          break
        case '1+2-bottom':
          availDim = comp.height - PAD * 2 - DIV
          idxA = 0; idxB = -1
          break
        case '2+1-top':
          availDim = comp.height - PAD * 2 - DIV
          idxA = 1; idxB = -1
          break
        default:
          availDim = comp.height - PAD * 2
          idxA = dividerDrag.index; idxB = dividerDrag.index + 1
      }
      if (availDim <= 0) return
      const deltaRatio = rawDy / availDim * 100
      const newVal = orig[idxA] + deltaRatio
      const minRatio = MIN_SLOT / availDim * 100
      if (idxB >= 0) {
        const newValB = orig[idxB] - deltaRatio
        if (newVal < minRatio || newValB < minRatio) return
        ratios[idxA] = Math.round(newVal * 10) / 10
        ratios[idxB] = Math.round(newValB * 10) / 10
      } else {
        const maxRatio = 100 - minRatio
        if (newVal < minRatio || newVal > maxRatio) return
        ratios[idxA] = Math.round(newVal * 10) / 10
      }
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
  if (dividerDrag) {
    pushHistory()
    dividerDrag = null
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

async function doLoad() {
  if (props.dossierId) {
    await loadFromDB(props.dossierId, props.documentType)
  } else {
    load(props.documentType === 'display' ? 'builder-display-save' : 'builder-save')
  }
}

onMounted(async () => {
  document.addEventListener('keydown', onKeyDown)
  if (viewportRef.value) {
    viewportRef.value.addEventListener('contextmenu', onStageContextMenu)
  }
  document.addEventListener('click', onGlobalClick)

  await doLoad()
})

// Reload when dossier changes (DossierPicker switches via router.replace)
watch(() => [props.dossierId, props.documentType], () => {
  doLoad()
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
