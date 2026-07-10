// src/modules/builder/editor/componentFactory.js

export function createComponent(type, x, y, chartType) {
  switch (type) {
    case 'text':        return createTextComponent(x, y)
    case 'image':       return createImageComponent(x, y)
    case 'chart':       return createChartComponent(x, y, chartType)
    case 'agri-sensor': return createSensorComponent(x, y)
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

function defaultCsvFor(chartType) {
  switch (chartType) {
    case 'pie':           return 'label,value\n类别A,35\n类别B,68\n类别C,42\n类别D,55\n类别E,27'
    case 'stacked-bar':   return 'label,系列1,系列2,系列3\n一月,10,20,15\n二月,25,30,20\n三月,35,28,22'
    case 'dumbbell':      return 'label,start,end\n茶叶产量,120,210\n农户年收入,8000,18500\n合作社数量,3,12\n村集体资产,50,320'
    case 'trend-badge':   return 'label,value,change\n销售额,128,560,+12.5%\n用户数,42,091,+8.3%\n转化率,3.28%,-0.5%'
    case 'radar':         return 'label,产业兴旺,生态宜居,乡风文明,治理有效,生活富裕\n李家村,80,65,72,88,70\n全县平均,60,55,58,62,50'
    default:              return 'label,value\n类别A,35\n类别B,68\n类别C,42\n类别D,55\n类别E,27'
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
