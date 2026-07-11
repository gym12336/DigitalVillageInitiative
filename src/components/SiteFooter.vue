<template>
  <footer class="site-footer museum-grid">
    <div class="footer-main">
      <div class="brand-col">
        <p class="archive-no">DIGITAL FIELD ARCHIVE · SX-2026</p>
        <div class="footer-brand-lockup" aria-label="数乡计划·乡村数字资源库">
          <img src="/brand/shuxiang-logo-mark-v3.png" alt="" />
          <div>
            <strong>数乡计划</strong>
            <span>乡村数字资源库</span>
          </div>
        </div>
        <p class="f-slogan">用数字技术整理田野，以青年行动回应乡村。让每一次抵达都成为可留存、可共享、可继续生长的档案。</p>
      </div>

      <nav class="link-col" aria-label="页脚导航">
        <p class="col-title">展厅目录 / HALLS</p>
        <div class="link-grid">
          <router-link v-for="(m, index) in navModules" :key="m.id" :to="m.path">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>{{ m.name }}
          </router-link>
        </div>
      </nav>

      <div class="statement-col">
        <p class="col-title">开放说明 / NOTICE</p>
        <p>本平台处于建设与资料采集阶段，展示数据与素材将由实践团队逐步核验、补充。</p>
        <router-link to="/about" class="statement-link">了解计划与参与方式 →</router-link>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© 2026 数乡计划 · 大学生公益实践项目</p>
      <p>田野档案 · 青年共创 · 数字乡村</p>
    </div>
  </footer>
</template>

<script setup>
import { modules } from '@/modules.config.js'
const navModules = modules.filter((m) => m.enabled)
</script>

<style scoped>
.site-footer {
  position: relative;
  overflow: hidden;
  padding: clamp(4rem, 8vw, 6.5rem) clamp(1.3rem, 5vw, 4rem) 1.6rem;
  color: rgba(243, 238, 228, .7);
  background: linear-gradient(180deg, #182c26 0%, var(--museum-black) 24%, #050d0b 100%);
}
.site-footer::before {
  content: '';
  position: absolute;
  top: 0;
  right: 6vw;
  left: 6vw;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--bronze), transparent);
}
.site-footer::after {
  content: '';
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  left: 0;
  height: 92px;
  pointer-events: none;
  background: linear-gradient(180deg, var(--paper-deep) 0%, rgba(24,44,38,.52) 58%, transparent 100%);
}
.footer-main {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.25fr 1fr .9fr;
  gap: clamp(2.5rem, 6vw, 6rem);
  width: min(100%, 1240px);
  margin: 0 auto;
}
.archive-no { color: var(--jade-light); opacity: .72; }
.footer-brand-lockup { display: inline-flex; align-items: center; gap: 14px; margin: 1rem 0 1.35rem; padding: 4px 0; }
.footer-brand-lockup img { width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 8px 18px rgba(0,0,0,.28)); }
.footer-brand-lockup div { display: flex; flex-direction: column; gap: 4px; }
.footer-brand-lockup strong { color: #f5efe2; font-family: var(--font-display); font-size: 1.45rem; font-weight: 600; letter-spacing: .16em; }
.footer-brand-lockup span { color: var(--jade-light); font-family: var(--font-mono); font-size: 9px; letter-spacing: .24em; }
.f-slogan { max-width: 430px; color: rgba(243, 238, 228, .58); font-size: 13px; line-height: 1.9; }
.col-title { margin: 0 0 1.2rem; color: var(--bronze); font-family: var(--font-mono); font-size: 10px; letter-spacing: .16em; }
.link-grid { display: grid; grid-template-columns: repeat(2, minmax(110px, 1fr)); gap: 0 1.4rem; }
.link-grid a { display: flex; gap: 10px; padding: .58rem 0; color: rgba(243, 238, 228, .7); border-bottom: 1px solid var(--museum-line); font-size: 13px; }
.link-grid a span { color: var(--jade-light); font-family: var(--font-mono); font-size: 10px; }
.link-grid a:hover { color: var(--data-glow); }
.statement-col p:not(.col-title) { color: rgba(243, 238, 228, .58); font-size: 13px; line-height: 1.85; }
.statement-link { display: inline-block; margin-top: 1.2rem; color: var(--bronze-light); font-size: 12px; }
.statement-link:hover { color: var(--data-glow); }
.footer-bottom { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 1rem; width: min(100%, 1240px); margin: 3.5rem auto 0; padding-top: 1.25rem; border-top: 1px solid var(--museum-line); color: rgba(243, 238, 228, .34); font-family: var(--font-mono); font-size: 9px; letter-spacing: .08em; }
@media (max-width: 850px) {
  .footer-main { grid-template-columns: 1fr 1fr; }
  .brand-col { grid-column: 1 / -1; }
}
@media (max-width: 560px) {
  .footer-main { grid-template-columns: 1fr; }
  .brand-col { grid-column: auto; }
  .footer-bottom { flex-direction: column; }
}
</style>
