import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { generateId } from '@/utils/storage'
import { sanitizeNutritionTags } from '@/utils/categories'

const WASTE_RECORD_KEY = 'waste_records'

const DISPOSAL_REASONS = {
  expired: { label: '过期丢弃', icon: '⏰', isWaste: true },
  natural_consumption: { label: '自然消耗', icon: '🍽️', isWaste: false },
  spoiled: { label: '变质丢弃', icon: '🦠', isWaste: true },
  discarded: { label: '手动清理', icon: '🚫', isWaste: true },
  other: { label: '其他原因', icon: '📝', isWaste: true }
}

function getDisposalReasonInfo(reason) {
  return DISPOSAL_REASONS[reason] || DISPOSAL_REASONS.discarded
}

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
      reason: itemData.reason || 'discarded',
      disposalNote: itemData.disposalNote || '',
      expiryDate: itemData.expiryDate,
      categoryId: itemData.categoryId || '',
      categoryName: itemData.categoryName || '',
      parentCategoryId: itemData.parentCategoryId || '',
      parentCategoryName: itemData.parentCategoryName || '',
      nutritionTags: sanitizeNutritionTags(itemData.nutritionTags || []),
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

    const wasteRecords = filtered.filter(r => getDisposalReasonInfo(r.reason).isWaste)
    const naturalConsumptionCount = filtered.filter(r => r.reason === 'natural_consumption').length
    const expiredCount = wasteRecords.filter(r => r.reason === 'expired').length
    const spoiledCount = wasteRecords.filter(r => r.reason === 'spoiled').length
    const discardedCount = wasteRecords.filter(r => r.reason === 'discarded').length
    const otherCount = wasteRecords.filter(r => r.reason === 'other').length
    const totalWasteCount = wasteRecords.length
    const totalCount = filtered.length

    const byZone = {}
    filtered.forEach(r => {
      if (!byZone[r.zone]) {
        byZone[r.zone] = { expired: 0, spoiled: 0, discarded: 0, other: 0, naturalConsumption: 0, wasteTotal: 0, total: 0 }
      }
      const reasonInfo = getDisposalReasonInfo(r.reason)
      if (r.reason === 'natural_consumption') {
        byZone[r.zone].naturalConsumption++
      } else {
        byZone[r.zone][r.reason] = (byZone[r.zone][r.reason] || 0) + 1
        byZone[r.zone].wasteTotal++
      }
      byZone[r.zone].total++
    })

    const byName = {}
    filtered.forEach(r => {
      if (!byName[r.name]) {
        byName[r.name] = {
          count: 0,
          wasteCount: 0,
          naturalCount: 0,
          totalQuantity: 0,
          unit: r.unit,
          reasons: { expired: 0, spoiled: 0, discarded: 0, other: 0, natural_consumption: 0 }
        }
      }
      byName[r.name].count++
      byName[r.name].totalQuantity += r.quantity
      byName[r.name].reasons[r.reason] = (byName[r.name].reasons[r.reason] || 0) + 1
      if (r.reason === 'natural_consumption') {
        byName[r.name].naturalCount++
      } else {
        byName[r.name].wasteCount++
      }
    })

    const topWastedItems = Object.entries(byName)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.wasteCount - a.wasteCount)
      .slice(0, 5)

    const byReason = {}
    Object.keys(DISPOSAL_REASONS).forEach(reason => {
      const count = filtered.filter(r => r.reason === reason).length
      byReason[reason] = {
        count,
        label: DISPOSAL_REASONS[reason].label,
        icon: DISPOSAL_REASONS[reason].icon,
        isWaste: DISPOSAL_REASONS[reason].isWaste
      }
    })

    return {
      month,
      totalCount,
      totalWasteCount,
      naturalConsumptionCount,
      expiredCount,
      spoiledCount,
      discardedCount,
      otherCount,
      byZone,
      byReason,
      topWastedItems,
      details: [...filtered].sort((a, b) => new Date(b.discardedAt) - new Date(a.discardedAt))
    }
  }

  function getWasteTrend(zoneFilter = '全部') {
    const trend = {}
    records.value.forEach(r => {
      if (zoneFilter !== '全部' && r.zone !== zoneFilter) return
      if (!trend[r.month]) {
        trend[r.month] = { expired: 0, spoiled: 0, discarded: 0, other: 0, naturalConsumption: 0, wasteTotal: 0, total: 0 }
      }
      const reasonInfo = getDisposalReasonInfo(r.reason)
      if (r.reason === 'natural_consumption') {
        trend[r.month].naturalConsumption++
      } else {
        trend[r.month][r.reason] = (trend[r.month][r.reason] || 0) + 1
        trend[r.month].wasteTotal++
      }
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
    DISPOSAL_REASONS,
    addRecord,
    getMonthlySummary,
    getWasteTrend,
    getDisposalReasonInfo
  }
})
