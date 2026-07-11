// Big component CRUD backed by /api/builder (database).
// Each dossier has its own big component library.
import { apiLoadDocuments, apiSaveDocument, apiDeleteDocument } from '../builderApi.js'

/**
 * Load all big components for a dossier.
 * @param {string} dossierId
 * @returns {Promise<Array>} — each item is the full document row { id, type, name, payload, ... }
 */
export async function loadBigComponents(dossierId) {
  try {
    return await apiLoadDocuments(dossierId, 'big-component')
  } catch {
    return []
  }
}

/**
 * Save a new big component with normalized coordinates.
 * @param {string} dossierId
 * @param {string} name
 * @param {Array} children — array of canvas component objects
 * @returns {Promise<object>} the saved document
 */
export async function saveBigComponent(dossierId, name, children) {
  // Deep clone children so originals are not mutated
  const cloned = JSON.parse(JSON.stringify(children))

  // Compute minX and minY
  const minX = Math.min(...cloned.map((c) => c.x))
  const minY = Math.min(...cloned.map((c) => c.y))

  // Normalize coordinates
  for (const child of cloned) {
    child.x -= minX
    child.y -= minY
  }

  // Compute total dimensions
  let totalWidth = 0
  let totalHeight = 0
  for (const child of cloned) {
    const right = child.x + child.width
    const bottom = child.y + child.height
    if (right > totalWidth) totalWidth = right
    if (bottom > totalHeight) totalHeight = bottom
  }

  const payload = JSON.stringify({
    children: cloned,
    totalWidth,
    totalHeight,
    thumbnail: '',
    createdAt: Date.now(),
  })

  return apiSaveDocument(dossierId, {
    type: 'big-component',
    name,
    payload,
  })
}

/**
 * Delete a big component by document id.
 * @param {string} id — document id (not the old localStorage bc_xxx id)
 */
export async function deleteBigComponent(id) {
  try {
    await apiDeleteDocument(id)
  } catch {
    // Silently ignore errors
  }
}

/** @deprecated — use loadBigComponents + find instead */
export async function getBigComponent(dossierId, bigComponentId) {
  const all = await loadBigComponents(dossierId)
  return all.find((bc) => bc.id === bigComponentId)
}
