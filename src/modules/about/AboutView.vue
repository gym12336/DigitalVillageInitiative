<template>
  <section class="about museum-public-page">
    <MuseumPageHero
      archive-no="PROJECT ARCHIVE · ABOUT"
      kicker="关于数乡计划"
      title="用数字技术，架起青年与乡村的桥梁"
      description="我们把分散的田野记录整理为可阅读、可参与、可持续生长的公共数字档案。"
      icon="about"
      :metric="data.team.length"
      metric-label="位演示团队成员"
      demo
    >
      <template #aside>
        <img class="project-logo" src="/brand/shuxiang-logo-transparent-v3.png" alt="数乡计划·乡村数字资源库" />
        <small>PROJECT-OWNED BRAND ASSET</small>
      </template>
    </MuseumPageHero>

    <div class="museum-content-shell">

      <!-- 项目介绍：居中，max-width 800px -->
      <div class="intro">
        <p>{{ data.intro }}</p>
      </div>

      <!-- 我们的团队 -->
      <MuseumSectionHeader index="01" kicker="YOUTH FIELD TEAM" title="我们的团队" icon="users">
        <p>以产品、调研、影像和技术协作，让每一份田野材料都有清晰归属。</p>
      </MuseumSectionHeader>
      <ul class="team">
        <li
          v-for="member in data.team"
          :key="member.name"
          class="member"
        >
          <!-- 圆形头像：姓名首字母 + 麦色背景，点击弹出个人简介 -->
          <button
            class="avatar"
            type="button"
            :style="{ background: avatarColor(member.name) }"
            :aria-label="`查看 ${member.name} 的简介`"
            @click="openMember(member)"
          >
            {{ member.name.charAt(0) }}
          </button>
          <p class="m-name">{{ member.name }}</p>
          <p class="m-role">{{ member.role }}</p>
        </li>
      </ul>

      <!-- 合作单位 Logo 墙 -->
      <MuseumSectionHeader index="02" kicker="CO-CREATION NETWORK" title="合作单位" icon="university">
        <p>当前内容为演示信息，正式合作单位将在获得确认后更新。</p>
      </MuseumSectionHeader>
      <ul class="partners">
        <li v-for="p in data.partners" :key="p" class="partner">{{ p }}</li>
      </ul>
    </div>

    <!-- 个人简介弹窗 -->
    <Transition name="fade">
      <div
        v-if="active"
        class="modal-mask"
        @click.self="closeMember"
      >
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          :aria-label="`${active.name} 的简介`"
        >
          <button class="modal-close" type="button" aria-label="关闭" @click="closeMember">×</button>
          <div class="modal-head">
            <div class="modal-avatar" :style="{ background: avatarColor(active.name) }">{{ active.name.charAt(0) }}</div>
            <div>
              <h3 class="modal-name">{{ active.name }}</h3>
              <p class="modal-role">{{ active.role }}</p>
              <p class="modal-school">{{ active.school }}</p>
            </div>
          </div>
          <p class="modal-bio">{{ active.bio }}</p>
          <p class="modal-board"><span>负责板块</span>{{ active.board }}</p>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup>
// 关于我们栏目：项目介绍、团队成员（点击头像弹出个人简介）、合作单位 Logo 墙。
// 数据统一放在 about-data.json，便于队员维护。
import { ref, onMounted, onUnmounted } from 'vue'
import data from './about-data.json'
import MuseumPageHero from '@/components/MuseumPageHero.vue'
import MuseumSectionHeader from '@/components/MuseumSectionHeader.vue'

// 头像暖色映射
const avatarColors = {"张明": "hsl(15, 60%, 55%)", "李婷": "hsl(35, 60%, 55%)", "王浩": "hsl(55, 60%, 55%)", "陈雪": "hsl(80, 60%, 55%)", "刘洋": "hsl(105, 60%, 55%)", "林芳": "hsl(130, 60%, 55%)"}
function avatarColor(name) {
  return avatarColors[name] || 'var(--color-secondary)'
}

// 当前打开简介的成员（null 表示弹窗关闭）
const active = ref(null)

// 打开某成员简介
function openMember(member) {
  active.value = member
}

// 关闭弹窗
function closeMember() {
  active.value = null
}

// ESC 键关闭弹窗
function onKeydown(e) {
  if (e.key === 'Escape') closeMember()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.about { padding: 0; }
.project-logo { width: min(100%, 280px); max-height: 155px; margin: auto; padding: 12px 18px; object-fit: contain; background: rgba(250,247,240,.94); }
.museum-signal-panel small { margin-top: 1rem; color: var(--bronze); font-family: var(--font-mono); font-size: 8px; letter-spacing: .12em; text-align: center; }

/* —— 页面头部 —— */
.about-head { text-align: center; margin-bottom: 2.4rem; }
.kicker {
  font-size: 13px; font-weight: 700; color: var(--color-highlight);
  letter-spacing: .08em; margin: 0 0 .6rem;
}
.about-head h1 {
  font-size: clamp(24px, 4vw, 38px); color: var(--color-primary-dark);
  line-height: 1.35;
}

/* —— 项目介绍 —— */
.intro {
  max-width: 880px; margin: 0 auto 4rem;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);
  padding: clamp(1.4rem, 4vw, 2.4rem);
}
.intro::before { content: 'PROJECT STATEMENT / 项目说明'; display: block; margin-bottom: 1rem; color: var(--clay); font-family: var(--font-mono); font-size: 9px; letter-spacing: .13em; }
.intro p {
  margin: 0; font-size: 15px; line-height: 1.8;
  color: var(--color-text-secondary); text-indent: 2em;
}

/* —— 区块标题 —— */
.museum-section-head { margin-top: 4rem; }

/* —— 团队 —— */
.team {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-wrap: wrap; justify-content: center; gap: 1.6rem 2rem;
}
.member { width: 120px; text-align: center; }
.avatar {
  width: 80px; height: 80px; border-radius: var(--radius-sm);
  color: #fff;
  font-size: 32px; font-weight: 700; font-family: var(--sx-serif);
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  margin: 0 auto; box-shadow: var(--shadow-card);
  transition: transform var(--transition), box-shadow var(--transition);
}
.avatar:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
.avatar:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 2px; }
.m-name { margin: 8px 0 0; font-size: 15px; font-weight: 600; color: var(--color-text); }
.m-role { margin: 2px 0 0; font-size: 13px; color: var(--color-text-light); }

/* —— 合作单位 —— */
.partners {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;
}
.partner {
  background: rgba(250,247,240,.76); padding: 16px 28px; border-radius: var(--radius-sm);
  border: 1px solid var(--color-border); font-size: 14px; color: var(--color-text-secondary);
}

/* —— 弹窗 —— */
.modal-mask {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(30, 30, 30, 0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.modal {
  position: relative; width: 100%; max-width: 460px;
  background: var(--color-card); border-radius: var(--radius);
  box-shadow: var(--shadow-card-hover); padding: 2rem;
}
.modal-close {
  position: absolute; top: .8rem; right: 1rem;
  background: none; border: none; cursor: pointer;
  font-size: 26px; line-height: 1; color: var(--color-text-light);
}
.modal-close:hover { color: var(--color-highlight); }
.modal-head { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.2rem; }
.modal-avatar {
  flex: none; width: 64px; height: 64px; border-radius: 50%;
  color: #fff;
  font-size: 26px; font-weight: 700; font-family: var(--sx-serif);
  display: flex; align-items: center; justify-content: center;
}
.modal-name { font-size: 1.2rem; color: var(--color-primary-dark); }
.modal-role { margin: 4px 0 0; font-size: 13px; color: var(--color-highlight); font-weight: 600; }
.modal-school { margin: 2px 0 0; font-size: 13px; color: var(--color-text-light); }
.modal-bio {
  margin: 0 0 1rem; font-size: 14px; line-height: 1.8;
  color: var(--color-text-secondary);
}
.modal-board { margin: 0; font-size: 14px; color: var(--color-text); }
.modal-board span {
  display: inline-block; margin-right: .6rem; padding: .1rem .6rem;
  border-radius: 50px; font-size: 12px;
  background: var(--color-accent); color: var(--color-primary-dark);
}

/* —— 弹窗过渡 —— */
.fade-enter-active, .fade-leave-active { transition: opacity var(--transition); }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* —— 移动端团队 2 列 —— */
@media (max-width: 560px) {
  .team { gap: 1.4rem 0; }
  .member { width: 50%; }
}
</style>
