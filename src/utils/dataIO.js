export const DATA_VERSION = '1.0.0'

const VERSION_COMPATIBILITY = {
  '1.0.0': true
}

export function checkVersion(version) {
  if (!version) return { valid: false, message: '缺少版本号信息' }
  if (VERSION_COMPATIBILITY[version]) {
    return { valid: true, message: '版本兼容' }
  }
  const [major, minor] = version.split('.').map(v => parseInt(v, 10))
  const [curMajor, curMinor] = DATA_VERSION.split('.').map(v => parseInt(v, 10))
  if (major === curMajor && minor <= curMinor) {
    return { valid: true, message: '版本向下兼容' }
  }
  return { valid: false, message: `版本不兼容：当前版本 ${DATA_VERSION}，导入版本 ${version}` }
}

export function buildExportData(fridgeItems, shoppingList) {
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    fridge: {
      items: fridgeItems || []
    },
    shopping: {
      items: shoppingList || []
    }
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportToJSON(fridgeItems, shoppingList) {
  const data = buildExportData(fridgeItems, shoppingList)
  const content = JSON.stringify(data, null, 2)
  const dateStr = new Date().toISOString().split('T')[0]
  downloadFile(content, `fridge-data-${dateStr}.json`, 'application/json')
}

function escapeCSV(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function unescapeCSV(value) {
  if (value === null || value === undefined) return ''
  let str = String(value).trim()
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.slice(1, -1).replace(/""/g, '"')
  }
  return str
}

const FRIDGE_CSV_HEADERS = [
  { key: 'type', label: '类型' },
  { key: 'name', label: '名称' },
  { key: 'quantity', label: '数量' },
  { key: 'unit', label: '单位' },
  { key: 'expiryDate', label: '保质期' },
  { key: 'zone', label: '分区' },
  { key: 'categoryName', label: '品类' },
  { key: 'parentCategoryName', label: '父品类' },
  { key: 'nutritionTags', label: '营养标签' },
  { key: 'store', label: '门店' },
  { key: 'unitPrice', label: '单价' },
  { key: 'purchased', label: '已购' },
  { key: 'fromExpiring', label: '临期补货' },
  { key: 'createdAt', label: '创建时间' }
]

export function exportToCSV(fridgeItems, shoppingList) {
  const rows = []
  rows.push(FRIDGE_CSV_HEADERS.map(h => escapeCSV(h.label)).join(','))

  fridgeItems.forEach(item => {
    rows.push([
      escapeCSV('fridge'),
      escapeCSV(item.name),
      escapeCSV(item.quantity),
      escapeCSV(item.unit),
      escapeCSV(item.expiryDate),
      escapeCSV(item.zone),
      escapeCSV(item.categoryName || ''),
      escapeCSV(item.parentCategoryName || ''),
      escapeCSV((item.nutritionTags || []).join('|')),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(item.createdAt || '')
    ].join(','))
  })

  shoppingList.forEach(item => {
    rows.push([
      escapeCSV('shopping'),
      escapeCSV(item.name),
      escapeCSV(item.quantity),
      escapeCSV(item.unit),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(''),
      escapeCSV(item.store || ''),
      escapeCSV(item.unitPrice || 0),
      escapeCSV(item.purchased ? '是' : '否'),
      escapeCSV(item.fromExpiring ? '是' : '否'),
      escapeCSV(item.createdAt || '')
    ].join(','))
  })

  const content = '\uFEFF' + rows.join('\r\n')
  const dateStr = new Date().toISOString().split('T')[0]
  downloadFile(content, `fridge-data-${dateStr}.csv`, 'text/csv;charset=utf-8')
}

export function parseJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        const versionCheck = checkVersion(data.version)
        if (!versionCheck.valid) {
          reject(new Error(versionCheck.message))
          return
        }
        resolve({
          fridgeItems: data.fridge?.items || [],
          shoppingItems: data.shopping?.items || [],
          version: data.version,
          exportedAt: data.exportedAt
        })
      } catch (err) {
        reject(new Error('JSON 解析失败：' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let content = e.target.result
        if (content.charCodeAt(0) === 0xFEFF) {
          content = content.slice(1)
        }
        const lines = content.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) {
          reject(new Error('CSV 文件内容为空'))
          return
        }
        const headers = parseCSVLine(lines[0])
        const headerMap = {}
        FRIDGE_CSV_HEADERS.forEach((h, idx) => {
          if (headers[idx] === h.label) {
            headerMap[h.key] = idx
          }
        })
        const fridgeItems = []
        const shoppingItems = []
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i])
          const getVal = (key) => unescapeCSV(cols[headerMap[key]] ?? '')
          const type = getVal('type')
          if (type === 'fridge') {
            fridgeItems.push({
              name: getVal('name'),
              quantity: parseFloat(getVal('quantity')) || 0,
              unit: getVal('unit') || '个',
              expiryDate: getVal('expiryDate'),
              zone: getVal('zone') || '冷藏',
              categoryName: getVal('categoryName') || '',
              parentCategoryName: getVal('parentCategoryName') || '',
              nutritionTags: getVal('nutritionTags').split('|').filter(Boolean),
              createdAt: getVal('createdAt') || undefined
            })
          } else if (type === 'shopping') {
            shoppingItems.push({
              name: getVal('name'),
              quantity: parseFloat(getVal('quantity')) || 1,
              unit: getVal('unit') || '个',
              store: getVal('store') || '',
              unitPrice: parseFloat(getVal('unitPrice')) || 0,
              purchased: getVal('purchased') === '是',
              fromExpiring: getVal('fromExpiring') === '是',
              createdAt: getVal('createdAt') || undefined
            })
          }
        }
        resolve({
          fridgeItems,
          shoppingItems,
          version: 'csv-import',
          exportedAt: null
        })
      } catch (err) {
        reject(new Error('CSV 解析失败：' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

export function addDaysToDate(dateStr, days) {
  if (!dateStr) return dateStr
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}
