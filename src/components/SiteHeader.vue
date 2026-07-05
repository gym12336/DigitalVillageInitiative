<template>
  <header class="site-header">
    <router-link to="/" class="brand">
      <span class="brand-mark">数</span>
      <span class="brand-text">数乡计划</span>
    </router-link>
    <nav class="site-nav">
      <router-link to="/" class="nav-item">首页</router-link>
      <div
        v-for="m in navModules"
        :key="m.id"
        class="nav-item"
        :class="{ 'has-children': m.children && m.children.length }"
      >
        <router-link :to="m.path" class="nav-link">{{ m.name }}</router-link>
        <div v-if="m.children && m.children.length" class="submenu">
          <router-link
            v-for="c in m.children"
            :key="c.path"
            :to="c.path"
            class="submenu-item"
          >
            <span class="submenu-name">{{ c.name }}</span>
            <span v-if="c.desc" class="submenu-desc">{{ c.desc }}</span>
          </router-link>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { modules } from '@/modules.config.js'
// 导航只显示已启用的一级栏目，与首页入口卡共用同一份清单。
const navModules = modules.filter((m) => m.enabled)
</script>

<style scoped>
.site-header {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  min-height: 76px; padding: 0 clamp(1.2rem, 4vw, 48px);
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 2px 16px rgba(107, 140, 92, 0.06);
  backdrop-filter: blur(12px);
}
.brand { display: inline-flex; align-items: center; gap: 14px; font-weight: 700; }
.brand-mark {
  display: grid; place-items: center; width: 46px; height: 46px;
  border-radius: 13px;
  color: #fff; background: var(--color-primary);
  box-shadow: 0 4px 12px rgba(107, 140, 92, 0.28);
  font-family: var(--sx-serif); font-size: 20px; font-weight: 700;
}
.brand-text { font-family: var(--sx-serif); font-size: 22px; font-weight: 800; letter-spacing: 1px; color: var(--color-primary-dark); }
.site-nav { display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 600; flex-wrap: wrap; }
.nav-item { position: relative; }
.nav-item > .nav-link, .site-nav > a.nav-item {
  display: inline-block;
  padding: 8px 14px; border-radius: 10px;
  color: var(--color-text); transition: all 200ms ease;
}
.nav-item > .nav-link:hover, .site-nav > a.nav-item:hover {
  color: var(--color-primary-dark); background: rgba(107, 140, 92, 0.08);
}
.nav-item > .nav-link.router-link-active, .site-nav > a.nav-item.router-link-active {
  color: #fff; background: var(--color-primary);
  box-shadow: 0 3px 10px rgba(107, 140, 92, 0.25);
}

/* 悬浮下拉子菜单 */
.submenu {
  position: absolute; top: 100%; left: 0;
  min-width: 220px; margin-top: 8px; padding: 8px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid var(--color-border); border-radius: 14px;
  box-shadow: 0 12px 32px rgba(77, 107, 62, 0.16);
  backdrop-filter: blur(12px);
  opacity: 0; visibility: hidden; transform: translateY(6px);
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms;
  z-index: 30;
}
/* 悬停一级栏目时展开；顶部留一段透明桥接，避免鼠标移动到子菜单时中断 */
.has-children:hover .submenu { opacity: 1; visibility: visible; transform: translateY(0); }
.submenu::before { content: ''; position: absolute; top: -10px; left: 0; right: 0; height: 10px; }
.submenu-item {
  display: flex; flex-direction: column; gap: 2px;
  padding: 9px 12px; border-radius: 9px;
  transition: background 160ms ease;
}
.submenu-item:hover { background: rgba(107, 140, 92, 0.1); }
.submenu-name { font-size: 15px; font-weight: 600; color: var(--color-text); }
.submenu-item:hover .submenu-name { color: var(--color-primary-dark); }
.submenu-desc { font-size: 12px; font-weight: 400; color: var(--color-text-light); }
</style>
