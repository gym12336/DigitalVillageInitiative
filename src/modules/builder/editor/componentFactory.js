// src/modules/builder/editor/componentFactory.js

export function createComponent(type, x, y) {
  switch (type) {
    case 'text':        return createTextComponent(x, y)
    case 'image':       return createImageComponent(x, y)
    case 'chart':       return createChartComponent(x, y)
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

export function createChartComponent(x, y) {
  return {
    type: 'chart',
    x, y,
    width: 520,
    height: 320,
    props: {
      title: '图表标题',
      chartType: 'bar',
      csvText: 'label,value\n类别A,35\n类别B,68\n类别C,42\n类别D,55\n类别E,27',
      labelColumn: 'label',
      valueColumn: 'value',
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
