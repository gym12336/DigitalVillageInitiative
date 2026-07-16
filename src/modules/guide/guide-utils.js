import { GUIDE_STAGE_ALL, GUIDE_TYPE_ALL } from './guide-schema.js'

export const defaultGuideFilters = Object.freeze({
  keyword: '',
  stage: GUIDE_STAGE_ALL,
  type: GUIDE_TYPE_ALL,
})

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function sectionText(sections = []) {
  return sections
    .map((section) => [
      section.heading,
      section.body,
      ...(section.steps || []),
      section.tip,
      section.example,
    ].filter(Boolean).join(' '))
    .join(' ')
}

export function guideSearchText(resource) {
  return [
    resource.title,
    resource.summary,
    resource.type,
    resource.format,
    ...(resource.keywords || []),
    ...(resource.applicableScenes || []),
    sectionText(resource.sections),
    ...(resource.checklist || []),
    ...(resource.mistakes || []),
    resource.example?.title,
    resource.example?.content,
  ].filter(Boolean).join(' ')
}

export function filterGuideResources(resources = [], filters = {}) {
  const keyword = normalize(filters.keyword)
  const stage = filters.stage || GUIDE_STAGE_ALL
  const type = filters.type || GUIDE_TYPE_ALL

  return resources.filter((resource) => {
    const stageMatched = stage === GUIDE_STAGE_ALL || resource.stage === stage
    const typeMatched = type === GUIDE_TYPE_ALL || resource.type === type
    const keywordMatched = !keyword || normalize(guideSearchText(resource)).includes(keyword)
    return stageMatched && typeMatched && keywordMatched
  })
}

export function clearGuideFilters() {
  return { ...defaultGuideFilters }
}

export function findGuideResource(resources = [], slug) {
  return resources.find((resource) => resource.slug === slug) || null
}

export function hasDownloadableAttachments(resource) {
  return Array.isArray(resource?.attachments) && resource.attachments.some((item) => item?.href)
}

export function getRelatedResources(resources = [], resource, limit = 3) {
  if (!resource) return []
  const explicit = (resource.relatedIds || [])
    .map((id) => resources.find((item) => item.id === id || item.slug === id))
    .filter(Boolean)

  if (explicit.length >= limit) return explicit.slice(0, limit)

  const used = new Set(explicit.map((item) => item.id))
  used.add(resource.id)
  const fallback = resources
    .filter((item) => !used.has(item.id))
    .filter((item) => item.stage === resource.stage || item.type === resource.type)

  return [...explicit, ...fallback].slice(0, limit)
}
