<template>
  <!-- 渲染单个组件节点的 view。消费的是 renderer.renderWork 产出的纯数据 node，
       与静态导出 exportSite 是同一棵渲染描述——「一套渲染逻辑，两个消费端」。 -->
  <div class="node-inner">
    <!-- 标题 -->
    <component
      :is="node.view.level || 'h2'"
      v-if="node.type === 'heading'"
      class="c-heading"
      :style="{ textAlign: node.view.align }"
    >{{ node.view.text || '（空标题）' }}</component>

    <!-- 文本 -->
    <p v-else-if="node.type === 'text'" class="c-text" :style="{ textAlign: node.view.align }">
      {{ node.view.content || '（空文本）' }}
    </p>

    <!-- 图片 -->
    <figure v-else-if="node.type === 'image'" class="c-image">
      <img v-if="node.view.src" :src="node.view.src" :alt="node.view.alt" />
      <div v-else class="img-placeholder">图片待补充</div>
      <figcaption v-if="node.view.caption">{{ node.view.caption }}</figcaption>
    </figure>

    <!-- 大组件统一卡片外壳 -->
    <div v-else class="card">
      <h3 v-if="node.view.title" class="card-title">{{ node.view.title }}</h3>

      <p v-if="node.view.missing" class="missing">📭 数据源为空，待补充</p>

      <template v-else>
        <!-- KPI -->
        <div v-if="node.type === 'kpiGrid'" class="kpi-grid">
          <div v-for="(k, i) in node.view.items" :key="i" class="kpi">
            <span class="kpi-num">{{ k.value }}<i>{{ k.unit }}</i></span>
            <span class="kpi-label">{{ k.name }}</span>
          </div>
        </div>

        <!-- 帮扶前后对比 -->
        <div v-else-if="node.type === 'beforeAfter'" class="cmp-list">
          <div v-for="(m, i) in node.view.items" :key="i" class="cmp-row">
            <div class="cmp-head">
              <span>{{ m.name }}</span>
              <span :class="m.up ? 'up' : m.down ? 'down' : ''">{{ m.deltaLabel }}</span>
            </div>
            <div class="bar-line">
              <span class="bar-tag">前</span>
              <div class="bar-track"><div class="bar before" :style="{ width: m.beforePct + '%' }" /></div>
              <span>{{ m.before }}{{ m.unit }}</span>
            </div>
            <div class="bar-line">
              <span class="bar-tag">后</span>
              <div class="bar-track"><div class="bar after" :style="{ width: m.afterPct + '%' }" /></div>
              <span>{{ m.after }}{{ m.unit }}</span>
            </div>
          </div>
        </div>

        <!-- 时间轴 -->
        <ol v-else-if="node.type === 'timeline'" class="timeline">
          <li v-for="(t, i) in node.view.events" :key="i">
            <span class="tl-dot" />
            <div>
              <p class="tl-name">{{ t.name }}</p>
              <p v-if="t.note" class="tl-note">{{ t.note }}</p>
              <span class="tl-type">{{ t.type }}</span>
            </div>
          </li>
        </ol>

        <!-- 人物墙 -->
        <div v-else-if="node.type === 'peopleWall'" class="people-wall">
          <article v-for="(p, i) in node.view.people" :key="i" class="person">
            <div class="avatar" :style="{ background: p.color }">{{ p.initial }}</div>
            <p class="person-name">{{ p.name }}<span v-if="p.role" class="person-role"> · {{ p.role }}</span></p>
            <p v-if="p.quote" class="person-quote">“{{ p.quote }}”</p>
          </article>
        </div>

        <!-- 地图点位（骨架：卫星地图为二期，本期先落地点标签占位）-->
        <div v-else-if="node.type === 'mapPoint'" class="map-point">
          <span class="map-pin">📍</span>
          <span class="map-place">{{ node.view.place || '（未指定地点）' }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  node: { type: Object, required: true },
})
</script>

<style scoped>
.node-inner { height: 100%; }
.card { padding: 1.2rem 1.3rem; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; box-shadow: var(--shadow-sm); height: 100%; }
.card-title { margin: 0 0 .9rem; font-size: 1rem; color: var(--color-primary-dark); }
.missing { margin: 0; font-size: .84rem; color: var(--color-text-light); }

.c-heading { margin: 0; color: var(--color-primary-dark); }
.c-text { margin: 0; color: var(--color-text-secondary); white-space: pre-wrap; }
.c-image { margin: 0; height: 100%; }
.c-image img { width: 100%; border-radius: 12px; object-fit: cover; }
.img-placeholder { display: grid; place-items: center; height: 100%; min-height: 100px; color: var(--color-text-light); background: var(--color-bg); border: 1px dashed var(--color-border); border-radius: 12px; }
.c-image figcaption { font-size: .78rem; color: var(--color-text-light); text-align: center; margin-top: .4rem; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: .7rem; }
.kpi { display: flex; flex-direction: column; gap: .25rem; padding: .8rem .6rem; text-align: center; background: var(--color-bg); border-radius: 10px; }
.kpi-num { font-size: 1.4rem; font-weight: 700; color: var(--color-primary-dark); }
.kpi-num i { font-size: .8rem; font-style: normal; color: var(--color-text-light); margin-left: 2px; }
.kpi-label { font-size: .78rem; color: var(--color-text-secondary); }

.cmp-list { display: flex; flex-direction: column; gap: .9rem; }
.cmp-head { display: flex; justify-content: space-between; font-size: .88rem; font-weight: 600; margin-bottom: .35rem; }
.cmp-head .up { color: var(--color-primary); }
.cmp-head .down { color: var(--color-highlight); }
.bar-line { display: flex; align-items: center; gap: .5rem; margin-bottom: .3rem; font-size: .76rem; color: var(--color-text-secondary); }
.bar-tag { width: 1.4em; color: var(--color-text-light); }
.bar-track { flex: 1; height: 11px; background: var(--color-bg); border-radius: 50px; overflow: hidden; }
.bar { height: 100%; border-radius: 50px; transition: width .5s ease; }
.bar.before { background: #cdd6c4; }
.bar.after { background: var(--color-primary); }

.timeline { list-style: none; margin: 0; padding: 0; }
.timeline li { position: relative; padding: 0 0 .9rem 1.4rem; border-left: 2px solid var(--color-border); }
.timeline li:last-child { border-left-color: transparent; padding-bottom: 0; }
.tl-dot { position: absolute; left: -6px; top: 3px; width: 10px; height: 10px; border-radius: 50%; background: var(--color-primary); }
.tl-name { margin: 0; font-size: .88rem; font-weight: 600; }
.tl-note { margin: .2rem 0; font-size: .8rem; color: var(--color-text-secondary); }
.tl-type { font-size: .7rem; color: var(--color-primary); background: var(--color-accent); padding: .1rem .5rem; border-radius: 50px; }

.people-wall { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: .8rem; }
.person { display: flex; flex-direction: column; align-items: center; gap: .35rem; padding: .9rem .5rem; text-align: center; background: var(--color-bg); border-radius: 10px; }
.avatar { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; color: #fff; font-size: 1.05rem; font-weight: 700; }
.person-name { margin: 0; font-size: .85rem; font-weight: 600; }
.person-role { font-weight: 400; color: var(--color-text-light); }
.person-quote { margin: 0; font-size: .78rem; color: var(--color-text-secondary); }

.map-point { display: flex; align-items: center; gap: .6rem; padding: 1.1rem; background: var(--color-bg); border-radius: 10px; }
.map-pin { font-size: 1.5rem; }
.map-place { font-size: 1rem; font-weight: 600; color: var(--color-primary-dark); }
</style>
