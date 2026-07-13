<!-- src/modules/builder/editor/PropertyPanel.vue -->
<template>
  <div class="pp-root">
    <!-- No selection: canvas settings -->
    <template v-if="!comp">
      <div class="pp-section">
        <h3 class="pp-title">📐 画布设置</h3>
        <div class="pp-field">
          <label>宽度</label>
          <input type="number" v-model.number="state.pageWidth" min="400" max="7680" />
        </div>
        <div class="pp-field">
          <label>高度</label>
          <input type="number" v-model.number="state.pageHeight" min="300" max="4320" />
        </div>
        <div class="pp-field">
          <label>背景色</label>
          <input type="color" v-model="state.pageBackground" />
        </div>
      </div>
      <div class="pp-section">
        <p class="pp-stat">共 {{ state.components.length }} 个组件</p>
        <p class="pp-hint">从左侧拖入组件到画布，点击组件查看属性</p>
      </div>
    </template>

    <!-- Selected component -->
    <template v-else>
      <div class="pp-section">
        <h3 class="pp-title">
          <span>{{ typeLabel(comp.type) }}</span>
          <button class="pp-del" @click="deleteComponent(comp.id)" title="删除组件">🗑</button>
        </h3>

        <!-- Position & Size (all types) -->
        <div class="pp-field-row">
          <div class="pp-field">
            <label>X</label>
            <input type="number" v-model.number="comp.x" />
          </div>
          <div class="pp-field">
            <label>Y</label>
            <input type="number" v-model.number="comp.y" />
          </div>
        </div>
        <div class="pp-field-row">
          <div class="pp-field">
            <label>宽</label>
            <input type="number" v-model.number="comp.width" min="20" />
          </div>
          <div class="pp-field">
            <label>高</label>
            <input type="number" v-model.number="comp.height" min="20" />
          </div>
        </div>
      </div>

      <!-- Text props -->
      <div v-if="comp.type === 'text'" class="pp-section">
        <h4 class="pp-subtitle">文本内容</h4>
        <div class="pp-field">
          <textarea v-model="comp.props.text" rows="3"></textarea>
        </div>
        <h4 class="pp-subtitle">样式</h4>
        <div class="pp-field-row">
          <div class="pp-field">
            <label>字号</label>
            <input type="number" v-model.number="comp.props.fontSize" min="8" max="200" />
          </div>
          <div class="pp-field">
            <label>粗细</label>
            <select v-model.number="comp.props.fontWeight">
              <option :value="400">常规</option>
              <option :value="700">粗体</option>
              <option :value="900">特粗</option>
            </select>
          </div>
        </div>
        <div class="pp-field">
          <label>颜色</label>
          <input type="color" v-model="comp.props.color" />
        </div>
        <div class="pp-field">
          <label>对齐</label>
          <select v-model="comp.props.textAlign">
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </select>
        </div>
        <div class="pp-field">
          <label>背景色</label>
          <input type="color" v-model="comp.props.backgroundColor" />
        </div>
      </div>

      <!-- Image props -->
      <div v-if="comp.type === 'image'" class="pp-section">
        <div class="pp-field">
          <label>图片 URL</label>
          <input type="text" v-model="comp.props.src" placeholder="https://..." />
        </div>
        <!-- 新增：从实践选取 -->
        <div class="pp-field">
          <label>或从实践选取</label>
          <PracticeImagePicker
            :dossier-id="dossierId"
            v-model="comp.props.src"
            @select="onImagePicked"
          />
        </div>
        <div class="pp-field">
          <label>替代文本</label>
          <input type="text" v-model="comp.props.alt" placeholder="图片描述" />
        </div>
        <div class="pp-field">
          <label>填充模式</label>
          <select v-model="comp.props.objectFit">
            <option value="cover">Cover 裁剪</option>
            <option value="contain">Contain 完整</option>
            <option value="fill">Fill 拉伸</option>
          </select>
        </div>
        <div class="pp-field">
          <label>圆角 (px)</label>
          <input type="number" v-model.number="comp.props.borderRadius" min="0" />
        </div>
        <div class="pp-field">
          <label class="pp-check">
            <input type="checkbox" v-model="comp.props.autoRefresh" />
            自动刷新
          </label>
        </div>
        <div v-if="comp.props.autoRefresh" class="pp-field">
          <label>刷新间隔 (秒)</label>
          <input type="number" v-model.number="comp.props.refreshInterval" min="5" />
        </div>
      </div>

      <!-- Chart props -->
      <div v-if="comp.type === 'chart'" class="pp-section">
        <div class="pp-field">
          <label>标题</label>
          <input type="text" v-model="comp.props.title" />
        </div>
        <div class="pp-field">
          <label>图表类型</label>
          <select v-model="comp.props.chartType">
            <option value="bar">柱状图</option>
            <option value="stacked-bar">堆叠柱状图</option>
            <option value="pie">饼图</option>
            <option value="line">折线图</option>
            <option value="dumbbell">哑铃图</option>
            <option value="trend-badge">涨跌徽标</option>
            <option value="radar">雷达图</option>
          </select>
        </div>
        <div class="pp-field">
          <label>CSV 数据</label>
          <textarea v-model="comp.props.csvText" rows="6" style="font-family:monospace;font-size:12px;"></textarea>
        </div>
      </div>

      <!-- Sensor props -->
      <div v-if="comp.type === 'agri-sensor'" class="pp-section">
        <div class="pp-field">
          <label>标题</label>
          <input type="text" v-model="comp.props.title" />
        </div>
        <h4 class="pp-subtitle">
          传感器列表
          <button class="pp-add" @click="addSensor(comp)">+ 添加</button>
        </h4>
        <div v-for="(s, i) in comp.props.sensors" :key="i" class="pp-sensor-row">
          <input type="text" v-model="s.name" placeholder="名称" class="pp-sr-name" />
          <input type="number" v-model.number="s.value" placeholder="值" class="pp-sr-val" />
          <input type="text" v-model="s.unit" placeholder="单位" class="pp-sr-unit" />
          <select v-model="s.status" class="pp-sr-status">
            <option value="normal">正常</option>
            <option value="warning">注意</option>
            <option value="error">异常</option>
          </select>
          <button class="pp-sr-del" @click="removeSensor(comp, i)">×</button>
        </div>
      </div>

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
                  <option value="error">危险</option>
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

      <!-- Datatable props -->
      <div v-if="comp.type === 'datatable'" class="pp-section">
        <div class="pp-field">
          <label>标题</label>
          <input type="text" v-model="comp.props.title" />
        </div>
        <h4 class="pp-subtitle">
          列定义
          <button class="pp-add" @click="addDatatableColumn(comp)">+ 添加列</button>
        </h4>
        <div class="pp-dt-columns">
          <div v-for="(col, ci) in comp.props.columns" :key="'col'+ci" class="pp-dt-col-item">
            <input type="text" v-model="comp.props.columns[ci]" placeholder="列名" class="pp-dt-col-input" />
            <button v-if="comp.props.columns.length > 1" class="pp-sr-del" @click="removeDatatableColumn(comp, ci)">×</button>
          </div>
        </div>
        <h4 class="pp-subtitle">
          数据行
          <button class="pp-add" @click="addDatatableRow(comp)">+ 添加行</button>
        </h4>
        <div v-for="(row, ri) in comp.props.rows" :key="'row'+ri" class="pp-dt-row">
          <div class="pp-dt-row-inputs">
            <input v-for="(col, ci) in comp.props.columns" :key="ci" type="text" v-model="comp.props.rows[ri][ci]" :placeholder="col" class="pp-dt-cell" />
          </div>
          <button v-if="comp.props.rows.length > 1" class="pp-sr-del" @click="removeDatatableRow(comp, ri)">×</button>
        </div>
      </div>

      <!-- Layout-box props -->
      <div v-if="comp.type === 'layout-box'" class="pp-section">

        <!-- View A: Container-level settings -->
        <template v-if="comp._selectedChildIndex == null">
          <div class="pp-field">
            <label>容器标题</label>
            <input type="text" v-model="comp.props.title" placeholder="容器标题（可选）" />
          </div>

          <div class="pp-field">
            <label>槽位数量</label>
            <select v-model.number="comp.props.slotCount" @change="onSlotCountChange(comp)">
              <option :value="2">2 槽位</option>
              <option :value="3">3 槽位</option>
              <option :value="4">4 槽位</option>
            </select>
          </div>

          <div class="pp-field">
            <label>布局方案</label>
            <div class="pp-layout-presets">
              <button
                v-for="lo in availableLayouts"
                :key="lo.value"
                class="pp-layout-preset"
                :class="{ 'pp-layout-preset--active': comp.props.layout === lo.value }"
                @click="onLayoutChange(comp, lo.value)"
              >{{ lo.label }}</button>
            </div>
          </div>

          <div class="pp-field">
            <label>槽位内容分配</label>
            <div v-for="(child, i) in comp.props.children" :key="'slot'+i" class="pp-slot-item">
              <span class="pp-slot-label">槽位 {{ i + 1 }}</span>
              <select
                :value="child ? (child.type === 'chart' ? 'chart:' + (child.props.chartType || 'bar') : child.type) : ''"
                @change="onSlotTypeChange(comp, i, $event.target.value)"
              >
                <option value="">空（占位）</option>
                <option value="chart:bar">图表-柱状图</option>
                <option value="chart:pie">图表-饼图</option>
                <option value="chart:line">图表-折线图</option>
                <option value="chart:sankey">图表-桑基图</option>
                <option value="text">文本</option>
                <option value="image">图片</option>
                <option value="timeline">时间轴</option>
                <option value="datatable">数据表</option>
              </select>
              <span v-if="child" class="pp-slot-type">{{ childTypeLabel(child) }}</span>
              <button
                v-if="child"
                class="pp-slot-edit-btn"
                @click="comp._selectedChildIndex = i"
              >编辑</button>
            </div>
          </div>
        </template>

        <!-- View B: Child component editor -->
        <template v-else>
          <button class="pp-back-btn" @click="comp._selectedChildIndex = null">← 返回容器设置</button>

          <div v-if="editingChild" class="pp-child-editor">
            <h4 class="pp-subtitle">{{ childTypeLabel(editingChild) }} - 槽位 {{ comp._selectedChildIndex + 1 }}</h4>

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
                <label>或从实践选取</label>
                <PracticeImagePicker
                  :dossier-id="dossierId"
                  v-model="editingChild.props.src"
                  @select="(m) => { if (!editingChild.props.alt) editingChild.props.alt = m.name.replace(/\.[^.]+$/, '') }"
                />
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
          </div>
        </template>
      </div>

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

          <div v-if="editingChild" class="pp-child-editor">
            <h4 class="pp-subtitle">{{ childTypeLabel(editingChild) }} - 第 {{ comp._selectedChildIndex + 1 }} 项</h4>

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
                <label>或从实践选取</label>
                <PracticeImagePicker
                  :dossier-id="dossierId"
                  v-model="editingChild.props.src"
                  @select="(m) => { if (!editingChild.props.alt) editingChild.props.alt = m.name.replace(/\.[^.]+$/, '') }"
                />
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
                <button class="pp-sr-del" @click="removeTimelineEvent(editingChild, i)">×</button>
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
              <div v-for="(row, ri) in editingChild.props.rows" :key="'row'+ri" class="pp-dt-row">
                <div class="pp-dt-row-inputs">
                  <input v-for="(col, ci) in editingChild.props.columns" :key="ci" type="text" v-model="editingChild.props.rows[ri][ci]" :placeholder="col" class="pp-dt-cell" />
                </div>
                <button v-if="editingChild.props.rows.length > 1" class="pp-sr-del" @click="removeDatatableRow(editingChild, ri)">×</button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { state, getSelected, deleteComponent } from './stageEditor.js'
import { createComponent, createEmptyChildComponent } from './componentFactory.js'
import PracticeImagePicker from './PracticeImagePicker.vue'

const route = useRoute()
const dossierId = computed(() => route.params.dossierId || '')

const comp = computed(() => getSelected())

function typeLabel(type) {
  const labels = { text: '📝 文本', image: '🖼 图片', chart: '📊 图表', 'agri-sensor': '🌡 传感器', 'timeline': '⏳ 时间轴', 'datatable': '📋 数据表', 'layout-box': '📦 多组件框', 'flow-box': '🎠 流动组件框' }
  return labels[type] || type
}

function onImagePicked(material) {
  // 如果当前 alt 为空，自动填入图片名称（去掉扩展名）
  if (comp.value && !comp.value.props.alt) {
    const nameWithoutExt = material.name.replace(/\.[^.]+$/, '')
    comp.value.props.alt = nameWithoutExt
  }
}

// -- Layout-box helpers --

const LAYOUT_LABELS = {
  'horizontal': '水平等分',
  'vertical': '垂直等分',
  'grid-2x2': '田字格',
  'main-right': '主+右',
  'main-left': '左+主',
  'main-bottom': '主+下',
  'main-top': '上+主',
  '1+2-right': '左大+右二',
  '2+1-right': '左二+右大',
  '1+2-bottom': '上大+下二',
  '2+1-top': '上二+下大',
}

const LAYOUTS_BY_SLOT_COUNT = {
  2: ['horizontal', 'vertical', 'main-right', 'main-left', 'main-bottom', 'main-top'],
  3: ['horizontal', 'vertical', '1+2-right', '2+1-right', '1+2-bottom', '2+1-top'],
  4: ['horizontal', 'vertical', 'grid-2x2'],
}

function defaultRatiosForLayout(layout, slotCount) {
  switch (layout) {
    case 'horizontal':
    case 'vertical': {
      // Distribute 100 evenly, ensuring sum is exactly 100
      const base = Math.floor(100 / slotCount)
      const remainder = 100 - base * slotCount
      const arr = new Array(slotCount).fill(base)
      for (let i = 0; i < remainder; i++) arr[i]++
      return arr
    }
    case 'main-right': return [67, 33]
    case 'main-left': return [33, 67]
    case 'main-bottom': return [67, 33]
    case 'main-top': return [33, 67]
    case 'grid-2x2': return [50, 50, 50, 50]
    case '1+2-right': return [60, 50]
    case '2+1-right': return [50, 60]
    case '1+2-bottom': return [60, 50]
    case '2+1-top': return [50, 60]
    default: return new Array(slotCount).fill(Math.round(100 / slotCount))
  }
}

function defaultLayoutForSlotCount(slotCount) {
  if (slotCount === 4) return 'grid-2x2'
  return 'horizontal'
}

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

const availableLayouts = computed(() => {
  if (!comp.value || !comp.value.props) return []
  const sc = comp.value.props.slotCount || 2
  const names = LAYOUTS_BY_SLOT_COUNT[sc] || LAYOUTS_BY_SLOT_COUNT[2]
  return names.map(v => ({ value: v, label: LAYOUT_LABELS[v] || v }))
})

function childTypeLabel(child) {
  if (!child) return '空'
  const labels = { text: '文本', chart: '图表', image: '图片', 'agri-sensor': '传感器', timeline: '时间轴', datatable: '数据表' }
  if (child.type === 'chart' && child.props && child.props.chartType) {
    const ctLabels = { bar: '柱状图', pie: '饼图', line: '折线图', 'stacked-bar': '堆叠柱状图', dumbbell: '哑铃图', 'trend-badge': '涨跌徽标', radar: '雷达图', sankey: '桑基图' }
    return ctLabels[child.props.chartType] || '图表'
  }
  return labels[child.type] || child.type
}

function onSlotCountChange(comp) {
  const sc = comp.props.slotCount || 2
  // Distribute 100 evenly across slots, ensuring sum is exactly 100
  const base = Math.floor(100 / sc)
  const remainder = 100 - base * sc
  const ratios = new Array(sc).fill(base)
  for (let i = 0; i < remainder; i++) ratios[i]++
  comp.props.splitRatios = ratios
  // Update children array
  const oldLen = comp.props.children ? comp.props.children.length : 0
  if (oldLen < sc) {
    for (let i = oldLen; i < sc; i++) comp.props.children.push(null)
  } else if (oldLen > sc) {
    comp.props.children.splice(sc)
  }
  // Reset layout
  comp.props.layout = defaultLayoutForSlotCount(sc)
  // Reset selected child index if it's now out of bounds
  if (comp._selectedChildIndex != null && comp._selectedChildIndex >= sc) {
    comp._selectedChildIndex = null
  }
}

function onLayoutChange(comp, layout) {
  comp.props.layout = layout
  const sc = comp.props.slotCount || 2
  comp.props.splitRatios = defaultRatiosForLayout(layout, sc)
}

let _nextChildId = Date.now()
function onSlotTypeChange(comp, slotIndex, typeVal) {
  if (!typeVal) {
    comp.props.children[slotIndex] = null
    return
  }
  // Parse "chart:bar", "chart:pie", etc.
  let type = typeVal
  let chartType = 'bar'
  if (typeVal.startsWith('chart:')) {
    type = 'chart'
    chartType = typeVal.slice(6) // extract the chart sub-type
  }
  const child = createComponent(type, 0, 0, chartType)
  child.id = _nextChildId++
  comp.props.children[slotIndex] = child
}

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
  } else if (fbComp.props.activeIndex > index) {
    fbComp.props.activeIndex--
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

function addSensor(comp) {
  comp.props.sensors.push({ name: '', value: 0, unit: '', status: 'normal' })
}

function removeSensor(comp, index) {
  comp.props.sensors.splice(index, 1)
}

// Timeline helpers
function addTimelineEvent(comp) {
  comp.props.events.push({ date: '', title: '', description: '', child: null, popupWidth: 280, popupHeight: 200 })
}
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

// Datatable helpers
function addDatatableColumn(comp) {
  const newCol = '新列'
  comp.props.columns.push(newCol)
  comp.props.rows.forEach(row => row.push(''))
}
function removeDatatableColumn(comp, ci) {
  if (comp.props.columns.length > 1) {
    comp.props.columns.splice(ci, 1)
    comp.props.rows.forEach(row => row.splice(ci, 1))
  }
}
function addDatatableRow(comp) {
  const newRow = new Array(comp.props.columns.length).fill('')
  comp.props.rows.push(newRow)
}
function removeDatatableRow(comp, ri) {
  if (comp.props.rows.length > 1) comp.props.rows.splice(ri, 1)
}
</script>

<style scoped>
.pp-root { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
.pp-section {
  padding: 1rem;
  border-radius: 18px;
  background: rgba(44,125,160,0.02);
  border: 1px solid var(--color-border-light);
}
.pp-title {
  margin: 0 0 0.8rem;
  font-size: 0.95rem; font-weight: 700;
  color: var(--color-primary-dark);
  display: flex; align-items: center; justify-content: space-between;
}
.pp-subtitle {
  margin: 0.8rem 0 0.5rem;
  font-size: 0.8rem; font-weight: 600;
  color: var(--color-text-light);
  display: flex; align-items: center; justify-content: space-between;
}
.pp-field { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.6rem; }
.pp-field label {
  font-size: 0.76rem; color: var(--color-text-light); font-weight: 500;
}
.pp-field input[type="text"],
.pp-field input[type="number"],
.pp-field textarea,
.pp-field select {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.82rem; outline: none;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.pp-field input:focus,
.pp-field textarea:focus,
.pp-field select:focus {
  border-color: #2c7da0;
  box-shadow: 0 0 0 3px var(--editor-input-focus-glow);
}
.pp-field textarea { resize: vertical; min-height: 60px; }
.pp-field input[type="color"] {
  width: 40px; height: 32px; padding: 2px; cursor: pointer;
  border-radius: 8px; border: 1px solid var(--color-border);
}
.pp-field-row { display: flex; gap: 0.5rem; }
.pp-field-row .pp-field { flex: 1; }
.pp-check {
  display: flex; flex-direction: row; align-items: center; gap: 0.4rem;
  cursor: pointer; font-size: 0.82rem; color: var(--color-text-secondary);
}
.pp-check input[type="checkbox"] { width: auto; accent-color: #2c7da0; }

.pp-stat { font-size: 0.82rem; color: var(--color-text-secondary); margin: 0; }
.pp-hint {
  font-size: 13px; color: #687b8b; line-height: 1.7;
  margin: 0.4rem 0 0;
}

.pp-del {
  border: none; background: transparent; cursor: pointer;
  font-size: 1rem; color: var(--color-text-light);
  padding: 0.25rem 0.4rem; border-radius: 8px;
  transition: all var(--transition-fast);
}
.pp-del:hover {
  color: #c0392b;
  background: rgba(192,57,43,0.06);
}

.pp-add {
  border: 1px solid #2c7da0; border-radius: 999px;
  padding: 0.15rem 0.6rem;
  background: transparent; color: #2c7da0;
  font-size: 0.72rem; cursor: pointer; font-weight: 600;
  transition: all var(--transition-fast);
}
.pp-add:hover {
  background: #2c7da0; color: #fff;
}

.pp-sensor-row { display: flex; gap: 0.3rem; margin-bottom: 0.4rem; align-items: center; }
.pp-sr-name { flex: 2; }
.pp-sr-val { flex: 1; }
.pp-sr-unit { flex: 1; }
.pp-sr-status { flex: 1.2; }
.pp-sensor-row input,
.pp-sensor-row select {
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.76rem; outline: none;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.pp-sensor-row input:focus,
.pp-sensor-row select:focus {
  border-color: #2c7da0;
  box-shadow: 0 0 0 2px var(--editor-input-focus-glow);
}
.pp-sr-del {
  border: none; background: transparent; cursor: pointer;
  color: var(--color-text-light);
  font-size: 1rem; padding: 0 0.2rem;
  border-radius: 4px;
  transition: all var(--transition-fast);
}
.pp-sr-del:hover { color: #c0392b; }

/* Timeline editor rows */
.pp-timeline-row {
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px; margin-bottom: 6px;
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  background: rgba(44,125,160,0.02);
  position: relative;
}
.pp-timeline-fields { display: flex; gap: 6px; }
.pp-tl-date { flex: 0 0 90px; }
.pp-tl-title { flex: 1; }
.pp-tl-desc {
  font-size: 0.78rem; padding: 4px 8px;
  border: 1px solid var(--color-border-light);
  border-radius: 6px; outline: none; resize: vertical;
  background: var(--color-bg); color: var(--color-text);
  font-family: inherit;
}

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

/* Datatable editor */
.pp-dt-columns { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
.pp-dt-col-item { display: flex; align-items: center; gap: 2px; }
.pp-dt-col-input { width: 80px; }
.pp-dt-row { display: flex; align-items: flex-start; gap: 4px; margin-bottom: 4px; }
.pp-dt-row-inputs { display: flex; gap: 4px; flex: 1; overflow-x: auto; }
.pp-dt-cell { width: 80px; flex-shrink: 0; }

/* Layout-box editor */
.pp-back-btn {
  border: 1px solid #2c7da0; border-radius: 999px;
  padding: 0.25rem 0.75rem;
  background: transparent; color: #2c7da0;
  font-size: 0.78rem; cursor: pointer; font-weight: 600;
  transition: all var(--transition-fast);
  margin-bottom: 0.5rem;
}
.pp-back-btn:hover {
  background: #2c7da0; color: #fff;
}

.pp-layout-presets {
  display: flex; flex-wrap: wrap; gap: 0.35rem;
}
.pp-layout-preset {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 0.72rem; cursor: pointer;
  transition: all var(--transition-fast);
}
.pp-layout-preset:hover {
  border-color: #2c7da0;
  color: #2c7da0;
}
.pp-layout-preset--active {
  background: #2c7da0;
  color: #fff;
  border-color: #2c7da0;
}

.pp-slot-item {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.35rem 0.5rem; margin-bottom: 0.35rem;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  background: rgba(44,125,160,0.02);
}
.pp-slot-label {
  font-size: 0.72rem; font-weight: 600;
  color: var(--color-text-light);
  min-width: 3rem;
}
.pp-slot-item select {
  flex: 1;
  padding: 0.3rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.76rem; outline: none;
  background: var(--color-bg);
  color: var(--color-text);
}
.pp-slot-type {
  font-size: 0.68rem;
  color: var(--color-text-light);
  background: rgba(44,125,160,0.06);
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
}
.pp-slot-edit-btn {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.18rem 0.45rem;
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 0.7rem; cursor: pointer;
  transition: all var(--transition-fast);
}
.pp-slot-edit-btn:hover {
  border-color: #2c7da0;
  color: #2c7da0;
}

.pp-child-editor {
  margin-top: 0.5rem;
}
</style>
