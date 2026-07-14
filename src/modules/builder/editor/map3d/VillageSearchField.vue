<!-- src/modules/builder/editor/map3d/VillageSearchField.vue -->
<template>
  <div class="vsf-root">
    <!-- 省份下拉 -->
    <div class="pp-field">
      <label>省份筛选（可选）</label>
      <select v-model="filterProvince" @change="onFilterChange">
        <option v-for="p in PROVINCE_MAP" :key="p.adminCode" :value="p.adminCode">
          {{ p.name }}
        </option>
      </select>
    </div>

    <!-- 市/区县关键字 -->
    <div class="pp-field">
      <label>市 / 区县关键字（可选）</label>
      <input
        type="text"
        v-model="filterCity"
        placeholder="如：普洱市"
        @input="onFilterChange"
      />
    </div>

    <!-- 搜索框 -->
    <div class="pp-field">
      <label>村庄名称</label>
      <div class="vsf-search-row">
        <input
          type="text"
          v-model="searchText"
          placeholder="输入村名，如：和平村"
          @input="onSearchInput"
          @keydown.enter="onSearchEnter"
        />
        <button class="vsf-search-btn" @click="doSearch" :disabled="searching">
          {{ searching ? '搜索中...' : '🔍 搜索' }}
        </button>
      </div>
    </div>

    <!-- 候选下拉 -->
    <div v-if="candidates.length > 0" class="vsf-candidates">
      <div
        v-for="(c, i) in candidates"
        :key="i"
        class="vsf-candidate-item"
        @click="selectCandidate(c)"
      >
        <span class="vsf-cand-name">{{ c.name }}</span>
        <span class="vsf-cand-addr">{{ formatAddress(c) }}</span>
      </div>
    </div>

    <!-- 已定位状态 -->
    <div v-if="isLocated" class="vsf-located">
      <span>✅ 已定位到：{{ modelValue.villageName }}（{{ modelValue.region }}）</span>
      <a class="vsf-research" @click="resetSearch">重新搜索</a>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="vsf-error">{{ errorMsg }}</div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { searchVillages, normalizeRegion, PROVINCE_MAP } from './tianditu.js'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    // { villageName, centerLng, centerLat, region, filterProvince, filterCity }
  },
})

const emit = defineEmits(['update:modelValue'])

const searchText = ref('')
const filterProvince = ref(props.modelValue.filterProvince || '')
const filterCity = ref(props.modelValue.filterCity || '')
const candidates = ref([])
const searching = ref(false)
const errorMsg = ref('')
const isLocated = ref(false)

// 初始化：如果已定位显示已定位状态
watch(
  () => props.modelValue.centerLng,
  (val) => {
    if (val != null) {
      isLocated.value = true
    }
  },
  { immediate: true }
)

let debounceTimer = null

function onSearchInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    doSearch()
  }, 300)
}

function onSearchEnter() {
  clearTimeout(debounceTimer)
  doSearch()
}

onUnmounted(() => {
  clearTimeout(debounceTimer)
})

function onFilterChange() {
  emit('update:modelValue', {
    ...props.modelValue,
    filterProvince: filterProvince.value,
    filterCity: filterCity.value,
  })
}

async function doSearch() {
  const name = searchText.value.trim()
  if (!name) return

  searching.value = true
  errorMsg.value = ''
  candidates.value = []

  try {
    const results = await searchVillages({
      name,
      provinceCode: filterProvince.value,
      cityKeyword: filterCity.value,
    })

    if (results.length === 0) {
      errorMsg.value = '未找到该村庄，请检查名称或缩小行政区范围'
    } else {
      candidates.value = results
    }
  } catch (e) {
    errorMsg.value = '搜索失败，请重试'
    console.error('[VillageSearchField] 搜索失败:', e)
  } finally {
    searching.value = false
  }
}

function selectCandidate(candidate) {
  const region = normalizeRegion(candidate.address)
  emit('update:modelValue', {
    ...props.modelValue,
    villageName: candidate.name,
    centerLng: candidate.lng,
    centerLat: candidate.lat,
    region: region,
    filterProvince: filterProvince.value,
    filterCity: filterCity.value,
  })
  candidates.value = []
  errorMsg.value = ''
  isLocated.value = true
}

function resetSearch() {
  isLocated.value = false
  searchText.value = ''
  candidates.value = []
  errorMsg.value = ''
  emit('update:modelValue', {
    ...props.modelValue,
    villageName: '',
    centerLng: null,
    centerLat: null,
    region: '',
  })
}

function formatAddress(candidate) {
  return normalizeRegion(candidate.address) || candidate.address || ''
}
</script>

<style scoped>
.vsf-root {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.vsf-search-row {
  display: flex;
  gap: 0.4rem;
}

.vsf-search-row input {
  flex: 1;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.82rem;
  outline: none;
  background: var(--color-bg);
  color: var(--color-text);
}

.vsf-search-row input:focus {
  border-color: #2c7da0;
  box-shadow: 0 0 0 3px var(--editor-input-focus-glow);
}

.vsf-search-btn {
  padding: 0.45rem 0.8rem;
  border: 1px solid #2c7da0;
  border-radius: 12px;
  background: #2c7da0;
  color: #fff;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.vsf-search-btn:hover {
  background: #245a73;
}

.vsf-search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.vsf-candidates {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  max-height: 200px;
  overflow-y: auto;
  background: var(--color-card);
}

.vsf-candidate-item {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0.7rem;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}

.vsf-candidate-item:last-child {
  border-bottom: none;
}

.vsf-candidate-item:hover {
  background: rgba(44, 125, 160, 0.04);
}

.vsf-cand-name {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-text);
}

.vsf-cand-addr {
  font-size: 0.72rem;
  color: var(--color-text-light);
  margin-top: 0.15rem;
}

.vsf-located {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.7rem;
  background: rgba(44, 125, 160, 0.05);
  border-radius: 10px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
  gap: 0.3rem;
}

.vsf-research {
  color: #2c7da0;
  cursor: pointer;
  font-size: 0.74rem;
  text-decoration: underline;
}

.vsf-error {
  color: #c0392b;
  font-size: 0.76rem;
  padding: 0.4rem 0.6rem;
  background: rgba(192, 57, 43, 0.05);
  border-radius: 8px;
}
</style>
