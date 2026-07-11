# ZIP 整包导入 · 自动解压归类抽取 设计

- 作者：gym
- 日期：2026-07-11
- 栏目：乡村实践 · 我的实践 · 实践中（采集阶段）
- 关联：[[shuxiang-practice-track]]；上游 spec `2026-07-10-upload-ai-structuring-design.md`、`2026-07-11-practice-track-layout-redesign-design.md`
- 性质：入口层新增「解压 + 分发」，复用现有存盘/解析/抽取/归类管线。零 schema 变更。

## 一、问题

现在只能逐个上传文件。实践队常把一次采集的照片、文档、表格打包成一个 zip，需要能整包导入，自动解压、按类型归类、文本档自动 AI 抽取，省去逐个上传。

## 二、决策（用户拍板）

- **全自动**：解压后逐文件过现有管线——文本档存盘+解析+自动 AI 抽取，图片/音视频/表格存盘归类。全部进材料清单，抽取结果进待审校区。
- **稳妥限额**：单包 ≤100MB、解压总量 ≤300MB、≤100 文件；单文件仍按现有分档（音视频200MB/图片20MB/文本档10MB）。超限拒绝。

## 三、架构

```
前端 AI 采集工作区「📦 导入压缩包」→ 上传 .zip
后端 POST /api/practice/media/import-zip：
  1. jszip 读 buffer，遍历条目（jszip 已装，无新依赖）
  2. 安全校验：包≤100MB(multer硬顶)、解压总量≤300MB、≤100文件 → 超限拒绝
  3. 逐条目：跳过目录、__MACOSX、. 开头隐藏文件
  4. 每文件 → storeFile 存盘 + kindOf 归类（复用）
  5. 文本档(doc/table) → extractText 抽文本 + extractFromText 跑 AI（复用）
  6. 返回 { materials:[...], drafts:{people,metrics,materialHints}, skipped:[...], imported, total }
前端：materials 批量入清单；drafts 合并进待审校（带来源文件名）；提示导入/跳过/抽取条数
```

## 四、单元划分

- **新增 `server/services/zipImportService.js`**：`importZip(buffer, { dossierId, baseDir, deps })` → 结构化结果。职责：解压 + 安全校验 + 逐文件分发。依赖注入 jszip/storeFile/extractText/extractFromText 便于单测。单文件解析失败记 skipped 继续，不中断整包。
- **新增路由 `POST /api/practice/media/import-zip`**：multer 单文件收 zip（100MB 硬顶），assertDossierMember 归属校验，fixName 归正名。
- **前端 mediaApi 加 `importZip`**；TrackExtract 加「📦 导入压缩包」按钮 + 进度提示；结果分发：materials push 进清单、drafts 走已有 mergeDraft 合并进待审校（sourceFile 标各自来源文件名）。

## 五、安全（zip 特有）

- 包≤100MB、解压总量≤300MB、≤100文件 → 整体拒绝（413）。
- 存盘用重铸随机名 → 路径穿越天然免疫。
- 单文件仍走 checkUpload 分档限额；超限的单文件记 skipped，不整体失败。
- 跳过目录项、`__MACOSX/`、`.` 开头隐藏文件、0 字节项。

## 六、错误处理

- 非 zip / 解析失败 → 400；缺 file/dossierId → 400；超限 → 413；非成员 → 403。
- 单文件失败（解析/超限）→ 进 skipped 列表继续，整包不中断。
- AI 抽取失败沿用三级兜底，不阻断导入。

## 七、测试

- zipImportService 单测（mock jszip）：正常分发多文件、限额拒绝（文件数/总量）、跳过规则（目录/隐藏/__MACOSX）、单文件失败进 skipped 继续、文本档触发抽取。
- 路由测试：非成员 403、缺 file 400、正常 zip 导入 201 返回结构。
- 回归：现有 media-route 测试不破。

## 八、不做（YAGNI）

- 嵌套 zip 递归解压、rar/7z。
- 导入后自动生成成果综述（综述仍手动触发）。
- 解压预览勾选（选了全自动）。
- 大包流式解压（jszip 内存解压，300MB 上限内可接受）。
