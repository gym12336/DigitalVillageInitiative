<template>
  <header class="site-header" :class="{ scrolled: isScrolled }">
    <router-link to="/" class="brand" aria-label="数乡计划首页">
      <span class="brand-mark">数</span>
      <span class="brand-text">数乡计划</span>
    </router-link>

    <!-- 桌面导航 -->
    <nav class="site-nav" aria-label="主导航">
      <router-link to="/" class="nav-item" exact-active-class="active">首页</router-link>
      <div
        v-for="m in navModules"
        :key="m.id"
        class="nav-drop"
        @mouseenter="hoverMenu = m.id"
        @mouseleave="hoverMenu = null"
      >
        <router-link
          :to="m.path"
          class="nav-item"
          :class="{ active: isModuleActive(m) }"
        >
          {{ m.name }}
        </router-link>
        <div
          v-if="m.children?.length"
          class="submenu"
          :class="{ open: hoverMenu === m.id }"
        >
          <div class="submenu-bridge" />
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

    <!-- 移动端汉堡按钮 -->
    <button
      class="hamburger"
      :class="{ open: mobileOpen }"
      aria-label="切换菜单"
      @click="mobileOpen = !mobileOpen"
    >
      <span class="hamburger-line" />
      <span class="hamburger-line" />
      <span class="hamburger-line" />
    </button>
  </header>

  <!-- 移动端全屏菜单 -->
  <Teleport to="body">
    <Transition name="mobile-menu">
      <div v-if="mobileOpen" class="mobile-overlay" @click.self="mobileOpen = false">
        <nav class="mobile-nav" aria-label="移动端导航">
          <router-link to="/" class="mobile-item" @click="mobileOpen = false">🏠 首页</router-link>
          <template v-for="m in navModules" :key="m.id">
            <router-link :to="m.path" class="mobile-item" @click="mobileOpen = false">
              {{ m.icon }} {{ m.name }}
            </router-link>
            <router-link
              v-for="c in (m.children || [])"
              :key="c.path"
              :to="c.path"
              class="mobile-sub"
              @click="mobileOpen = false"
            >
              {{ c.name }}
            </router-link>
          </template>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { modules } from '@/modules.config.js'

const route = useRoute()
const navModules = modules.filter((m) => m.enabled)

// 滚动感知
const isScrolled = ref(false)
function onScroll() { isScrolled.value = window.scrollY > 80 }

// 悬浮子菜单（用 id 做状态，带短暂延迟防止误关）
const hoverMenu = ref(null)

// 判断是否属于某模块（包括子路由）
function isModuleActive(m) {
  const current = route.path
  if (current === m.path) return true
  if (m.children?.some((c) => current === c.path || current.startsWith(c.path + '/'))) return true
  return false
}

// 移动端
const mobileOpen = ref(false)
function onRouteChange() { mobileOpen.value = false }
function onResize() { if (window.innerWidth > 860) mobileOpen.value = false }

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
/* ===== 基础 ===== */
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  padding: 0 clamp(1rem, 4vw, 48px);
  color: var(--color-text);
  background: var(--glass-bg-strong);
  border-bottom: 1px solid transparent;
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  transition:
    background var(--transition),
    border-color var(--transition),
    box-shadow var(--transition),
    backdrop-filter var(--transition);
}

/* 滚动后增强磨砂 */
.site-header.scrolled {
  background: rgba(255, 255, 255, 0.85);
  border-color: var(--color-border);
  box-shadow: 0 4px 24px rgba(107, 140, 92, 0.06);
  backdrop-filter: blur(var(--glass-blur-strong));
  -webkit-backdrop-filter: blur(var(--glass-blur-strong));
}

/* ===== 品牌标识 ===== */
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: #fff;
  background: var(--gradient-hero);
  box-shadow: 0 4px 12px rgba(107, 140, 92, 0.28);
  font-family: var(--sx-serif);
  font-size: 19px;
  font-weight: 700;
}
.brand-text {
  font-family: var(--sx-serif);
  font-size: 21px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--color-primary-dark);
}

/* ===== 桌面导航 ===== */
.site-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  font-weight: 600;
}

.nav-item {
  position: relative;
  display: inline-block;
  padding: 8px 15px;
  border-radius: 10px;
  color: var(--color-text);
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.nav-item:hover {
  color: var(--color-primary-dark);
  background: rgba(107, 140, 92, 0.07);
}
.nav-item.active {
  color: #fff;
  background: var(--color-primary);
  box-shadow: 0 3px 12px rgba(107, 140, 92, 0.25);
}

/* ===== 下拉子菜单 ===== */
.nav-drop { position: relative; }

.submenu {
  position: absolute;
  top: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 220px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%) translateY(8px);
  transition:
    opacity 0.22s ease,
    transform 0.22s ease,
    visibility 0.22s;
  z-index: 100;
}
.submenu.open {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

/* 顶部透明桥接区，防止鼠标移动时中断 */
.submenu-bridge {
  position: absolute;
  top: -14px;
  left: 0;
  right: 0;
  height: 14px;
}

.submenu-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  border-radius: 10px;
  transition: background 0.16s ease;
}
.submenu-item:hover {
  background: rgba(107, 140, 92, 0.1);
}
.submenu-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}
.submenu-item:hover .submenu-name { color: var(--color-primary-dark); }
.submenu-desc {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-light);
  line-height: 1.4;
}

/* ===== 汉堡按钮（移动端） ===== */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  z-index: 60;
}
.hamburger-line {
  display: block;
  width: 100%;
  height: 2.5px;
  border-radius: 2px;
  background: var(--color-primary-dark);
  transition: all var(--transition-fast);
  transform-origin: center;
}
.hamburger.open .hamburger-line:nth-child(1) {
  transform: translateY(7.5px) rotate(45deg);
}
.hamburger.open .hamburger-line:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}
.hamburger.open .hamburger-line:nth-child(3) {
  transform: translateY(-7.5px) rotate(-45deg);
}

/* ===== 移动端全屏菜单 ===== */
.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(30, 30, 30, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.mobile-nav {
  position: fixed;
  top: 72px;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1.2rem 1.5rem;
  background: var(--color-bg);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mobile-item {
  display: block;
  padding: 14px 18px;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  transition: background var(--transition-fast);
}
.mobile-item:hover {
  background: rgba(107, 140, 92, 0.08);
  color: var(--color-primary-dark);
}
.mobile-sub {
  display: block;
  padding: 10px 18px 10px 44px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 400;
  color: var(--color-text-secondary);
  transition: background var(--transition-fast);
}
.mobile-sub:hover {
  background: rgba(107, 140, 92, 0.05);
  color: var(--color-primary);
}

/* 移动端过渡 */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.25s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}

/* ===== 响应式 ===== */
@media (max-width: 860px) {
  .site-nav { display: none; }
  .hamburger { display: flex; }
}
</style>
