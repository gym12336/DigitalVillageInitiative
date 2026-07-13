// src/modules/builder/editor/map3d/cesiumScene.js
// 纯逻辑模块，无 Vue 依赖。封装所有 Cesium API 调用。
// Cesium 在预览态按需动态 import，编辑器主 bundle 不打包。

/**
 * @typedef {Object} SceneOpts
 * @property {number} lng - 经度
 * @property {number} lat - 纬度
 * @property {number} terrainExaggeration - 地形夸张系数 1.0–3.0
 * @property {boolean} showRangeCircle - 是否显示范围圆
 * @property {number} rangeRadius - 范围圆半径（米）
 * @property {number} defaultHeight - 相机默认高度（米）
 * @property {number} defaultPitch - 相机默认倾斜角（度）
 * @property {number} minZoomHeight - 最小缩放高度（米）
 * @property {number} maxZoomHeight - 最大缩放高度（米）
 * @property {string} tiandituKey - 天地图密钥
 * @property {string} ionToken - Cesium Ion Token
 * @property {Function} onError - 错误回调 ({ type, reason })
 */

export async function createScene(container, opts) {
  // 动态 import Cesium（仅预览态触发）
  const Cesium = await import('cesium')

  // 1. 检测 WebGL 支持（容错）
  if (typeof WebGLRenderingContext === 'undefined') {
    opts.onError && opts.onError({ type: 'no-webgl', reason: '浏览器不支持 WebGL' })
    return createNoopController()
  }

  // 2. 配置 Ion Token（必须在创建 Viewer 之前）
  if (opts.ionToken) {
    Cesium.Ion.defaultAccessToken = opts.ionToken
  }

  // 3. 创建 Viewer（关闭所有 UI 控件）
  const viewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    imageryProvider: false,   // 手动添加天地图图层
  })

  const { scene, camera, globe, entities } = viewer

  try {
    // 4. 手动添加天地图影像 + 注记图层
    if (opts.tiandituKey) {
      const imgLayer = new Cesium.UrlTemplateImageryProvider({
        url: `https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${opts.tiandituKey}`,
        maximumLevel: 18,
        subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      })
      viewer.imageryLayers.addImageryProvider(imgLayer)

      const labelLayer = new Cesium.UrlTemplateImageryProvider({
        url: `https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${opts.tiandituKey}`,
        maximumLevel: 18,
        subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      })
      viewer.imageryLayers.addImageryProvider(labelLayer)
    } else {
      opts.onError && opts.onError({ type: 'no-tianditu-key', reason: '天地图密钥未配置' })
    }

    // 5. 加载全球地形（依赖 Ion Token）
    if (opts.ionToken) {
      try {
        const terrainProvider = await Cesium.createWorldTerrainAsync({
          requestVertexNormals: true,
        })
        globe.terrainProvider = terrainProvider
      } catch (e) {
        // 降级为无地形平面
        globe.terrainProvider = new Cesium.EllipsoidTerrainProvider()
        opts.onError && opts.onError({ type: 'terrain-failed', reason: e.message || '地形加载失败' })
      }
    } else {
      // 无 Ion Token → 平面模式
      globe.terrainProvider = new Cesium.EllipsoidTerrainProvider()
      opts.onError && opts.onError({ type: 'no-ion-token', reason: 'Ion Token 未配置' })
    }

    // 6. 关闭全局特效
    scene.skyBox.show = false
    scene.skyAtmosphere.show = false
    scene.sun.show = false
    scene.moon.show = false
    scene.fog.enabled = false
    globe.showGroundAtmosphere = false
    globe.enableLighting = false

    // 7. 性能优化
    globe.showSkirts = false
    globe.underground = false

    // 8. 地形夸张
    scene.verticalExaggeration = opts.terrainExaggeration || 1.5

    // 9. 相机限制
    scene.screenSpaceCameraController.minimumZoomDistance = opts.minZoomHeight || 500
    scene.screenSpaceCameraController.maximumZoomDistance = opts.maxZoomHeight || 5000

    // 10. 标注贴地
    globe.depthTestAgainstTerrain = true

    // 11. 按需渲染
    scene.requestRenderMode = true
    scene.maximumRenderTimeChange = Infinity
    viewer.targetFrameRate = 30

    // 12. 标注实体：中心点 + 村名 + 范围圆
    const pointEntity = entities.add({
      position: Cesium.Cartesian3.fromDegrees(opts.lng, opts.lat),
      point: new Cesium.PointGraphics({
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString('#e74c3c'),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      }),
    })

    const labelEntity = entities.add({
      position: Cesium.Cartesian3.fromDegrees(opts.lng, opts.lat),
      label: new Cesium.LabelGraphics({
        text: '',  // 暂时留空，由外部设置
        font: '16px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      }),
    })

    const ellipseEntity = entities.add({
      ellipse: new Cesium.EllipseGraphics({
        semiMinorAxis: opts.rangeRadius || 500,
        semiMajorAxis: opts.rangeRadius || 500,
        material: Cesium.Color.fromCssColorString('rgba(231, 76, 60, 0.15)'),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('rgba(231, 76, 60, 0.5)'),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      }),
      show: opts.showRangeCircle !== false,
    })

    // 13. 飞行到村庄
    const pitchRad = Cesium.Math.toRadians(opts.defaultPitch || 60)
    camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        opts.lng, opts.lat, opts.defaultHeight || 1200
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: pitchRad,
        roll: 0,
      },
      duration: 2.5,
    })

    // -- ResizeObserver --
    let resizeObserver = null
    let resizeTimer = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          viewer.resize()
          // requestRenderMode 下 resize 后需手动触发渲染
          scene.requestRender()
        }, 100)
      })
      resizeObserver.observe(container)
    }

    // -- IntersectionObserver --
    let intersectionObserver = null
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            viewer.useDefaultRenderLoop = true
            scene.requestRender()
          } else {
            viewer.useDefaultRenderLoop = false
          }
        }
      })
      intersectionObserver.observe(container)
    }

    // 内部状态
    let _defaultHeight = opts.defaultHeight || 1200
    let _defaultPitch = opts.defaultPitch || 60
    let _destroyed = false

    // -- 返回控制器 --
    const controller = {
      async flyTo(lng, lat) {
        if (_destroyed) return
        const target = Cesium.Cartesian3.fromDegrees(lng, lat, _defaultHeight)
        camera.flyTo({
          destination: target,
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(_defaultPitch),
            roll: 0,
          },
          duration: 2.5,
        })
        // 更新标注实体位置
        pointEntity.position = Cesium.Cartesian3.fromDegrees(lng, lat)
        labelEntity.position = Cesium.Cartesian3.fromDegrees(lng, lat)
        ellipseEntity.position = Cesium.Cartesian3.fromDegrees(lng, lat)
      },

      setTerrainExaggeration(val) {
        if (_destroyed) return
        scene.verticalExaggeration = val
        scene.requestRender()
      },

      setRangeCircle(show, radius) {
        if (_destroyed) return
        ellipseEntity.show = show
        if (show) {
          ellipseEntity.ellipse.semiMinorAxis = radius
          ellipseEntity.ellipse.semiMajorAxis = radius
        }
        scene.requestRender()
      },

      setZoomLimits(min, max) {
        if (_destroyed) return
        scene.screenSpaceCameraController.minimumZoomDistance = min
        scene.screenSpaceCameraController.maximumZoomDistance = max
      },

      setLabel(text) {
        if (_destroyed) return
        labelEntity.label.text = text
        scene.requestRender()
      },

      setDefaultCamera(height, pitch) {
        _defaultHeight = height
        _defaultPitch = pitch
      },

      pauseRendering() {
        if (_destroyed) return
        viewer.useDefaultRenderLoop = false
      },

      resumeRendering() {
        if (_destroyed) return
        viewer.useDefaultRenderLoop = true
        scene.requestRender()
      },

      resize() {
        if (_destroyed) return
        viewer.resize()
        scene.requestRender()
      },

      destroy() {
        if (_destroyed) return
        _destroyed = true

        // 1. 取消飞行
        camera.cancelFlight()

        // 2. 清除实体
        entities.removeAll()

        // 3. 断开 Observer
        if (resizeObserver) {
          resizeObserver.disconnect()
          resizeObserver = null
        }
        if (intersectionObserver) {
          intersectionObserver.disconnect()
          intersectionObserver = null
        }

        // 4. 销毁 Viewer
        viewer.destroy()

        // 5. 清空容器
        container.innerHTML = ''
      },
    }

    return controller
  } catch (e) {
    // 初始化过程中任意步骤出错 → 安全销毁
    try { viewer.destroy() } catch (_) { /* ignore */ }
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;">3D 渲染初始化失败</div>'
    opts.onError && opts.onError({ type: 'init-failed', reason: e.message })
    return createNoopController()
  }
}

/** 空操作控制器（出错或 WebGL 不可用时返回） */
function createNoopController() {
  const noop = () => {}
  return {
    flyTo: noop,
    setTerrainExaggeration: noop,
    setRangeCircle: noop,
    setZoomLimits: noop,
    setLabel: noop,
    setDefaultCamera: noop,
    pauseRendering: noop,
    resumeRendering: noop,
    resize: noop,
    destroy: noop,
  }
}
