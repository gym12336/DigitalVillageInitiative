<template>
  <section class="guide-detail">
    <div class="container">
      <nav class="breadcrumb" aria-label="面包屑导航">
        <router-link to="/">首页</router-link>
        <span>/</span>
        <router-link to="/guide">实践攻略</router-link>
        <span>/</span>
        <span>{{ resource?.title || '未找到攻略' }}</span>
      </nav>

      <article v-if="resource" class="detail-layout">
        <header class="detail-hero">
          <div class="meta-row">
            <span>{{ stageName(resource.stage) }}</span>
            <span>{{ resource.type }}</span>
            <span>{{ resource.format }}</span>
          </div>
          <h1>{{ resource.title }}</h1>
          <p class="summary">{{ resource.summary }}</p>
          <dl class="detail-facts">
            <div>
              <dt>最近更新</dt>
              <dd>{{ resource.updatedAt }}</dd>
            </div>
            <div>
              <dt>预计阅读</dt>
              <dd>{{ resource.readingTime }}</dd>
            </div>
            <div>
              <dt>资源方式</dt>
              <dd>{{ hasDownloadableAttachments(resource) ? '含附件下载' : '在线阅读' }}</dd>
            </div>
          </dl>
        </header>

        <aside class="side-panel" aria-label="攻略摘要">
          <section>
            <h2>适用场景</h2>
            <ul>
              <li v-for="scene in resource.applicableScenes" :key="scene">{{ scene }}</li>
            </ul>
          </section>
          <section>
            <h2>配套模板或附件</h2>
            <div v-if="hasDownloadableAttachments(resource)" class="attachment-list">
              <a
                v-for="attachment in downloadableAttachments"
                :key="attachment.href"
                :href="attachment.href"
                download
              >
                <span>{{ attachment.name }}</span>
                <small>{{ attachment.format }}</small>
              </a>
            </div>
            <p v-else class="muted">当前资源以在线阅读为主，未配置下载附件。</p>
          </section>
        </aside>

        <div class="content-flow">
          <section class="content-section" aria-labelledby="steps-title">
            <h2 id="steps-title">正文步骤</h2>
            <article v-for="(section, index) in resource.sections" :key="section.heading" class="step-block">
              <span class="step-no">{{ String(index + 1).padStart(2, '0') }}</span>
              <div>
                <h3>{{ section.heading }}</h3>
                <p>{{ section.body }}</p>
                <ol v-if="section.steps?.length">
                  <li v-for="step in section.steps" :key="step">{{ step }}</li>
                </ol>
                <div v-if="section.tip" class="callout">
                  <strong>提示</strong>
                  <p>{{ section.tip }}</p>
                </div>
                <div v-if="section.example" class="example-box">
                  <strong>示例</strong>
                  <p>{{ section.example }}</p>
                </div>
              </div>
            </article>
          </section>

          <section class="content-section" aria-labelledby="checklist-title">
            <h2 id="checklist-title">可勾选操作清单</h2>
            <div class="checklist">
              <label v-for="item in resource.checklist" :key="item">
                <input type="checkbox" />
                <span>{{ item }}</span>
              </label>
            </div>
          </section>

          <section class="content-section" aria-labelledby="mistakes-title">
            <h2 id="mistakes-title">常见错误或注意事项</h2>
            <ul class="mistake-list">
              <li v-for="item in resource.mistakes" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section class="content-section example-section" aria-labelledby="example-title">
            <h2 id="example-title">示例内容</h2>
            <h3>{{ resource.example.title }}</h3>
            <p>{{ resource.example.content }}</p>
          </section>

          <section class="content-section" aria-labelledby="sources-title">
            <h2 id="sources-title">参考来源</h2>
            <ul class="source-list">
              <li v-for="source in resource.sources" :key="source.link">
                <a :href="source.link" target="_blank" rel="noreferrer">{{ source.name }}</a>
              </li>
            </ul>
          </section>

          <section class="content-section" aria-labelledby="related-title">
            <h2 id="related-title">相关攻略推荐</h2>
            <div class="related-grid">
              <router-link
                v-for="item in relatedResources"
                :key="item.id"
                class="related-card"
                :to="{ name: 'guide-detail', params: { slug: item.slug } }"
              >
                <span>{{ stageName(item.stage) }} · {{ item.type }}</span>
                <strong>{{ item.title }}</strong>
                <p>{{ item.summary }}</p>
              </router-link>
            </div>
          </section>

          <p class="disclaimer">
            本内容为通用参考，不同学校的申报、盖章、报销和结项要求可能不同，请以所在学校当年正式通知为准。
          </p>

          <router-link class="back-link" to="/guide">返回资源中心</router-link>
        </div>
      </article>

      <section v-else class="not-found" role="status">
        <p class="section-kicker">未找到攻略</p>
        <h1>这个攻略暂时不存在</h1>
        <p>可能是链接已更新，或资源还没有上线。你可以返回资源中心重新查找。</p>
        <router-link class="back-link" to="/guide">返回资源中心</router-link>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import data from './guide-data.json'
import { stageName } from './guide-schema.js'
import {
  findGuideResource,
  getRelatedResources,
  hasDownloadableAttachments,
} from './guide-utils.js'

const route = useRoute()
const resources = data.resources
const resource = computed(() => findGuideResource(resources, route.params.slug))
const downloadableAttachments = computed(() =>
  (resource.value?.attachments || []).filter((attachment) => attachment.href),
)
const relatedResources = computed(() => getRelatedResources(resources, resource.value, 3))
</script>

<style scoped>
.guide-detail {
  min-height: 100%;
  padding: 2.2rem 0 4rem;
  background: var(--color-bg);
}

.container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2rem);
}

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  margin-bottom: 1.2rem;
  color: var(--color-text-light);
  font-size: 0.85rem;
}

.breadcrumb a {
  color: var(--color-primary-dark);
  font-weight: 700;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  grid-template-areas:
    "hero side"
    "content side";
  gap: 1.2rem;
  align-items: start;
}

.detail-hero,
.side-panel,
.content-section,
.not-found {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.detail-hero {
  grid-area: hero;
  padding: clamp(1.4rem, 3vw, 2rem);
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.85rem;
}

.meta-row span {
  padding: 0.16rem 0.7rem;
  border-radius: 999px;
  color: var(--color-primary-dark);
  background: var(--color-accent-soft);
  font-size: 0.78rem;
  font-weight: 800;
}

.detail-hero h1 {
  color: var(--color-primary-dark);
  font-size: clamp(30px, 4vw, 44px);
}

.summary {
  margin-top: 0.9rem;
  color: var(--color-text-secondary);
  font-size: 1.04rem;
  line-height: 1.8;
}

.detail-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin: 1.4rem 0 0;
}

.detail-facts div {
  padding-top: 0.8rem;
  border-top: 1px solid var(--color-border-light);
}

.detail-facts dt {
  color: var(--color-text-light);
  font-size: 0.78rem;
}

.detail-facts dd {
  margin: 0.2rem 0 0;
  color: var(--color-text);
  font-weight: 800;
}

.side-panel {
  position: sticky;
  top: 92px;
  grid-area: side;
  padding: 1.2rem;
}

.side-panel section + section {
  margin-top: 1.3rem;
  padding-top: 1.3rem;
  border-top: 1px solid var(--color-border-light);
}

.side-panel h2,
.content-section h2 {
  color: var(--color-primary-dark);
  font-size: 1.18rem;
}

.side-panel ul {
  margin: 0.75rem 0 0;
  padding-left: 1.1rem;
  color: var(--color-text-secondary);
}

.side-panel li + li {
  margin-top: 0.35rem;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.attachment-list a {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.72rem 0.85rem;
  border-radius: 10px;
  color: var(--color-primary-dark);
  background: var(--color-accent-soft);
  font-weight: 800;
}

.attachment-list small {
  color: var(--color-text-secondary);
  font-weight: 700;
}

.muted {
  margin-top: 0.65rem;
  color: var(--color-text-light);
  line-height: 1.7;
}

.content-flow {
  grid-area: content;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.content-section {
  padding: clamp(1.2rem, 3vw, 1.6rem);
}

.step-block {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 1rem;
  padding-top: 1.1rem;
}

.step-block + .step-block {
  margin-top: 1rem;
  border-top: 1px solid var(--color-border-light);
}

.step-no {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #fff;
  background: var(--color-primary);
  font-weight: 900;
}

.step-block h3,
.example-section h3 {
  color: var(--color-text);
  font-size: 1.08rem;
}

.step-block p,
.example-section p {
  margin-top: 0.5rem;
  color: var(--color-text-secondary);
  line-height: 1.85;
}

.step-block ol {
  margin: 0.8rem 0 0;
  padding-left: 1.2rem;
  color: var(--color-text);
}

.step-block li + li {
  margin-top: 0.3rem;
}

.callout,
.example-box {
  margin-top: 0.9rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
}

.callout {
  background: rgba(107, 140, 92, 0.1);
  border-left: 4px solid var(--color-primary);
}

.example-box {
  background: rgba(232, 201, 155, 0.28);
  border-left: 4px solid var(--color-accent);
}

.callout strong,
.example-box strong {
  color: var(--color-primary-dark);
}

.checklist {
  display: grid;
  gap: 0.65rem;
  margin-top: 0.9rem;
}

.checklist label {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  background: var(--color-bg);
}

.checklist input {
  margin-top: 0.2rem;
  accent-color: var(--color-primary);
}

.mistake-list,
.source-list {
  margin: 0.9rem 0 0;
  padding-left: 1.2rem;
  color: var(--color-text-secondary);
}

.mistake-list li + li,
.source-list li + li {
  margin-top: 0.45rem;
}

.source-list a {
  color: var(--color-primary-dark);
  font-weight: 800;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 0.9rem;
}

.related-card {
  padding: 0.95rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg);
}

.related-card span {
  color: var(--color-highlight);
  font-size: 0.76rem;
  font-weight: 800;
}

.related-card strong {
  display: block;
  margin-top: 0.35rem;
  color: var(--color-text);
}

.related-card p {
  margin-top: 0.35rem;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  line-height: 1.65;
}

.disclaimer {
  padding: 1rem 1.1rem;
  color: #69442f;
  background: #fff5e5;
  border: 1px solid rgba(212, 163, 115, 0.35);
  border-radius: var(--radius);
  line-height: 1.8;
}

.back-link {
  align-self: flex-start;
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  color: #fff;
  background: var(--color-primary);
  font-weight: 800;
}

.not-found {
  max-width: 720px;
  padding: 2rem;
}

.section-kicker {
  margin: 0 0 0.6rem;
  color: var(--color-highlight);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.not-found h1 {
  color: var(--color-primary-dark);
}

.not-found p:not(.section-kicker) {
  margin-top: 0.8rem;
  color: var(--color-text-secondary);
}

.not-found .back-link {
  margin-top: 1.2rem;
}

@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "hero"
      "side"
      "content";
  }

  .side-panel {
    position: static;
  }

  .related-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .detail-facts {
    grid-template-columns: 1fr;
  }

  .step-block {
    grid-template-columns: 1fr;
  }
}
</style>
