<template>
  <div v-if="items.length" class="draft-review">
    <div class="dr-head">
      <span class="dr-title">🕓 待审校（{{ items.length }}）</span>
      <div class="dr-batch">
        <button class="btn tiny" @click="$emit('adopt-all')">全部采纳</button>
        <button class="btn tiny ghost" @click="$emit('discard-all')">全部丢弃</button>
      </div>
    </div>

    <div v-for="(it, i) in items" :key="i" class="draft-card">
      <!-- 人物 -->
      <template v-if="kind === 'people'">
        <input v-model="it.name" class="cell" placeholder="姓名" />
        <input v-model="it.role" class="cell" placeholder="身份" />
        <input v-model="it.quote" class="cell wide" placeholder="一句话" />
        <select v-model="it.category" class="cell cat-sel"><option value="">分类</option><option>村干部</option><option>返乡青年</option><option>村民</option><option>外来帮扶</option><option>手艺人</option><option>其他</option></select>
      </template>
      <!-- 指标 -->
      <template v-else-if="kind === 'metrics'">
        <input v-model="it.name" class="cell" placeholder="指标名" />
        <input v-model="it.value" class="cell" placeholder="数值" />
        <input v-model="it.unit" class="cell" placeholder="单位" />
        <select v-model="it.category" class="cell cat-sel"><option value="">分类</option><option>产业</option><option>教育</option><option>文化</option><option>基础设施</option><option>民生</option><option>生态</option><option>其他</option></select>
      </template>
      <!-- 足迹 -->
      <template v-else-if="kind === 'places'">
        <input v-model="it.name" class="cell" placeholder="地点名" />
        <input v-model="it.date" class="cell" placeholder="日期" />
        <input v-model="it.event" class="cell wide" placeholder="做了什么" />
        <select v-model="it.category" class="cell cat-sel"><option value="">分类</option><option>自然景观</option><option>建筑遗存</option><option>公共机构</option><option>产业场所</option><option>其他</option></select>
      </template>
      <!-- 材料要点 -->
      <template v-else>
        <input v-model="it.name" class="cell wide" placeholder="材料名" />
        <input v-model="it.note" class="cell" placeholder="备注" />
      </template>

      <span v-if="it.sourceFile" class="src" :title="it.sourceFile">📄 {{ it.sourceFile }}</span>
      <span class="conf">{{ pct(it.confidence) }}</span>
      <button class="btn tiny" @click="$emit('adopt', i)">采纳</button>
      <button class="chip-x" aria-label="丢弃" @click="$emit('discard', i)">×</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  kind: { type: String, required: true }, // 'people' | 'metrics' | 'materialHints'
  items: { type: Array, required: true },
})
defineEmits(['adopt', 'discard', 'adopt-all', 'discard-all'])

function pct(c) {
  const n = Number(c)
  return Number.isFinite(n) ? `把握 ${Math.round(n * 100)}%` : ''
}
</script>

<style scoped>
.draft-review { margin-top: 1.2rem; padding-top: 1rem; border-top: 1px dashed var(--color-border); }
.dr-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .7rem; flex-wrap: wrap; gap: .5rem; }
.dr-title { font-size: .9rem; font-weight: 600; color: var(--color-primary-dark); }
.dr-batch { display: flex; gap: .5rem; }

.draft-card { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; flex-wrap: wrap; }
.cell {
  padding: .45rem .6rem; font-size: .86rem; color: var(--color-text);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 8px; outline: none; min-width: 80px;
}
.cell.wide { flex: 1; min-width: 140px; }
.cell:focus { border-color: var(--color-primary); }
.cat-sel { min-width: 80px; font-size: .78rem; cursor: pointer; appearance: auto; }
.src {
  font-size: .72rem; color: var(--color-primary-dark); background: var(--color-accent);
  padding: .12rem .5rem; border-radius: 50px; max-width: 130px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.conf { font-size: .74rem; color: var(--color-text-light); white-space: nowrap; }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.tiny { padding: .35rem .9rem; font-size: .8rem; background: var(--color-accent); color: var(--color-primary-dark); }
.btn.tiny.ghost { background: transparent; border: 1px dashed var(--color-border); color: var(--color-text-secondary); }
.chip-x { border: none; background: transparent; cursor: pointer; font-size: 1.2rem; line-height: 1; color: var(--color-text-light); }
.chip-x:hover { color: var(--color-highlight); }
</style>
