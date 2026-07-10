<!-- src/modules/builder/DossierPicker.vue -->
<template>
  <div class="dp-root">
    <template v-if="!isAuthed">
      <span class="dp-label">⚠️ 请先登录「我的实践」</span>
    </template>
    <template v-else-if="selectedDossierId">
      <span class="dp-current">
        📋 {{ selectedTitle || selectedDossierId }}
      </span>
      <button class="dp-switch-btn" @click="showPicker = !showPicker">切换</button>
    </template>
    <template v-else>
      <span class="dp-placeholder">选择关联的实践档案</span>
      <button class="dp-pick-btn" @click="showPicker = !showPicker">选择</button>
    </template>

    <!-- 下拉选择器 -->
    <div v-if="showPicker" class="dp-dropdown">
      <div class="dp-dropdown-header">选择实践档案</div>
      <div v-if="loading" class="dp-loading">加载中...</div>
      <template v-else v-for="team in teamsWithDossiers" :key="team.id">
        <div class="dp-team-label">{{ team.name }}</div>
        <button
          v-for="d in team.dossiers"
          :key="d.id"
          class="dp-item"
          :class="{ active: d.id === selectedDossierId }"
          @click="select(d)"
        >
          {{ d.title || d.id }}
        </button>
      </template>
      <div v-if="allEmpty" class="dp-empty">暂无实践档案，请先创建</div>
    </div>

    <!-- 遮罩层 -->
    <div v-if="showPicker" class="dp-overlay" @click="showPicker = false"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { currentUser, isAuthed, myTeams } from '../practice/mine/auth.js'
import { apiListDossiers } from '../practice/mine/api.js'

const props = defineProps({
  dossierId: { type: String, default: '' },
})

const router = useRouter()
const route = useRoute()

const showPicker = ref(false)
const loading = ref(false)
const teamsWithDossiers = ref([])

const selectedDossierId = computed(() => props.dossierId)

const selectedTitle = computed(() => {
  if (!selectedDossierId.value) return ''
  for (const t of teamsWithDossiers.value) {
    const found = t.dossiers.find(d => d.id === selectedDossierId.value)
    if (found) return found.title
  }
  return ''
})

const allEmpty = computed(() =>
  teamsWithDossiers.value.every(t => t.dossiers.length === 0),
)

async function loadDossiers() {
  if (!isAuthed.value) return
  loading.value = true
  try {
    const teams = myTeams.value
    const result = []
    for (const t of teams) {
      try {
        const dossiers = await apiListDossiers(t.id)
        result.push({ id: t.id, name: t.name, dossiers })
      } catch { /* skip */ }
    }
    teamsWithDossiers.value = result
  } finally {
    loading.value = false
  }
}

function select(d) {
  showPicker.value = false
  const currentPath = route.path
  // 例如 /builder/editor → /builder/editor/d1a2b3
  // 或 /builder/editor/oldId → /builder/editor/d1a2b3
  const base = currentPath.replace(/\/[^/]+$/, '') // 去掉最后一段
  const newPath = `${base}/${d.id}`
  router.replace(newPath)
}

watch(isAuthed, (val) => {
  if (val) loadDossiers()
})

onMounted(() => {
  if (isAuthed.value) loadDossiers()
})
</script>

<style scoped>
.dp-root {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.4rem 0.9rem;
  position: relative;
}
.dp-label, .dp-placeholder {
  font-size: 0.78rem; color: rgba(255,255,255,0.6);
}
.dp-current {
  font-size: 0.78rem; color: rgba(255,255,255,0.9); font-weight: 600;
}
.dp-switch-btn, .dp-pick-btn {
  padding: 0.25rem 0.6rem;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
  font-size: 0.72rem; cursor: pointer;
  transition: all 0.15s;
}
.dp-switch-btn:hover, .dp-pick-btn:hover {
  background: rgba(255,255,255,0.14);
  border-color: rgba(255,255,255,0.35);
}
.dp-overlay {
  position: fixed; inset: 0; z-index: 998;
}
.dp-dropdown {
  position: absolute; top: 100%; left: 0;
  z-index: 999;
  min-width: 260px; max-height: 320px; overflow-y: auto;
  background: #1e2a3a;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  margin-top: 6px;
}
.dp-dropdown-header {
  padding: 0.6rem 1rem;
  font-size: 0.72rem; color: rgba(255,255,255,0.5);
  text-transform: uppercase; letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.dp-loading, .dp-empty {
  padding: 1rem; text-align: center;
  font-size: 0.78rem; color: rgba(255,255,255,0.4);
}
.dp-team-label {
  padding: 0.4rem 1rem 0.2rem;
  font-size: 0.68rem; color: rgba(255,255,255,0.35);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.dp-item {
  display: block; width: 100%;
  padding: 0.5rem 1rem;
  border: none; background: transparent;
  text-align: left;
  font-size: 0.82rem; color: rgba(255,255,255,0.8);
  cursor: pointer;
  transition: background 0.12s;
}
.dp-item:hover { background: rgba(255,255,255,0.06); }
.dp-item.active {
  background: rgba(44,125,160,0.2);
  color: #56ccf2;
}
</style>
