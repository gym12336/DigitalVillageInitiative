# 「实践前」自动检索 + 概要加权设计文档

- 作者：gym
- 日期：2026-07-07
- 落地：「我的实践」实践前阶段（StagePlan）与检索纯函数（retrieval.js）
- 定位：让建档页填的 idea/主题/目标村在进入「实践前」时立刻转化为检索资源，无需再点一次
- 关联：[我的实践设计](./2026-07-07-my-practice-design.md)、[新建实践表单页设计](./2026-07-07-new-practice-form-design.md)

---

## 1. 目标与范围

两条改进，衔接刚做完的建档表单页：

1. **进入「实践前」自动检索一次**：新建档已填 idea，进来时资源卡直接铺好，不用再手点「检索平台资源」——「懂平台」的第一印象直接给到。
2. **主题/目标村喂进检索**：建档页填的 `plan.topic` 与 `village` 一并参与检索打分，命中更贴、目标村稳定置顶。

### 本期边界

- 纯前端，无后端。检索仍是规则版纯函数。
- `retrieve` 保持**向后兼容**：新增选项都可选，不传时行为与现在完全一致。
- 不新增档案字段（不引入「是否检索过」标记），用 refs 是否为空来判断。

### 成功标准

- 进入「实践前」，若 idea 或 topic 非空且 refs 为空，自动出资源卡。
- 已采纳过资源（refs 非空）的档案再进来，不重复自动检索。
- 建档填了主题「非遗文化挖掘」、目标村「陈家铺村」，检索结果里该村档案与该村往届成果置顶，文化类来源命中。
- `retrieval.js` 新增单测；4 个旧单测不回归；全量测试 + 构建通过。

---

## 2. retrieval.js 改造（核心）

签名扩展：

```js
// 旧：retrieve(idea, sources, { perSource })
// 新：retrieve(idea, sources, { perSource, topic, village })
```

`topic` 与 `village` 均可选，不传时结果与旧签名完全一致。

**改动一：topic 参与打分。** 把 `topic` 也过一遍 `extractKeywords`，与 idea 的关键词**合并去重**成一个关键词集，再照现有逻辑打分。效果：idea 没提「文化」但主题是「非遗文化挖掘」时，也能命中 villages 的 `文化类` 标签、practice 的 `type=文化挖掘`、demand 的 `type=文化挖掘`。

**改动二：village 显式精确加权。** 现有 `villageNameHit(name, keywords, idea)` 只从 idea 文本抠村名。新增可选的显式 `village` 输入：各来源（village/result/demand）的村名与它精确匹配时，加一份 `VILLAGE_EXACT` 权重。实现上把 `villageNameHit` 的第三参数从「idea 文本」扩为「idea 文本 + 显式 village」，两者任一精确命中即加权。效果：建档填了目标村，该村档案与该村往届成果稳定置顶。

**改动三（副作用，正向）：** 关键词来源变宽后，只要 topic 非空就有关键词，因此「idea 空但 topic 非空」也能检索出结果——这正是自动检索场景需要的。

权重常量（`TITLE_WEIGHT / SUB_WEIGHT / TAG_WEIGHT / VILLAGE_EXACT`）不变，只扩大「关键词来源」与「精确匹配输入」。

---

## 3. StagePlan.vue 接线

**onSearch 带上概要：**

```js
cards.value = retrieve(ideaInput.value.trim(), retrievalSources, {
  topic: props.dossier.plan?.topic,
  village: props.dossier.village,
})
```

**自动检索：** 抽一个 `maybeAutoSearch()`——当 `refs` 为空 且（idea 非空 或 `plan.topic` 非空）时，调一次 `onSearch()`。在两处调用：

- `onMounted`：进入实践前时判断。
- 切换档案的 `watch(() => props.dossier.id)`：同步本地状态后判断。

已采纳过资源（refs 非空）→ 不自动检索，不打扰已推进的档案。

**注意：** `onSearch` 内已有 `emit('update', { idea })`。自动检索触发时 idea 未变，emit 幂等（写回相同值），无副作用，无需特判。

---

## 4. 错误处理与边界

- `plan.topic` / `village` 可能为 `undefined`（老档案）：`retrieve` 内对 topic 走 `extractKeywords(String(topic||''))`，village 走现有 `String(v||'')` 兜底，不报错。
- idea 与 topic 都为空：`extractKeywords` 返回空关键词集，`retrieve` 提前返回 `[]`，自动检索条件也不满足，不会空跑。
- 自动检索不改变「无命中时的空态提示」逻辑（`searched=true` 且 `cards` 为空 → 显示占位提示）。

---

## 5. 测试

`retrieval.js` 新增单测（沿用 [mine-retrieval.test.js](../../../src/__tests__/mine-retrieval.test.js) 的 sources fixture）：

- 传 `{ topic: '文化挖掘' }`、idea 为无关文本 → 断言命中文化类来源（village 文化标签 / result type=文化挖掘 / demand type=文化挖掘）。
- 传 `{ village: '扎尕那村' }` → 断言扎尕那村档案排到该来源首位（显式村名精确加权生效）。
- 不传 topic/village → 断言结果与旧三参调用完全一致（向后兼容护栏）。
- idea 空但 topic 非空 → 断言能出结果（非空）。

4 个旧单测不动、不回归。StagePlan 的自动检索逻辑耦合视图，不加组件测试（沿用只测纯函数惯例）。全量 `vitest run` + `vite build` 通过。

---

## 6. 落地步骤（供实现计划参考）

1. `retrieval.js`：扩展 `retrieve` 选项（topic 合并关键词、village 显式加权）；`villageNameHit` 接受显式 village。
2. `mine-retrieval.test.js`：新增 topic/village/向后兼容/空 idea 四组断言。
3. `StagePlan.vue`：`onSearch` 带上 topic/village；新增 `maybeAutoSearch` 并在 `onMounted` 与档案切换 watch 中调用。
4. 全量跑测 + `vite build` + 手动走「建档填 idea/主题/目标村 → 进实践前自动出卡、目标村置顶」闭环。
