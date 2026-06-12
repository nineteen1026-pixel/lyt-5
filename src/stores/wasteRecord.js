import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { generateId } from '@/utils/storage'

const WASTE_RECORD_KEY = 'waste_records'

function getStoredRecords() {
  try {
    const data = localStorage.getItem(WASTE_RECORD_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function setStoredRecords(records) {
  try {
    localStorage.setItem(WASTE_RECORD_KEY, JSON.stringify(records))
  } catch {
    console.error('Failed to save waste records to localStorage')
  }
}

export const useWasteRecordStore = defineStore('wasteRecord', () => {
  const records = ref(getStoredRecords())

  const allMonths = computed(() => {
    const monthSet = new Set(records.value.map(r => r.month))
    return [...monthSet].sort().reverse()
  })

  const currentMonth = computed(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const availableMonths = computed(() => {
    const months = [...allMonths.value]
    if (!months.includes(currentMonth.value)) {
      months.unshift(currentMonth.value)
    }
    return months
  })

  const zones = ['冷藏', '冷冻', '保鲜', '门架']

  function addRecord(itemData) {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const record = {
      id: generateId(),
      name: itemData.name,
      quantity: itemData.quantity,
      unit: itemData.unit,
      zone: itemData.zone,
      reason: itemData.reason,
      expiryDate: itemData.expiryDate,
      discardedAt: now.toISOString(),
      month
    }
    records.value.push(record)
    return record
  }

  function removeRecord(id) {
    const index = records.value.findIndex(r => r.id === id)
    if (index !== -1) {
      records.value.splice(index, 1)
    }
  }

  function clearAllRecords() {
    records.value = []
  }

  function getMonthlySummary(month, zoneFilter = '全部') {
    let filtered = records.value.filter(r => r.month === month)
    if (zoneFilter !== '全部') {
      filtered = filtered.filter(r => r.zone === zoneFilter)
    }

    const expiredCount = filtered.filter(r => r.reason === 'expired').length
    const discardedCount = filtered.filter(r => r.reason === 'discarded').length
    const totalCount = filtered.length

    const byZone = {}
    filtered.forEach(r => {
      if (!byZone[r.zone]) {
        byZone[r.zone] = { expired: 0, discarded: 0, total: 0 }
      }
      byZone[r.zone][r.reason]++
      byZone[r.zone].total++
    })

    const byName = {}
    filtered.forEach(r => {
      if (!byName[r.name]) {
        byName[r.name] = { count: 0, totalQuantity: 0, unit: r.unit, reasons: { expired: 0, discarded: 0 } }
      }
      byName[r.name].count++
      byName[r.name].totalQuantity += r.quantity
      byName[r.name].reasons[r.reason]++
    })

    const topWastedItems = Object.entries(byName)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const weeklyBreakdown = getWeeklyBreakdown(filtered)

    return {
      month,
      totalCount,
      expiredCount,
      discardedCount,
      byZone,
      topWastedItems,
      weeklyBreakdown,
      details: [...filtered].sort((a, b) => new Date(b.discardedAt) - new Date(a.discardedAt))
    }
  }

  function getWeeklyBreakdown(filteredRecords) {
    const weeks = {}
    filteredRecords.forEach(r => {
      const date = new Date(r.discardedAt)
      const dayOfMonth = date.getDate()
      const weekNum = Math.ceil(dayOfMonth / 7)
      const weekKey = `第${weekNum}周`
      if (!weeks[weekKey]) {
        weeks[weekKey] = { expired: 0, discarded: 0, total: 0 }
      }
      weeks[weekKey][r.reason]++
      weeks[weekKey].total++
    })
    return Object.entries(weeks)
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }

  function getWasteTrend(zoneFilter = '全部') {
    const trend = {}
    records.value.forEach(r => {
      if (zoneFilter !== '全部' && r.zone !== zoneFilter) return
      if (!trend[r.month]) {
        trend[r.month] = { expired: 0, discarded: 0, total: 0 }
      }
      trend[r.month][r.reason]++
      trend[r.month].total++
    })
    return Object.entries(trend)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  function generateMockData() {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const mockItems = [
      { name: '西红柿', unit: '斤', zone: '冷藏' },
      { name: '黄瓜', unit: '斤', zone: '冷藏' },
      { name: '鸡蛋', unit: '个', zone: '保鲜' },
      { name: '牛奶', unit: '盒', zone: '冷藏' },
      { name: '鸡肉', unit: '斤', zone: '冷冻' },
      { name: '面包', unit: '袋', zone: '冷藏' },
      { name: '酸奶', unit: '瓶', zone: '冷藏' },
      { name: '豆腐', unit: '盒', zone: '保鲜' },
      { name: '饺子', unit: '袋', zone: '冷冻' },
      { name: '可乐', unit: '瓶', zone: '门架' },
    ]

    for (let m = 0; m < 6; m++) {
      const monthIdx = (currentMonth - m + 12) % 12
      const year = currentYear - (m > currentMonth ? 1 : 0)
      const monthStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
      const recordCount = Math.floor(Math.random() * 8) + 3

      for (let i = 0; i < recordCount; i++) {
        const item = mockItems[Math.floor(Math.random() * mockItems.length)]
        const day = Math.floor(Math.random() * daysInMonth) + 1
        const reason = Math.random() > 0.4 ? 'expired' : 'discarded'
        const date = new Date(year, monthIdx, day)
        const expiryDate = new Date(date)
        expiryDate.setDate(expiryDate.getDate() - Math.floor(Math.random() * 5))

        const record = {
          id: generateId(),
          name: item.name,
          quantity: Math.floor(Math.random() * 3) + 1,
          unit: item.unit,
          zone: item.zone,
          reason,
          expiryDate: expiryDate.toISOString().split('T')[0],
          discardedAt: date.toISOString(),
          month: monthStr
        }
        records.value.push(record)
      }
    }
  }

  watch(
    records,
    (newRecords) => {
      setStoredRecords(newRecords)
    },
    { deep: true }
  )

  return {
    records,
    allMonths,
    currentMonth,
    availableMonths,
    zones,
    addRecord,
    removeRecord,
    clearAllRecords,
    getMonthlySummary,
    getWasteTrend,
    generateMockData
  }
})
