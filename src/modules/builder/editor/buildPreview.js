// src/modules/builder/editor/buildPreview.js
import { renderChartSvg } from './chartRenderer.js'
import { renderSensorMarkup } from './sensorRenderer.js'
import { renderTimelineMarkup } from './timelineRenderer.js'
import { renderDatatableMarkup } from './datatableRenderer.js'
import { calcLayoutSlots } from './layoutBoxEngine.js'

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderLayoutBoxPreview(comp) {
  const { slots } = calcLayoutSlots(comp.width, comp.height, comp.props.layout, comp.props.splitRatios, comp.props.slotCount)
  const children = comp.props.children || []

  let slotHtml = ''
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]
    const child = children[i] || null
    if (child) {
      const tempChild = {
        type: child.type,
        x: 4,
        y: 4,
        width: s.w - 8,
        height: s.h - 8,
        props: child.props,
      }
      slotHtml += `<div style="position:absolute;left:${Math.round(s.x)}px;top:${Math.round(s.y)}px;width:${Math.round(s.w)}px;height:${Math.round(s.h)}px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">${renderComponentHtml(tempChild)}</div>`
    } else {
      slotHtml += `<div style="position:absolute;left:${Math.round(s.x)}px;top:${Math.round(s.y)}px;width:${Math.round(s.w)}px;height:${Math.round(s.h)}px;background:rgba(0,0,0,0.02);border-radius:12px;"></div>`
    }
  }

  return `<div style="position:relative;width:100%;height:100%;border:1px solid #e8edf2;border-radius:16px;background:#fafdfe;overflow:hidden;">${slotHtml}</div>`
}

function renderFlowBoxPreview(comp) {
  const p = comp.props
  const children = p.children || []
  const activeIndex = p.activeIndex || 0
  const w = comp.width
  const h = comp.height
  const duration = p.animationDuration || 400
  const interval = (p.interval || 5) * 1000
  const autoPlay = p.autoPlay !== false

  if (children.length === 0) {
    return '<div style="position:relative;width:100%;height:100%;border:1px solid #e8edf2;border-radius:16px;background:#fafdfe;display:flex;align-items:center;justify-content:center;color:#8ea3b2;font-size:14px;">无子组件</div>'
  }

  const fbId = 'fb' + Math.random().toString(36).slice(2, 8)

  // Render each child as a slide
  let slidesHtml = ''
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const translateX = (i - activeIndex) * 100
    const childComp = {
      type: child.type,
      x: 0,
      y: 0,
      width: w,
      height: h,
      props: child.props,
    }
    const innerHtml = renderComponentHtml(childComp)
    slidesHtml += '<div class="' + fbId + '-slide" data-slide-index="' + i + '" style="position:absolute;left:0;top:0;width:100%;height:100%;transform:translateX(' + translateX + '%);transition:transform ' + duration + 'ms ease;overflow:hidden;">' + innerHtml + '</div>'
  }

  // Dot indicators (only if more than one child)
  let dotsHtml = ''
  if (children.length > 1) {
    let dotsMarkup = ''
    for (let i = 0; i < children.length; i++) {
      const isActive = i === activeIndex
      dotsMarkup += '<span onclick="window[\'' + fbId + '_goTo\'](' + i + ')" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 4px;cursor:pointer;background:' + (isActive ? '#2c7da0' : 'rgba(255,255,255,0.5)') + ';border:1.5px solid ' + (isActive ? '#2c7da0' : 'rgba(255,255,255,0.5)') + ';transition:all 0.2s;"></span>'
    }
    dotsHtml = '<div id="' + fbId + '-dots" style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;align-items:center;padding:4px 12px;background:rgba(0,0,0,0.25);border-radius:999px;z-index:5;">' + dotsMarkup + '</div>'
  }

  // JavaScript for navigation, auto-play, and wheel
  let commonJs = ''
  let autoPlayJs = ''
  let wheelJs = ''

  if (children.length > 1) {
    commonJs =
      'var ' + fbId + '_idx=' + activeIndex + ';' +
      'var ' + fbId + '_len=' + children.length + ';' +
      'var ' + fbId + '_timer=null;' +
      'function ' + fbId + '_goTo(idx){' +
        fbId + '_idx=idx;' +
        'var slides=document.querySelectorAll(".' + fbId + '-slide");' +
        'for(var s=0;s<slides.length;s++){slides[s].style.transform="translateX("+((s-idx)*100)+"%)";}' +
        'var dots=document.querySelectorAll("#' + fbId + '-dots span");' +
        'for(var d=0;d<dots.length;d++){' +
          'if(d===idx){dots[d].style.background="#2c7da0";dots[d].style.borderColor="#2c7da0";}' +
          'else{dots[d].style.background="rgba(255,255,255,0.5)";dots[d].style.borderColor="rgba(255,255,255,0.5)";}' +
        '}' +
      '}' +
      'function ' + fbId + '_next(){' + fbId + '_goTo((' + fbId + '_idx+1)%' + fbId + '_len);}' +
      'function ' + fbId + '_prev(){' + fbId + '_goTo((' + fbId + '_idx-1+' + fbId + '_len)%' + fbId + '_len);}' +
      'function ' + fbId + '_resetTimer(){if(' + fbId + '_timer)clearTimeout(' + fbId + '_timer);' + fbId + '_timer=setTimeout(function(){' + fbId + '_next();' + fbId + '_resetTimer();},' + interval + ');}' +
      'window[\'' + fbId + '_goTo\']=' + fbId + '_goTo;'

    if (autoPlay) {
      autoPlayJs = fbId + '_resetTimer();'
    }

    wheelJs = 'document.getElementById("' + fbId + '").addEventListener("wheel",function(e){e.preventDefault();if(e.deltaY>0){' + fbId + '_next();}else{' + fbId + '_prev();}' + (autoPlay ? fbId + '_resetTimer();' : '') + '});'
  }

  return '<div id="' + fbId + '" style="position:relative;width:100%;height:100%;border:1px solid #e8edf2;border-radius:16px;background:#fafdfe;overflow:hidden;">' +
    slidesHtml +
    dotsHtml +
    '</div>' +
    '<script>' + commonJs + autoPlayJs + wheelJs + '</script>'
}

function renderComponentHtml(c) {
  let inner = ''
  const p = c.props
  switch (c.type) {
    case 'text':
      inner = `<div style="width:100%;height:100%;display:flex;align-items:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};padding:12px;box-sizing:border-box;font-size:${p.fontSize}px;color:${p.color};font-weight:${p.fontWeight};text-align:${p.textAlign};background:${p.backgroundColor};border-radius:4px;overflow:hidden;word-wrap:break-word;">${esc(p.text)}</div>`
      break
    case 'image':
      if (p.src) {
        inner = `<img src="${esc(p.src)}" alt="${esc(p.alt)}" draggable="false" style="width:100%;height:100%;object-fit:${p.objectFit};border-radius:${p.borderRadius}px;"/>`
      } else {
        inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:#f2f6f8;color:#687b8b;font-size:13px;border-radius:${p.borderRadius}px;">图片占位</div>`
      }
      break
    case 'chart':
      inner = renderChartSvg(c)
      break
    case 'agri-sensor':
      inner = renderSensorMarkup(c)
      break
    case 'timeline':
      inner = renderTimelineMarkup(c)
      break
    case 'datatable':
      inner = renderDatatableMarkup(c)
      break
    case 'layout-box':
      inner = renderLayoutBoxPreview(c)
      break
    case 'flow-box':
      inner = renderFlowBoxPreview(c)
      break
    case 'map-3d': {
      const located = p.centerLng != null && p.centerLat != null
      if (!located) {
        inner = `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f2f6f8;border-radius:12px;color:#8ea3b2;font-size:13px;gap:6px;"><span style="font-size:2rem;opacity:0.5;">\u{1F3D4}️</span><span>请在属性面板输入村庄名</span></div>`
      } else {
        inner = `<div id="map3d-${c.id || ''}" style="width:100%;height:100%;border-radius:12px;overflow:hidden;background:#f2f6f8;"></div>
<script type="module">
(function() {
  var container = document.getElementById('map3d-${c.id || ''}');
  if (!container) return;

  window.__map3dCount = (window.__map3dCount || 0) + 1;
  if (window.__map3dCount > 4) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8ea3b2;font-size:13px;">实例超限，单页最多 4 个 3D 地图</div>';
    return;
  }

  var opts = {
    lng: ${p.centerLng},
    lat: ${p.centerLat},
    terrainExaggeration: ${p.terrainExaggeration || 1.5},
    showRangeCircle: ${p.showRangeCircle !== false},
    rangeRadius: ${p.rangeRadius || 500},
    defaultHeight: ${p.defaultHeight || 1200},
    defaultPitch: ${p.defaultPitch || 60},
    minZoomHeight: ${p.minZoomHeight || 500},
    maxZoomHeight: ${p.maxZoomHeight || 5000},
    tiandituKey: window.__tiandituKey || '',
    ionToken: window.__ionToken || '',
    onError: function(err) {
      if (err.type === 'no-tianditu-key' || err.type === 'bad-tianditu-key') {
        container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#8ea3b2;font-size:13px;gap:8px;"><span>天地图密钥未配置，请联系管理员</span></div>';
      } else if (err.type === 'no-webgl') {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8ea3b2;font-size:13px;">浏览器不支持 3D 渲染</div>';
      }
    }
  };

  import('__CESIUM_SCENE_URL__')
    .then(function(m) {
      return m.createScene(container, opts);
    })
    .then(function(ctrl) {
      if (ctrl && ctrl.setLabel) {
        ctrl.setLabel('${esc(p.villageName || '')}');
      }
    })
    .catch(function(e) {
      console.error('[map3d preview] 初始化失败:', e);
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8ea3b2;font-size:13px;">3D 渲染初始化失败</div>';
    });
})();
</script>`
      }
      break
    }
  }
  const overflow = (c.type === 'timeline') ? 'overflow:visible;' : 'overflow:hidden;'
  return `<div style="position:absolute;left:${c.x}px;top:${c.y}px;width:${c.width}px;height:${c.height}px;${overflow}">${inner}</div>`
}

export function buildPreviewHtml(state, baseUrl) {
  const hasMap3d = state.components.some(c => c.type === 'map-3d' && c.props.centerLng != null)

  const isDev = import.meta.env.DEV
  const cesiumSceneUrl = isDev
    ? '/src/modules/builder/editor/map3d/cesiumScene.js'
    : '/assets/cesiumScene.js'

  const componentsHtml = state.components
    .map(c => renderComponentHtml(c))
    .join('\n')
    .replace(/__CESIUM_SCENE_URL__/g, cesiumSceneUrl)

  const baseTag = baseUrl ? `<base href="${esc(baseUrl)}">` : ''

  const map3dHead = hasMap3d ? `
<script type="module">
  if (window.opener && window.opener.__map3dKeys) {
    window.__tiandituKey = window.opener.__map3dKeys.tiandituKey || '';
    window.__ionToken = window.opener.__map3dKeys.ionToken || '';
  }
  window.__map3dCount = 0;
</script>
<link rel="stylesheet" href="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Widgets/widgets.css">
` : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
${baseTag}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>成果预览</title>
${map3dHead}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: "LXGW WenKai", "Noto Serif SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #edf3f7; display: flex; justify-content: center; padding: 40px;
}
.stage {
  position: relative; width: ${state.pageWidth}px; height: ${state.pageHeight}px;
  background: ${state.pageBackground}; box-shadow: 0 12px 48px rgba(36,90,115,0.18);
  overflow: hidden;
}
</style>
</head>
<body>
<div class="stage">
${componentsHtml}
</div>
</body>
</html>`
}

export function buildAndOpen(state) {
  // 将密钥暴露给预览子窗口（通过 opener 访问）
  import('./map3d/mapConfig.js').then(m => {
    window.__map3dKeys = {
      tiandituKey: m.getTiandituKey(),
      ionToken: m.getIonToken(),
    }
  })

  const html = buildPreviewHtml(state, window.location.origin + '/')
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
