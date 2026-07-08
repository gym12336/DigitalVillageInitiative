<template>
  <footer class="site-footer">
    <div class="footer-cols">
      <div class="col brand-col">
        <p class="f-brand">🌾 数乡计划</p>
        <p class="f-slogan">连接乡村与青年，让每一次下乡都有回响</p>
      </div>
      <nav class="col link-col">
        <p class="col-title">快速导航</p>
        <div class="link-grid">
          <router-link to="/">首页</router-link>
          <router-link v-for="m in navModules" :key="m.id" :to="m.path">{{ m.name }}</router-link>
        </div>
      </nav>
      <div class="col contact-col">
        <p class="col-title">联系我们</p>
        <p>📧 shuxiang@example.com</p>
        <p>📱 123-4567-8900</p>
      </div>
    </div>
    <div class="footer-divider" />
    <p class="copyright">© 2026 数乡计划 · 大学生公益项目 · 用数字技术架起青年与乡村的桥梁</p>
  </footer>
</template>

<script setup>
import { modules } from '@/modules.config.js'
const navModules = modules.filter((m) => m.enabled)
</script>

<style scoped>
.site-footer {
  margin-top: 0;
  padding: 3.5rem clamp(1.4rem, 5vw, 40px) 2rem;
  background: var(--color-primary-deep);
  color: rgba(250, 248, 245, .78);
}
.footer-cols {
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 3rem;
  justify-content: space-between;
}
.col { min-width: 180px; }
.f-brand {
  font-family: var(--sx-serif);
  font-weight: 700;
  font-size: 1.25rem;
  color: #fff;
  margin: 0 0 .8rem;
}
.f-slogan {
  font-size: 14px;
  margin: 0;
  max-width: 260px;
  line-height: 1.75;
  color: rgba(250, 248, 245, .6);
}
.col-title {
  color: var(--color-accent);
  font-weight: 600;
  margin: 0 0 .9rem;
  font-size: 15px;
  letter-spacing: .02em;
}
.link-grid {
  display: flex;
  flex-wrap: wrap;
  gap: .6rem 1.5rem;
}
.link-grid a {
  font-size: 14px;
  color: rgba(250, 248, 245, .68);
  transition: color var(--transition-fast);
}
.link-grid a:hover { color: var(--color-accent); }
.contact-col p {
  margin: .4rem 0;
  font-size: 14px;
  color: rgba(250, 248, 245, .68);
}
.footer-divider {
  max-width: 1180px;
  margin: 2.2rem auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(250, 248, 245, .2), transparent);
}
.copyright {
  max-width: 1180px;
  margin: 1.3rem auto 0;
  font-size: 12px;
  color: rgba(250, 248, 245, .45);
  text-align: center;
}
</style>
