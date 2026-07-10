const STORAGE_KEY = 'builder-big-components'

/**
 * Load all big components from localStorage.
 * @returns {Array}
 */
export function loadBigComponents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Save a new big component with normalized coordinates.
 * @param {string} name
 * @param {Array} children
 * @returns {object} the saved big component
 */
export function saveBigComponent(name, children) {
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

  const bigComponent = {
    id: 'bc_' + Date.now(),
    name,
    children: cloned,
    totalWidth,
    totalHeight,
    thumbnail: '',
    createdAt: Date.now(),
  }

  const all = loadBigComponents()
  all.push(bigComponent)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))

  return bigComponent
}

/**
 * Delete a big component by id.
 * @param {string} id
 */
export function deleteBigComponent(id) {
  const all = loadBigComponents()
  const filtered = all.filter((bc) => bc.id !== id)
  if (filtered.length !== all.length) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  }
}

/**
 * Get a single big component by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getBigComponent(id) {
  const all = loadBigComponents()
  return all.find((bc) => bc.id === id)
}
