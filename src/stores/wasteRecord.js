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

    return {
      month,
      totalCount,
      expiredCount,
      discardedCount,
      byZone,
      topWastedItems,
      details: [...filtered].sort((a, b) => new Date(b.discardedAt) - new Date(a.discardedAt))
    }
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
    addRecord,
    getMonthlySummary,
    getWasteTrend
  }
})
