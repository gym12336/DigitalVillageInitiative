<template>
  <div class="ai-panel">
    <div class="ai-header">
      <span class="ai-title">🤖 AI 助手</span>
      <button class="ai-toggle" @click="$emit('close')" title="收起">×</button>
    </div>

    <div class="ai-body">
      <!-- 输入区 -->
      <div class="ai-input-area">
        <textarea
          ref="inputRef"
          v-model="prompt"
          class="ai-input"
          rows="3"
          :placeholder="placeholder"
          @keydown.ctrl.enter="onGenerate"
        />
        <div class="ai-input-actions">
          <button
            class="btn ai-btn"
            :disabled="!prompt.trim() || generating"
            @click="onGenerate"
          >
            {{ generating ? '⏳ 生成中…' : '✨ 生成' }}
          </button>
          <span class="ai-hint">Ctrl+Enter 发送</span>
        </div>
        <p v-if="msg" class="ai-msg" :class="{ err: msgErr }">{{ msg }}</p>
      </div>

      <!-- 生成结果预览 -->
      <div v-if="result && result.components?.length" class="ai-result">
        <div class="ai-result-head">
          <span class="ai-result-title">生成了 {{ result.components.length }} 个组件</span>
          <span v-if="result.source === 'ai'" class="ai-badge">AI</span>
          <span v-else class="ai-badge warn">{{ result.source === 'empty' ? '无数据' : '失败' }}</span>
        </div>

        <div class="ai-comp-list">
          <div
            v-for="(c, i) in result.components"
            :key="i"
            class="ai-comp-item"
          >
            <span class="ai-comp-icon">{{ compIcon(c.type, c.props) }}</span>
            <span class="ai-comp-label">{{ compLabel(c.type, c.props) }}</span>
          </div>
        </div>

        <div class="ai-result-actions">
          <button class="btn primary small" @click="onApply">
            🎨 应用到画布
          </button>
          <button class="btn ghost small" @click="onRegenerate">
            🔄 重新生成
          </button>
        </div>
      </div>

      <!-- 空结果 -->
      <div v-else-if="result && !result.components?.length" class="ai-empty">
        <p>数据不足，无法生成组件。建议先在「实践中」补充指标、人物或材料。</p>
      </div>

      <!-- 快捷指令 -->
      <div v-if="!result" class="ai-quick">
        <p class="ai-quick-title">快捷指令</p>
        <button
          v-for="q in quickPrompts"
          :key="q"
          class="ai-quick-btn"
          @click="prompt = q; onGenerate()"
        >{{ q }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { apiCompile, apiBigComponent, apiPolish } from '../../practice/mine/postApi.js'
import { loadComponentsFromAI } from './stageEditor.js'

const props = defineProps({
  mode: { type: String, default: 'display' }, // 'display' | 'big-component'
  dossierId: { type: String, default: '' },
  dossierData: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'applied'])

const prompt = ref('')
const generating = ref(false)
const msg = ref('')
const msgErr = ref(false)
const result = ref(null)
const inputRef = ref(null)

const isDisplay = computed(() => props.mode === 'display')

const placeholder = computed(() => isDisplay.value
  ? '用自然语言告诉 AI 你想生成什么成果展示…\n例如：「帮我展示帮扶前后收入翻倍的变化，加上村支书的人物故事」'
  : '描述你想要的大组件…\n例如：「做一个包含姓名、身份和金句的人物卡」'
)

const quickPrompts = computed(() => isDisplay.value
  ? ['展示帮扶前后关键指标的变化对比', '突出人物故事，弱化数据图表', '生成完整的成果展示页']
  : ['做一个人物信息卡（姓名+身份+金句）', '做一个前后数据对比模块', '做一个KPI指标概览卡组', '做一个图文混排模块（图片+说明文字）']
)

function compIcon(type, props) {
  const m = { chart: { dumbbell: '🔗', 'trend-badge': '📈', pie: '🥧', radar: '🕸️' }[props?.chartType] || '📊', text: props?.fontSize > 40 ? '🎬' : '📝', image: '🖼️', timeline: '⏱️', datatable: '📋', 'agri-sensor': '🃏', 'layout-box': '📦' }
  return m[type] || '📦'
}

function compLabel(type, props) {
  const m = { chart: { dumbbell: '哑铃图', 'trend-badge': '涨跌徽标', pie: '饼图', radar: '雷达图', bar: '柱状图', 'stacked-bar': '堆叠柱' }[props?.chartType] || '图表', text: props?.fontSize > 40 ? '封面标题' : '文本段落', image: '图片', timeline: '时间轴', datatable: '数据表', 'agri-sensor': 'KPI卡组', 'layout-box': '多组件框' }
  return m[type] || type
}

async function onGenerate() {
  const text = prompt.value.trim()
  if (!text || generating.value) return

  generating.value = true
  msg.value = ''
  msgErr.value = false
  result.value = null

  try {
    let r
    if (isDisplay.value) {
      // 展示台模式：需要dossier数据，产出完整页面
      const data = props.dossierData
      const collected = data?.collected || {}
      r = await apiCompile(collected, {
        topic: data?.plan?.topic || '',
        village: data?.plan?.targetVillage || data?.village || '',
        intent: text,
      })
    } else {
      // 大组件编辑台模式：不需要数据，产出可复用大组件
      r = await apiBigComponent(text)
    }

    result.value = r

    if (r.source === 'ai' && r.components?.length) {
      msg.value = `已生成 ${r.components.length} 个组件，点击「应用到画布」加载`
      msgErr.value = false
    } else if (r.source === 'empty') {
      msg.value = isDisplay.value ? '数据不足，请先在实践中补充指标、人物或材料' : '请描述更具体的大组件需求'
      msgErr.value = true
    } else {
      msg.value = 'AI 服务暂时不可用，请稍后重试'
      msgErr.value = true
    }
  } catch (e) {
    msg.value = e.message || '生成失败'
    msgErr.value = true
  } finally {
    generating.value = false
  }
}

function onApply() {
  if (!result.value?.components?.length) return
  const n = loadComponentsFromAI(result.value.components, {
    pageWidth: result.value.pageWidth,
    pageHeight: result.value.pageHeight,
    pageBackground: result.value.pageBackground,
  })
  msg.value = `已加载 ${n} 个组件到画布，可拖拽调整位置`
  msgErr.value = false
  emit('applied', result.value)
}

function onRegenerate() {
  result.value = null
  nextTick(() => onGenerate())
}
</script>

<style scoped>
.ai-panel {
  display: flex; flex-direction: column;
  height: 100%;
  background: var(--color-card, #fff);
  border-right: 1px solid var(--color-border, #e0e0e0);
}

.ai-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .7rem 1rem;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
}
.ai-title {
  font-size: .9rem; font-weight: 700;
  color: var(--color-primary-dark, #245a73);
}
.ai-toggle {
  border: none; background: none;
  font-size: 1.2rem; color: var(--color-text-light, #999);
  cursor: pointer; padding: 0 .3rem; line-height: 1;
}

.ai-body {
  flex: 1; overflow-y: auto;
  padding: .8rem;
  display: flex; flex-direction: column; gap: .8rem;
}

/* 输入 */
.ai-input-area {
  background: var(--color-bg, #f5f5f5);
  border-radius: 12px; padding: .7rem;
}
.ai-input {
  width: 100%; box-sizing: border-box; resize: vertical;
  padding: .5rem .6rem; font-size: .84rem;
  color: var(--color-text, #333);
  background: #fff; border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 8px; outline: none;
  font-family: inherit;
}
.ai-input:focus { border-color: var(--color-primary, #2c7da0); }
.ai-input-actions {
  display: flex; align-items: center; gap: .5rem;
  margin-top: .5rem;
}
.ai-hint { font-size: .7rem; color: var(--color-text-light, #999); }
.ai-msg { margin: .4rem 0 0; font-size: .78rem; color: var(--color-text-light, #666); }
.ai-msg.err { color: var(--color-highlight, #c0392b); }

/* 结果 */
.ai-result {
  background: var(--color-bg, #f5f5f5);
  border-radius: 12px; padding: .7rem;
}
.ai-result-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: .5rem;
}
.ai-result-title { font-size: .82rem; font-weight: 600; color: var(--color-text, #333); }
.ai-badge {
  font-size: .7rem; padding: .15rem .5rem; border-radius: 50px;
  background: #e8f5e9; color: #2e7d32; font-weight: 600;
}
.ai-badge.warn { background: #fff3e0; color: #e65100; }

.ai-comp-list {
  display: flex; flex-direction: column; gap: .3rem;
  max-height: 200px; overflow-y: auto;
}
.ai-comp-item {
  display: flex; align-items: center; gap: .5rem;
  padding: .35rem .5rem;
  background: #fff; border-radius: 6px;
  font-size: .78rem;
}
.ai-comp-icon { flex-shrink: 0; }
.ai-comp-label { color: var(--color-text, #333); }

.ai-result-actions {
  display: flex; gap: .4rem; margin-top: .6rem;
}
.ai-empty {
  padding: 1rem; text-align: center;
  font-size: .82rem; color: var(--color-text-light, #999);
}

/* 快捷指令 */
.ai-quick { margin-top: auto; }
.ai-quick-title {
  font-size: .72rem; color: var(--color-text-light, #999);
  margin: 0 0 .4rem; font-weight: 600;
}
.ai-quick-btn {
  display: block; width: 100%; text-align: left;
  padding: .4rem .6rem; margin-bottom: .25rem;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 8px;
  background: #fff; font-size: .78rem;
  color: var(--color-text, #333);
  cursor: pointer; transition: all .15s;
}
.ai-quick-btn:hover {
  background: var(--color-accent, #e8f0f4);
  border-color: var(--color-primary, #2c7da0);
}

/* 按钮 */
.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all .15s; }
.btn.ai-btn {
  padding: .4rem 1rem; font-size: .82rem;
  background: var(--color-primary, #2c7da0); color: #fff;
}
.btn.ai-btn:hover { filter: brightness(1.1); }
.btn.ai-btn:disabled { background: #cfcfcf; cursor: not-allowed; }
.btn.primary.small { padding: .35rem .9rem; font-size: .78rem; background: var(--color-primary, #2c7da0); color: #fff; }
.btn.primary.small:hover { filter: brightness(1.1); }
.btn.ghost.small {
  padding: .35rem .9rem; font-size: .78rem;
  background: transparent; border: 1px solid var(--color-primary, #2c7da0);
  color: var(--color-primary, #2c7da0);
}
.btn.ghost.small:hover { background: var(--color-primary, #2c7da0); color: #fff; }
</style>
