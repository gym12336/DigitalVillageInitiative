# 数乡计划素材版权工作流

## 使用优先级

1. 团队自行拍摄，并取得与用途相匹配的书面或可追溯授权；
2. 村委、合作单位提供，并明确授权主体、范围与期限；
3. 公有领域或许可条件清晰的开放素材；
4. Unsplash、Pexels 等图库素材，仅作为有台账的临时占位；
5. 禁止直接使用搜索引擎结果页、社交平台搬运图或无法追溯原作者的图片。

## 每项素材必须记录的字段

```json
{
  "id": "唯一编号",
  "fileOrUrl": "本地文件或原始地址",
  "type": "photo | video | audio | font | icon | map-data",
  "source": "self-shot | partner | Unsplash | Pexels | Wikimedia Commons",
  "author": "作者或拍摄者",
  "originalPage": "原始作品说明页",
  "license": "具体许可名称与版本",
  "licenseUrl": "许可链接",
  "obtainedAt": "获取日期",
  "usage": ["使用页面或栏目"],
  "modified": false,
  "consentStatus": "not-applicable | pending | granted | restricted | revoked",
  "proofLocation": "授权凭证位置",
  "publishStatus": "demo-only | cleared | blocked",
  "replaceWithOriginal": true
}
```

## 发布门槛

- `publishStatus` 不是 `cleared` 的素材不得进入正式公开站点；
- Wikimedia Commons 素材必须按单文件许可处理；
- 人物素材缺少公开传播授权时，即使是团队成员拍摄也不得公开；
- 乡村、商品与人物的图片不得被错误绑定到不对应的数据记录；
- 保留原始文件、授权记录与最终发布版本之间的可追溯关系。

## 当前仓库状态

本轮视觉改造没有新增外部图片、字体或图标库，并移除了首页的 Unsplash 自动轮播。用户提供并确认由团队自行设计的项目 Logo 已登记在 `src/data/assets-manifest.json`，状态为 `project-owned / cleared`。现有数据文件中的 Unsplash、Pexels 与 Wikimedia Commons 直链仍属于 `demo-only`，需要后续逐项补齐作者和许可信息，或替换为团队自有素材。
