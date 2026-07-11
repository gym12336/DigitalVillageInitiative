// Prompt 模板：读一份实践档案已采集的人物/指标/材料，生成一段成果综述 + 若干成果亮点。
// 喂给 chatJSON，强制 JSON 输出。用于实践后成果页的开场综述与亮点清单。

export const SUMMARY_SYSTEM = [
  '你是「大学生乡村实践成果综述助手」。用户会给你一份实践档案已采集的结构化数据',
  '（人物、指标前后值、材料要点）。请综合这些数据，生成成果综述与亮点。',
  '严格返回 JSON 对象，结构如下：',
  '{',
  '  "summary": string,       // 一段 150-250 字、有观点有逻辑的实践成果综述',
  '  "highlights": [string]   // 3-5 条成果亮点短句，每条一句话',
  '}',
  '要求：',
  '- 综述要综合全部数据讲出「带来了什么改变」，可读、成段，适合答辩开场。',
  '- 亮点每条突出一个具体成效，能引用指标数字的优先引用。',
  '- 只依据给定数据，不得编造原始数据里没有的人物、数字或事实。',
  '- 数据稀少时，就现有内容如实概括，不要凑字数、不要空话套话。',
].join('\n')

/** 把档案的结构化数据整理成给 LLM 的 user prompt。 */
export function buildSummaryUserPrompt({ people = [], metricValues = [], materials = [], topic = '', village = '' } = {}) {
  const lines = []
  if (topic) lines.push(`实践主题：${topic}`)
  if (village) lines.push(`目标村庄：${village}`)

  if (metricValues.length) {
    lines.push('', '【指标数据】')
    for (const m of metricValues) {
      const before = m.before === '' || m.before === undefined ? '—' : m.before
      const after = m.after === '' || m.after === undefined ? '—' : m.after
      lines.push(`- ${m.name || '(未命名)'}：帮扶前 ${before}${m.unit || ''}，帮扶后 ${after}${m.unit || ''}`)
    }
  }
  if (people.length) {
    lines.push('', '【人物】')
    for (const p of people) {
      const bits = [p.name, p.role].filter(Boolean).join('·')
      lines.push(`- ${bits}${p.quote ? `：“${p.quote}”` : ''}`)
    }
  }
  if (materials.length) {
    lines.push('', '【材料要点】')
    for (const m of materials) {
      lines.push(`- ${m.name || '(未命名)'}${m.note ? `（${m.note}）` : ''}`)
    }
  }

  return [
    '请综合下面这份实践档案的采集数据，按 system 指定的 JSON 结构生成成果综述与亮点：',
    '---',
    lines.join('\n'),
    '---',
  ].join('\n')
}
