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
            <option value="pie">饼图</option>
            <option value="line">折线图</option>
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
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { state, getSelected, deleteComponent } from './stageEditor.js'

const comp = computed(() => getSelected())

function typeLabel(type) {
  const labels = { text: '📝 文本', image: '🖼 图片', chart: '📊 图表', 'agri-sensor': '🌡 传感器' }
  return labels[type] || type
}

function addSensor(comp) {
  comp.props.sensors.push({ name: '', value: 0, unit: '', status: 'normal' })
}

function removeSensor(comp, index) {
  comp.props.sensors.splice(index, 1)
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
</style>
