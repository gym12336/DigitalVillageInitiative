# 数乡计划前端重构设计（首页改造 + 7 栏目骨架）

- 作者：gym

日期：2026-07-04
状态：已确认方向，逐步开发中

## 目标

将现有 Vue3 前端从「中式纸感 + 科技蓝 3D 地图 + 4 模块」重构为「暖绿品牌 + 2D 点亮地图 + 7 一级栏目」，对齐《一、设计风格与配色.md》文档，服务数乡计划使命：资源数字化、可视化，连接乡村与青年（乡村出题、青年回应）。

范围（本轮）：首页完整改造 + 补齐 7 栏目页面骨架。栏目内容分批填充，不在本轮追求文档全部数据。

## 三项已确认决策

1. **范围**：首页改造 + 补齐 7 栏目骨架（路由 + 空页面 + 核心模块占位）。
2. **配色**：采用文档暖绿配色（见下）。
3. **地图**：ECharts 2D geo 点亮地图（新建 ChinaMap2D.vue，替换 ChinaMap3D）。

## 一、设计系统改造（全站基础）

替换 `src/assets/theme/theme.css` 变量为文档暖绿配色，删除 `src/assets/theme/tech-blue.js`：

```
--color-bg:#faf8f5  --color-primary:#6b8c5c  --color-primary-dark:#4d6b3e
--color-secondary:#d4a373  --color-accent:#e8c99b  --color-highlight:#e07a5f
--color-card:#ffffff  --color-text:#1e1e1e  --color-text-secondary:#5a5a5a
--color-text-light:#8a8a8a  --color-border:#ede8e0
--radius:16px  --shadow-card:0 4px 20px rgba(0,0,0,.04)
--shadow-card-hover:0 8px 40px rgba(107,140,92,.12)
--transition:.3s cubic-bezier(.4,0,.2,1)
```

字体：Inter（英文）+ system-ui/PingFang SC/微软雅黑（中文）。为兼容现有组件，保留旧变量名（`--sx-*`）映射到新色值，逐步迁移。

## 二、栏目结构

`src/modules.config.js` 扩展为 7 个一级栏目，作为导航与路由的唯一清单：

```
首页 home | 乡村百科 village | 乡村实践 practice | 乡村之声 voice
实践攻略 guide | 乡村好物 goods | 关于我们 about
```

现有 villages / people / media / ranking 模块降级并入乡村百科/实践之下（本轮先保留其路由可访问，后续整合）。导航栏 sticky + 滚动磨砂玻璃 + 移动端汉堡菜单。

## 三、首页改造（本轮重点）

替换 HomeView 的「hero + 科技蓝三栏大屏」为：
1. 英雄区（背景图 + 渐变 + 标语 + 搜索框 + 三快捷入口）
2. 数据看板（4 卡片滚动计数：156 乡村 / 423 成果 / 89 需求 / 267 团队）
3. **点亮中国地图（2D）**：ChinaMap2D.vue，ECharts geo + china.json，省份按数据密度深浅绿填色，点击省份高亮 + 弹数据面板，「查看该省乡村」跳乡村百科并筛选
4. 双向 CTA（乡村入驻 / 青年注册）
5. 深色三栏页脚

地图从 echarts-gl geo3D → echarts geo，配色科技蓝 → 暖绿。`mapDrill.js` 逐级下钻逻辑保留文件，本轮不接入首页。

## 四、7 栏目骨架

除首页外 6 个栏目各建 View + routes.js，页面头部 + 核心模块占位（真实标题结构 + 1-2 条示例数据），可独立访问、导航高亮正确。内容分批填充。

## 补充方向（文档基础上新增）

- **乡村之声问答互动区**：在需求发布→响应之外，增加「乡村提问 → 青年作答沉淀」的知识库，呼应「向青年提出问题」。
- **本次实践队行动清单**：采集档案 / 拍口述史 / 记录导览点位 / 收需求 / 采好物故事 / 产出一村一页。
- **手机可采集资源**：短视频、访谈录音、图集、GPS 导览坐标、电子问卷、图文速记。

## 开发顺序

1. 主题改造（theme.css 暖绿 + 删科技蓝）
2. ChinaMap2D 组件（替换 3D）
3. 首页重组（英雄区/看板/地图/CTA/页脚）
4. 7 栏目 modules.config + 路由 + 骨架页
5. 逐个子栏目内容填充（后续多轮）
