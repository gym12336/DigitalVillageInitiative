# 数乡计划 · 乡村数字资源库

“数乡计划”是一个面向乡村调研、青年实践与数字成果归档的平台原型。当前视觉方向为 **数字田野博物馆**：深色数字展厅负责地图、数据与入口，暖色田野档案负责内容阅读与工作记录。

## 最简单的本地检查方式（macOS）

1. 在 Finder 中打开本仓库；
2. 双击 `启动数乡计划.command`；
3. 系统会自动启动数据服务、打开网站，并在 5173 被占用时选择其他端口；
4. 检查结束后关闭启动终端，或按 `Control + C`。

首次运行前需要安装依赖：

```bash
npm install
```

如果 macOS 首次阻止打开 `.command` 文件，可在 Finder 中右键该文件，选择“打开”，再确认一次。

## 开发命令

```bash
npm run dev:all   # 同时启动前后端并自动打开网站
npm run dev       # 只启动 Vite 前端
npm run server    # 只启动 Express 后端（需要 JWT_SECRET）
npm test          # 运行 Vitest 测试
npm run build     # 生成生产构建
npm run preview   # 预览生产构建（不包含独立 API 服务）
```

开发期前端会把 `/api` 请求代理到 `http://localhost:3001`。后端使用 Express 与 SQLite，提供乡村档案、乡村需求、实践队、实践档案和成果作品等接口。

## 主要目录

- `src/views/HomeView.vue`：数字博物馆序厅；
- `src/modules/`：乡村百科、乡村实践、乡村之声、攻略、好物与关于页面；
- `src/components/`：导航、地图、展厅页首、档案状态和基础组件；
- `server/`：Express API、SQLite 数据与服务层；
- `docs/visual-system.md`：视觉语言与设计令牌；
- `docs/asset-licensing.md`：素材登记与发布门槛；
- `src/data/assets-manifest.json`：当前素材版权台账。

## 演示数据与素材

页面中的部分村庄、成果、需求、团队和好物为演示内容，只用于验证信息架构与交互，不代表真实运营规模。平台级演示统计集中在 `src/data/demo-metadata.js`。

项目 Logo 为团队自有资产。现有 Unsplash、Pexels、Wikimedia Commons 图片和 DataV 地图数据均登记为 `demo-only`；正式公开前必须逐项完成许可核验，或替换为已获得公开传播授权的团队素材。

完整说明见 `THIRD_PARTY_NOTICES.md`。

## 技术栈

- Vue 3 + Vue Router + Vite
- ECharts / ECharts-GL
- Express 5 + SQLite
- Vitest
