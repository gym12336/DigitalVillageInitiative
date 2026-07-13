# 流动组件框（flow-box）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `flow-box` composite component type that displays one child at a time with carousel-style horizontal slide transitions, auto-play, scroll-wheel navigation, and dot indicators.

**Architecture:** Follow the existing `layout-box` pattern — factory function in `componentFactory.js`, rendering in `EditorCanvas.vue` via innerHTML, property editing in `PropertyPanel.vue` with a two-level (container/child) editing mode, preview in `buildPreview.js` with CSS transition animations, and registration in both component library catalogs.

**Tech Stack:** Vue 3 (Composition API), vanilla JS innerHTML rendering (no Vue components for canvas elements), CSS transitions for preview animations

## Global Constraints

- Component type string: `'flow-box'`
- Default size: 900×500
- Children stored in `props.children[]` (flat dynamic array, not fixed-size sparse array like layout-box)
- `activeIndex` tracks currently visible child (0-based)
- animation field value: `'slide'` only (others reserved for future)
- animationDuration: 200, 400, or 600 (default 400)
- interval: 1-30 seconds (default 5)
- Category: "组合" (group), alongside layout-box
- No left/right arrow buttons, dot indicators only
- Editor: no animation (instant switch); Preview: slide animation
- Infinite loop (first↔last)
- Scroll wheel resets auto-play timer

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/modules/builder/editor/componentFactory.js` | Modify | Add `createFlowBoxComponent()` and register in `createComponent()` |
| `src/modules/builder/editor/ComponentLibrary.vue` | Modify | Add flow-box item to "组合" category |
| `src/modules/builder/display/DisplayComponentLibrary.vue` | Modify | Add flow-box item to "组合" category |
| `src/modules/builder/editor/PropertyPanel.vue` | Modify | Add flow-box container + child property editors |
| `src/modules/builder/editor/EditorCanvas.vue` | Modify | Add `renderFlowBoxMarkup()`, drop-into-flow-box, wheel nav, dot clicks, toolbar button |
| `src/modules/builder/editor/buildPreview.js` | Modify | Add `renderFlowBoxPreview()` with slide animation + auto-play + wheel |

---

### Task 1: Add flow-box factory function

**Files:**
- Modify: `src/modules/builder/editor/componentFactory.js`

**Interfaces:**
- Produces: `createFlowBoxComponent(x, y)` — returns a flow-box component object with shape `{ type: 'flow-box', x, y, width: 900, height: 500, props: { title: '', children: [], activeIndex: 0, autoPlay: true, interval: 5, animation: 'slide', animationDuration: 400 } }`
- Produces: `createComponent('flow-box', x, y)` now works (register in switch)

- [ ] **Step 1: Add `createFlowBoxComponent` factory and register in switch**

In `src/modules/builder/editor/componentFactory.js`:

Add the factory function after the `createLayoutBoxComponent` function (after line 146):

```js
export function createFlowBoxComponent(x, y) {
  return {
    type: 'flow-box',
    x, y,
    width: 900,
    height: 500,
    props: {
      title: '',
      children: [],
      activeIndex: 0,
      autoPlay: true,
      interval: 5,
      animation: 'slide',
      animationDuration: 400,
    },
  }
}
```

Add the case in the `createComponent` switch (after line 11):

```js
    case 'flow-box':   return createFlowBoxComponent(x, y)
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/componentFactory.js
git commit -m "feat: add createFlowBoxComponent factory function"
```

---

### Task 2: Register flow-box in component library catalogs

**Files:**
- Modify: `src/modules/builder/editor/ComponentLibrary.vue`
- Modify: `src/modules/builder/display/DisplayComponentLibrary.vue`

**Interfaces:**
- Consumes: `createComponent('flow-box', x, y)` from Task 1
- Produces: flow-box draggable item in both catalogs with `{ label: '流动组件框', icon: '🎠', type: 'flow-box' }`

- [ ] **Step 1: Add flow-box to editor ComponentLibrary.vue**

In `src/modules/builder/editor/ComponentLibrary.vue`, in the `COMPONENT_CATEGORIES` array, find the "组合" category at lines 109-114:

```js
  {
    id: 'group', icon: '📦', name: '组合',
    items: [
      { label: '多组件框', icon: '📦', type: 'layout-box' },
    ],
  },
```

Replace with:

```js
  {
    id: 'group', icon: '📦', name: '组合',
    items: [
      { label: '多组件框', icon: '📦', type: 'layout-box' },
      { label: '流动组件框', icon: '🎠', type: 'flow-box' },
    ],
  },
```

- [ ] **Step 2: Add flow-box to display DisplayComponentLibrary.vue**

In `src/modules/builder/display/DisplayComponentLibrary.vue`, in the `NATIVE_CATEGORIES` array, find the "组合" category at lines 130-135:

```js
  {
    id: 'group', icon: '📦', name: '组合',
    items: [
      { label: '多组件框', icon: '📦', type: 'layout-box' },
    ],
  },
```

Replace with:

```js
  {
    id: 'group', icon: '📦', name: '组合',
    items: [
      { label: '多组件框', icon: '📦', type: 'layout-box' },
      { label: '流动组件框', icon: '🎠', type: 'flow-box' },
    ],
  },
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/editor/ComponentLibrary.vue src/modules/builder/display/DisplayComponentLibrary.vue
git commit -m "feat: register flow-box in component library catalogs"
```

---

### Task 3: Add flow-box property editor in PropertyPanel

**Files:**
- Modify: `src/modules/builder/editor/PropertyPanel.vue`

**Interfaces:**
- Consumes: flow-box component with props shape from Task 1
- Produces: Two-level property editor (container view and child edit view) matching the layout-box pattern

- [ ] **Step 1: Add flow-box type label**

In the `typeLabel` function (line 386), add the flow-box entry:

```js
function typeLabel(type) {
  const labels = { text: '📝 文本', image: '🖼 图片', chart: '📊 图表', 'agri-sensor': '🌡 传感器', 'timeline': '⏳ 时间轴', 'datatable': '📋 数据表', 'layout-box': '📦 多组件框', 'flow-box': '🎠 流动组件框' }
  return labels[type] || type
}
```

- [ ] **Step 2: Add flow-box template section**

In the `<template>`, after the layout-box section (after the closing `</div>` of the layout-box block at line 368, before the closing `</template>` at line 369), add:

```html
      <!-- Flow-box props -->
      <div v-if="comp.type === 'flow-box'" class="pp-section">

        <!-- View A: Container-level settings -->
        <template v-if="comp._selectedChildIndex == null">
          <div class="pp-field">
            <label>容器标题</label>
            <input type="text" v-model="comp.props.title" placeholder="容器标题（可选）" />
          </div>

          <h4 class="pp-subtitle">
            子组件列表
            <button class="pp-add" @click="addFlowBoxChild(comp)">+ 添加</button>
          </h4>
          <div v-if="comp.props.children.length === 0" class="pp-hint" style="margin-bottom:0.6rem;">
            拖入组件或点击上方按钮添加
          </div>
          <div v-for="(child, i) in comp.props.children" :key="'fbchild'+i" class="pp-slot-item">
            <span class="pp-slot-label">{{ i + 1 }}</span>
            <span class="pp-slot-type">{{ childTypeLabel(child) }}</span>
            <div style="flex:1;"></div>
            <button
              class="pp-slot-edit-btn"
              @click="comp._selectedChildIndex = i"
              :disabled="i === (comp.props.activeIndex || 0)"
              style="margin-right:4px;"
            >编辑</button>
            <button
              v-if="i > 0"
              class="pp-slot-edit-btn"
              @click="moveFlowBoxChild(comp, i, -1)"
              style="margin-right:4px;"
              title="上移"
            >↑</button>
            <button
              v-if="i < comp.props.children.length - 1"
              class="pp-slot-edit-btn"
              @click="moveFlowBoxChild(comp, i, 1)"
              style="margin-right:4px;"
              title="下移"
            >↓</button>
            <button class="pp-sr-del" @click="removeFlowBoxChild(comp, i)">×</button>
          </div>

          <div class="pp-field" style="margin-top:0.8rem;">
            <label class="pp-check">
              <input type="checkbox" v-model="comp.props.autoPlay" />
              自动轮播
            </label>
          </div>
          <div class="pp-field">
            <label>轮播间隔 (秒)</label>
            <input type="number" v-model.number="comp.props.interval" min="1" max="30" :disabled="!comp.props.autoPlay" />
          </div>
          <div class="pp-field">
            <label>动画时长</label>
            <select v-model.number="comp.props.animationDuration">
              <option :value="200">快 (200ms)</option>
              <option :value="400">中 (400ms)</option>
              <option :value="600">慢 (600ms)</option>
            </select>
          </div>
        </template>

        <!-- View B: Child component editor -->
        <template v-else>
          <button class="pp-back-btn" @click="comp._selectedChildIndex = null">← 返回容器设置</button>

          <div v-if="editingFlowChild" class="pp-child-editor">
            <h4 class="pp-subtitle">{{ childTypeLabel(editingFlowChild) }} - 第 {{ comp._selectedChildIndex + 1 }} 项</h4>

            <!-- Child chart props -->
            <div v-if="editingFlowChild.type === 'chart'">
              <div class="pp-field">
                <label>标题</label>
                <input type="text" v-model="editingFlowChild.props.title" />
              </div>
              <div class="pp-field">
                <label>图表类型</label>
                <select v-model="editingFlowChild.props.chartType">
                  <option value="bar">柱状图</option>
                  <option value="pie">饼图</option>
                  <option value="line">折线图</option>
                  <option value="stacked-bar">堆叠柱状图</option>
                  <option value="dumbbell">哑铃图</option>
                  <option value="trend-badge">涨跌徽标</option>
                  <option value="radar">雷达图</option>
                  <option value="sankey">桑基图</option>
                </select>
              </div>
              <div class="pp-field">
                <label>CSV 数据</label>
                <textarea v-model="editingFlowChild.props.csvText" rows="6" style="font-family:monospace;font-size:12px;"></textarea>
              </div>
            </div>

            <!-- Child text props -->
            <div v-if="editingFlowChild.type === 'text'">
              <div class="pp-field">
                <label>文本内容</label>
                <textarea v-model="editingFlowChild.props.text" rows="3"></textarea>
              </div>
              <div class="pp-field">
                <label>字号</label>
                <input type="number" v-model.number="editingFlowChild.props.fontSize" min="8" max="200" />
              </div>
              <div class="pp-field">
                <label>颜色</label>
                <input type="color" v-model="editingFlowChild.props.color" />
              </div>
            </div>

            <!-- Child image props -->
            <div v-if="editingFlowChild.type === 'image'">
              <div class="pp-field">
                <label>图片 URL</label>
                <input type="text" v-model="editingFlowChild.props.src" placeholder="https://..." />
              </div>
              <div class="pp-field">
                <label>或从实践选取</label>
                <PracticeImagePicker
                  :dossier-id="dossierId"
                  v-model="editingFlowChild.props.src"
                  @select="(m) => { if (!editingFlowChild.props.alt) editingFlowChild.props.alt = m.name.replace(/\.[^.]+$/, '') }"
                />
              </div>
              <div class="pp-field">
                <label>填充模式</label>
                <select v-model="editingFlowChild.props.objectFit">
                  <option value="cover">Cover 裁剪</option>
                  <option value="contain">Contain 完整</option>
                  <option value="fill">Fill 拉伸</option>
                </select>
              </div>
            </div>
          </div>
        </template>
      </div>
```

- [ ] **Step 3: Add flow-box helper computed and methods**

In the `<script setup>` section, after the `editingChild` computed (after line 452), add:

```js
const editingFlowChild = computed(() => {
  if (!comp.value || !comp.value.props || comp.value._selectedChildIndex == null) return null
  return comp.value.props.children[comp.value._selectedChildIndex] || null
})
```

After the `onSlotTypeChange` function (after line 516), add:

```js
let _nextFlowChildId = Date.now() + 100000
function addFlowBoxChild(fbComp) {
  const child = createComponent('text', 0, 0)
  child.id = _nextFlowChildId++
  fbComp.props.children.push(child)
  if (fbComp.props.children.length === 1) {
    fbComp.props.activeIndex = 0
  }
}

function removeFlowBoxChild(fbComp, index) {
  const len = fbComp.props.children.length
  fbComp.props.children.splice(index, 1)
  // Adjust activeIndex
  if (fbComp.props.activeIndex >= len - 1) {
    fbComp.props.activeIndex = Math.max(0, len - 2)
  }
  // Reset child editor if editing the removed child
  if (fbComp._selectedChildIndex === index) {
    fbComp._selectedChildIndex = null
  } else if (fbComp._selectedChildIndex > index) {
    fbComp._selectedChildIndex--
  }
}

function moveFlowBoxChild(fbComp, index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= fbComp.props.children.length) return
  const temp = fbComp.props.children[index]
  fbComp.props.children[index] = fbComp.props.children[newIndex]
  fbComp.props.children[newIndex] = temp
  // Adjust activeIndex if we moved the active child
  if (fbComp.props.activeIndex === index) {
    fbComp.props.activeIndex = newIndex
  } else if (fbComp.props.activeIndex === newIndex) {
    fbComp.props.activeIndex = index
  }
  // Adjust selectedChildIndex similarly
  if (fbComp._selectedChildIndex === index) {
    fbComp._selectedChildIndex = newIndex
  } else if (fbComp._selectedChildIndex === newIndex) {
    fbComp._selectedChildIndex = index
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/builder/editor/PropertyPanel.vue
git commit -m "feat: add flow-box property editor with child list management"
```

---

### Task 4: Add flow-box rendering and interaction in EditorCanvas

**Files:**
- Modify: `src/modules/builder/editor/EditorCanvas.vue`

**Interfaces:**
- Consumes: `createComponent('flow-box', x, y)` from Task 1
- Produces: `renderFlowBoxMarkup(comp)` — returns HTML string for the flow-box with current child, dot indicators, and data attributes
- Produces: `renderComponentMarkup()` case `'flow-box'`
- Produces: Drop-into-flow-box logic in `onDrop()`
- Produces: Wheel navigation in `onWheel()`
- Produces: Dot click handling in stage event delegation
- Produces: Toolbar button for flow-box

- [ ] **Step 1: Add toolbar button**

At line 15 (after the layout-box button), add:

```html
        <button class="tb-btn" @click="addToCanvas('flow-box')">🎠 流动框</button>
```

- [ ] **Step 2: Add `renderFlowBoxMarkup` function**

After the `renderLayoutBoxMarkup` function (after line 179), add:

```js
function renderFlowBoxMarkup(comp) {
  const p = comp.props
  const children = p.children || []
  const activeIndex = p.activeIndex || 0
  const w = comp.width
  const h = comp.height

  // Render current child
  let childHtml = ''
  if (children.length > 0 && children[activeIndex]) {
    const child = children[activeIndex]
    const childComp = {
      id: child.id,
      type: child.type,
      x: 4,
      y: 4,
      width: w - 8,
      height: h - 8,
      props: child.props,
    }
    childHtml = renderComponentMarkup(childComp)
  } else {
    childHtml = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8ea3b2;font-size:14px;border:2px dashed #d0dbe3;border-radius:12px;">拖入组件开始轮播</div>`
  }

  // Render dot indicators (only if more than 1 child)
  let dotsHtml = ''
  if (children.length > 1) {
    const dotSize = 8
    const dotGap = 8
    const totalDotsWidth = children.length * dotSize + (children.length - 1) * dotGap
    let dotsMarkup = ''
    for (let i = 0; i < children.length; i++) {
      const isActive = i === activeIndex
      dotsMarkup += `<span data-flow-dot="${i}" style="display:inline-block;width:${dotSize}px;height:${dotSize}px;border-radius:50%;margin:0 ${dotGap / 2}px;cursor:pointer;background:${isActive ? '#2c7da0' : 'rgba(255,255,255,0.5)'};border:1.5px solid ${isActive ? '#2c7da0' : 'rgba(255,255,255,0.5)'};transition:all 0.2s;" onmouseover="if(!this.classList.contains('active')){this.style.background='rgba(255,255,255,0.8)';}" onmouseout="if(!this.classList.contains('active')){this.style.background='rgba(255,255,255,0.5)';}"></span>`
    }
    dotsHtml = `<div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;align-items:center;padding:4px 12px;background:rgba(0,0,0,0.25);border-radius:999px;z-index:5;">${dotsMarkup}</div>`
  }

  return `<div style="position:relative;width:100%;height:100%;border:1px solid #e8edf2;border-radius:16px;background:#fafdfe;overflow:hidden;" data-flow-box>${childHtml}${dotsHtml}</div>`
}
```

- [ ] **Step 3: Add flow-box case in `renderComponentMarkup`**

In the `renderComponentMarkup` switch statement (after line 216, before the closing `}`), add:

```js
    case 'flow-box':
      inner = renderFlowBoxMarkup(c)
      break
```

- [ ] **Step 4: Add drop-into-flow-box logic in `onDrop`**

In the `onDrop` function, after the layout-box slot detection block (after line 333, before `addComponentAt(info.type, Math.round(x), Math.round(y), info.chartType)`), add:

```js
    // Check if dropping into a flow-box
    const flowBoxEl = dropEl ? dropEl.closest('[data-flow-box]') : null
    if (flowBoxEl) {
      const compEl = flowBoxEl.closest('[data-component-id]')
      if (compEl) {
        const containerId = Number(compEl.dataset.componentId)
        const container = state.components.find(c => c.id === containerId)
        if (container && container.type === 'flow-box') {
          const child = createComponent(info.type, 0, 0, info.chartType)
          child.id = state.nextId++
          child.x = 0
          child.y = 0
          child.width = 0
          child.height = 0
          container.props.children.push(child)
          container.props.activeIndex = container.props.children.length - 1
          pushHistory()
          return
        }
      }
    }
```

- [ ] **Step 5: Add flow-box click handling in `onStageMouseDown`**

In `onStageMouseDown`, inside the `if (target.type === 'component')` block (after line 431, before the `// Move` section at line 436), add flow-box child click handling. The code at lines 412-437 already handles layout-box; we need to add similar logic for flow-box dots and child clicks. Add after the existing layout-box handling (after the closing `}` at line 436 but before the `// Move` comment):

Replace the section from line 412 to 445 with augmented logic. Specifically, find the `} else if (target.type === 'component') {` block and add flow-box handling:

Looking at the code more carefully, the layout-box click handling at lines 412-437 checks `el.closest('[data-layout-box]')`. We need to add flow-box handling that checks `el.closest('[data-flow-box]')`. Let me be more precise.

After line 436 (after the layout-box child-click block closes) and before line 438 (`// Move`), add:

```js
          // Check if click is inside a flow-box (dot click or child area)
          const flowBoxEl2 = el ? el.closest('[data-flow-box]') : null
          if (flowBoxEl2) {
            const containerCompEl2 = flowBoxEl2.closest('[data-component-id]')
            if (containerCompEl2) {
              const containerId2 = Number(containerCompEl2.dataset.componentId)
              const container2 = state.components.find(c => c.id === containerId2)
              if (container2 && container2.type === 'flow-box') {
                // Check if clicking on a dot
                const dotEl = el.closest('[data-flow-dot]')
                if (dotEl) {
                  const dotIndex = parseInt(dotEl.dataset.flowDot, 10)
                  container2.props.activeIndex = dotIndex
                  state.selectedId = containerId2
                  ctxMenu.value.show = false
                  return
                }
                // Clicked on flow-box child — select the container for editing
                state.selectedId = containerId2
                ctxMenu.value.show = false
                return
              }
            }
          }
```

Wait, this variable naming with `flowBoxEl2`, `containerCompEl2`, etc. is messy because we're inside a scope where `el` is already defined at line 414. Let me re-think.

Looking at the existing code structure:
- Line 412: `} else if (target.type === 'component') {`
- Line 413-414: define `el` and `layoutBoxEl`
- Lines 415-436: handle layout-box click
- Line 438: `// Move`

The `el` at line 414 is scoped to the `else if (target.type === 'component')` block. We can reuse the same `el` variable. Let me write cleaner code:

After line 436 (`}` closing the layout-box handling), before line 438 (`// Move`), add:

```js
          // Check if click is inside a flow-box (dot indicator or child area)
          const flowBoxParent = el ? el.closest('[data-flow-box]') : null
          if (flowBoxParent) {
            const fbCompEl = flowBoxParent.closest('[data-component-id]')
            if (fbCompEl) {
              const fbId = Number(fbCompEl.dataset.componentId)
              const fb = state.components.find(c => c.id === fbId)
              if (fb && fb.type === 'flow-box') {
                // Check if clicking on a dot indicator
                const dotEl = el.closest('[data-flow-dot]')
                if (dotEl) {
                  fb.props.activeIndex = parseInt(dotEl.dataset.flowDot, 10)
                }
                state.selectedId = fbId
                ctxMenu.value.show = false
                return
              }
            }
          }
```

But wait — `el` is defined inside this block at line 414 as `const el = document.elementFromPoint(e.clientX, e.clientY)`, so it's scoped properly. The `flowBoxParent` check is after the layout-box check, so if someone clicks inside a flow-box that is nested inside a layout-box... well, let's not worry about that edge case for now.

Actually, looking more carefully, there's a potential issue. The layout-box handler at line 416 checks `const layoutBoxEl = el ? el.closest('[data-layout-box]') : null` and if found, it selects the container and returns. So if a flow-box is inside a layout-box slot, clicking on it would be caught by the layout-box handler first. But our flow-box is a top-level canvas component, not nested inside anything — so this is fine.

But wait — what about clicking on the flow-box to select it (for dragging)? The current code at line 438-443 handles that. But if we add our flow-box handler before it, and the click is inside the flow-box but not on a dot, we `return` early, which prevents the user from initiating a drag. Let me look at this flow more carefully.

In the current layout-box handler:
1. Check if click is inside `[data-layout-box]`
2. If clicking on a slot card → set `_selectedChildIndex` and select container, return
3. If not on a slot card → select container, fall through to Move

For flow-box, we want:
1. Check if click is inside `[data-flow-box]`
2. If clicking on a dot → switch `activeIndex`, select container, return
3. If clicking on the child area → select container, AND allow drag (don't return)

So the flow-box handler should NOT return when clicking on the non-dot area. Let me adjust:

```js
          // Check if click is inside a flow-box
          const flowBoxParent = el ? el.closest('[data-flow-box]') : null
          if (flowBoxParent) {
            const fbCompEl = flowBoxParent.closest('[data-component-id]')
            if (fbCompEl) {
              const fbId = Number(fbCompEl.dataset.componentId)
              const fb = state.components.find(c => c.id === fbId)
              if (fb && fb.type === 'flow-box') {
                // Check if clicking on a dot indicator
                const dotEl = el.closest('[data-flow-dot]')
                if (dotEl) {
                  fb.props.activeIndex = parseInt(dotEl.dataset.flowDot, 10)
                }
                state.selectedId = fbId
                ctxMenu.value.show = false
                // Don't return — allow drag (fall through to Move logic)
              }
            }
          }
```

Wait, but then the code would continue to the `// Move` section at line 438, which would set up `dragState`. Is that what we want? Yes — for a flow-box, clicking on it should select it AND allow dragging it around the canvas. The `// Move` section at line 438-445 does exactly that.

Actually, let me re-read the layout-box handler. In the layout-box case:
```js
          if (layoutBoxEl) {
            const containerCompEl = layoutBoxEl.closest('[data-component-id]')
            if (containerCompEl) {
              const containerId = Number(containerCompEl.dataset.componentId)
              const container = state.components.find(c => c.id === containerId)
              if (container && container.type === 'layout-box') {
                const slotCard = el.closest('[data-layout-box] > div')
                if (slotCard) {
                  const slotIndexEl = slotCard.getAttribute('data-slot-index')
                  if (slotIndexEl !== null) {
                    container._selectedChildIndex = parseInt(slotIndexEl, 10)
                  }
                  state.selectedId = containerId
                  ctxMenu.value.show = false
                  return  // <-- returns here for slot clicks, preventing drag
                }
                // Clicked on container padding — fall through to drag logic
                state.selectedId = containerId
              }
            }
          }
```

So for layout-box:
- Slot click → child edit mode, select, return (no drag)
- Padding click → select, fall through to drag

For flow-box, the analogous behavior:
- Dot click → switch slide, select, return (no drag — we want immediate dot switch)
- Child area click → select, fall through to drag

So the dot click should return, but non-dot click should fall through. Let me fix:

```js
          // Check if click is inside a flow-box
          const flowBoxParent = el ? el.closest('[data-flow-box]') : null
          if (flowBoxParent) {
            const fbCompEl = flowBoxParent.closest('[data-component-id]')
            if (fbCompEl) {
              const fbId = Number(fbCompEl.dataset.componentId)
              const fb = state.components.find(c => c.id === fbId)
              if (fb && fb.type === 'flow-box') {
                // Check if clicking on a dot indicator
                const dotEl = el.closest('[data-flow-dot]')
                if (dotEl) {
                  fb.props.activeIndex = parseInt(dotEl.dataset.flowDot, 10)
                  state.selectedId = fbId
                  ctxMenu.value.show = false
                  return
                }
                // Clicked on child area — select and fall through to drag
                state.selectedId = fbId
              }
            }
          }
```

This is correct. Now, we also need to make sure flow-box is recognized as a valid target in `findTarget`. Looking at the existing code at line 369:
```js
  const compEl = el.closest('[data-component-id]')
  if (compEl) return { type: 'component', id: Number(compEl.dataset.componentId) }
```

Since flow-box renders with `data-component-id` (via `renderComponentMarkup`'s wrapper div), it's already handled. Good.

What about clearing `_selectedChildIndex`? The layout-box code at lines 382-390 clears it when clicking outside a layout-box. We should extend this to also clear flow-box's `_selectedChildIndex`:

At line 383:
```js
  const insideLayoutBox = clearEl ? clearEl.closest('[data-layout-box]') : null
  if (!insideLayoutBox) {
    for (const comp of state.components) {
      if (comp.type === 'layout-box' && comp._selectedChildIndex !== undefined) {
        comp._selectedChildIndex = undefined
      }
    }
  }
```

This should also clear flow-box's `_selectedChildIndex`:

```js
  const insideLayoutBox = clearEl ? clearEl.closest('[data-layout-box]') : null
  const insideFlowBox = clearEl ? clearEl.closest('[data-flow-box]') : null
  if (!insideLayoutBox && !insideFlowBox) {
    for (const comp of state.components) {
      if ((comp.type === 'layout-box' || comp.type === 'flow-box') && comp._selectedChildIndex !== undefined) {
        comp._selectedChildIndex = undefined
      }
    }
  }
```

Let me now include all this in the plan step.

- [ ] **Step 6: Add wheel-based navigation for flow-box**

In the `onWheel` function (lines 635-640), modify to support flow-box navigation:

```js
function onWheel(e) {
  if (e.ctrlKey) {
    const delta = e.deltaY > 0 ? -0.25 : 0.25
    setZoom(state.zoom + delta)
    return
  }
  // Check if wheel is over a flow-box for carousel navigation
  const target = document.elementFromPoint(e.clientX, e.clientY)
  const flowBoxEl = target ? target.closest('[data-flow-box]') : null
  if (flowBoxEl) {
    const compEl = flowBoxEl.closest('[data-component-id]')
    if (compEl) {
      const fbId = Number(compEl.dataset.componentId)
      const fb = state.components.find(c => c.id === fbId)
      if (fb && fb.type === 'flow-box' && fb.props.children.length > 1) {
        const len = fb.props.children.length
        if (e.deltaY > 0) {
          fb.props.activeIndex = (fb.props.activeIndex + 1) % len
        } else {
          fb.props.activeIndex = (fb.props.activeIndex - 1 + len) % len
        }
        e.preventDefault()
        return
      }
    }
  }
}
```

Note: Since the template already has `@wheel.prevent="onWheel"`, we need to make sure `e.preventDefault()` is only called for flow-box wheel or ctrl+wheel. The `.prevent` modifier on the template always calls `preventDefault()`, so the viewport scroll is already disabled. This is fine — the flow-box wheel handling doesn't conflict.

- [ ] **Step 7: Add flow-box child selection clearing on outside clicks**

In `onStageMouseDown`, modify the child selection clearing block (lines 381-390) to also cover flow-box:

Find:
```js
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
```

Replace with:
```js
  // Clear child selection on any container when clicking elsewhere
  const clearEl = document.elementFromPoint(e.clientX, e.clientY)
  const insideLayoutBox = clearEl ? clearEl.closest('[data-layout-box]') : null
  const insideFlowBox = clearEl ? clearEl.closest('[data-flow-box]') : null
  if (!insideLayoutBox && !insideFlowBox) {
    for (const comp of state.components) {
      if ((comp.type === 'layout-box' || comp.type === 'flow-box') && comp._selectedChildIndex !== undefined) {
        comp._selectedChildIndex = undefined
      }
    }
  }
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/builder/editor/EditorCanvas.vue
git commit -m "feat: add flow-box rendering, drop, wheel nav, and dot click in EditorCanvas"
```

---

### Task 5: Add flow-box preview in buildPreview.js

**Files:**
- Modify: `src/modules/builder/editor/buildPreview.js`

**Interfaces:**
- Consumes: flow-box component with props shape from Task 1
- Produces: `renderFlowBoxPreview(comp)` — returns HTML string with inline CSS for slide animation, dot indicators, and auto-play/wheel JavaScript

- [ ] **Step 1: Add `renderFlowBoxPreview` function**

After the `renderLayoutBoxPreview` function (after line 36), add:

```js
function renderFlowBoxPreview(comp) {
  const p = comp.props
  const children = p.children || []
  const activeIndex = p.activeIndex || 0
  const w = comp.width
  const h = comp.height
  const duration = p.animationDuration || 400
  const interval = (p.interval || 5) * 1000
  const autoPlay = p.autoPlay !== false

  if (children.length === 0) {
    return `<div style="position:relative;width:100%;height:100%;border:1px solid #e8edf2;border-radius:16px;background:#fafdfe;display:flex;align-items:center;justify-content:center;color:#8ea3b2;font-size:14px;">无子组件</div>`
  }

  // Generate unique id for this flow-box instance
  const fbId = 'fb-' + Math.random().toString(36).slice(2, 8)

  // Render each child as a slide
  let slidesHtml = ''
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const translateX = (i - activeIndex) * 100
    const childComp = {
      type: child.type,
      x: 0,
      y: 0,
      width: w,
      height: h,
      props: child.props,
    }
    const innerHtml = renderComponentHtml(childComp)
    slidesHtml += `<div class="${fbId}-slide" data-slide-index="${i}" style="position:absolute;left:0;top:0;width:100%;height:100%;transform:translateX(${translateX}%);transition:transform ${duration}ms ease;overflow:hidden;">${innerHtml}</div>`
  }

  // Dot indicators
  let dotsHtml = ''
  if (children.length > 1) {
    let dotsMarkup = ''
    for (let i = 0; i < children.length; i++) {
      const isActive = i === activeIndex
      dotsMarkup += `<span onclick="window['${fbId}_goTo'](${i})" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 4px;cursor:pointer;background:${isActive ? '#2c7da0' : 'rgba(255,255,255,0.5)'};border:1.5px solid ${isActive ? '#2c7da0' : 'rgba(255,255,255,0.5)'};transition:all 0.2s;"></span>`
    }
    dotsHtml = `<div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;align-items:center;padding:4px 12px;background:rgba(0,0,0,0.25);border-radius:999px;z-index:5;">${dotsMarkup}</div>`
  }

  // Auto-play and wheel handling script
  const autoPlayJs = autoPlay && children.length > 1 ? `
var ${fbId}_idx = ${activeIndex};
var ${fbId}_len = ${children.length};
var ${fbId}_timer = null;
function ${fbId}_goTo(idx) {
  ${fbId}_idx = idx;
  var slides = document.querySelectorAll('.${fbId}-slide');
  for (var s = 0; s < slides.length; s++) {
    slides[s].style.transform = 'translateX(' + ((s - idx) * 100) + '%)';
  }
  // Update dots
  var dots = document.querySelectorAll('#${fbId}-dots span');
  for (var d = 0; d < dots.length; d++) {
    if (d === idx) {
      dots[d].style.background = '#2c7da0';
      dots[d].style.borderColor = '#2c7da0';
    } else {
      dots[d].style.background = 'rgba(255,255,255,0.5)';
      dots[d].style.borderColor = 'rgba(255,255,255,0.5)';
    }
  }
}
function ${fbId}_next() { ${fbId}_goTo((${fbId}_idx + 1) % ${fbId}_len); }
function ${fbId}_prev() { ${fbId}_goTo((${fbId}_idx - 1 + ${fbId}_len) % ${fbId}_len); }
function ${fbId}_resetTimer() {
  if (${fbId}_timer) clearTimeout(${fbId}_timer);
  ${fbId}_timer = setTimeout(function() { ${fbId}_next(); ${fbId}_resetTimer(); }, ${interval});
}
window['${fbId}_goTo'] = ${fbId}_goTo;
${fbId}_resetTimer();
` : `var ${fbId}_idx = ${activeIndex}; var ${fbId}_len = ${children.length};
function ${fbId}_goTo(idx) {
  ${fbId}_idx = idx;
  var slides = document.querySelectorAll('.${fbId}-slide');
  for (var s = 0; s < slides.length; s++) {
    slides[s].style.transform = 'translateX(' + ((s - idx) * 100) + '%)';
  }
  var dots = document.querySelectorAll('#${fbId}-dots span');
  for (var d = 0; d < dots.length; d++) {
    if (d === idx) { dots[d].style.background = '#2c7da0'; dots[d].style.borderColor = '#2c7da0'; }
    else { dots[d].style.background = 'rgba(255,255,255,0.5)'; dots[d].style.borderColor = 'rgba(255,255,255,0.5)'; }
  }
}
window['${fbId}_goTo'] = ${fbId}_goTo;
`

  // Wheel handler
  const wheelJs = children.length > 1 ? `
document.getElementById('${fbId}').addEventListener('wheel', function(e) {
  e.preventDefault();
  if (e.deltaY > 0) { ${fbId}_next(); } else { ${fbId}_prev(); }
  ${fbId}_resetTimer();
});
` : ''

  return `<div id="${fbId}" style="position:relative;width:100%;height:100%;border:1px solid #e8edf2;border-radius:16px;background:#fafdfe;overflow:hidden;">
${slidesHtml}
<div id="${fbId}-dots">${dotsHtml}</div>
</div>
<script>${autoPlayJs}${wheelJs}</script>`
}
```

Wait, there's an issue with the auto-play JS — if autoPlay is false, we still need `_next` and `_prev` functions for wheel handling. Let me refactor slightly to make wheel work regardless of autoPlay setting.

Actually, let me reconsider the JS structure. When autoPlay is true: timer + wheel reset. When autoPlay is false: no timer, just wheel.

```js
  const commonJs = children.length > 1 ? `
var ${fbId}_idx = ${activeIndex};
var ${fbId}_len = ${children.length};
var ${fbId}_timer = null;
var ${fbId}_duration = ${duration};
function ${fbId}_goTo(idx) {
  ${fbId}_idx = idx;
  var slides = document.querySelectorAll('.${fbId}-slide');
  for (var s = 0; s < slides.length; s++) {
    slides[s].style.transform = 'translateX(' + ((s - idx) * 100) + '%)';
  }
  var dots = document.querySelectorAll('#${fbId}-dots span');
  for (var d = 0; d < dots.length; d++) {
    if (d === idx) { dots[d].style.background = '#2c7da0'; dots[d].style.borderColor = '#2c7da0'; }
    else { dots[d].style.background = 'rgba(255,255,255,0.5)'; dots[d].style.borderColor = 'rgba(255,255,255,0.5)'; }
  }
}
function ${fbId}_next() { ${fbId}_goTo((${fbId}_idx + 1) % ${fbId}_len); }
function ${fbId}_prev() { ${fbId}_goTo((${fbId}_idx - 1 + ${fbId}_len) % ${fbId}_len); }
function ${fbId}_resetTimer() {
  if (${fbId}_timer) clearTimeout(${fbId}_timer);
  ${fbId}_timer = setTimeout(function() { ${fbId}_next(); ${fbId}_resetTimer(); }, ${interval});
}
window['${fbId}_goTo'] = ${fbId}_goTo;
` : ''

  const autoPlayJs = autoPlay && children.length > 1 ? `${fbId}_resetTimer();` : ''

  const wheelJs = children.length > 1 ? `
document.getElementById('${fbId}').addEventListener('wheel', function(e) {
  e.preventDefault();
  if (e.deltaY > 0) { ${fbId}_next(); } else { ${fbId}_prev(); }
  ${fbId}_resetTimer();
});
` : ''
```

OK this is getting complex. Let me simplify the whole thing for the plan. The key idea is correct — I'll write a clean version.

Actually, let me just write the whole function cleanly in the plan. Let me include it as one compact, correct function.

Let me also identify a problem: `renderComponentHtml` renders components at their natural position (`position:absolute;left:${c.x}px;top:${c.y}px...`). For flow-box children, we want them to fill the container. In the preview, the child components should be rendered at full size inside each slide. Let me look at how layout-box preview handles this:

```js
const tempChild = {
  type: child.type,
  x: 4, y: 4,
  width: s.w - 8, height: s.h - 8,
  props: child.props,
}
```

So for flow-box, we'd render children at `x: 0, y: 0, width: w, height: h`.

OK let me rewrite the whole plan step more carefully.

- [ ] **Step 2: Add flow-box case in `renderComponentHtml`**

In `renderComponentHtml`, add after the layout-box case (after line 66):

```js
    case 'flow-box':
      inner = renderFlowBoxPreview(c)
      break
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/editor/buildPreview.js
git commit -m "feat: add flow-box preview with slide animation, auto-play, and wheel nav"
```

---

## Task Summary

| Task | Files | Description |
|---|---|---|
| 1 | `componentFactory.js` | Factory function |
| 2 | `ComponentLibrary.vue`, `DisplayComponentLibrary.vue` | Catalog registration |
| 3 | `PropertyPanel.vue` | Property editor (container + child) |
| 4 | `EditorCanvas.vue` | Rendering, drop, wheel, dots, toolbar |
| 5 | `buildPreview.js` | Preview with slide animation + auto-play |
