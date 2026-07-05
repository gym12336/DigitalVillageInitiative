<template>
  <footer class="site-footer">
    <div class="footer-cols">
      <div class="col brand-col">
        <p class="f-brand">🌾 数乡计划</p>
        <p class="f-slogan">连接乡村与青年，让每一次下乡都有回响</p>
      </div>
      <nav class="col link-col">
        <router-link to="/">首页</router-link>
        <router-link v-for="m in navModules" :key="m.id" :to="m.path">{{ m.name }}</router-link>
      </nav>
      <div class="col contact-col">
        <p class="col-title">联系我们</p>
        <p>📧 shuxiang@example.com</p>
        <p>📱 123-4567-8900</p>
      </div>
    </div>
    <p class="copyright">© 2026 数乡计划 · 大学生公益项目 · 用数字技术架起青年与乡村的桥梁</p>
  </footer>
</template>

<script setup>
import { modules } from '@/modules.config.js'
const navModules = modules.filter((m) => m.enabled)
</script>

<style scoped>
.site-footer {
  margin-top: 3rem;
  padding: 3rem clamp(1.4rem, 5vw, 40px) 1.6rem;
  background: #3a4d2f; color: rgba(250, 248, 245, .72);
}
.footer-cols {
  max-width: 1180px; margin: 0 auto;
  display: flex; flex-wrap: wrap; gap: 2rem; justify-content: space-between;
}
.col { min-width: 200px; }
.f-brand { font-family: var(--sx-serif); font-weight: 700; font-size: 1.2rem; color: #fff; margin: 0 0 .7rem; }
.f-slogan { font-size: 14px; margin: 0; max-width: 260px; line-height: 1.7; }
.link-col { display: flex; flex-wrap: wrap; gap: .6rem 1.4rem; align-content: flex-start; }
.link-col a { font-size: 14px; color: rgba(250, 248, 245, .72); transition: color .2s ease; }
.link-col a:hover { color: var(--color-accent); }
.col-title { color: #fff; font-weight: 600; margin: 0 0 .7rem; font-size: 15px; }
.contact-col p { margin: .35rem 0; font-size: 14px; }
.copyright {
  max-width: 1180px; margin: 2rem auto 0; padding-top: 1.3rem;
  border-top: 1px solid rgba(250, 248, 245, .15); font-size: 12px; color: rgba(250, 248, 245, .5); text-align: center;
}
</style>
