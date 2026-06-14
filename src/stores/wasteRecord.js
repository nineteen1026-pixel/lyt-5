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
      store: itemData.store || '',
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

  function getMonthBefore(month) {
    const [y, m] = month.split('-').map(Number)
    const date = new Date(y, m - 2, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  function getMonthlyWasteAnalysis(month, filters = {}) {
    let filtered = records.value.filter(r => r.month === month)
    const prevMonth = getMonthBefore(month)
    let prevFiltered = records.value.filter(r => r.month === prevMonth)

    if (filters.category && filters.category !== '全部') {
      filtered = filtered.filter(r => r.parentCategoryName === filters.category)
      prevFiltered = prevFiltered.filter(r => r.parentCategoryName === filters.category)
    }
    if (filters.zone && filters.zone !== '全部') {
      filtered = filtered.filter(r => r.zone === filters.zone)
      prevFiltered = prevFiltered.filter(r => r.zone === filters.zone)
    }
    if (filters.store && filters.store !== '全部') {
      filtered = filtered.filter(r => r.store === filters.store)
      prevFiltered = prevFiltered.filter(r => r.store === filters.store)
    }

    const wasteRecords = filtered.filter(r => getDisposalReasonInfo(r.reason).isWaste)
    const naturalConsumption = filtered.filter(r => r.reason === 'natural_consumption')

    const totalWasteCount = wasteRecords.length
    const totalWasteQty = wasteRecords.reduce((sum, r) => sum + r.quantity, 0)
    const naturalConsumptionCount = naturalConsumption.length
    const naturalConsumptionQty = naturalConsumption.reduce((sum, r) => sum + r.quantity, 0)
    const totalCount = filtered.length
    const totalQty = filtered.reduce((sum, r) => sum + r.quantity, 0)

    const prevWasteRecords = prevFiltered.filter(r => getDisposalReasonInfo(r.reason).isWaste)
    const prevNatural = prevFiltered.filter(r => r.reason === 'natural_consumption')
    const prevWasteQty = prevWasteRecords.reduce((sum, r) => sum + r.quantity, 0)
    const prevNaturalQty = prevNatural.reduce((sum, r) => sum + r.quantity, 0)

    const wasteChange = prevWasteQty > 0
      ? Math.round(((totalWasteQty - prevWasteQty) / prevWasteQty) * 100)
      : (totalWasteQty > 0 ? 100 : 0)
    const consumptionChange = prevNaturalQty > 0
      ? Math.round(((naturalConsumptionQty - prevNaturalQty) / prevNaturalQty) * 100)
      : (naturalConsumptionQty > 0 ? 100 : 0)

    const utilizationRate = totalQty > 0
      ? Math.round((naturalConsumptionQty / totalQty) * 100)
      : 0
    const prevTotalQty = prevFiltered.reduce((sum, r) => sum + r.quantity, 0)
    const prevUtilization = prevTotalQty > 0
      ? Math.round((prevNaturalQty / prevTotalQty) * 100)
      : 0
    const utilizationChange = utilizationRate - prevUtilization

    return {
      month,
      totalCount,
      totalQty,
      totalWasteCount,
      totalWasteQty,
      naturalConsumptionCount,
      naturalConsumptionQty,
      utilizationRate,
      prevWasteQty,
      prevNaturalQty,
      prevUtilization,
      wasteChange,
      consumptionChange,
      utilizationChange,
      byReason: getReasonBreakdown(filtered),
      byWasteType: getWasteTypeBreakdown(wasteRecords)
    }
  }

  function getReasonBreakdown(filtered) {
    const result = {}
    Object.keys(DISPOSAL_REASONS).forEach(reason => {
      const items = filtered.filter(r => r.reason === reason)
      result[reason] = {
        count: items.length,
        quantity: items.reduce((sum, r) => sum + r.quantity, 0),
        label: DISPOSAL_REASONS[reason].label,
        icon: DISPOSAL_REASONS[reason].icon,
        isWaste: DISPOSAL_REASONS[reason].isWaste
      }
    })
    return result
  }

  function getWasteTypeBreakdown(wasteRecords) {
    return {
      expired: {
        count: wasteRecords.filter(r => r.reason === 'expired').length,
        quantity: wasteRecords.filter(r => r.reason === 'expired').reduce((sum, r) => sum + r.quantity, 0)
      },
      spoiled: {
        count: wasteRecords.filter(r => r.reason === 'spoiled').length,
        quantity: wasteRecords.filter(r => r.reason === 'spoiled').reduce((sum, r) => sum + r.quantity, 0)
      },
      discarded: {
        count: wasteRecords.filter(r => r.reason === 'discarded').length,
        quantity: wasteRecords.filter(r => r.reason === 'discarded').reduce((sum, r) => sum + r.quantity, 0)
      },
      other: {
        count: wasteRecords.filter(r => r.reason === 'other').length,
        quantity: wasteRecords.filter(r => r.reason === 'other').reduce((sum, r) => sum + r.quantity, 0)
      }
    }
  }

  function getWasteDimensionAnalysis(month, dimension, filters = {}) {
    let filtered = records.value.filter(r => r.month === month)
    const prevMonth = getMonthBefore(month)
    let prevFiltered = records.value.filter(r => r.month === prevMonth)

    if (filters.category && filters.category !== '全部' && dimension !== 'category') {
      filtered = filtered.filter(r => r.parentCategoryName === filters.category)
      prevFiltered = prevFiltered.filter(r => r.parentCategoryName === filters.category)
    }
    if (filters.zone && filters.zone !== '全部' && dimension !== 'zone') {
      filtered = filtered.filter(r => r.zone === filters.zone)
      prevFiltered = prevFiltered.filter(r => r.zone === filters.zone)
    }
    if (filters.store && filters.store !== '全部' && dimension !== 'store') {
      filtered = filtered.filter(r => r.store === filters.store)
      prevFiltered = prevFiltered.filter(r => r.store === filters.store)
    }

    const dimensionKey = dimension === 'category' ? 'parentCategoryName' : dimension
    const currentByDim = {}
    const prevByDim = {}

    filtered.forEach(r => {
      const key = r[dimensionKey] || '未分类'
      const isWaste = getDisposalReasonInfo(r.reason).isWaste
      if (!currentByDim[key]) {
        currentByDim[key] = {
          totalCount: 0,
          totalQty: 0,
          wasteCount: 0,
          wasteQty: 0,
          consumptionCount: 0,
          consumptionQty: 0
        }
      }
      currentByDim[key].totalCount++
      currentByDim[key].totalQty += r.quantity
      if (isWaste) {
        currentByDim[key].wasteCount++
        currentByDim[key].wasteQty += r.quantity
      } else {
        currentByDim[key].consumptionCount++
        currentByDim[key].consumptionQty += r.quantity
      }
    })

    prevFiltered.forEach(r => {
      const key = r[dimensionKey] || '未分类'
      const isWaste = getDisposalReasonInfo(r.reason).isWaste
      if (!prevByDim[key]) {
        prevByDim[key] = { wasteQty: 0, consumptionQty: 0, totalQty: 0 }
      }
      prevByDim[key].totalQty += r.quantity
      if (isWaste) {
        prevByDim[key].wasteQty += r.quantity
      } else {
        prevByDim[key].consumptionQty += r.quantity
      }
    })

    const allKeys = new Set([...Object.keys(currentByDim), ...Object.keys(prevByDim)])
    const result = Array.from(allKeys).map(key => {
      const current = currentByDim[key] || {
        totalCount: 0, totalQty: 0, wasteCount: 0, wasteQty: 0, consumptionCount: 0, consumptionQty: 0
      }
      const prev = prevByDim[key] || { wasteQty: 0, consumptionQty: 0, totalQty: 0 }

      const utilizationRate = current.totalQty > 0
        ? Math.round((current.consumptionQty / current.totalQty) * 100)
        : 0
      const wasteRate = current.totalQty > 0
        ? Math.round((current.wasteQty / current.totalQty) * 100)
        : 0

      const wasteChange = prev.wasteQty > 0
        ? Math.round(((current.wasteQty - prev.wasteQty) / prev.wasteQty) * 100)
        : (current.wasteQty > 0 ? 100 : 0)
      const consumptionChange = prev.consumptionQty > 0
        ? Math.round(((current.consumptionQty - prev.consumptionQty) / prev.consumptionQty) * 100)
        : (current.consumptionQty > 0 ? 100 : 0)

      return {
        name: key,
        totalCount: current.totalCount,
        totalQty: current.totalQty,
        wasteCount: current.wasteCount,
        wasteQty: current.wasteQty,
        consumptionCount: current.consumptionCount,
        consumptionQty: current.consumptionQty,
        utilizationRate,
        wasteRate,
        prevWasteQty: prev.wasteQty,
        prevConsumptionQty: prev.consumptionQty,
        wasteChange,
        consumptionChange
      }
    }).sort((a, b) => b.wasteQty - a.wasteQty)

    return result
  }

  function getWasteTrendWithFilters(filters = {}) {
    const trend = {}
    records.value.forEach(r => {
      if (filters.category && filters.category !== '全部' && r.parentCategoryName !== filters.category) return
      if (filters.zone && filters.zone !== '全部' && r.zone !== filters.zone) return
      if (filters.store && filters.store !== '全部' && r.store !== filters.store) return

      const isWaste = getDisposalReasonInfo(r.reason).isWaste
      if (!trend[r.month]) {
        trend[r.month] = {
          total: 0,
          waste: 0,
          consumption: 0,
          totalQty: 0,
          wasteQty: 0,
          consumptionQty: 0
        }
      }
      trend[r.month].total++
      trend[r.month].totalQty += r.quantity
      if (isWaste) {
        trend[r.month].waste++
        trend[r.month].wasteQty += r.quantity
      } else {
        trend[r.month].consumption++
        trend[r.month].consumptionQty += r.quantity
      }
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
    getMonthlyWasteAnalysis,
    getWasteDimensionAnalysis,
    getWasteTrendWithFilters,
    getDisposalReasonInfo
  }
})
