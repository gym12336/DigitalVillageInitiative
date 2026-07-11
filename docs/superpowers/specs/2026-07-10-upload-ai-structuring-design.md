# 上传文件 → AI 自动结构化 → 实践后原始数据支持 设计

- 日期:2026-07-10
- 栏目:乡村实践 · 我的实践 · 实践中(采集阶段)
- 关联:[[shuxiang-practice-track]] [[shuxiang-internship-ai]],上游 spec `2026-07-10-practice-track-ai-collection-design.md`

## 一、问题

「实践中」上传的文档已能存盘 + 解析出纯文本(如报名表 xlsx 抽出 14827 字),但这些 `text` **目前完全没被 AI 利用**:
- `ResultCards.vue`(实践后成果卡)只认结构化字段 `metricValues`/`people`/`materials`,读不到文件里藏的指标/人物/事件。
- 文档上传后,解析文本只是填进 AI 提取的输入框,要队员手动再点「AI 提取」,多一步、易漏。

结果:上传的原始材料无法自动转成结构化数据,喂不到实践后工作台。

## 二、目标

补上断链:**文档一上传 → 自动 AI 抽取其解析文本 → 结构化信息(人物/指标/材料要点)进待审校区 → 队员逐条采纳 → 入 `collected` → 实践后成果卡自动生成。**

管线各段(存盘解析、AI 抽取服务、待审校 UI、采纳入库、成果卡)均已存在,本设计只串接「上传后自动抽取」这一步 + 标注来源 + 加载态 + 图片轻量入口。

## 三、决策(用户拍板)

1. **处理范围**:文本为主 + 图片轻量。文档解析文本走 AI 抽取(核心);图片做「按需手动 AI 描述」入口;视频不做内容理解。
2. **落地阶段**:实践中采集阶段(复用现有管线,不新增页面)。
3. **自动化程度**:上传即自动抽取(拿到解析文本后自动跑一次 AI 提取,结果进待审校区)。

## 四、数据流

```
传文档 → /media/extract-and-store(存盘+解析,已有)
      → 前端自动调 extractFromText(text)(已有,主 AI + 离线兜底)
      → 结果合并进 TrackExtract 待审校区,每条标 sourceFile
      → 逐条采纳 → collected.people / metricValues / materials(已有)
      → ResultCards 自动成卡(已有)
```

## 五、组件改动

### 1. TrackExtract.vue —— 上传即自动抽取 + 来源标注(核心)
- `onPickDoc` 拿到 `{ media, text }` 后:
  - 把文档登记进材料清单(已实现)。
  - **自动调用一次 `extractFromText(text)`**,把结果 merge 进现有待审校区(不覆盖已有草稿,追加去重)。
  - 每条草稿加 `sourceFile: media.name`,卡片上展示「来自:报名表.xlsx」。
- 粘贴文字手动提取的路径保留不变(那些 `sourceFile` 为空,展示为「手动输入」)。
- 加载态:抽取期间显示「AI 正在读取 <文件名>…」,禁用重复触发。

### 2. 后端 `/media/describe-image` —— 图片轻量描述(诚实降级)
- 新增路由:multipart 上传图片 → 转 base64 → 调多模态 chat(OpenAI 兼容 content 数组 `image_url`)→ 返回一句图注。
- `server/lib/deepseek.js` 现仅支持 string `user`;新增 `chatVision({ system, user, imageDataUrl, ... })` 支持数组 content,或扩展 chatJSON。**不改动现有 chatJSON 签名**,避免回归。
- DeepSeek 官方 `deepseek-chat` 不支持图片输入:调用失败时后端返回 `{ available:false, reason }`,前端提示「当前模型暂不支持图片理解,可后续接入多模态模型」。接口与前端就位,换 model/endpoint(如百炼 qwen-vl)即可启用。

### 3. TrackMedia.vue —— 图片行「AI 描述此图」按钮
- 图片类材料行加小按钮,点击调 `describeImage`,成功把图注写进该材料 `note`(空时)或追加提示;失败给降级提示。不自动跑(省成本)。

## 六、错误处理

- AI 抽取:沿用三级兜底(主 AI → 离线正则 → 空结果),恒不阻断上传;抽取为空提示「未从该文件抽到结构化信息」。
- 图片描述:模型不支持 / 无 key / 网络失败 → 诚实降级提示,不阻断。
- 自动抽取失败不影响文档已进材料清单(两步独立)。

## 七、测试

- 前端:文档上传后自动触发抽取并 merge 待审校(mock extractFromText);来源标注展示;加载态。
- 后端:`/describe-image` 缺 file → 400;非成员 → 403;无 key/模型不支持 → 200 且 `available:false`(不抛)。
- 回归:现有 media route 12 测试、extract 前端测试不破。

## 八、不做(YAGNI)

- 视频内容理解、图片批量自动打标签(全量图片自动跑 vision 成本高)。
- 新增独立页面 / 看板(复用实践中 + 实践后既有结构)。
- 真·视觉识别依赖:当前 key 不支持,不硬造;结构预留,二期接多模态模型。
