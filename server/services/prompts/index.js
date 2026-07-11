// Prompt 模板集中导出。所有 AI 生成任务的 Prompt 在这里统一管理，便于调优。
export { INTRO_SYSTEM, buildIntroUserPrompt } from './introPrompt.js'
export { FACTS_SYSTEM, buildFactsUserPrompt } from './factsPrompt.js'
export { TAGS_SYSTEM, TAG_POOL, buildTagsUserPrompt } from './tagsPrompt.js'

