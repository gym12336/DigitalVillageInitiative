<!-- src/modules/builder/editor/BigComponentEditor.vue -->
<template>
  <div class="editor-root">
    <!-- Left Panel: Component Library -->
    <aside class="editor-left" :class="{ collapsed: leftCollapsed }">
      <ComponentLibrary v-if="!leftCollapsed" />
      <button class="toggle-btn" @click="leftCollapsed = !leftCollapsed" :title="leftCollapsed ? '展开组件库' : '收起组件库'">
        {{ leftCollapsed ? '▶' : '◀' }}
      </button>
    </aside>

    <!-- Center: Canvas -->
    <main class="editor-center">
      <EditorCanvas />
    </main>

    <!-- Right Panel: Properties -->
    <aside class="editor-right" :class="{ collapsed: !state.selectedId }">
      <PropertyPanel />
    </aside>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ComponentLibrary from './ComponentLibrary.vue'
import EditorCanvas from './EditorCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import { state, load } from './stageEditor.js'

const leftCollapsed = ref(false)

onMounted(() => {
  load() // Restore from localStorage if available
})
</script>

<style scoped>
.editor-root {
  display: flex; height: calc(100vh - 60px); overflow: hidden;
  background: #e8e4dc;
}
.editor-left {
  position: relative; width: 240px; flex-shrink: 0;
  background: var(--color-card); border-right: 1px solid var(--color-border);
  display: flex; flex-direction: column; overflow-y: auto;
  transition: width var(--transition);
}
.editor-left.collapsed { width: 32px; }
.editor-center { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.editor-right {
  width: 280px; flex-shrink: 0;
  background: var(--color-card); border-left: 1px solid var(--color-border);
  overflow-y: auto; transition: width var(--transition);
}
.editor-right.collapsed { width: 0; border-left: none; }
.toggle-btn {
  position: absolute; top: 8px; right: 4px; z-index: 2;
  width: 24px; height: 24px; border: 1px solid var(--color-border);
  border-radius: 50%; background: var(--color-card); cursor: pointer;
  font-size: 10px; display: grid; place-items: center; color: var(--color-text-light);
  transition: all var(--transition-fast);
}
.toggle-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
</style>
