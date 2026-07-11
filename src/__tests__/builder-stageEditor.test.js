import { describe, it, expect, beforeEach } from 'vitest'
import {
  state,
  resetState,
  addComponentAt,
  deleteComponent,
  selectComponent,
  moveComponent,
  bringToFront,
  cloneComponent,
  copySelected,
  pasteClipboard,
  undo,
  redo,
  getSelected,
  save,
  load,
} from '../modules/builder/editor/stageEditor.js'

beforeEach(() => {
  resetState()
})

describe('stageEditor', () => {
  describe('addComponentAt', () => {
    it('adds a text component and returns its id', () => {
      const id = addComponentAt('text', 100, 200)
      expect(id).toBe(1)
      expect(state.components).toHaveLength(1)
      expect(state.components[0].type).toBe('text')
      expect(state.components[0].x).toBe(100)
      expect(state.components[0].y).toBe(200)
    })

    it('auto-selects the new component', () => {
      addComponentAt('text', 0, 0)
      expect(state.selectedId).toBe(1)
    })
  })

  describe('deleteComponent', () => {
    it('removes component and clears selection', () => {
      addComponentAt('text', 0, 0)
      deleteComponent(1)
      expect(state.components).toHaveLength(0)
      expect(state.selectedId).toBeNull()
    })
  })

  describe('selectComponent', () => {
    it('sets selectedId', () => {
      addComponentAt('text', 0, 0)
      selectComponent(1)
      expect(state.selectedId).toBe(1)
    })
  })

  describe('moveComponent', () => {
    it('moves component by delta within bounds', () => {
      addComponentAt('text', 100, 100)
      moveComponent(1, 20, -10)
      expect(state.components[0].x).toBe(120)
      expect(state.components[0].y).toBe(90)
    })
  })

  describe('bringToFront', () => {
    it('moves component to end of array', () => {
      addComponentAt('text', 0, 0)
      addComponentAt('image', 10, 10)
      bringToFront(1)
      expect(state.components[state.components.length - 1].id).toBe(1)
    })
  })

  describe('cloneComponent', () => {
    it('creates a copy with offset position', () => {
      const id = addComponentAt('text', 100, 100)
      const newId = cloneComponent(id)
      expect(newId).toBe(2)
      expect(state.components).toHaveLength(2)
      expect(state.components[1].x).toBe(120)
      expect(state.components[1].y).toBe(120)
    })
  })

  describe('copy/paste', () => {
    it('copies selected then pastes at given position', () => {
      addComponentAt('text', 50, 50)
      copySelected()
      pasteClipboard(200, 300)
      expect(state.components).toHaveLength(2)
      expect(state.components[1].x).toBe(200)
      expect(state.components[1].y).toBe(300)
    })
  })

  describe('undo/redo', () => {
    it('undo reverts the last operation', () => {
      addComponentAt('text', 0, 0)
      addComponentAt('image', 10, 10)
      expect(state.components).toHaveLength(2)
      undo()
      expect(state.components).toHaveLength(1)
      expect(state.components[0].type).toBe('text')
    })

    it('redo restores the undone operation', () => {
      addComponentAt('text', 0, 0)
      addComponentAt('image', 10, 10)
      undo()
      redo()
      expect(state.components).toHaveLength(2)
    })

    it('caps history at 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        addComponentAt('text', i * 10, 0)
      }
      expect(state.history.length).toBeLessThanOrEqual(50)
    })
  })

  describe('getSelected', () => {
    it('returns the selected component or null', () => {
      expect(getSelected()).toBeNull()
      addComponentAt('text', 0, 0)
      expect(getSelected().type).toBe('text')
    })
  })

  describe('save/load with custom key', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('save uses default key "builder-save"', () => {
      addComponentAt('text', 10, 20)
      save()
      expect(localStorage.getItem('builder-save')).toBeTruthy()
    })

    it('save uses custom key when provided', () => {
      addComponentAt('text', 10, 20)
      save('builder-display-save')
      expect(localStorage.getItem('builder-display-save')).toBeTruthy()
      expect(localStorage.getItem('builder-save')).toBeFalsy()
    })

    it('load uses default key "builder-save"', () => {
      addComponentAt('text', 10, 20)
      save()
      resetState()
      const ok = load()
      expect(ok).toBe(true)
      expect(state.components).toHaveLength(1)
    })

    it('load uses custom key when provided', () => {
      addComponentAt('image', 30, 40)
      save('builder-display-save')
      resetState()
      const ok = load('builder-display-save')
      expect(ok).toBe(true)
      expect(state.components).toHaveLength(1)
      expect(state.components[0].type).toBe('image')
    })

    it('load returns false when custom key has no data', () => {
      localStorage.removeItem('builder-display-save')
      expect(load('builder-display-save')).toBe(false)
    })
  })
})
