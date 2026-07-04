// 乡村实践页的筛选/排序纯函数，与视图解耦便于单测。

/** 按标签过滤人物；tag 为「全部」返回全部。匹配 role 或 tags 数组任一。 */
export function filterPeople(people, tag) {
  if (!tag || tag === '全部') return [...people]
  return people.filter((p) => p.role === tag || (p.tags || []).includes(tag))
}

/** 多条件过滤成果：keyword（标题/学校/团队/村，大小写不敏感）、type、form、year。'全部'/空表示不限。 */
export function filterResults(results, { keyword = '', type = '全部', form = '全部', year = '全部' } = {}) {
  const kw = String(keyword).trim().toLowerCase()
  return results.filter((r) => {
    if (type !== '全部' && r.type !== type) return false
    if (form !== '全部' && r.form !== form) return false
    if (year !== '全部' && String(r.year) !== String(year)) return false
    if (kw) {
      const hay = [r.title, r.school, r.team, r.village].join(' ').toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
}

/** 四种排序，返回新数组：latest(年份降序) / views / likes / downloads(均降序)。 */
export function sortResults(results, sortBy = 'latest') {
  const list = [...results]
  const byNum = (key) => (a, b) => (b[key] ?? 0) - (a[key] ?? 0)
  if (sortBy === 'views') return list.sort(byNum('views'))
  if (sortBy === 'likes') return list.sort(byNum('likes'))
  if (sortBy === 'downloads') return list.sort(byNum('downloads'))
  return list.sort(byNum('year')) // latest
}
