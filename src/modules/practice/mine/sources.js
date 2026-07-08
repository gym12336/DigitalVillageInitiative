// 聚合四类站内静态数据，供 retrieval.js 检索。集中在此，视图只管调用。
import villages from '@/data/encyclopedia-villages.json'
import practiceData from '../practice-data.json'
import voiceData from '@/modules/voice/voice-data.json'
import guideData from '@/modules/guide/guide-data.json'

export const retrievalSources = {
  villages,
  results: practiceData.results || [],
  demands: voiceData.demands || [],
  guide: guideData,
}
