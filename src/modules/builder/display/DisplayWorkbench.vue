<!-- src/modules/builder/display/DisplayWorkbench.vue -->
<template>
  <div class="editor-root">
    <!-- Left Panel: Extended Component Library -->
    <aside class="editor-left" :class="{ collapsed: leftCollapsed }">
      <DisplayComponentLibrary ref="libRef" v-if="!leftCollapsed" />
      <button class="toggle-btn" @click="leftCollapsed = !leftCollapsed" :title="leftCollapsed ? '展开组件库' : '收起组件库'">
        {{ leftCollapsed ? '▶' : '◀' }}
      </button>
    </aside>

    <!-- Center: Canvas -->
    <main class="editor-center">
      <EditorCanvas save-key="builder-display-save" />
    </main>

    <!-- Right Panel: Properties -->
    <aside class="editor-right" :class="{ collapsed: !state.selectedId }">
      <PropertyPanel />
    </aside>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DisplayComponentLibrary from './DisplayComponentLibrary.vue'
import EditorCanvas from '../editor/EditorCanvas.vue'
import PropertyPanel from '../editor/PropertyPanel.vue'
import { state, resetState } from '../editor/stageEditor.js'

const leftCollapsed = ref(false)
const libRef = ref(null)

onMounted(() => {
  resetState()
  // EditorCanvas will load from 'builder-display-save' via its saveKey prop
  // Refresh custom big component list
  if (libRef.value?.refreshBigComponents) {
    libRef.value.refreshBigComponents()
  }
})
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

.editor-left {
  position: relative;
  width: 260px;
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
  overflow-y: auto;
  transition: width var(--transition);
}
.editor-left.collapsed {
  width: 36px;
  margin-right: 0;
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
