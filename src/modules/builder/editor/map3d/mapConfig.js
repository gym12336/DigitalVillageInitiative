// src/modules/builder/editor/map3d/mapConfig.js

let _tiandituKey = ''
let _ionToken = ''
let _fetched = false

export async function fetchMapConfig() {
  if (_fetched) return
  try {
    const res = await fetch('/api/config')
    if (res.ok) {
      const data = await res.json()
      _tiandituKey = data.tiandituKey || ''
      _ionToken = data.ionToken || ''
    }
  } catch (e) {
    console.warn('[map3d] 获取密钥配置失败，地图功能将受限:', e)
  }
  _fetched = true
}

export function getTiandituKey() {
  return _tiandituKey
}

export function getIonToken() {
  return _ionToken
}
