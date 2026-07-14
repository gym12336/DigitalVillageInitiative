// src/modules/builder/editor/componentFactory.js

export function createComponent(type, x, y, chartType) {
  switch (type) {
    case 'text':        return createTextComponent(x, y)
    case 'image':       return createImageComponent(x, y)
    case 'chart':       return createChartComponent(x, y, chartType)
    case 'timeline':    return createTimelineComponent(x, y)
    case 'datatable':   return createDatatableComponent(x, y)
    case 'agri-sensor': return createSensorComponent(x, y)
    case 'layout-box': return createLayoutBoxComponent(x, y)
    case 'flow-box':   return createFlowBoxComponent(x, y)
    case 'map-3d':    return createMap3DComponent(x, y)
    default:            throw new Error(`Unknown component type: ${type}`)
  }
}

export function createTextComponent(x, y) {
  return {
    type: 'text',
    x, y,
    width: 300,
    height: 96,
    props: {
      text: '新建文本',
      fontSize: 34,
      color: '#1f2937',
      fontWeight: 700,
      textAlign: 'left',
      backgroundColor: 'transparent',
    },
  }
}

export function createImageComponent(x, y) {
  return {
    type: 'image',
    x, y,
    width: 320,
    height: 220,
    props: {
      src: '',
      alt: '',
      objectFit: 'cover',
      borderRadius: 0,
      autoRefresh: false,
      refreshInterval: 60,
    },
  }
}

export function createChartComponent(x, y, chartType) {
  return {
    type: 'chart',
    x, y,
    width: 520,
    height: 320,
    props: {
      title: '图表标题',
      chartType: chartType || 'bar',
      csvText: chartType
        ? defaultCsvFor(chartType)
        : 'label,value\n类别A,35\n类别B,68\n类别C,42\n类别D,55\n类别E,27',
      labelColumn: 'label',
      valueColumn: 'value',
    },
  }
}

export function defaultCsvFor(chartType) {
  switch (chartType) {
    case 'pie':           return 'label,value\n类别A,35\n类别B,68\n类别C,42\n类别D,55\n类别E,27'
    case 'stacked-bar':   return 'label,系列1,系列2,系列3\n一月,10,20,15\n二月,25,30,20\n三月,35,28,22'
    case 'dumbbell':      return 'label,start,end\n茶叶产量,120,210\n农户年收入,8000,18500\n合作社数量,3,12\n村集体资产,50,320'
    case 'trend-badge':   return 'label,value,change\n销售额,128,560,+12.5%\n用户数,42,091,+8.3%\n转化率,3.28%,-0.5%'
    case 'radar':         return 'label,产业兴旺,生态宜居,乡风文明,治理有效,生活富裕\n李家村,80,65,72,88,70\n全县平均,60,55,58,62,50'
    case 'sankey':        return 'source,target,value\n产业收入,基础设施建设,120\n产业收入,教育投入,80\n产业收入,医疗健康,50\n政策补贴,基础设施建设,60\n政策补贴,教育投入,40\n社会捐赠,医疗健康,30'
    default:              return 'label,value\n类别A,35\n类别B,68\n类别C,42\n类别D,55\n类别E,27'
  }
}

export function createTimelineComponent(x, y) {
  return {
    type: 'timeline',
    x, y,
    width: 600,
    height: 360,
    props: {
      title: '发展历程',
      events: [
        { date: '2020-03', title: '事件标题', description: '事件描述', child: null, popupWidth: 280, popupHeight: 200 },
        { date: '2021-06', title: '事件标题', description: '事件描述', child: null, popupWidth: 280, popupHeight: 200 },
        { date: '2022-12', title: '事件标题', description: '事件描述', child: null, popupWidth: 280, popupHeight: 200 },
      ],
    },
  }
}

export function createDatatableComponent(x, y) {
  return {
    type: 'datatable',
    x, y,
    width: 560,
    height: 340,
    props: {
      title: '荣誉资质',
      columns: ['荣誉名称', '颁发单位', '时间'],
      rows: [
        ['示例荣誉', '示例单位', '2024'],
        ['示例荣誉', '示例单位', '2023'],
      ],
    },
  }
}

export function createSensorComponent(x, y) {
  return {
    type: 'agri-sensor',
    x, y,
    width: 430,
    height: 400,
    props: {
      title: '农业传感器监测',
      sensors: [
        { name: '温度', value: 26.5, unit: '°C', status: 'normal' },
        { name: '湿度', value: 68, unit: '%', status: 'normal' },
        { name: '土壤pH', value: 6.8, unit: '', status: 'warning' },
        { name: '光照', value: 3200, unit: 'lux', status: 'normal' },
      ],
    },
  }
}

export function createLayoutBoxComponent(x, y) {
  return {
    type: 'layout-box',
    x, y,
    width: 800,
    height: 500,
    props: {
      title: '',
      slotCount: 2,
      layout: 'horizontal',
      splitRatios: [50, 50],
      children: [null, null],
    },
  }
}

export function createFlowBoxComponent(x, y) {
  return {
    type: 'flow-box',
    x, y,
    width: 900,
    height: 500,
    props: {
      title: '',
      children: [],
      activeIndex: 0,
      autoPlay: true,
      interval: 5,
      animation: 'slide',
      animationDuration: 400,
    },
  }
}

export function createMap3DComponent(x, y) {
  return {
    type: 'map-3d',
    x, y,
    width: 640,
    height: 420,
    props: {
      // 定位
      villageName: '',
      centerLng: null,
      centerLat: null,
      region: '',

      // 搜索筛选
      filterProvince: '',
      filterCity: '',

      // 视觉
      terrainExaggeration: 1.5,
      showRangeCircle: true,
      rangeRadius: 500,

      // 相机
      defaultHeight: 1200,
      defaultPitch: 60,
      minZoomHeight: 500,
      maxZoomHeight: 5000,
    },
  }
}

export function createEmptyChildComponent(type) {
  const defaults = {
    text:        { width: 200, height: 60,  props: { text: '文本内容', fontSize: 16, color: '#1f2937', fontWeight: 400, textAlign: 'center', backgroundColor: 'transparent' } },
    image:       { width: 240, height: 160, props: { src: '', alt: '', objectFit: 'cover', borderRadius: 4 } },
    chart:       { width: 260, height: 180, props: { title: '', chartType: 'bar', csvText: 'label,value\nA,30\nB,50\nC,20', labelColumn: 'label', valueColumn: 'value' } },
    'agri-sensor': { width: 240, height: 200, props: { title: '', sensors: [{ name: '温度', value: 26.5, unit: '°C', status: 'normal' }] } },
    timeline:    { width: 300, height: 220, props: { title: '', events: [{ date: '', title: '', description: '' }] } },
    datatable:   { width: 280, height: 180, props: { title: '', columns: ['列1'], rows: [['']] } },
  }
  const d = defaults[type]
  if (!d) throw new Error(`Unknown child component type: ${type}`)
  return { type, x: 0, y: 0, width: d.width, height: d.height, props: JSON.parse(JSON.stringify(d.props)) }
}
