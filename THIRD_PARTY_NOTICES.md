# 第三方素材与许可说明

本文件记录“数乡计划”前端仓库中会直接影响页面呈现的第三方素材。依赖包的完整许可仍以各包随附的 `LICENSE` 与 `package-lock.json` 为准。

## 本轮视觉改造

- 字体：未新增或分发任何第三方字体文件。页面使用操作系统自带的中文无衬线、宋体与楷体回退栈。
- 图标：`src/components/AppIcon.vue` 中的线性 SVG 为本项目本轮原创绘制，不依赖外部图标库。
- 首页视觉：地形线、经纬网、扫描线与展陈框均由 CSS / SVG 代码生成，不使用第三方图片。

## 项目自有 Logo（非第三方）

用户已确认 `public/brand/shuxiang-logo-source.jpg` 为数乡计划团队自行设计。透明全标与图形标仅进行背景提取和裁切，分别用于页脚、导航与 favicon；三项资产均在 `src/data/assets-manifest.json` 中登记为 `project-owned / cleared`。

## 现有演示图片

仓库在本轮改造前已经包含以下外部占位素材。这些素材只应继续用于内部原型或演示，不应在完成逐项许可核验前作为正式公开内容发布。

### Unsplash

出现位置：

- `src/data/encyclopedia-villages.json`
- `src/modules/practice/practice-data.json`

当前记录只保留了 `images.unsplash.com` 的图片 ID，未记录摄影者、原始作品页与下载日期。虽然 Unsplash 素材通常适用 Unsplash License，但直接 CDN 地址不足以形成完整的素材台账。

发布前要求：

1. 找回每张图片的原始作品页与摄影者；
2. 记录许可版本、获取日期与使用位置；
3. 确认图片内容不会被误认为真实的对应村庄；
4. 优先替换为团队自摄且已获得公开传播授权的照片。

### Pexels

出现位置：

- `src/modules/goods/goods-data.json`

当前直链包含作品编号，但没有摄影者、原始作品页与获取日期。发布前应补齐这些信息，并确认商品图不会造成产地、品牌或实物背书的误导。

### Wikimedia Commons

出现位置：

- `src/data/encyclopedia-villages.json`

Wikimedia Commons 的每个文件可能采用不同许可，不能以“来自 Commons”为由统一视为无条件可用。发布前必须逐个打开文件说明页，记录作者、具体许可证、署名格式、许可证链接及是否要求相同方式共享。

### 地图边界数据

`src/lib/geoLoader.js` 会按需请求阿里云 DataV 的行政区划 GeoJSON。正式部署前需要确认该数据服务的可用范围、署名要求、缓存与再分发条件，并准备稳定的本地或自有数据源。

## 团队自采素材

团队自摄不等于自动获得公开或商业使用权。人物影像、采访音频与可识别私人空间至少应记录：

- 拍摄者与拍摄日期；
- 被摄者是否同意拍摄；
- 是否同意网站公开展示；
- 是否同意新闻宣传；
- 是否同意商业推广；
- 授权凭证存放位置与撤回方式。

详细流程见 `docs/asset-licensing.md`。
