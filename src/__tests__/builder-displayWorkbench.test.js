import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DisplayWorkbench from '../modules/builder/display/DisplayWorkbench.vue'
import { resetState } from '../modules/builder/editor/stageEditor.js'

beforeEach(() => {
  resetState()
  localStorage.clear()
})

describe('DisplayWorkbench', () => {
  it('mounts successfully', () => {
    const wrapper = mount(DisplayWorkbench, {
      global: {
        stubs: {
          EditorCanvas: { template: '<div class="mock-canvas"></div>' },
          PropertyPanel: { template: '<div class="mock-props"></div>' },
          DisplayComponentLibrary: { template: '<div class="mock-lib"></div>' },
        },
      },
    })
    expect(wrapper.find('.editor-root').exists()).toBe(true)
  })

  it('has three-column layout', () => {
    const wrapper = mount(DisplayWorkbench, {
      global: {
        stubs: {
          EditorCanvas: { template: '<div class="mock-canvas"></div>' },
          PropertyPanel: { template: '<div class="mock-props"></div>' },
          DisplayComponentLibrary: { template: '<div class="mock-lib"></div>' },
        },
      },
    })
    expect(wrapper.find('.editor-left').exists()).toBe(true)
    expect(wrapper.find('.editor-center').exists()).toBe(true)
    expect(wrapper.find('.editor-right').exists()).toBe(true)
  })
})
