<template>
  <div class="stage">
    <section class="block">
      <div class="result-head">
        <div>
          <h2 class="block-title">🎉 实践成果</h2>
          <p class="block-desc">
            以下成果卡由档案里的结构化数据自动生成。
            <template v-if="dossier.plan?.targetVillage">目标村：{{ dossier.plan.targetVillage }}。</template>
          </p>
        </div>
        <button class="btn ghost" @click="onDiy">进入成果搭建台 DIY ↗</button>
      </div>
    </section>

    <ResultCards :dossier="dossier" />

    <section class="block diy-note">
      <p>
        「成果搭建台」是一个低代码可视化工作台：把大组件 + 基础组件拖进栅格画布，
        插槽自动从本档案灌数据，DIY 微调后可导出 JSON 或一个双击即开的静态展示网站。
      </p>
    </section>

    <AppToast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ResultCards from './ResultCards.vue'
import AppToast from '@/components/AppToast.vue'

const props = defineProps({
  dossier: { type: Object, required: true },
})

const route = useRoute()
const router = useRouter()
const toastRef = ref(null)
function onDiy() {
  // 带上本档案 id 作为数据源 + 当前队 id（作品持久化归属），直达成果搭建台。
  const query = { source: props.dossier.id }
  const teamId = route.params.teamId
  if (teamId) query.team = teamId
  router.push({ path: '/practice/studio/edit', query })
}
</script>

<style scoped>
.stage { display: flex; flex-direction: column; gap: 1.6rem; }
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .4rem; }
.block-desc { margin: 0; font-size: .88rem; color: var(--color-text-secondary); }
.result-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.btn.ghost {
  flex-shrink: 0; padding: .6rem 1.3rem; border-radius: 50px; cursor: pointer; font-weight: 600; font-size: .88rem;
  background: transparent; border: 1px solid var(--color-primary); color: var(--color-primary); transition: all var(--transition);
}
.btn.ghost:hover { background: var(--color-primary); color: #fff; }
.diy-note { padding: 1.2rem 1.4rem; background: var(--color-bg); border: 1px dashed var(--color-border); border-radius: var(--radius); }
.diy-note p { margin: 0; font-size: .86rem; color: var(--color-text-secondary); line-height: 1.7; }
</style>
