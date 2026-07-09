// src/modules/builder/editor/stageEditor.js
import { reactive } from 'vue'
import { createComponent } from './componentFactory.js'

const HISTORY_LIMIT = 50

export const state = reactive({
  components: [],
  selectedId: null,
  pageWidth: 1920,
  pageHeight: 1080,
  pageBackground: '#ffffff',
  zoom: 1,
  clipboard: [],
  nextId: 1,
  history: [[]],
  historyIndex: 0,
})

export function resetState() {
  state.components = []
  state.selectedId = null
  state.pageWidth = 1920
  state.pageHeight = 1080
  state.pageBackground = '#ffffff'
  state.zoom = 1
  state.clipboard = []
  state.nextId = 1
  state.history = [[]]
  state.historyIndex = 0
}

function snapshot() {
  return JSON.parse(JSON.stringify(state.components))
}

export function pushHistory() {
  // Discard any future history if we've undone
  if (state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1)
  }
  state.history.push(snapshot())
  if (state.history.length > HISTORY_LIMIT) {
    state.history.shift()
  } else {
    state.historyIndex = state.history.length - 1
  }
}

function restoreHistory(index) {
  state.components = JSON.parse(JSON.stringify(state.history[index]))
  state.selectedId = null
}

export function addComponentAt(type, x, y) {
  const comp = createComponent(type, x, y)
  comp.id = state.nextId++
  state.components.push(comp)
  state.selectedId = comp.id
  pushHistory()
  return comp.id
}

export function deleteComponent(id) {
  state.components = state.components.filter(c => c.id !== id)
  if (state.selectedId === id) state.selectedId = null
  pushHistory()
}

export function selectComponent(id) {
  state.selectedId = id
}

export function moveComponent(id, dx, dy) {
  const c = state.components.find(c => c.id === id)
  if (!c) return
  c.x = Math.max(0, c.x + dx)
  c.y = Math.max(0, c.y + dy)
}

export function resizeComponent(id, handle, dx, dy) {
  const c = state.components.find(c => c.id === id)
  if (!c) return
  const MIN_SIZE = 20
  switch (handle) {
    case 'se': c.width = Math.max(MIN_SIZE, c.width + dx); c.height = Math.max(MIN_SIZE, c.height + dy); break
    case 'sw': c.x += dx; c.width = Math.max(MIN_SIZE, c.width - dx); c.height = Math.max(MIN_SIZE, c.height + dy); break
    case 'ne': c.width = Math.max(MIN_SIZE, c.width + dx); c.y += dy; c.height = Math.max(MIN_SIZE, c.height - dy); break
    case 'nw': c.x += dx; c.width = Math.max(MIN_SIZE, c.width - dx); c.y += dy; c.height = Math.max(MIN_SIZE, c.height - dy); break
    case 'e':  c.width = Math.max(MIN_SIZE, c.width + dx); break
    case 'w':  c.x += dx; c.width = Math.max(MIN_SIZE, c.width - dx); break
    case 's':  c.height = Math.max(MIN_SIZE, c.height + dy); break
    case 'n':  c.y += dy; c.height = Math.max(MIN_SIZE, c.height - dy); break
  }
}

export function bringToFront(id) {
  const idx = state.components.findIndex(c => c.id === id)
  if (idx === -1) return
  const [comp] = state.components.splice(idx, 1)
  state.components.push(comp)
}

export function cloneComponent(id) {
  const c = state.components.find(c => c.id === id)
  if (!c) return null
  const clone = JSON.parse(JSON.stringify(c))
  clone.id = state.nextId++
  clone.x += 20
  clone.y += 20
  state.components.push(clone)
  state.selectedId = clone.id
  pushHistory()
  return clone.id
}

export function copySelected() {
  if (state.selectedId === null) return
  const c = state.components.find(c => c.id === state.selectedId)
  if (c) state.clipboard = [JSON.parse(JSON.stringify(c))]
}

export function pasteClipboard(x, y) {
  if (!state.clipboard.length) return
  state.clipboard.forEach(src => {
    const clone = JSON.parse(JSON.stringify(src))
    clone.id = state.nextId++
    clone.x = x !== undefined ? x : clone.x + 20
    clone.y = y !== undefined ? y : clone.y + 20
    state.components.push(clone)
    state.selectedId = clone.id
  })
  pushHistory()
}

export function selectByRect(x1, y1, x2, y2) {
  const rx = Math.min(x1, x2)
  const ry = Math.min(y1, y2)
  const rw = Math.abs(x2 - x1)
  const rh = Math.abs(y2 - y1)

  // Find topmost intersecting component (reverse iteration = higher z-index)
  for (let i = state.components.length - 1; i >= 0; i--) {
    const c = state.components[i]
    if (c.x < rx + rw && c.x + c.width > rx && c.y < ry + rh && c.y + c.height > ry) {
      state.selectedId = c.id
      return
    }
  }
  state.selectedId = null
}

export function undo() {
  if (state.historyIndex <= 0) return
  state.historyIndex--
  restoreHistory(state.historyIndex)
}

export function redo() {
  if (state.historyIndex >= state.history.length - 1) return
  state.historyIndex++
  restoreHistory(state.historyIndex)
}

export function setZoom(z) {
  state.zoom = Math.max(0.25, Math.min(2, z))
}

export function getSelected() {
  if (state.selectedId === null) return null
  return state.components.find(c => c.id === state.selectedId) || null
}

export function save() {
  const data = {
    components: JSON.parse(JSON.stringify(state.components)),
    pageWidth: state.pageWidth,
    pageHeight: state.pageHeight,
    pageBackground: state.pageBackground,
    nextId: state.nextId,
  }
  localStorage.setItem('builder-save', JSON.stringify(data))
}

export function load() {
  const raw = localStorage.getItem('builder-save')
  if (!raw) return false
  try {
    const data = JSON.parse(raw)
    state.components = data.components || []
    state.pageWidth = data.pageWidth || 1920
    state.pageHeight = data.pageHeight || 1080
    state.pageBackground = data.pageBackground || '#ffffff'
    state.nextId = data.nextId || 1
    state.selectedId = null
    state.history = [JSON.parse(JSON.stringify(state.components))]
    state.historyIndex = 0
    state.clipboard = []
    return true
  } catch {
    return false
  }
}
