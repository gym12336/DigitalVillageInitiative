<!-- src/modules/builder/display/DisplayWorkbench.vue -->
<template>
  <div class="editor-root">
    <!-- Left Panel: AI Assistant / Component Library tab-switchable -->
    <aside class="editor-left" :class="{ collapsed: leftCollapsed }">
      <template v-if="!leftCollapsed">
        <!-- tab switcher -->
        <div class="left-tabs">
          <button class="left-tab" :class="{ active: leftTab === 'ai' }" @click="leftTab = 'ai'">🤖 AI 助手</button>
          <button class="left-tab" :class="{ active: leftTab === 'components' }" @click="leftTab = 'components'">🧩 组件库</button>
        </div>

        <AICommandPanel
          v-if="leftTab === 'ai'"
          mode="display"
          :dossier-id="dossierId"
          :dossier-data="dossierData"
          @applied="onAIApplied"
          @close="leftTab = 'components'"
        />
        <DisplayComponentLibrary v-else ref="libRef" :dossier-id="dossierId" />
      </template>
      <button class="toggle-btn" @click="leftCollapsed = !leftCollapsed" :title="leftCollapsed ? '展开面板' : '收起面板'">
        {{ leftCollapsed ? '▶' : '◀' }}
      </button>
    </aside>

    <!-- Center: Canvas -->
    <main class="editor-center">
      <EditorCanvas ref="canvasRef" document-type="display" :dossier-id="dossierId" />
    </main>

    <!-- Right Panel: Properties -->
    <aside class="editor-right" :class="{ collapsed: !state.selectedId }">
      <PropertyPanel />
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DisplayComponentLibrary from './DisplayComponentLibrary.vue'
import EditorCanvas from '../editor/EditorCanvas.vue'
import PropertyPanel from '../editor/PropertyPanel.vue'
import AICommandPanel from '../editor/AICommandPanel.vue'
import { state, resetState } from '../editor/stageEditor.js'
import { apiGetDossier } from '../../practice/mine/api.js'

const route = useRoute()
const leftCollapsed = ref(false)
const leftTab = ref('ai') // 默认展示AI助手
const libRef = ref(null)
const canvasRef = ref(null)

const dossierId = computed(() => route.params.dossierId || '')
const dossierData = ref(null)

// 加载档案完整数据，供AI面板使用
async function loadDossierData() {
  if (!dossierId.value) { dossierData.value = null; return }
  try {
    dossierData.value = await apiGetDossier(dossierId.value)
  } catch {
    dossierData.value = null
  }
}

onMounted(() => {
  resetState()
  loadDossierData()
})

watch(dossierId, () => {
  resetState()
  loadDossierData()
  if (libRef.value?.refreshBigComponents) {
    libRef.value.refreshBigComponents()
  }
})

function onAIApplied(componentCount) {
  // AI组件已通过 loadComponentsFromAI 直接注入 stageEditor.state
  // 这里可以做一些后续处理，比如切换到组件库tab方便用户手动调整
}
</script>

<style scoped>
/* Same tech-blue theme as BigComponentEditor.vue */
.editor-root {
  --color-bg: #f2f6f8;
  --color-bg-deep: #edf2f7;
  --color-primary: #2c7da0;
  --color-primary-soft: #4aa3c0;
  --color-primary-dark: #245a73;
  --color-primary-deep: #1a3f50;
  --color-secondary: #56ccf2;
  --color-secondary-soft: #a8e0f8;
  --color-accent: rgba(44,125,160,0.10);
  --color-accent-soft: rgba(44,125,160,0.05);
  --color-highlight: #c0392b;
  --color-highlight-soft: #e08070;
  --color-card: rgba(255,255,255,0.92);
  --color-text: #1c2834;
  --color-text-secondary: #627586;
  --color-text-light: #687b8b;
  --color-border: rgba(44,125,160,0.12);
  --color-border-light: rgba(44,125,160,0.06);

  --shadow-xs: 0 1px 3px rgba(36,90,115,0.04);
  --shadow-sm: 0 2px 8px rgba(36,90,115,0.06);
  --shadow-card: 0 4px 24px rgba(36,90,115,0.08);
  --shadow-card-hover: 0 8px 40px rgba(36,90,115,0.14);
  --shadow-lg: 0 12px 48px rgba(36,90,115,0.15);
  --shadow-xl: 0 20px 60px rgba(36,90,115,0.22);

  --editor-topbar-bg: rgba(18,28,39,0.92);
  --editor-topbar-shadow: 0 18px 50px rgba(0,0,0,0.15);
  --editor-canvas-grid-line: rgba(101,126,152,0.08);
  --editor-select-glow: rgba(44,125,160,0.26);
  --editor-select-bg: rgba(44,125,160,0.06);
  --editor-input-focus-glow: rgba(44,125,160,0.12);

  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;

  background:
    radial-gradient(circle at top left, rgba(88,164,176,0.22), transparent 30%),
    radial-gradient(circle at bottom right, rgba(236,184,101,0.22), transparent 34%),
    linear-gradient(145deg, #f2f6f8, #edf2f7, #f8fbfd);
}

/* Left panel with tab switcher */
.editor-left {
  position: relative;
  width: 280px;
  flex-shrink: 0;
  margin: 12px 0 12px 12px;
  background: var(--color-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width var(--transition);
}
.editor-left.collapsed {
  width: 36px;
  margin-right: 0;
}

.left-tabs {
  display: flex; gap: 0;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.left-tab {
  flex: 1; padding: .6rem .4rem;
  border: none; background: transparent;
  font-size: .8rem; font-weight: 600;
  color: var(--color-text-light);
  cursor: pointer; transition: all .15s;
  border-bottom: 2px solid transparent;
}
.left-tab:hover { color: var(--color-text); }
.left-tab.active {
  color: var(--color-primary-dark);
  border-bottom-color: var(--color-primary);
}

.editor-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 12px 8px;
}

.editor-right {
  width: 300px;
  flex-shrink: 0;
  margin: 12px 12px 12px 0;
  background: var(--color-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  box-shadow: var(--shadow-card);
  overflow-y: auto;
  transition: width var(--transition);
}
.editor-right.collapsed {
  width: 0;
  margin: 12px 0;
  border: none;
  box-shadow: none;
}

.toggle-btn {
  position: absolute;
  top: 12px;
  right: 6px;
  z-index: 2;
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-card);
  cursor: pointer;
  font-size: 10px;
  display: grid;
  place-items: center;
  color: var(--color-text-light);
  transition: all var(--transition-fast);
}
.toggle-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}
</style>
