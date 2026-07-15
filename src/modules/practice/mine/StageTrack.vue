<template>
  <div class="stage">
    <!-- 进度看板 + 动态督进（通栏） -->
    <TrackProgress :dossier="dossierForAnalysis" />

    <!-- 左右分栏工作台 -->
    <div class="workbench">
      <!-- 左栏：上传区 + AI 采集区 -->
      <div class="col-left">
        <!-- 上传文件：按类型分行 -->
        <UploadPanel :dossier-id="dossier.id" @imported="onImported" />
        <!-- AI 采集区：自然语言输入，提取人物/指标/发现进右栏各资料格待审校 -->
        <TrackExtract
          :dossier-id="dossier.id"
          :snapshot="editSnapshot"
          @extracted="onExtracted"
          @edit-ops="onEditOps"
        />

        <!-- AI 修改建议：待确认清单 -->
        <section v-if="editOps.length" class="block edit-ops">
          <div class="eo-head">
            <h3 class="eo-title">✏️ AI 修改建议 <span class="eo-n">{{ editOps.length }}</span></h3>
            <div class="eo-batch">
              <button class="btn tiny" @click="confirmAllEdits">全部确认</button>
              <button class="btn tiny ghost" @click="discardEditOps">全部放弃</button>
            </div>
          </div>
          <p class="eo-hint">AI 只提议，确认后才会改右栏资料。</p>
          <div v-for="(e, i) in editOps" :key="'eo'+i" class="eo-card">
            <div class="eo-row">
              <span class="eo-tag" :class="'act-'+e.desc.action">{{ e.desc.label }}·{{ e.desc.action }}</span>
              <span class="eo-text">{{ e.desc.text }}</span>
            </div>
            <p v-if="e.op.reason" class="eo-reason">{{ e.op.reason }}</p>
            <p v-if="e.error" class="eo-error">⚠ {{ e.error }}</p>
            <div class="eo-acts">
              <button class="btn tiny" @click="confirmEditOp(i)">确认</button>
              <button class="btn tiny ghost" @click="editOps.splice(i, 1)">忽略</button>
            </div>
          </div>
        </section>
      </div>

      <!-- 右栏：5 格资料台（为成果搭建台准备的分门别类资料库） -->
      <div class="col-right">
        <div class="tabs">
          <button
            v-for="t in tabs"
            :key="t.key"
            class="tab"
            :class="{ active: activeTab === t.key }"
            @click="activeTab = t.key"
          >{{ t.label }} <span class="tab-n">{{ t.count }}</span><span v-if="t.pending" class="tab-pending">🕓{{ t.pending }}</span></button>
          <button class="tab dedupe-btn" title="合并同名项，保留非空字段" @click="dedupeState">🧹 去重</button>
          <span v-if="dedupeMsg" class="dedupe-msg">{{ dedupeMsg }}</span>
        </div>

        <!-- ===== Tab 1: 📁 素材 ===== -->
        <section v-show="activeTab === 'files'" class="tab-panel">
          <div class="tab-mode-bar">
            <span class="block-desc">原始文件，每张卡内收纳该文件的 AI 解析文本和图注。对应成果页「实践足迹」。</span>
            <span class="mode-toggles">
              <button class="mode-btn" :class="{ active: tabModes.files === 'preview' }" @click="tabModes.files = 'preview'">预览</button>
              <button class="mode-btn" :class="{ active: tabModes.files === 'edit' }" @click="tabModes.files = 'edit'">编辑</button>
            </span>
          </div>
          <MaterialGroups v-if="tabModes.files === 'preview'" :materials="fileMaterials" @preview="onMatPreview" @extracted="onExtracted" />
          <TrackMedia v-else :materials="state.materials" :dossier-id="dossier.id" @change="save" />
        </section>

        <!-- ===== Tab 2: 🖼 影像 ===== -->
        <section v-show="activeTab === 'images'" class="tab-panel">
          <p class="block-desc">照片和视频独立展示。对应成果页「实践影集」。</p>
          <div v-if="imageMaterials.length" class="image-grid">
            <div v-for="img in imageMaterials" :key="'img'+img._i" class="image-card" @click="onMatPreview(img)">
              <div class="img-thumb">
                <img v-if="img.kind === 'image' && img.url" :src="img.url" :alt="img.name" />
                <span v-else class="img-placeholder">{{ img.kind === 'av' ? '🎬' : '📎' }}</span>
              </div>
              <div class="img-info">
                <span class="img-name">{{ img.name || '(未命名)' }}</span>
                <span v-if="img._aiNote" class="img-ai">🤖 {{ img._aiNote }}</span>
              </div>
            </div>
          </div>
          <p v-else class="hint">还没有照片或视频。用左侧「上传实践材料」上传图片/视频。</p>
        </section>

        <!-- ===== Tab 3: 📊 数据 ===== -->
        <section v-show="activeTab === 'data'" class="tab-panel">
          <div class="tab-mode-bar">
            <span class="block-desc">量化指标。预览显示对比图和KPI卡，编辑模式按分类折叠填值。</span>
            <span class="mode-toggles">
              <button class="mode-btn" :class="{ active: tabModes.data === 'preview' }" @click="tabModes.data = 'preview'">预览</button>
              <button class="mode-btn" :class="{ active: tabModes.data === 'edit' }" @click="tabModes.data = 'edit'">编辑</button>
            </span>
          </div>

          <template v-if="tabModes.data === 'preview'">
            <template v-if="dataPreviewGroups.length">
              <div v-for="g in dataPreviewGroups" :key="'dg-'+g.cat" class="preview-group">
                <h4 class="preview-cat-label">{{ g.cat }}</h4>
                <CompareBars v-if="g.cmpItems.length" :items="g.cmpItems" />
                <KpiGrid v-if="g.kpiItems.length" :items="g.kpiItems" />
              </div>
            </template>
            <p v-else class="hint">还没有指标。切换到「编辑」添加，或回「实践前」生成方案。</p>
          </template>

          <template v-else>
          <div v-if="metricGroups.length" class="cat-groups">
            <div v-for="[cat, items] in metricGroups" :key="'mc'+cat" class="cat-group">
              <div class="cat-toggle-row">
                <button class="cat-toggle" @click="toggleCat('m-'+cat)">
                  <span class="cat-arrow">{{ catOpen('m-'+cat) ? '▾' : '▸' }}</span>
                  <span class="cat-label">{{ cat }}</span>
                  <span class="cat-n">{{ items.length }}</span>
                </button>
                <button class="cat-del" title="删除本分类全部" @click="removeByCategory('metricValues', cat)">🗑 删本类</button>
              </div>
              <div v-show="catOpen('m-'+cat)" class="cat-body">
                <div class="mt-head"><span>指标</span><span>帮扶前</span><span>帮扶后</span><span>单位</span><span>分类</span></div>
                <div v-for="m in items" :key="'m'+m.name" class="mt-row">
                  <input v-model="m.name" class="cell name" placeholder="指标名" />
                  <input v-model="m.before" class="cell" placeholder="前值" inputmode="decimal" />
                  <input v-model="m.after" class="cell" placeholder="后值" inputmode="decimal" />
                  <input v-model="m.unit" class="cell unit" placeholder="单位" />
                  <select v-model="m.category" class="cell cat-sel"><option v-for="c in METRIC_CATS" :key="c" :value="c">{{ c || '归类' }}</option></select>
                  <button class="chip-x" aria-label="删除" @click="removeMetric(state.metricValues.indexOf(m))">×</button>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="hint">还没有指标。可在此添加，或回「实践前」生成方案。</p>
          <div class="edit-foot">
            <button class="btn tiny ghost" @click="addMetric">+ 添加指标</button>
            <button v-if="state.metricValues.length" class="btn tiny danger" @click="removeAll('metricValues', '指标')">🗑 清空全部</button>
          </div>
          <DraftReview
            kind="metrics" :items="draft.metrics"
            @adopt="adoptDraft('metrics', $event)" @discard="draft.metrics.splice($event, 1)"
            @adopt-all="adoptAll('metrics')" @discard-all="discardAll('metrics')"
          />
          </template>
        </section>

        <!-- ===== Tab 3: 👤 人物 ===== -->
        <section v-show="activeTab === 'people'" class="tab-panel">
          <div class="tab-mode-bar">
            <span class="block-desc">访谈人物及其故事、引语。按分类折叠编辑，预览显示人物墙卡片。</span>
            <span class="mode-toggles">
              <button class="mode-btn" :class="{ active: tabModes.people === 'preview' }" @click="tabModes.people = 'preview'">预览</button>
              <button class="mode-btn" :class="{ active: tabModes.people === 'edit' }" @click="tabModes.people = 'edit'">编辑</button>
            </span>
          </div>

          <template v-if="tabModes.people === 'preview'">
            <template v-if="peopleGroups.length">
              <div v-for="[cat, items] in peopleGroups" :key="'pw-'+cat" class="preview-group">
                <h4 class="preview-cat-label">{{ cat }}</h4>
                <PeopleWall :items="items.filter(p => p.name)" />
              </div>
            </template>
            <p v-else class="hint">还没有人物。切换到「编辑」添加，AI 提取或手动添加。</p>
          </template>

          <template v-else>
          <div v-if="peopleGroups.length" class="cat-groups">
            <div v-for="[cat, items] in peopleGroups" :key="'pc'+cat" class="cat-group">
              <div class="cat-toggle-row">
                <button class="cat-toggle" @click="toggleCat('p-'+cat)">
                  <span class="cat-arrow">{{ catOpen('p-'+cat) ? '▾' : '▸' }}</span>
                  <span class="cat-label">{{ cat }}</span>
                  <span class="cat-n">{{ items.length }}</span>
                </button>
                <button class="cat-del" title="删除本分类全部" @click="removeByCategory('people', cat)">🗑 删本类</button>
              </div>
              <div v-show="catOpen('p-'+cat)" class="cat-body">
                <div v-for="p in items" :key="'p'+p.name" class="person-row">
                  <input v-model="p.name" class="cell name" placeholder="姓名" />
                  <input v-model="p.role" class="cell" placeholder="身份 / 角色" />
                  <input v-model="p.quote" class="cell wide" placeholder="一句话记录" />
                  <select v-model="p.category" class="cell cat-sel"><option v-for="c in PERSON_CATS" :key="c" :value="c">{{ c || '归类' }}</option></select>
                  <button class="chip-x" aria-label="删除" @click="removePerson(state.people.indexOf(p))">×</button>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="hint">还没有人物。AI 提取或手动添加。</p>
          <div class="edit-foot">
            <button class="btn tiny ghost" @click="addPerson">+ 添加人物</button>
            <button v-if="state.people.length" class="btn tiny danger" @click="removeAll('people', '人物')">🗑 清空全部</button>
          </div>
          <DraftReview
            kind="people" :items="draft.people"
            @adopt="adoptDraft('people', $event)" @discard="draft.people.splice($event, 1)"
            @adopt-all="adoptAll('people')" @discard-all="discardAll('people')"
          />
          </template>
        </section>

        <!-- ===== Tab 5: 📍 足迹 ===== -->
        <section v-show="activeTab === 'places'" class="tab-panel">
          <div class="tab-mode-bar">
            <span class="block-desc">实践到访地点与事件。预览显示时间线，编辑模式按分类折叠。</span>
            <span class="mode-toggles">
              <button class="mode-btn" :class="{ active: tabModes.places === 'preview' }" @click="tabModes.places = 'preview'">预览</button>
              <button class="mode-btn" :class="{ active: tabModes.places === 'edit' }" @click="tabModes.places = 'edit'">编辑</button>
            </span>
          </div>

          <template v-if="tabModes.places === 'preview'">
            <template v-if="placeGroups.length">
              <div v-for="[cat, items] in placeGroups" :key="'tl-'+cat" class="preview-group">
                <h4 class="preview-cat-label">{{ cat }}</h4>
                <TimelineView :items="[...items].filter(p => p.name).sort((a, b) => { if (!a.date) return 1; if (!b.date) return -1; return String(a.date).localeCompare(String(b.date)) })" />
              </div>
            </template>
            <p v-else class="hint">还没有实践足迹。切换到「编辑」添加，AI 提取或手动添加。</p>
          </template>

          <template v-else>
          <div v-if="placeGroups.length" class="cat-groups">
            <div v-for="[cat, items] in placeGroups" :key="'lc'+cat" class="cat-group">
              <div class="cat-toggle-row">
                <button class="cat-toggle" @click="toggleCat('l-'+cat)">
                  <span class="cat-arrow">{{ catOpen('l-'+cat) ? '▾' : '▸' }}</span>
                  <span class="cat-label">{{ cat }}</span>
                  <span class="cat-n">{{ items.length }}</span>
                </button>
                <button class="cat-del" title="删除本分类全部" @click="removeByCategory('places', cat)">🗑 删本类</button>
              </div>
              <div v-show="catOpen('l-'+cat)" class="cat-body">
                <div class="places-list">
                  <div v-for="p in items" :key="'pl'+p.name" class="place-card">
                    <div class="place-top">
                      <div class="place-main">
                        <input v-model="p.name" class="place-name" placeholder="地点名" />
                        <input v-model="p.date" class="place-date" placeholder="日期" />
                        <select v-model="p.category" class="cell cat-sel" style="flex:0 0 auto;margin-left:.3rem"><option v-for="c in PLACE_CATS" :key="c" :value="c">{{ c || '归类' }}</option></select>
                      </div>
                      <button class="chip-x" aria-label="删除" @click="state.places.splice(state.places.indexOf(p), 1)">×</button>
                    </div>
                    <div class="place-body">
                      <input v-model="p.event" class="place-event" placeholder="做了什么" />
                      <input v-model="p.note" class="place-note" placeholder="备注" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="hint">还没有实践足迹。AI 提取或手动添加。</p>
          <div class="edit-foot">
            <button class="btn tiny ghost" @click="state.places.push({ name:'', date:'', event:'', note:'', category:'' })">+ 添加地点</button>
            <button v-if="state.places.length" class="btn tiny danger" @click="removeAll('places', '足迹')">🗑 清空全部</button>
          </div>
          <DraftReview
            kind="places" :items="draft.places"
            @adopt="adoptDraft('places', $event)" @discard="draft.places.splice($event, 1)"
            @adopt-all="adoptAll('places')" @discard-all="discardAll('places')"
          />
          </template>
        </section>

        <!-- ===== Tab 6: 💡 发现 ===== -->
        <section v-show="activeTab === 'findings'" class="tab-panel">
          <div class="tab-mode-bar">
            <span class="block-desc">AI 从素材中提炼的定性发现，按主题归类。预览模式看已采纳，编辑模式审校新发现。</span>
            <span class="mode-toggles">
              <button class="mode-btn" :class="{ active: tabModes.findings === 'preview' }" @click="tabModes.findings = 'preview'">预览</button>
              <button class="mode-btn" :class="{ active: tabModes.findings === 'edit' }" @click="tabModes.findings = 'edit'">编辑</button>
            </span>
          </div>

          <template v-if="tabModes.findings === 'preview'">
            <div v-if="findingGroups.length" class="finding-groups">
              <div v-for="g in findingGroups" :key="g.theme" class="finding-group">
                <h4 class="shelf-title">{{ themeIcon(g.theme) }} {{ g.theme || '未归类' }}（{{ g.items.length }}）</h4>
                <div v-for="m in g.items" :key="'f'+m._i" class="finding-card">
                  <div class="f-head">
                    <span class="f-name">{{ m.name || '(未命名)' }}</span>
                    <span v-if="m.theme" class="f-theme">{{ m.theme }}</span>
                  </div>
                  <p v-if="m.summary" class="f-summary">{{ m.summary }}</p>
                  <p v-if="m.note" class="f-note">{{ m.note }}</p>
                </div>
              </div>
            </div>
            <p v-else class="hint">还没有 AI 发现。在左侧粘贴访谈/调研文字，AI 提取后采纳到这里。</p>
          </template>

          <template v-else>
          <div v-if="draft.materialHints.length" class="draft-shelf">
            <div class="dr-head">
              <h4 class="shelf-title">🕓 待审校（{{ draft.materialHints.length }}）</h4>
              <div class="dr-batch">
                <button class="btn tiny" @click="adoptAll('materialHints')">全部采纳</button>
                <button class="btn tiny ghost" @click="discardAll('materialHints')">全部丢弃</button>
              </div>
            </div>
            <div v-for="(h, i) in draft.materialHints" :key="'dh'+i" class="finding-card draft">
              <div class="f-head">
                <span class="f-name">{{ h.name || '(未命名)' }}</span>
                <span v-if="h.theme" class="f-theme">{{ h.theme }}</span>
                <span class="f-conf">置信 {{ (h.confidence * 100).toFixed(0) }}%</span>
              </div>
              <p v-if="h.summary" class="f-summary">{{ h.summary }}</p>
              <p v-if="h.note" class="f-note">{{ h.note }}</p>
              <div class="f-acts">
                <button class="btn tiny" @click="adoptDraft('materialHints', i)">采纳</button>
                <button class="btn tiny ghost" @click="draft.materialHints.splice(i, 1)">丢弃</button>
              </div>
            </div>
          </div>
          <p v-if="!draft.materialHints.length" class="hint">
            还没有待审校的 AI 发现。在左侧「AI 帮你理素材」粘贴访谈/调研文字，AI 会抽出要点，采纳后按主题归类到这里。
          </p>
          </template>
        </section>

        <!-- ===== Tab 7: 📝 综述 ===== -->
        <section v-show="activeTab === 'summary'" class="tab-panel">
          <p class="block-desc">AI 生成的全局综述和亮点，可直接用于成果报告。下方提示各资料格的完整度。</p>

          <!-- 资料完整度 -->
          <div class="completeness">
            <span class="comp-label">资料完整度</span>
            <div class="comp-bars">
              <span v-for="c in completeness" :key="c.key" class="comp-item" :class="{ ok: c.ok }" :title="c.tip">{{ c.icon }} {{ c.label }}</span>
            </div>
          </div>

          <!-- 已采纳的综述（只读展示） -->
          <div v-if="state.summary" class="summary-saved">
            <div class="sum-field">
              <label class="sum-label">成果综述</label>
              <p class="sum-text">{{ state.summary }}</p>
            </div>
            <div v-if="state.highlights && state.highlights.length" class="sum-field">
              <label class="sum-label">关键亮点</label>
              <ul class="hl-list">
                <li v-for="(h, i) in state.highlights" :key="i">{{ h }}</li>
              </ul>
            </div>
            <button class="btn tiny ghost" @click="state.summary = ''; state.highlights = []">清空重生成</button>
          </div>

          <!-- 生成 / 重新生成 -->
          <div v-else class="summary-gen">
            <button class="btn primary" :disabled="summarizing" @click="onSummarize">
              {{ summarizing ? 'AI 生成中…' : '🤖 生成成果综述' }}
            </button>
            <span v-if="summaryMsg" class="ex-hint" :class="{ err: summarySource === 'error' }">{{ summaryMsg }}</span>
          </div>

          <!-- 生成结果待审校 -->
          <div v-if="summaryDraft.has" class="draft-shelf">
            <h4 class="shelf-title">待审校</h4>
            <div class="sum-field">
              <label class="sum-label">成果综述</label>
              <textarea v-model="summaryDraft.summary" class="ex-input" rows="4" placeholder="AI 生成的成果综述" />
            </div>
            <div v-if="summaryDraft.highlights.length" class="sum-field">
              <label class="sum-label">关键亮点</label>
              <div v-for="(h, i) in summaryDraft.highlights" :key="'hl'+i" class="hl-row">
                <input v-model="summaryDraft.highlights[i]" class="cell wide" placeholder="亮点描述" />
                <button class="chip-x" aria-label="删除" @click="summaryDraft.highlights.splice(i, 1)">×</button>
              </div>
            </div>
            <div class="f-acts">
              <button class="btn tiny" @click="adoptSummary">采纳进成果页</button>
              <button class="btn tiny ghost" @click="summaryDraft.has = false">丢弃</button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- ① 本阶段任务：折叠收纳在底部 -->
    <details v-if="hasTrackPhase" class="task-fold">
      <summary class="task-summary">
        ① 本阶段任务 · {{ doneCount }}/{{ trackTasks.length }} 已完成
        <span class="mini-bar"><span class="mini-fill" :style="{ width: percent + '%' }" /></span>
      </summary>
      <ul class="task-list">
        <li v-for="(t, i) in trackTasks" :key="i" class="task-item" :class="{ done: t.done }">
          <label class="task-line">
            <input type="checkbox" :checked="t.done" @change="toggleTask(i, $event.target.checked)" />
            <span class="task-text">{{ t.text }}</span>
            <span v-if="t.output" class="task-output">交付：{{ t.output }}</span>
          </label>
        </li>
      </ul>
    </details>

    <div class="save-bar">
      <button class="btn primary" @click="save">保存采集数据</button>
      <span v-if="justSaved" class="saved-hint">已保存 ✓</span>
    </div>

    <MediaPreview :item="matPreviewItem" @close="matPreviewItem = null" />
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import TrackProgress from './TrackProgress.vue'
import TrackMedia from './TrackMedia.vue'
import TrackExtract from './TrackExtract.vue'
import UploadPanel from './UploadPanel.vue'
import DraftReview from './DraftReview.vue'
import MaterialGroups from './MaterialGroups.vue'
import MediaPreview from './MediaPreview.vue'
import { summarizeCollected } from './extract.js'
import { applyEditOp, describeOp } from './editApply.js'
import CompareBars from './CompareBars.vue'
import KpiGrid from './KpiGrid.vue'
import TimelineView from './TimelineView.vue'
import PeopleWall from './PeopleWall.vue'

const props = defineProps({
  dossier: { type: Object, required: true },
})
const emit = defineEmits(['update'])

// 右栏 Tab 状态。默认打开素材。
const activeTab = ref('files')
// 每个Tab独立的预览/编辑模式（默认预览）
const tabModes = reactive({
  files: 'preview',
  images: 'preview',
  data: 'preview',
  people: 'preview',
  places: 'preview',
  findings: 'preview',
})
// 预览弹窗。
const matPreviewItem = ref(null)
function onMatPreview(m) { matPreviewItem.value = m }

// —— 数据Tab预览用的computed ——
const comparableMetrics = computed(() => {
  return state.metricValues
    .filter((m) => isNumStr(m.before) && isNumStr(m.after))
    .map((m) => {
      const before = Number(m.before)
      const after = Number(m.after)
      const max = Math.max(before, after, 1)
      const delta = after - before
      return {
        name: m.name, unit: m.unit || '',
        before, after,
        beforePct: Math.round((before / max) * 100),
        afterPct: Math.round((after / max) * 100),
        up: delta > 0, down: delta < 0,
        deltaLabel: delta === 0 ? '持平' : (delta > 0 ? '▲ +' : '▼ ') + Math.abs(delta) + (m.unit || ''),
        insight: m.insight || '',
      }
    })
})

const kpiMetrics = computed(() => {
  return state.metricValues
    .filter((m) => isNumStr(m.after) || isNumStr(m.before))
    .map((m) => ({
      name: m.name, unit: m.unit || '',
      value: isNumStr(m.after) ? Number(m.after) : Number(m.before),
      isHighlight: !!m.isHighlight,
      insight: m.insight || '',
    }))
})

// 数据Tab预览：按分类分组（与编辑模式分类一致）
const dataPreviewGroups = computed(() => {
  const allCats = new Set()
  for (const m of state.metricValues) {
    if (!isNumStr(m.before) && !isNumStr(m.after)) continue
    allCats.add((m.category || '').trim() || '未分类')
  }
  const cats = [...allCats]
  const fbIdx = cats.indexOf('未分类')
  if (fbIdx > -1) { cats.splice(fbIdx, 1); cats.push('未分类') }

  return cats.map((cat) => {
    const items = state.metricValues.filter((m) => {
      if (!isNumStr(m.before) && !isNumStr(m.after)) return false
      return ((m.category || '').trim() || '未分类') === cat
    })
    const cmpItems = items
      .filter((m) => isNumStr(m.before) && isNumStr(m.after))
      .map((m) => {
        const before = Number(m.before)
        const after = Number(m.after)
        const max = Math.max(before, after, 1)
        const delta = after - before
        return {
          name: m.name, unit: m.unit || '', before, after,
          beforePct: Math.round((before / max) * 100),
          afterPct: Math.round((after / max) * 100),
          up: delta > 0, down: delta < 0,
          deltaLabel: delta === 0 ? '持平' : (delta > 0 ? '▲ +' : '▼ ') + Math.abs(delta) + (m.unit || ''),
          insight: m.insight || '',
        }
      })
    const kpiItems = items
      .filter((m) => isNumStr(m.after) || isNumStr(m.before))
      .map((m) => ({
        name: m.name, unit: m.unit || '',
        value: isNumStr(m.after) ? Number(m.after) : Number(m.before),
        isHighlight: !!m.isHighlight,
        insight: m.insight || '',
      }))
    return { cat, cmpItems, kpiItems }
  })
})

const sortedPlaces = computed(() => {
  return [...state.places].filter((p) => p.name).sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return String(a.date).localeCompare(String(b.date))
  })
})

function isNumStr(v) {
  return v !== undefined && v !== null && String(v).trim() !== '' && !Number.isNaN(Number(v))
}

// —— 综述生成状态 ——
const summarizing = ref(false)
const summaryMsg = ref('')
const summarySource = ref('')
const summaryDraft = reactive({ summary: '', highlights: [], has: false, source: '' })

// —— 待审校区（提升到此，供右栏三 Tab 各自渲染）——
const draft = reactive({ people: [], metrics: [], materialHints: [], places: [] })

// 合并一次抽取结果（追加、去重），每条已带 sourceFile。返回新增条数。
function mergeDraft(r) {
  let added = 0
  const key = (o, fs) => fs.map((f) => String(o?.[f] || '').trim()).join('|')
  for (const p of r.people || []) {
    if (key(p, ['name', 'quote']) === '|') continue
    if (draft.people.some((x) => key(x, ['name', 'quote']) === key(p, ['name', 'quote']))) continue
    draft.people.push({ ...p }); added++
  }
  for (const m of r.metrics || []) {
    if (key(m, ['name', 'value']) === '|') continue
    if (draft.metrics.some((x) => key(x, ['name', 'value']) === key(m, ['name', 'value']))) continue
    draft.metrics.push({ ...m }); added++
  }
  for (const h of r.materialHints || []) {
    if (key(h, ['name']) === '') continue
    if (draft.materialHints.some((x) => key(x, ['name']) === key(h, ['name']))) continue
    draft.materialHints.push({ ...h }); added++
  }
  for (const p of r.places || []) {
    if (key(p, ['name']) === '') continue
    if (draft.places.some((x) => key(x, ['name']) === key(p, ['name']))) continue
    draft.places.push({ ...p }); added++
  }
  return added
}

// TrackExtract 抽取完成回调：并入待审校。
function onExtracted(r) { mergeDraft(r) }

// —— AI 自然语言编辑：待确认操作区 ——
// 给 TrackExtract 的四桶精简快照(只带 AI 匹配/改动需要的字段)。
const editSnapshot = computed(() => ({
  people: state.people.map((p) => ({ name: p.name, role: p.role, quote: p.quote, category: p.category })),
  metrics: state.metricValues.map((m) => ({ name: m.name, before: m.before, after: m.after, unit: m.unit, category: m.category })),
  places: state.places.map((p) => ({ name: p.name, date: p.date, event: p.event, category: p.category })),
  materials: findingItems.value.map((m) => ({ name: m.name, summary: m.summary, theme: m.theme })),
}))

// AI 提议的待确认操作:每条 { op, desc:{label,action,text}, applied:false }。
const editOps = ref([])
function onEditOps(ops) {
  editOps.value = ops.map((op) => ({ op, desc: describeOp(state, op) }))
}
// 确认单条:应用到 state,成功则从清单移除并保存。
function confirmEditOp(i) {
  const entry = editOps.value[i]
  if (!entry) return
  const r = applyEditOp(state, entry.op)
  if (r.ok) { editOps.value.splice(i, 1); save() }
  else { entry.error = r.desc }
}
function confirmAllEdits() {
  for (let i = editOps.value.length - 1; i >= 0; i--) confirmEditOp(i)
}
function discardEditOps() { editOps.value = [] }

// UploadPanel 上传完成：材料入清单，抽取草稿并入待审校。
function onImported({ materials, drafts } = {}) {
  for (const m of materials || []) state.materials.push({ ...m })
  if (drafts) mergeDraft(drafts)
  save()
}

// 采纳单条：并入 state，同名去重（保留已有非空字段，新字段补空），从 draft 移除，保存。
function adoptDraft(kind, i) {
  if (kind === 'people') {
    const p = draft.people[i]
    const dup = state.people.find(x => x.name === p.name)
    if (dup) {
      // 合并：已有非空字段不覆盖，新字段补空
      if (!dup.role && p.role) dup.role = p.role
      if (!dup.quote && p.quote) dup.quote = p.quote
      if (!dup.story && p.story) dup.story = p.story
      if (!dup.highlight && p.highlight) dup.highlight = p.highlight
      if (!dup.category && p.category) dup.category = p.category
    } else {
      state.people.push({ name: p.name, role: p.role || '', quote: p.quote || '', story: p.story || '', highlight: p.highlight || '', category: p.category || '' })
    }
    draft.people.splice(i, 1)
  } else if (kind === 'metrics') {
    const m = draft.metrics[i]
    const dup = state.metricValues.find(x => x.name === m.name)
    if (dup) {
      if (!dup.after && m.value) dup.after = m.value
      if (!dup.unit && m.unit) dup.unit = m.unit
      if (!dup.insight && m.insight) dup.insight = m.insight
      if (!dup.isHighlight && m.isHighlight) dup.isHighlight = true
      if (!dup.category && m.category) dup.category = m.category
    } else {
      state.metricValues.push({ name: m.name, before: '', after: m.value || '', unit: m.unit || '', insight: m.insight || '', isHighlight: !!m.isHighlight, category: m.category || '' })
    }
    draft.metrics.splice(i, 1)
  } else if (kind === 'materialHints') {
    const h = draft.materialHints[i]
    const dup = state.materials.find(x => x.name === h.name)
    if (dup) {
      // 同名材料：补充缺失字段
      if (!dup.note && h.note) dup.note = h.note
      if (!dup.summary && h.summary) dup.summary = h.summary
      if (!dup.theme && h.theme) dup.theme = h.theme
    } else {
      state.materials.push({ type: '其他', name: h.name, note: h.note || '', summary: h.summary || '', theme: h.theme || '', source: 'auto' })
    }
    draft.materialHints.splice(i, 1)
  } else if (kind === 'places') {
    const p = draft.places[i]
    const dup = state.places.find(x => x.name === p.name)
    if (dup) {
      if (!dup.date && p.date) dup.date = p.date
      if (!dup.event && p.event) dup.event = p.event
      if (!dup.note && p.note) dup.note = p.note
      if (!dup.category && p.category) dup.category = p.category
    } else {
      state.places.push({ name: p.name, date: p.date || '', event: p.event || '', note: p.note || '', category: p.category || '' })
    }
    draft.places.splice(i, 1)
  }
  save()
}
// 批量采纳/丢弃某类（从后往前采纳以保下标稳定）。
function adoptAll(kind) {
  const map = { people: draft.people, metrics: draft.metrics, materialHints: draft.materialHints, places: draft.places }
  const arr = map[kind] || []
  for (let i = arr.length - 1; i >= 0; i--) adoptDraft(kind, i)
}
function discardAll(kind) {
  const map = { people: draft.people, metrics: draft.metrics, materialHints: draft.materialHints, places: draft.places }
  const arr = map[kind] || []
  arr.splice(0, arr.length)
}

// —— 综述：AI 生成 ——
async function onSummarize() {
  if (summarizing.value) return
  summarizing.value = true
  summaryMsg.value = ''
  try {
    const r = await summarizeCollected({
      people: state.people,
      metricValues: state.metricValues,
      materials: state.materials,
      topic: props.dossier.plan?.topic || '',
      village: props.dossier.village || props.dossier.plan?.targetVillage || '',
    })
    summarySource.value = r.source
    if (r.source === 'empty') {
      summaryMsg.value = '还没有可综述的采集数据，请先补充素材/数据/人物/发现。'
      summaryDraft.has = false
    } else if (r.source === 'error' || (!r.summary && !r.highlights.length)) {
      summaryMsg.value = '综述暂未生成，可补充材料后重试。'
      summaryDraft.has = false
    } else {
      summaryDraft.summary = r.summary || ''
      summaryDraft.highlights = Array.isArray(r.highlights) ? r.highlights.slice() : []
      summaryDraft.source = r.source
      summaryDraft.has = true
      summaryMsg.value = ''
    }
  } catch {
    summaryMsg.value = '生成失败，请重试。'
    summarySource.value = 'error'
  } finally {
    summarizing.value = false
  }
}

function adoptSummary() {
  state.summary = summaryDraft.summary
  state.highlights = summaryDraft.highlights.filter(h => String(h).trim())
  summaryDraft.has = false
  summaryMsg.value = '成果综述已采纳 ✓'
  save()
}

function clone(d) {
  const c = d.collected || {}
  return {
    metricValues: (c.metricValues || []).map((m) => ({ category: '', ...m })),
    materials: (c.materials || []).map((m) => ({ type: '照片', ...m })),
    people: (c.people || []).map((p) => ({ category: '', ...p })),
    places: (c.places || []).map((p) => ({ category: '', ...p })),
    summary: c.summary || '',
    highlights: Array.isArray(c.highlights) ? c.highlights.slice() : [],
  }
}

const state = reactive(clone(props.dossier))
const metricValues = computed(() => state.metricValues)
const people = computed(() => state.people)
const justSaved = ref(false)
const dedupeMsg = ref('')

// 分类选项（与后端 extractPrompt 对齐）
const PERSON_CATS = ['', '村干部', '返乡青年', '村民', '外来帮扶', '手艺人', '其他']
const METRIC_CATS = ['', '产业', '教育', '文化', '基础设施', '民生', '生态', '其他']
const PLACE_CATS = ['', '自然景观', '建筑遗存', '公共机构', '产业场所', '其他']

// —— 分组折叠：各 tab 内按 category 分组，默认全部展开 ——
const catExpand = reactive({})
function toggleCat(key) { catExpand[key] = !catExpand[key] }
function catOpen(key) { return catExpand[key] !== false } // 默认展开

// 通用分组工具：{ 分类名: [items] }，未分类的归入"未分类"
function groupByCat(items, fallback = '未分类') {
  const map = new Map()
  for (const it of items) {
    const c = (it.category || '').trim() || fallback
    if (!map.has(c)) map.set(c, [])
    map.get(c).push(it)
  }
  // "未分类"排最后
  const entries = [...map.entries()]
  const fbIdx = entries.findIndex(([k]) => k === fallback)
  if (fbIdx > -1) {
    const fb = entries.splice(fbIdx, 1)[0]
    entries.push(fb)
  }
  return entries
}
const metricGroups = computed(() => groupByCat(state.metricValues))
const peopleGroups = computed(() => groupByCat(state.people))
const placeGroups = computed(() => groupByCat(state.places))

// 右栏资料台 Tab 定义 + 计数徽标。
const tabs = computed(() => [
  { key: 'files',    label: '📁 素材', count: fileMaterials.value.length },
  { key: 'images',   label: '🖼 影像', count: imageMaterials.value.length },
  { key: 'data',     label: '📊 数据', count: state.metricValues.length, pending: draft.metrics.length },
  { key: 'people',   label: '👤 人物', count: state.people.length, pending: draft.people.length },
  { key: 'places',   label: '📍 足迹', count: state.places.length, pending: draft.places.length },
  { key: 'findings', label: '💡 发现', count: findingItems.value.length, pending: draft.materialHints.length },
  { key: 'summary',  label: '📝 综述', count: state.summary ? 1 : 0 },
])

// 素材 Tab：文档类 + 手动登记（不含图片/视频）
const fileMaterials = computed(() => state.materials.filter(m => {
  if (m.url && (m.kind === 'image' || m.kind === 'av')) return false
  return m.url || !(m.source === 'auto' || m.summary || m.theme)
}))
// 影像 Tab：图片 + 视频
const imageMaterials = computed(() => state.materials.filter(m => m.url && (m.kind === 'image' || m.kind === 'av')))

// 发现 Tab：AI 抽取采纳的材料（source:'auto'），按 theme 分组。
const findingItems = computed(() => state.materials.filter(m => m.source === 'auto'))
const findingGroups = computed(() => {
  const map = {}
  for (const m of findingItems.value) {
    const theme = (m.theme || '未归类').trim()
    if (!map[theme]) map[theme] = []
    map[theme].push(m)
  }
  return Object.entries(map).map(([theme, items]) => ({ theme, items }))
})

const THEME_ICONS = { '文化挖掘':'🏛', '乡村规划':'🏗', '产业调研':'🏭', '生态':'🌿', '教育帮扶':'📚', '科技助农':'🔧', '非遗传承':'🎭', '古建保护':'🏯', '文旅':'🎒', '治理':'⚖' }
function themeIcon(t) { return THEME_ICONS[t] || '📌' }

// 综述：资料完整度提示。
const completeness = computed(() => [
  { key: 'files', icon: '📁', label: '素材', ok: fileMaterials.value.length > 0, tip: fileMaterials.value.length ? `已有 ${fileMaterials.value.length} 个文件` : '还没有上传文件' },
  { key: 'data', icon: '📊', label: '数据', ok: state.metricValues.length > 0, tip: state.metricValues.length ? `已有 ${state.metricValues.length} 个指标` : '还没有采集指标' },
  { key: 'people', icon: '👤', label: '人物', ok: state.people.length > 0, tip: state.people.length ? `已有 ${state.people.length} 位人物` : '还没有访谈人物' },
  { key: 'findings', icon: '💡', label: '发现', ok: findingItems.value.length > 0, tip: findingItems.value.length ? `已有 ${findingItems.value.length} 条发现` : '还没有 AI 发现' },
])

// 传给 TrackProgress 的档案：并进当前编辑态，实时反映未保存的采集。
const dossierForAnalysis = computed(() => ({ ...props.dossier, collected: { ...state } }))

// —— 阶段任务（track 段）——
const trackPhase = computed(() => {
  const phases = props.dossier.plan?.phases
  if (!Array.isArray(phases)) return null
  return phases.find((p) => p?.stage === 'track') || null
})
const hasTrackPhase = computed(() => !!trackPhase.value && Array.isArray(trackPhase.value.tasks) && trackPhase.value.tasks.length > 0)
const trackTasks = computed(() => trackPhase.value?.tasks || [])
const doneCount = computed(() => trackTasks.value.filter((t) => t.done).length)
const percent = computed(() => {
  const n = trackTasks.value.length
  if (!n) return 0
  return Math.round((doneCount.value / n) * 100)
})

// 勾选：把 plan.phases 复制回写（不改 props），emit update 让父组件落库。
function toggleTask(i, done) {
  const phases = Array.isArray(props.dossier.plan?.phases) ? props.dossier.plan.phases : []
  const nextPhases = phases.map((p) => ({
    ...p,
    tasks: Array.isArray(p.tasks) ? p.tasks.map((t) => ({ ...t })) : [],
  }))
  const track = nextPhases.find((p) => p?.stage === 'track')
  if (!track || !track.tasks[i]) return
  track.tasks[i].done = !!done
  emit('update', { plan: { ...props.dossier.plan, phases: nextPhases } })
}

// 首次进入时，把方案里计划的指标补进采集表（若尚未登记）
function seedFromPlan() {
  const planned = props.dossier.plan?.metrics || []
  const have = new Set(state.metricValues.map((m) => m.name))
  for (const pm of planned) {
    if (pm.name && !have.has(pm.name)) {
      state.metricValues.push({ name: pm.name, before: '', after: '', unit: pm.unit || '', category: '' })
    }
  }
}
seedFromPlan()

watch(
  () => props.dossier.id,
  () => {
    Object.assign(state, clone(props.dossier))
    seedFromPlan()
  },
)

function addMetric() { state.metricValues.push({ name: '', before: '', after: '', unit: '', category: '' }) }
function removeMetric(i) { state.metricValues.splice(i, 1) }
function addPerson() { state.people.push({ name: '', role: '', quote: '', category: '' }) }
function removePerson(i) { state.people.splice(i, 1) }

// —— 批量删除:按分类 / 全部。bucketKey 为 state 上的数组字段名。——
// 分组用的 fallback 与 groupByCat 一致("未分类"),cat 传该 fallback 时删所有无分类项。
function removeByCategory(bucketKey, cat) {
  const arr = state[bucketKey]
  if (!Array.isArray(arr)) return
  const fallback = '未分类'
  const n = arr.filter((it) => ((it.category || '').trim() || fallback) === cat).length
  if (!n) return
  if (!confirm(`确定删除「${cat}」分类下的 ${n} 条吗?`)) return
  for (let i = arr.length - 1; i >= 0; i--) {
    if (((arr[i].category || '').trim() || fallback) === cat) arr.splice(i, 1)
  }
  save()
}
function removeAll(bucketKey, label) {
  const arr = state[bucketKey]
  if (!Array.isArray(arr) || !arr.length) return
  if (!confirm(`确定清空全部 ${arr.length} 条${label}吗?此操作不可撤销。`)) return
  arr.splice(0, arr.length)
  save()
}

function save() {
  emit('update', {
    collected: {
      metricValues: state.metricValues.map((m) => ({ ...m })),
      materials: state.materials.map((m) => ({ ...m })),
      people: state.people.map((p) => ({ ...p })),
      places: state.places.map((p) => ({ ...p })),
      summary: state.summary || '',
      highlights: Array.isArray(state.highlights) ? state.highlights.slice() : [],
    },
  })
  justSaved.value = true
  setTimeout(() => (justSaved.value = false), 1800)
}

// 去重：同名项合并（保留非空字段），返回移除数。
function dedupeBy(arr, keyFn, mergeFn) {
  const seen = new Map()
  let removed = 0
  for (let i = arr.length - 1; i >= 0; i--) {
    const k = keyFn(arr[i])
    if (seen.has(k)) {
      mergeFn(seen.get(k), arr[i])
      arr.splice(i, 1)
      removed++
    } else {
      seen.set(k, arr[i])
    }
  }
  return removed
}
function dedupeState() {
  let n = 0
  n += dedupeBy(state.people,
    p => p.name,
    (keep, dup) => { if (!keep.role && dup.role) keep.role = dup.role; if (!keep.quote && dup.quote) keep.quote = dup.quote; if (!keep.story && dup.story) keep.story = dup.story; if (!keep.highlight && dup.highlight) keep.highlight = dup.highlight; if (!keep.category && dup.category) keep.category = dup.category }
  )
  n += dedupeBy(state.metricValues,
    m => m.name,
    (keep, dup) => { if (!keep.after && dup.after) keep.after = dup.after; if (!keep.before && dup.before) keep.before = dup.before; if (!keep.unit && dup.unit) keep.unit = dup.unit; if (!keep.insight && dup.insight) keep.insight = dup.insight; if (!keep.isHighlight && dup.isHighlight) keep.isHighlight = true; if (!keep.category && dup.category) keep.category = dup.category }
  )
  n += dedupeBy(state.materials,
    m => m.name,
    (keep, dup) => { if (!keep.note && dup.note) keep.note = dup.note; if (!keep.summary && dup.summary) keep.summary = dup.summary; if (!keep.theme && dup.theme) keep.theme = dup.theme }
  )
  n += dedupeBy(state.places,
    p => p.name,
    (keep, dup) => { if (!keep.date && dup.date) keep.date = dup.date; if (!keep.event && dup.event) keep.event = dup.event; if (!keep.note && dup.note) keep.note = dup.note; if (!keep.category && dup.category) keep.category = dup.category }
  )
  if (n > 0) { dedupeMsg.value = `已合并 ${n} 条重复项`; save() }
  else dedupeMsg.value = '没有重复项'
  setTimeout(() => (dedupeMsg.value = ''), 2500)
}
</script>

<style scoped>
.stage { display: flex; flex-direction: column; gap: 1.6rem; }
/* 实践中工作台内容多，撑破外层 1080px 容器限宽，占近全屏（两侧留边距）。
   仅本阶段生效；用负 margin 而非 transform，避免破坏 MediaPreview 的 fixed 定位。 */
@media (min-width: 1140px) {
  .stage {
    width: calc(100vw - 6rem);
    max-width: 1600px;
    margin-left: calc(50% - min(50vw - 3rem, 800px));
  }
}
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .4rem; }
.block-desc { margin: 0 0 .9rem; font-size: .88rem; color: var(--color-text-secondary); }
.hint { font-size: .85rem; color: var(--color-text-light); margin: 0 0 .6rem; }

/* —— 左右分栏工作台：左窄（操作区够用即可）、右宽（材料列表需要空间）—— */
.workbench { display: grid; grid-template-columns: minmax(320px, 440px) minmax(0, 1fr); gap: 1.4rem; align-items: start; }
.col-left { display: flex; flex-direction: column; gap: 1.4rem; min-width: 0; }
.col-right {
  min-width: 0; padding: 1.2rem 1.3rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}

/* Tab 头 */
.tabs { display: flex; gap: .4rem; margin-bottom: 1rem; border-bottom: 1px solid var(--color-border); }
.tab {
  border: none; background: transparent; cursor: pointer; padding: .5rem .9rem;
  font-size: .9rem; font-weight: 600; color: var(--color-text-secondary);
  border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all var(--transition);
}
.tab:hover { color: var(--color-primary); }
.tab.active { color: var(--color-primary-dark); border-bottom-color: var(--color-primary); }
.tab-n { font-size: .72rem; color: var(--color-text-light); background: var(--color-bg); padding: 0 .4rem; border-radius: 50px; margin-left: .2rem; }
.tab-pending { font-size: .72rem; color: #f0a030; margin-left: .2rem; }
.dedupe-btn { margin-left: auto; font-size: .8rem; color: var(--color-text-light); }

/* —— 分类折叠分组 —— */
.cat-groups { display: flex; flex-direction: column; gap: .3rem; }
.cat-group { }
.cat-toggle {
  width: 100%; display: flex; align-items: center; gap: .5rem;
  border: none; background: var(--color-bg); cursor: pointer;
  padding: .45rem .7rem; border-radius: 9px; font-size: .84rem;
  font-weight: 600; color: var(--color-text-secondary); transition: background var(--transition);
}
.cat-toggle:hover { background: var(--color-accent); }
.cat-toggle-row { display: flex; align-items: center; gap: .4rem; }
.cat-toggle-row .cat-toggle { flex: 1; }
.cat-del {
  border: none; background: transparent; cursor: pointer; flex-shrink: 0;
  padding: .35rem .6rem; font-size: .74rem; font-weight: 600; color: var(--color-text-light);
  border-radius: 8px; white-space: nowrap; transition: all var(--transition);
}
.cat-del:hover { background: #fdecea; color: #b0322a; }
.edit-foot { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; margin-top: .4rem; }
.btn.tiny.danger {
  padding: .4rem 1rem; font-size: .82rem; background: transparent;
  border: 1px dashed #e0a0a0; color: #b0322a;
}
.btn.tiny.danger:hover { background: #fdecea; }
.cat-arrow { font-size: .7rem; width: 14px; text-align: center; flex-shrink: 0; }
.cat-label { flex: 1; text-align: left; }
.cat-n {
  font-size: .7rem; color: var(--color-text-light);
  background: var(--color-card); padding: .1rem .45rem; border-radius: 50px;
}
.cat-body { padding: .3rem 0 .3rem .4rem; }
.dedupe-btn:hover { color: var(--color-highlight); border-bottom-color: transparent; }
.dedupe-msg { font-size: .74rem; color: var(--color-primary); white-space: nowrap; align-self: center; margin-left: .4rem; }
.tab-panel { min-height: 120px; max-height: 68vh; overflow-y: auto; padding-right: .3rem; }

/* 折叠任务 */
.task-fold { border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-card); padding: .4rem .9rem; }
.task-summary { cursor: pointer; font-size: .92rem; font-weight: 600; color: var(--color-primary-dark); display: flex; align-items: center; gap: .8rem; padding: .5rem 0; }
.mini-bar { flex: 1; max-width: 160px; height: 6px; background: var(--color-bg); border-radius: 50px; overflow: hidden; }
.mini-fill { display: block; height: 100%; background: var(--color-primary); }
.task-fold .task-list { margin-top: .6rem; padding-bottom: .5rem; }

@media (max-width: 900px) {
  .workbench { grid-template-columns: 1fr; }
}

.cell {
  padding: .5rem .7rem; font-size: .88rem; color: var(--color-text);
  background: var(--color-card); border: 1px solid var(--color-border); border-radius: 9px; outline: none; min-width: 0;
}
.cell:focus { border-color: var(--color-primary); }
.cat-sel { min-width: 70px; font-size: .76rem; cursor: pointer; }

/* —— 任务块 —— */
.progress { display: flex; align-items: center; gap: .8rem; margin-bottom: .8rem; }
.progress-bar {
  flex: 1; height: 8px; background: var(--color-bg);
  border: 1px solid var(--color-border); border-radius: 50px; overflow: hidden;
}
.progress-fill { height: 100%; background: var(--color-primary); transition: width .25s ease; }
.progress-text { font-size: .85rem; color: var(--color-text-secondary); white-space: nowrap; }

.task-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .4rem; }
.task-item {
  padding: .55rem .8rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: 10px;
}
.task-item.done { background: var(--color-bg); }
.task-item.done .task-text { text-decoration: line-through; color: var(--color-text-light); }
.task-line { display: flex; align-items: center; gap: .7rem; cursor: pointer; flex-wrap: wrap; }
.task-line input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--color-primary); }
.task-text { flex: 1; font-size: .92rem; color: var(--color-text); min-width: 200px; }
.task-output { font-size: .78rem; color: var(--color-text-light); }

/* 指标表 */
.metric-table { display: flex; flex-direction: column; gap: .5rem; margin-bottom: .8rem; }
.mt-head { display: grid; grid-template-columns: 1.6fr 1fr 1fr .7fr .85fr; gap: .4rem; font-size: .78rem; color: var(--color-text-light); padding: 0 .3rem; }
.mt-row { display: grid; grid-template-columns: 1.6fr 1fr 1fr .7fr .85fr auto; gap: .4rem; align-items: center; }

/* 人物 */
.people-list { display: flex; flex-direction: column; gap: .5rem; }
.person-row { display: grid; grid-template-columns: 1fr 1fr 2fr .85fr auto; gap: .4rem; align-items: center; }
.cell.wide { width: 100%; }

.chip-x { border: none; background: transparent; cursor: pointer; font-size: 1.2rem; line-height: 1; color: var(--color-text-light); }
.chip-x:hover { color: var(--color-highlight); }

/* —— 发现 Tab 卡片 —— */
.draft-shelf { margin-bottom: 1rem; }
.shelf-title { font-size: .85rem; font-weight: 600; color: var(--color-text-secondary); margin: 0 0 .5rem; }
.finding-groups { display: flex; flex-direction: column; gap: .8rem; }
.finding-group { }
.finding-card {
  padding: .6rem .75rem; background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: 10px; margin-bottom: .4rem;
}
.finding-card.draft { border-left: 3px solid #f0a030; background: #fffdf7; }
.f-head { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; margin-bottom: .2rem; }
.f-name { font-size: .86rem; font-weight: 600; color: var(--color-text); flex: 1; }
.f-theme {
  font-size: .7rem; color: var(--color-primary-dark); background: var(--color-accent);
  padding: .1rem .5rem; border-radius: 50px; white-space: nowrap;
}
.f-conf { font-size: .7rem; color: var(--color-text-light); }
.f-summary { margin: .2rem 0 0; font-size: .82rem; color: var(--color-text); line-height: 1.5; }
.f-note { margin: .15rem 0 0; font-size: .78rem; color: var(--color-text-light); }
.f-acts { display: flex; gap: .5rem; margin-top: .5rem; }

/* —— 综述 Tab —— */
.completeness { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; padding: .5rem .7rem; background: var(--color-bg); border-radius: 8px; margin-bottom: 1rem; }
.comp-label { font-size: .78rem; font-weight: 600; color: var(--color-text-secondary); }
.comp-bars { display: flex; gap: .5rem; flex-wrap: wrap; }
.comp-item { font-size: .72rem; padding: .15rem .45rem; border-radius: 50px; background: #f5f5f5; color: var(--color-text-light); }
.comp-item.ok { background: #e8f5e9; color: #2e7d32; }
.summary-saved { display: flex; flex-direction: column; gap: .8rem; }
.summary-gen { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.sum-field { }
.sum-label { display: block; font-size: .8rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: .3rem; }
.sum-text { margin: 0; font-size: .86rem; color: var(--color-text); line-height: 1.6; }
.hl-list { margin: 0; padding-left: 1.2rem; font-size: .84rem; color: var(--color-text); line-height: 1.6; }
.hl-row { display: flex; align-items: center; gap: .5rem; margin-bottom: .4rem; }
.ex-input {
  width: 100%; resize: vertical; box-sizing: border-box;
  padding: .55rem .7rem; font-size: .86rem; color: var(--color-text);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 9px; outline: none;
}
.ex-input:focus { border-color: var(--color-primary); }
.ex-hint { font-size: .82rem; color: var(--color-text-light); }
.ex-hint.err { color: var(--color-highlight); }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .7rem 1.5rem; background: var(--color-primary); color: #fff; font-size: .92rem; }
.btn.primary:hover { background: var(--color-primary-dark); transform: translateY(-1px); }
.btn.tiny.ghost { align-self: flex-start; padding: .4rem 1rem; font-size: .82rem; background: transparent; border: 1px dashed var(--color-border); color: var(--color-text-secondary); }

.save-bar { display: flex; align-items: center; gap: 1rem; }
.saved-hint { font-size: .85rem; color: var(--color-primary); }

/* —— 影像 Tab 网格 —— */
.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .7rem; }
.image-card {
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: 10px; overflow: hidden; cursor: pointer; transition: all var(--transition);
}
.image-card:hover { border-color: var(--color-primary); transform: translateY(-1px); }
.img-thumb {
  width: 100%; height: 110px; overflow: hidden; background: var(--color-bg);
  display: flex; align-items: center; justify-content: center;
}
.img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.img-placeholder { font-size: 2rem; }
.img-info { padding: .4rem .6rem; display: flex; flex-direction: column; gap: .15rem; }
.img-name { font-size: .78rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.img-ai { font-size: .7rem; color: var(--color-primary-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* —— 发现 Tab 批量按钮 —— */
.dr-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; flex-wrap: wrap; gap: .5rem; }
.dr-batch { display: flex; gap: .4rem; }

/* —— 足迹 Tab 卡片 —— */
.places-list { display: flex; flex-direction: column; gap: .8rem; margin-bottom: .8rem; }
.place-card {
  background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: 12px; padding: .8rem .9rem;
}
.place-top { display: flex; align-items: flex-start; gap: .5rem; margin-bottom: .5rem; }
.place-main { flex: 1; display: flex; gap: .5rem; }
.place-name {
  flex: 2; border: none; background: transparent; font-size: .92rem; font-weight: 600;
  color: var(--color-text); outline: none; padding: .2rem 0;
  border-bottom: 1px dashed transparent; transition: border-color var(--transition);
}
.place-name:focus { border-bottom-color: var(--color-primary); }
.place-date {
  flex: 0 0 90px; border: none; background: transparent; font-size: .84rem;
  color: var(--color-text-light); outline: none; padding: .2rem 0;
  border-bottom: 1px dashed transparent; transition: border-color var(--transition);
}
.place-date:focus { border-bottom-color: var(--color-primary); }
.place-body { display: flex; flex-direction: column; gap: .35rem; }
.place-event {
  width: 100%; border: none; background: transparent; font-size: .84rem;
  color: var(--color-text); outline: none; padding: .2rem 0;
  border-bottom: 1px dashed transparent; transition: border-color var(--transition);
  box-sizing: border-box;
}
.place-event:focus { border-bottom-color: var(--color-primary); }
.place-note {
  width: 100%; border: none; background: transparent; font-size: .78rem;
  color: var(--color-text-light); outline: none; padding: .2rem 0;
  border-bottom: 1px dashed transparent; transition: border-color var(--transition);
  box-sizing: border-box;
}
.place-note:focus { border-bottom-color: var(--color-primary); }

@media (max-width: 640px) {
  .mt-head { display: none; }
  .mt-row, .person-row { grid-template-columns: 1fr 1fr auto; }
  .place-main { flex-direction: column; gap: .3rem; }
  .place-date { flex: 0 0 auto; }
  .image-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
}

/* 预览/编辑切换 */
.tab-mode-bar { display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem; margin-bottom: .9rem; flex-wrap: wrap; }
.tab-mode-bar .block-desc { flex: 1; margin-bottom: 0; min-width: 200px; }
.mode-toggles { display: flex; gap: 0; flex-shrink: 0; }
.mode-btn {
  border: 1px solid var(--color-border); background: var(--color-card); cursor: pointer;
  padding: .35rem .85rem; font-size: .8rem; font-weight: 600; color: var(--color-text-secondary);
  transition: all var(--transition);
}
.mode-btn:first-child { border-radius: 8px 0 0 8px; }
.mode-btn:last-child { border-radius: 0 8px 8px 0; }
.mode-btn.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.mode-btn:hover:not(.active) { border-color: var(--color-primary); color: var(--color-primary); }

/* —— AI 修改建议：待确认清单 —— */
.edit-ops {
  padding: 1.1rem 1.2rem; background: #fffdf7;
  border: 1px solid #f0d9a8; border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.eo-head { display: flex; align-items: center; justify-content: space-between; gap: .6rem; flex-wrap: wrap; }
.eo-title { font-size: 1rem; color: var(--color-primary-dark); margin: 0; }
.eo-n { font-size: .72rem; color: #f0a030; background: #fff3e0; padding: .05rem .5rem; border-radius: 50px; margin-left: .3rem; }
.eo-batch { display: flex; gap: .4rem; }
.eo-hint { margin: .4rem 0 .8rem; font-size: .78rem; color: var(--color-text-light); }
.eo-card {
  padding: .6rem .75rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-left: 3px solid #f0a030;
  border-radius: 10px; margin-bottom: .5rem;
}
.eo-row { display: flex; align-items: baseline; gap: .5rem; flex-wrap: wrap; }
.eo-tag { font-size: .7rem; font-weight: 600; color: var(--color-primary-dark); background: var(--color-accent); padding: .1rem .5rem; border-radius: 50px; white-space: nowrap; }
.eo-tag.act-删除 { color: #b0322a; background: #fdecea; }
.eo-tag.act-合并分类 { color: #1565c0; background: #e3f2fd; }
.eo-text { font-size: .84rem; color: var(--color-text); line-height: 1.5; }
.eo-reason { margin: .3rem 0 0; font-size: .78rem; color: var(--color-text-light); }
.eo-error { margin: .3rem 0 0; font-size: .78rem; color: var(--color-highlight); }
.eo-acts { display: flex; gap: .5rem; margin-top: .5rem; }
.btn.tiny { padding: .3rem .9rem; background: var(--color-primary); color: #fff; font-size: .8rem; }
.btn.tiny.ghost { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); }

/* —— AI 助手模式切换 —— */

/* 预览模式分类分组 */
.preview-group { margin-bottom: 1.2rem; }
.preview-cat-label {
  font-size: .82rem; font-weight: 600; color: var(--color-primary-dark);
  padding: .3rem .6rem; background: var(--color-accent); border-radius: 6px;
  display: inline-block; margin-bottom: .6rem;
}
</style>
