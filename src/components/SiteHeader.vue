<template>
  <header class="site-header" :class="{ scrolled: isScrolled }">
    <router-link to="/" class="brand" aria-label="数乡计划首页">
      <span class="brand-mark" aria-hidden="true">
        <img src="/brand/shuxiang-logo-mark-v3.png" alt="" />
      </span>
      <span class="brand-copy">
        <span class="brand-text">数乡计划</span>
        <span class="brand-sub">DIGITAL FIELD ARCHIVE</span>
      </span>
    </router-link>

    <nav class="site-nav" aria-label="主导航">
      <router-link to="/" class="nav-item" exact-active-class="active">序厅</router-link>
      <div
        v-for="m in navModules"
        :key="m.id"
        class="nav-drop"
        @mouseenter="hoverMenu = m.id"
        @mouseleave="hoverMenu = null"
      >
        <router-link :to="m.path" class="nav-item" :class="{ active: isModuleActive(m) }">
          {{ m.name }}
        </router-link>
        <div v-if="m.children?.length" class="submenu" :class="{ open: hoverMenu === m.id }">
          <div class="submenu-bridge" />
          <p class="submenu-label">{{ m.name }} / INDEX</p>
          <router-link v-for="c in m.children" :key="c.path" :to="c.path" class="submenu-item">
            <span class="submenu-name">{{ c.name }}</span>
            <span v-if="c.desc" class="submenu-desc">{{ c.desc }}</span>
          </router-link>
        </div>
      </div>
    </nav>

    <router-link to="/practice/mine" class="practice-entry">
      <AppIcon name="footprint" :size="17" />
      <span>我的实践</span>
    </router-link>

    <button
      class="hamburger"
      :class="{ open: mobileOpen }"
      :aria-expanded="mobileOpen"
      aria-label="切换菜单"
      @click="mobileOpen = !mobileOpen"
    >
      <span class="hamburger-line" />
      <span class="hamburger-line" />
      <span class="hamburger-line" />
    </button>
  </header>

  <Teleport to="body">
    <Transition name="mobile-menu">
      <div v-if="mobileOpen" class="mobile-overlay" @click.self="mobileOpen = false">
        <nav class="mobile-nav" aria-label="移动端导航">
          <p class="mobile-index">MUSEUM INDEX / 展厅目录</p>
          <router-link to="/" class="mobile-item" @click="mobileOpen = false">
            <AppIcon name="home" />
            <span><small>00</small>序厅</span>
          </router-link>
          <template v-for="(m, index) in navModules" :key="m.id">
            <router-link :to="m.path" class="mobile-item" @click="mobileOpen = false">
              <AppIcon :name="m.icon" />
              <span><small>{{ String(index + 1).padStart(2, '0') }}</small>{{ m.name }}</span>
            </router-link>
          </template>
          <router-link to="/practice/mine" class="mobile-practice" @click="mobileOpen = false">
            进入我的实践 <AppIcon name="arrow-right" :size="18" />
          </router-link>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { modules } from '@/modules.config.js'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const navModules = modules.filter((m) => m.enabled)
const isScrolled = ref(false)
const hoverMenu = ref(null)
const mobileOpen = ref(false)

function onScroll() { isScrolled.value = window.scrollY > 48 }
function isModuleActive(m) {
  const current = route.path
  if (current === m.path) return true
  return !!m.children?.some((c) => current === c.path || current.startsWith(c.path + '/'))
}
function onResize() { if (window.innerWidth > 980) mobileOpen.value = false }

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  onScroll()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  min-height: 68px;
  padding: 0 clamp(1.1rem, 3.5vw, 3.5rem);
  color: rgba(244, 240, 228, .78);
  background: rgba(7, 17, 15, .96);
  border-bottom: 1px solid var(--museum-line);
  transition: min-height var(--transition), background var(--transition), box-shadow var(--transition);
}
.site-header::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--bronze), transparent);
  opacity: .35;
}
.site-header.scrolled {
  min-height: 60px;
  background: rgba(7, 17, 15, .88);
  box-shadow: 0 14px 36px rgba(3, 10, 8, .2);
  backdrop-filter: blur(20px);
}
.brand { display: inline-flex; align-items: center; gap: 12px; min-width: 190px; color: inherit; }
.brand:hover { color: #fff; }
.brand-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  filter: drop-shadow(0 4px 12px rgba(26, 198, 152, .18));
}
.brand-mark img { width: 100%; height: 100%; object-fit: contain; }
.brand-copy { display: flex; flex-direction: column; line-height: 1.15; }
.brand-text { color: #f6f0e2; font-family: var(--font-display); font-size: 18px; font-weight: 700; letter-spacing: .14em; }
.brand-sub { margin-top: 4px; color: rgba(145, 187, 168, .66); font-family: var(--font-mono); font-size: 8px; letter-spacing: .12em; }
.site-nav { display: flex; align-items: stretch; justify-content: center; gap: clamp(.1rem, .6vw, .55rem); height: 68px; }
.nav-drop { position: relative; display: flex; align-items: stretch; }
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 clamp(.55rem, 1vw, .85rem);
  color: rgba(244, 240, 228, .7);
  font-size: 13px;
  letter-spacing: .04em;
  white-space: nowrap;
  transition: color var(--transition-fast);
}
.nav-item::after {
  content: '';
  position: absolute;
  right: .65rem;
  bottom: 0;
  left: .65rem;
  height: 2px;
  background: var(--bronze);
  transform: scaleX(0);
  transition: transform var(--transition);
}
.nav-item:hover, .nav-item.active { color: #fff; }
.nav-item:hover::after, .nav-item.active::after { transform: scaleX(1); }
.submenu {
  position: absolute;
  top: calc(100% + 1px);
  left: 50%;
  z-index: 100;
  min-width: 238px;
  padding: 10px;
  color: var(--ink);
  background: rgba(250, 247, 240, .98);
  border: 1px solid rgba(185, 155, 97, .42);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, 8px);
  transition: opacity .2s ease, transform .2s ease, visibility .2s;
}
.submenu.open { opacity: 1; visibility: visible; transform: translate(-50%, 0); }
.submenu-bridge { position: absolute; top: -14px; right: 0; left: 0; height: 14px; }
.submenu-label { padding: 5px 12px 9px; color: var(--clay); font-family: var(--font-mono); font-size: 9px; letter-spacing: .14em; }
.submenu-item { display: flex; flex-direction: column; gap: 2px; padding: 9px 12px; border-left: 1px solid transparent; }
.submenu-item:hover { color: var(--jade-deep); background: rgba(95, 146, 125, .08); border-left-color: var(--jade); }
.submenu-name { font-size: 14px; font-weight: 650; }
.submenu-desc { color: var(--ink-faint); font-size: 11px; }
.practice-entry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 16px;
  color: var(--museum-black);
  background: var(--bronze-light);
  border: 1px solid var(--bronze-light);
  font-size: 13px;
  font-weight: 700;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.practice-entry:hover { color: #fff; background: transparent; }
.hamburger { display: none; width: 42px; height: 42px; padding: 10px; border: 0; color: #fff; background: transparent; }
.hamburger-line { display: block; width: 22px; height: 1px; margin: 5px 0; background: currentColor; transition: transform var(--transition-fast), opacity var(--transition-fast); }
.hamburger.open .hamburger-line:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.hamburger.open .hamburger-line:nth-child(2) { opacity: 0; }
.hamburger.open .hamburger-line:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

.mobile-overlay { position: fixed; inset: 0; z-index: 49; display: flex; justify-content: flex-end; padding-top: 68px; background: rgba(2, 9, 7, .66); backdrop-filter: blur(4px); }
.mobile-nav {
  width: min(88vw, 390px);
  min-height: calc(100vh - 68px);
  padding: 2rem 1.4rem;
  color: #f6f0e2;
  background: var(--museum-deep);
  border-left: 1px solid var(--museum-line);
}
.mobile-index { margin: 0 0 1.3rem; color: var(--bronze); font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; }
.mobile-item { display: flex; align-items: center; gap: 14px; padding: 13px 4px; border-bottom: 1px solid var(--museum-line); color: rgba(246, 240, 226, .82); }
.mobile-item:hover { color: var(--data-glow); }
.mobile-item small { display: inline-block; width: 34px; color: var(--bronze); font-family: var(--font-mono); font-size: 10px; }
.mobile-practice { display: flex; align-items: center; justify-content: space-between; margin-top: 1.8rem; padding: 13px 15px; color: var(--museum-black); background: var(--bronze-light); font-weight: 700; }
.mobile-menu-enter-active, .mobile-menu-leave-active { transition: opacity .25s ease; }
.mobile-menu-enter-from, .mobile-menu-leave-to { opacity: 0; }

@media (max-width: 1100px) {
  .site-header { grid-template-columns: auto 1fr auto; }
  .site-nav { gap: 0; }
  .nav-item { padding-inline: .5rem; font-size: 12px; }
  .practice-entry { padding-inline: 11px; }
}
@media (max-width: 980px) {
  .site-header { grid-template-columns: 1fr auto; }
  .site-nav, .practice-entry { display: none; }
  .hamburger { display: block; }
}
@media (max-width: 440px) {
  .brand-sub { display: none; }
  .brand { min-width: 0; }
}
</style>
