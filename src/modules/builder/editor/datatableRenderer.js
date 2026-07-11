// src/modules/builder/editor/datatableRenderer.js

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderDatatableMarkup(component) {
  const { props, width, height } = component
  const { title, columns, rows } = props

  if (!columns || columns.length === 0 || !rows || rows.length === 0) {
    return `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fafdfe;border-radius:14px;border:1px solid rgba(44,125,160,0.08);color:#687b8b;font-size:14px;">
        暂无数据
      </div>`
  }

  // 表头
  let headerCells = ''
  columns.forEach(col => {
    headerCells += `<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;">${esc(col)}</th>`
  })

  // 数据行
  let bodyRows = ''
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? '#ffffff' : 'rgba(44,125,160,0.03)'
    const hoverBg = 'rgba(44,125,160,0.06)'
    let cells = ''
    row.forEach((cell, ci) => {
      const val = ci < columns.length ? (cell || '') : ''
      cells += `<td style="padding:10px 14px;font-size:12px;color:#627586;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${esc(String(val))}</td>`
    })
    bodyRows += `<tr style="background:${bg};" onmouseenter="this.style.background='${hoverBg}'" onmouseleave="this.style.background='${bg}'">${cells}</tr>`
  })

  let titleHtml = ''
  if (title) {
    titleHtml = `<div style="padding:14px 16px 10px;border-bottom:1px solid rgba(44,125,160,0.06);"><h3 style="margin:0;font-size:15px;font-weight:700;color:#1c2834;">${esc(title)}</h3></div>`
  }

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#fafdfe;border-radius:14px;border:1px solid rgba(44,125,160,0.08);">
      ${titleHtml}
      <div style="flex:1;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;table-layout:auto;">
          <thead>
            <tr style="background:#245a73;position:sticky;top:0;">
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
        </table>
      </div>
    </div>`
}
