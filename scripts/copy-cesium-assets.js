import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cesiumBase = join(__dirname, '..', 'node_modules', 'cesium', 'Build', 'Cesium')
const publicCesium = join(__dirname, '..', 'public', 'cesium')

if (existsSync(cesiumBase)) {
  mkdirSync(publicCesium, { recursive: true })
  for (const dir of ['Workers', 'Assets', 'Widgets']) {
    const src = join(cesiumBase, dir)
    const dest = join(publicCesium, dir)
    if (existsSync(src)) {
      cpSync(src, dest, { recursive: true })
      console.log(`[postinstall] Copied cesium/${dir} -> public/cesium/${dir}`)
    }
  }
} else {
  console.warn('[postinstall] Cesium build directory not found, skipping asset copy')
}
