# Timeline Event Popup Child Component — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hidden child component to each timeline event that pops up on hover.

**Architecture:** Each event gains `child` (a standard component object), `popupWidth`, and `popupHeight` fields. PropertyPanel gets a View A/B toggle pattern (same as layout-box/flow-box) for editing the child. timelineRenderer renders the popup as a CSS-hover-triggered positioned div with shadow + transition.

**Tech Stack:** Vue 3 (Composition API), vanilla JS

## Global Constraints

- Child component types: text, image, chart, agri-sensor, timeline, datatable (no layout-box, flow-box)
- Popup trigger: hover (CSS `:hover`)
- Popup style: white bg, rounded corners, `box-shadow: 0 4px 24px rgba(0,0,0,0.15)`, ~200ms opacity+transform transition
- Default popup: 280×200
- Positioning: to the right of event card; flip left if near right edge

---

### Task 1: Update componentFactory.js

**Files:**
- Modify: `src/modules/builder/editor/componentFactory.js`

**Interfaces:**
- Produces: `createEmptyChildComponent(type)` — takes `'text'|'image'|'chart'|'agri-sensor'|'timeline'|'datatable'`, returns a component object with `x:0, y:0` and sensible defaults
- Modifies: `createTimelineComponent()` — default events gain `child: null, popupWidth: 280, popupHeight: 200`

- [ ] **Step 1: Add `createEmptyChildComponent` function**

Append after `createFlowBoxComponent`:

```js
export function createEmptyChildComponent(type) {
  const defaults = {
    text:        { width: 200, height: 60,  props: { text: '文本内容', fontSize: 16, color: '#1f2937', fontWeight: 400, textAlign: 'center', backgroundColor: 'transparent' } },
    image:       { width: 240, height: 160, props: { src: '', alt: '', objectFit: 'cover', borderRadius: 4 } },
    chart:       { width: 260, height: 180, props: { title: '', chartType: 'bar', csvText: 'label,value\nA,30\nB,50\nC,20', labelColumn: 'label', valueColumn: 'value' } },
    'agri-sensor': { width: 240, height: 200, props: { title: '', sensors: [{ name: '温度', value: 26.5, unit: '°C', status: 'normal' }] } },
    timeline:    { width: 300, height: 220, props: { title: '', events: [{ date: '', title: '', description: '' }] } },
    datatable:   { width: 280, height: 180, props: { title: '', columns: ['列1'], rows: [['']] } },
  }
  const d = defaults[type]
  if (!d) throw new Error(`Unknown child component type: ${type}`)
  return { type, x: 0, y: 0, width: d.width, height: d.height, props: JSON.parse(JSON.stringify(d.props)) }
}
```

- [ ] **Step 2: Update `createTimelineComponent` default events**

Replace the `events` array in `createTimelineComponent`:

```js
// Before:
events: [
  { date: '2020-03', title: '事件标题', description: '事件描述' },
  ...
]

// After:
events: [
  { date: '2020-03', title: '事件标题', description: '事件描述', child: null, popupWidth: 280, popupHeight: 200 },
  { date: '2021-06', title: '事件标题', description: '事件描述', child: null, popupWidth: 280, popupHeight: 200 },
  { date: '2022-12', title: '事件标题', description: '事件描述', child: null, popupWidth: 280, popupHeight: 200 },
]
```

- [ ] **Step 3: Verify file parses correctly**

```bash
node -e "import('./src/modules/builder/editor/componentFactory.js').then(m => { console.log('OK'); const c = m.createTimelineComponent(0,0); console.log(JSON.stringify(c.props.events[0])); })"
```

Expected: `{"date":"2020-03","title":"事件标题","description":"事件描述","child":null,"popupWidth":280,"popupHeight":200}`

- [ ] **Step 4: Commit**

```bash
git add src/modules/builder/editor/componentFactory.js
git commit -m "feat: add createEmptyChildComponent helper and update timeline event defaults"
```

---

### Task 2: Update PropertyPanel — Timeline child editing

**Files:**
- Modify: `src/modules/builder/editor/PropertyPanel.vue`

**Interfaces:**
- Consumes: `createEmptyChildComponent` from `componentFactory.js`
- Modifies: `editingChild` computed, `addTimelineEvent`, timeline template section

- [ ] **Step 1: Add import for `createEmptyChildComponent`**

At the top of `<script setup>`, add to the existing import from `componentFactory.js`:

```js
import { createComponent, createEmptyChildComponent } from './componentFactory.js'
```

Note: `createComponent` is already imported. Change the import line (around line 583) to include the new export.

- [ ] **Step 2: Update `addTimelineEvent` function**

Replace the existing `addTimelineEvent` function (around line 760):

```js
function addTimelineEvent(comp) {
  comp.props.events.push({ date: '', title: '', description: '', child: null, popupWidth: 280, popupHeight: 200 })
}
```

- [ ] **Step 3: Update `removeTimelineEvent` function**

Add cleanup: if the removed event was being edited, reset `_selectedChildIndex`:

```js
function removeTimelineEvent(comp, i) {
  if (comp.props.events.length > 1) {
    comp.props.events.splice(i, 1)
    if (comp._selectedChildIndex === i) {
      comp._selectedChildIndex = null
    } else if (comp._selectedChildIndex > i) {
      comp._selectedChildIndex--
    }
  }
}
```

- [ ] **Step 4: Update `editingChild` computed to handle timeline**

Replace the `editingChild` computed (around line 635):

```js
const editingChild = computed(() => {
  if (!comp.value || !comp.value.props || comp.value._selectedChildIndex == null) return null
  if (comp.value.type === 'timeline') {
    const ev = comp.value.props.events[comp.value._selectedChildIndex]
    return ev ? ev.child : null
  }
  // layout-box and flow-box: child is in props.children array
  if (comp.value.props.children) {
    return comp.value.props.children[comp.value._selectedChildIndex] || null
  }
  return null
})
```

- [ ] **Step 5: Replace the timeline template section**

Replace lines 187–205 (the entire `<!-- Timeline props -->` block):

```html
      <!-- Timeline props -->
      <div v-if="comp.type === 'timeline'" class="pp-section">

        <!-- View A: Event list -->
        <template v-if="comp._selectedChildIndex == null">
          <div class="pp-field">
            <label>标题</label>
            <input type="text" v-model="comp.props.title" />
          </div>
          <h4 class="pp-subtitle">
            事件列表
            <button class="pp-add" @click="addTimelineEvent(comp)">+ 添加事件</button>
          </h4>
          <div v-for="(ev, i) in comp.props.events" :key="i" class="pp-timeline-row">
            <div class="pp-timeline-fields">
              <input type="text" v-model="ev.date" placeholder="日期" class="pp-tl-date" />
              <input type="text" v-model="ev.title" placeholder="标题" class="pp-tl-title" />
            </div>
            <textarea v-model="ev.description" placeholder="描述" rows="2" class="pp-tl-desc"></textarea>
            <button class="pp-sr-del" @click="removeTimelineEvent(comp, i)">×</button>

            <!-- Child config row -->
            <div class="pp-tl-child-row">
              <select
                :value="ev.child ? (ev.child.type === 'chart' ? 'chart:' + (ev.child.props.chartType || 'bar') : ev.child.type) : ''"
                class="pp-tl-child-select"
                @change="onTimelineChildTypeChange(comp, i, $event.target.value)"
              >
                <option value="">无关联组件</option>
                <option value="text">文本</option>
                <option value="image">图片</option>
                <option value="chart:bar">图表-柱状图</option>
                <option value="chart:pie">图表-饼图</option>
                <option value="chart:line">图表-折线图</option>
                <option value="chart:dumbbell">图表-哑铃图</option>
                <option value="chart:trend-badge">图表-涨跌徽标</option>
                <option value="chart:radar">图表-雷达图</option>
                <option value="chart:sankey">图表-桑基图</option>
                <option value="agri-sensor">传感器</option>
                <option value="timeline">时间轴</option>
                <option value="datatable">数据表</option>
              </select>
              <span class="pp-tl-size">
                <input type="number" v-model.number="ev.popupWidth" min="100" max="600" class="pp-tl-size-input" title="弹出宽度" />
                ×
                <input type="number" v-model.number="ev.popupHeight" min="80" max="500" class="pp-tl-size-input" title="弹出高度" />
              </span>
              <button
                v-if="ev.child"
                class="pp-slot-edit-btn"
                @click="comp._selectedChildIndex = i"
              >编辑</button>
            </div>
          </div>
        </template>

        <!-- View B: Child editor (reuses existing editingChild computed and child-editor template) -->
        <template v-else>
          <button class="pp-back-btn" @click="comp._selectedChildIndex = null">← 返回事件列表</button>

          <div v-if="editingChild" class="pp-child-editor">
            <h4 class="pp-subtitle">{{ childTypeLabel(editingChild) }} - 事件 {{ comp._selectedChildIndex + 1 }}</h4>

            <!-- Child chart props -->
            <div v-if="editingChild.type === 'chart'">
              <div class="pp-field">
                <label>标题</label>
                <input type="text" v-model="editingChild.props.title" />
              </div>
              <div class="pp-field">
                <label>图表类型</label>
                <select v-model="editingChild.props.chartType">
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
                <textarea v-model="editingChild.props.csvText" rows="6" style="font-family:monospace;font-size:12px;"></textarea>
              </div>
            </div>

            <!-- Child text props -->
            <div v-if="editingChild.type === 'text'">
              <div class="pp-field">
                <label>文本内容</label>
                <textarea v-model="editingChild.props.text" rows="3"></textarea>
              </div>
              <div class="pp-field">
                <label>字号</label>
                <input type="number" v-model.number="editingChild.props.fontSize" min="8" max="200" />
              </div>
              <div class="pp-field">
                <label>颜色</label>
                <input type="color" v-model="editingChild.props.color" />
              </div>
            </div>

            <!-- Child image props -->
            <div v-if="editingChild.type === 'image'">
              <div class="pp-field">
                <label>图片 URL</label>
                <input type="text" v-model="editingChild.props.src" placeholder="https://..." />
              </div>
              <div class="pp-field">
                <label>填充模式</label>
                <select v-model="editingChild.props.objectFit">
                  <option value="cover">Cover 裁剪</option>
                  <option value="contain">Contain 完整</option>
                  <option value="fill">Fill 拉伸</option>
                </select>
              </div>
            </div>

            <!-- Child sensor props -->
            <div v-if="editingChild.type === 'agri-sensor'">
              <div class="pp-field">
                <label>标题</label>
                <input type="text" v-model="editingChild.props.title" />
              </div>
              <h4 class="pp-subtitle">
                传感器
                <button class="pp-add" @click="addSensor(editingChild)">+ 添加</button>
              </h4>
              <div v-for="(s, si) in editingChild.props.sensors" :key="si" class="pp-timeline-row">
                <div class="pp-timeline-fields">
                  <input type="text" v-model="s.name" placeholder="名称" class="pp-tl-date" />
                  <input type="number" v-model.number="s.value" placeholder="值" class="pp-tl-title" />
                  <input type="text" v-model="s.unit" placeholder="单位" style="width:50px;" />
                </div>
                <select v-model="s.status" style="width:100%;margin-top:4px;">
                  <option value="normal">正常</option>
                  <option value="warning">警告</option>
                  <option value="danger">危险</option>
                </select>
                <button v-if="editingChild.props.sensors.length > 1" class="pp-sr-del" @click="removeSensor(editingChild, si)">×</button>
              </div>
            </div>

            <!-- Child timeline props -->
            <div v-if="editingChild.type === 'timeline'">
              <div class="pp-field">
                <label>标题</label>
                <input type="text" v-model="editingChild.props.title" />
              </div>
              <h4 class="pp-subtitle">
                事件列表
                <button class="pp-add" @click="addTimelineEvent(editingChild)">+ 添加事件</button>
              </h4>
              <div v-for="(ev, i) in editingChild.props.events" :key="i" class="pp-timeline-row">
                <div class="pp-timeline-fields">
                  <input type="text" v-model="ev.date" placeholder="日期" class="pp-tl-date" />
                  <input type="text" v-model="ev.title" placeholder="标题" class="pp-tl-title" />
                </div>
                <textarea v-model="ev.description" placeholder="描述" rows="2" class="pp-tl-desc"></textarea>
                <button v-if="editingChild.props.events.length > 1" class="pp-sr-del" @click="removeTimelineEvent(editingChild, i)">×</button>
              </div>
            </div>

            <!-- Child datatable props -->
            <div v-if="editingChild.type === 'datatable'">
              <div class="pp-field">
                <label>标题</label>
                <input type="text" v-model="editingChild.props.title" />
              </div>
              <h4 class="pp-subtitle">
                列定义
                <button class="pp-add" @click="addDatatableColumn(editingChild)">+ 添加列</button>
              </h4>
              <div class="pp-dt-columns">
                <div v-for="(col, ci) in editingChild.props.columns" :key="'col'+ci" class="pp-dt-col-item">
                  <input type="text" v-model="editingChild.props.columns[ci]" placeholder="列名" class="pp-dt-col-input" />
                  <button v-if="editingChild.props.columns.length > 1" class="pp-sr-del" @click="removeDatatableColumn(editingChild, ci)">×</button>
                </div>
              </div>
              <h4 class="pp-subtitle">
                数据行
                <button class="pp-add" @click="addDatatableRow(editingChild)">+ 添加行</button>
              </h4>
              <div v-for="(row, ri) in editingChild.props.rows" :key="'row'+ri" class="pp-timeline-row">
                <div class="pp-dt-cells">
                  <input v-for="(col, ci) in editingChild.props.columns" :key="ci" type="text" v-model="editingChild.props.rows[ri][ci]" :placeholder="col" class="pp-dt-cell" />
                </div>
                <button v-if="editingChild.props.rows.length > 1" class="pp-sr-del" @click="removeDatatableRow(editingChild, ri)">×</button>
              </div>
            </div>
          </div>
        </template>
      </div>
```

- [ ] **Step 6: Add `onTimelineChildTypeChange` function**

Add the helper function in the `<script setup>` section, after `removeTimelineEvent`:

```js
function onTimelineChildTypeChange(comp, eventIndex, typeVal) {
  if (!typeVal) {
    comp.props.events[eventIndex].child = null
    return
  }
  let type = typeVal
  let chartType = 'bar'
  if (typeVal.startsWith('chart:')) {
    type = 'chart'
    chartType = typeVal.slice(6)
  }
  const child = createEmptyChildComponent(type)
  if (type === 'chart') {
    child.props.chartType = chartType
  }
  comp.props.events[eventIndex].child = child
}
```

- [ ] **Step 7: Add CSS styles for the new timeline child config row**

In `<style scoped>`, after the existing `.pp-tl-desc` style block (around line 912), add:

```css
/* Timeline child config */
.pp-tl-child-row {
  display: flex; align-items: center; gap: 4px; margin-top: 4px;
  padding-top: 4px; border-top: 1px dashed var(--color-border-light);
}
.pp-tl-child-select {
  flex: 1; font-size: 0.72rem; padding: 2px 4px;
  border: 1px solid var(--color-border-light); border-radius: 6px;
  background: var(--color-bg); color: var(--color-text);
}
.pp-tl-size {
  display: flex; align-items: center; gap: 2px;
  font-size: 0.68rem; color: var(--color-text-light);
}
.pp-tl-size-input {
  width: 48px; font-size: 0.68rem; padding: 2px 4px;
  border: 1px solid var(--color-border-light); border-radius: 4px;
  background: var(--color-bg); color: var(--color-text); text-align: center;
}
```

- [ ] **Step 8: Verify the PropertyPanel compiles**

```bash
cd c:/Users/ALICE/Desktop/DigitalVillageInitiative && npx vue-tsc --noEmit src/modules/builder/editor/PropertyPanel.vue 2>&1 || echo "(check for template/script errors)"
```

Expected: No fatal errors (some type warnings on existing code are OK)

- [ ] **Step 9: Commit**

```bash
git add src/modules/builder/editor/PropertyPanel.vue
git commit -m "feat: add timeline event child component editing UI in PropertyPanel"
```

---

### Task 3: Update timelineRenderer — Popup rendering

**Files:**
- Modify: `src/modules/builder/editor/timelineRenderer.js`

**Interfaces:**
- Consumes: `renderComponentHtml` (internal — same file in `buildPreview.js`; for the renderer, inline the child render)
- Produces: Updated `renderTimelineMarkup` with popup HTML

- [ ] **Step 1: Add a local `renderChildHtml` helper**

Append after the existing `esc` function (after line 11):

```js
function renderChildHtml(child, w, h) {
  if (!child) return ''
  const p = child.props || {}
  let inner = ''
  switch (child.type) {
    case 'text':
      inner = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;font-size:${p.fontSize || 14}px;color:${p.color || '#1f2937'};font-weight:${p.fontWeight || 400};text-align:${p.textAlign || 'center'};background:${p.backgroundColor || 'transparent'};border-radius:4px;overflow:hidden;word-wrap:break-word;">${esc(p.text || '')}</div>`
      break
    case 'image':
      if (p.src) {
        inner = `<img src="${esc(p.src)}" alt="${esc(p.alt || '')}" draggable="false" style="width:100%;height:100%;object-fit:${p.objectFit || 'cover'};border-radius:${p.borderRadius || 0}px;"/>`
      } else {
        inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:#f2f6f8;color:#687b8b;font-size:12px;">图片占位</div>`
      }
      break
    case 'chart':
      inner = renderChartSvg({ type: 'chart', x: 0, y: 0, width: w, height: h, props: p })
      break
    case 'agri-sensor':
      inner = renderSensorMarkup({ type: 'agri-sensor', x: 0, y: 0, width: w, height: h, props: p })
      break
    case 'timeline':
      inner = renderTimelineMarkup({ type: 'timeline', x: 0, y: 0, width: w, height: h, props: p })
      break
    case 'datatable':
      inner = renderDatatableMarkup({ type: 'datatable', x: 0, y: 0, width: w, height: h, props: p })
      break
  }
  return inner
}
```

Note: This needs to import `renderChartSvg`, `renderSensorMarkup`, `renderDatatableMarkup` from their respective renderers. Actually, since `timelineRenderer.js` is a standalone file, we need to import them. Add at the top:

```js
import { renderChartSvg } from './chartRenderer.js'
import { renderSensorMarkup } from './sensorRenderer.js'
import { renderDatatableMarkup } from './datatableRenderer.js'
```

- [ ] **Step 2: Update the event rendering loop to add popup**

In `renderTimelineMarkup`, inside the `events.forEach` callback, after the existing card div (after line 48), add popup generation logic. Replace the entire `events.forEach` body:

```js
  events.forEach((ev, i) => {
    const cx = 10 + stepX * i + stepX / 2
    const isAbove = i % 2 === 0
    const color = COLORS[i % COLORS.length]
    const cardTop = isAbove ? 12 : lineY + 28
    const cardH = Math.min(80, (height - lineY - 40))

    // Popup dimensions from event (with fallback)
    const popW = ev.popupWidth || 280
    const popH = ev.popupHeight || 200
    const hasChild = ev.child && ev.child.type

    // Popup: prefer right side; flip left if near right edge
    const popupGap = 12
    const popLeft = cardW + popupGap
    const popRightEdge = cx + popLeft + popW
    const flipLeft = popRightEdge > width - 20
    const popActualLeft = flipLeft ? (-popW - popupGap) : popLeft
    const popTop = cardTop - Math.max(0, (popH - cardH) / 2)

    let popupHtml = ''
    if (hasChild) {
      const childInner = renderChildHtml(ev.child, popW - 16, popH - 16)
      popupHtml = `
        <div class="tl-popup" style="
          position:absolute;
          left:${popActualLeft}px;
          top:${popTop}px;
          width:${popW}px;
          height:${popH}px;
          background:#fff;
          border-radius:12px;
          box-shadow:0 4px 24px rgba(0,0,0,0.15);
          padding:8px;
          box-sizing:border-box;
          overflow:hidden;
          opacity:0;
          transform:translateY(4px);
          transition:opacity 0.2s ease, transform 0.2s ease;
          pointer-events:none;
          z-index:10;
        ">${childInner}</div>`
    }

    eventHtml += `
      <div class="timeline-event" style="position:absolute;left:${cx}px;top:0;width:0;height:100%;pointer-events:none;">
        <!-- connector line -->
        <div style="position:absolute;left:0;top:${isAbove ? cardTop + cardH : lineY}px;width:1px;height:${isAbove ? lineY - cardTop - cardH : cardTop - lineY}px;background:${color};opacity:0.3;transform:translateX(-0.5px);"></div>
        <!-- dot -->
        <div style="position:absolute;left:-7px;top:${lineY - 7}px;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 3px ${color}22;pointer-events:auto;"></div>
        <!-- card + popup wrapper (hover zone) -->
        <div class="tl-event-hover-zone" style="position:absolute;left:${-cardW / 2 - (hasChild && !flipLeft ? popW + popupGap : 0)}px;top:${Math.min(cardTop, hasChild ? popTop : cardTop)}px;width:${cardW + (hasChild ? popW + popupGap : 0)}px;height:${Math.max(cardH, hasChild ? popH : cardH)}px;pointer-events:auto;z-index:1;">
          <!-- card -->
          <div class="tl-event-card" style="position:absolute;left:${hasChild && flipLeft ? popW + popupGap : 0}px;top:${cardTop - Math.min(cardTop, hasChild ? popTop : cardTop)}px;width:${cardW}px;background:rgba(44,125,160,0.03);border:1px solid rgba(44,125,160,0.06);border-radius:10px;padding:10px 12px;">
            <div style="font-size:10px;color:#687b8b;margin-bottom:3px;">${esc(ev.date)}</div>
            <div style="font-size:13px;font-weight:700;color:#1c2834;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(ev.title)}</div>
            <div style="font-size:11px;color:#627586;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(ev.description)}</div>
          </div>
          ${popupHtml}
        </div>
      </div>`
  })
```

- [ ] **Step 3: Add the hover CSS rule**

In the returned HTML string, in the `<style>` block (inside `renderTimelineMarkup`'s return), add after the existing styles:

```css
.tl-event-hover-zone:hover .tl-popup {
  opacity: 1 !important;
  transform: translateY(0) !important;
}
```

Actually — `renderTimelineMarkup` currently returns inline styles only (no `<style>` block). It returns a raw HTML fragment. CSS hover can't work with inline styles alone because inline styles always take priority. We need to use a `<style>` tag in the returned HTML. 

Important note: The returned HTML from `renderTimelineMarkup` is embedded inside a larger page (EditorCanvas or buildPreview). Adding a `<style>` block inside the fragment would work in buildPreview (full HTML page) but might cause issues in EditorCanvas (Vue-rendered). However, looking at `buildPreview.js` line 154, the return value is wrapped in a styled div, and in EditorCanvas the innerHTML is set directly — `<style>` tags inside innerHTML do work in modern browsers.

Let me add the style block and use CSS classes:

Modify the returned HTML from `renderTimelineMarkup` to include a `<style>` block. In the returned template string, add before the closing:

```html
<style>
.tl-popup { opacity: 0; transform: translateY(4px); transition: opacity 0.2s ease, transform 0.2s ease; }
.tl-event-hover-zone:hover .tl-popup { opacity: 1 !important; transform: translateY(0) !important; }
.tl-event-hover-zone:hover .tl-event-card { border-color: rgba(44,125,160,0.18); background: rgba(44,125,160,0.06); }
</style>
```

Wait, but this is tricky. The `renderTimelineMarkup` function returns inner HTML that gets placed inside a div. If multiple timelines exist on the same page, the `<style>` block will be duplicated. That's not ideal but won't break anything.

Actually, a simpler and cleaner approach: instead of a `<style>` block, we can use inline styles with CSS custom properties... no, that doesn't work for `:hover`.

The simplest workable approach: embed the popup appearance entirely via inline styles and use `onmouseenter`/`onmouseleave` JS events to toggle visibility. But that requires JS in the preview context.

Or: move the popup and card inside the same parent div so we can use `:hover` on the parent. In the returned HTML fragment, add a single `<style>` block with the hover rule. This is how `buildPreview.js` handles other things (it injects styles inline).

Let me revise the approach. I'll add the `<style>` block in the returned HTML from `renderTimelineMarkup`. This works both in EditorCanvas (innerHTML) and buildPreview (full page).

- [ ] **Step 3 (revised): Add `<style>` block for hover in the returned HTML**

In `renderTimelineMarkup`, update the return statement. The current return is:

```js
return `
    <div style="width:100%;height:100%;...">
      ${titleHtml}
      <div style="flex:1;position:relative;min-height:0;">
        ${lineHtml}
        ${eventHtml}
      </div>
    </div>`
```

Change to:

```js
return `
    <style>
      .tl-popup-${uid} { opacity: 0; transform: translateY(4px); transition: opacity 0.2s ease, transform 0.2s ease; }
      .tl-hover-${uid}:hover .tl-popup-${uid} { opacity: 1; transform: translateY(0); }
      .tl-hover-${uid}:hover .tl-card-${uid} { border-color: rgba(44,125,160,0.18); background: rgba(44,125,160,0.06); }
    </style>
    <div style="width:100%;height:100%;...">
      ${titleHtml}
      <div style="flex:1;position:relative;min-height:0;">
        ${lineHtml}
        ${eventHtml}
      </div>
    </div>`
```

And use class names instead of inline `opacity`/`transform` on the popup and hover zone.

Where `uid` is a unique identifier per timeline instance to avoid conflicts when multiple timelines are on the same page:

```js
const uid = Math.random().toString(36).slice(2, 8)
```

- [ ] **Step 4: Verify the file parses**

```bash
node -e "import('./src/modules/builder/editor/timelineRenderer.js').then(m => { console.log('OK'); const h = m.renderTimelineMarkup({type:'timeline',x:0,y:0,width:600,height:360,props:{title:'test',events:[{date:'2020',title:'T',description:'D',child:null,popupWidth:280,popupHeight:200}]}}); console.log(h.substring(0,100)); })"
```

Expected: "OK" and HTML output starts with `<style>`.

- [ ] **Step 5: Commit**

```bash
git add src/modules/builder/editor/timelineRenderer.js
git commit -m "feat: add hover popup rendering for timeline event child components"
```

---

### Task 4: Integration verification

**Files:**
- No file changes — verify the feature works end-to-end

- [ ] **Step 1: Start the dev server and test manually**

```bash
cd c:/Users/ALICE/Desktop/DigitalVillageInitiative && npm run dev
```

1. Open the app, navigate to 大组件编辑台
2. Add a timeline component to the canvas
3. Select the timeline, add a child component to an event (e.g., a pie chart)
4. Hover over the event — verify the popup appears with shadow + animation
5. Export preview — verify the popup works in the standalone HTML

- [ ] **Step 2: Verify edge cases**

- Event with no child → no popup, no error
- Multiple events with children → each shows its own popup
- Event near right edge → popup flips to left side
- Multiple timelines on same canvas → each works independently

- [ ] **Step 3: Commit any follow-up fixes**
