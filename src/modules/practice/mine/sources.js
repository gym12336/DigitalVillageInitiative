// 聚合四类站内数据，供 retrieval.js 检索。集中在此，视图只管调用。
import { fetchAllVillages } from '@/api/villages.js'
import practiceData from '../practice-data.json'
import voiceData from '@/modules/voice/voice-data.json'
import guideData from '@/modules/guide/guide-data.json'

let _cached = null

export async function getRetrievalSources() {
  if (_cached) return _cached
  const villages = await fetchAllVillages()
  _cached = {
    villages,
    results: practiceData.results || [],
    demands: voiceData.demands || [],
    guide: guideData,
  }
  return _cached
}
