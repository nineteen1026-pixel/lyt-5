import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { generateId } from '@/utils/storage'
import { getCategoryInfo } from '@/utils/categories'

const COST_RECORDS_KEY = 'purchase_cost_records'
const CONSUMPTION_RECORDS_KEY = 'consumption_records'

function getStoredCostRecords() {
  try {
    const data = localStorage.getItem(COST_RECORDS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function setStoredCostRecords(records) {
  try {
    localStorage.setItem(COST_RECORDS_KEY, JSON.stringify(records))
  } catch {
    console.error('Failed to save cost records to localStorage')
  }
}

function getStoredConsumptionRecords() {
  try {
    const data = localStorage.getItem(CONSUMPTION_RECORDS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function setStoredConsumptionRecords(records) {
  try {
    localStorage.setItem(CONSUMPTION_RECORDS_KEY, JSON.stringify(records))
  } catch {
    console.error('Failed to save consumption records to localStorage')
  }
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const usePurchaseCostStore = defineStore('purchaseCost', () => {
  const costRecords = ref(getStoredCostRecords())
  const consumptionRecords = ref(getStoredConsumptionRecords())

  const allCostMonths = computed(() => {
    const monthSet = new Set(costRecords.value.map(r => r.month))
    return [...monthSet].sort().reverse()
  })

  function addCostRecord(itemData) {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const categoryInfo = getCategoryInfo(itemData.name)
    const record = {
      id: generateId(),
      name: itemData.name,
      quantity: itemData.quantity || 0,
      unit: itemData.unit || '个',
      unitPrice: itemData.unitPrice || 0,
      totalCost: (itemData.quantity || 0) * (itemData.unitPrice || 0),
      store: itemData.store || '',
      categoryId: itemData.categoryId || categoryInfo.categoryId,
      categoryName: itemData.categoryName || categoryInfo.categoryName,
      parentCategoryId: itemData.parentCategoryId || categoryInfo.parentCategoryId,
      parentCategoryName: itemData.parentCategoryName || categoryInfo.parentCategoryName,
      purchasedAt: now.toISOString(),
      month
    }
    costRecords.value.push(record)
    return record
  }

  function removeCostRecord(id) {
    const index = costRecords.value.findIndex(r => r.id === id)
    if (index !== -1) {
      costRecords.value.splice(index, 1)
    }
  }

  function addConsumptionRecord(itemData) {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const record = {
      id: generateId(),
      name: itemData.name,
      quantity: itemData.quantity || 0,
      unit: itemData.unit || '个',
      type: itemData.type || 'consumed',
      categoryId: itemData.categoryId || '',
      categoryName: itemData.categoryName || '',
      parentCategoryId: itemData.parentCategoryId || '',
      parentCategoryName: itemData.parentCategoryName || '',
      consumedAt: now.toISOString(),
      month
    }
    consumptionRecords.value.push(record)
    return record
  }

  function getMonthlyCostByCategory(month) {
    const monthRecords = costRecords.value.filter(r => r.month === month)
    const byCategory = {}
    monthRecords.forEach(r => {
      const key = r.parentCategoryName || '其他'
      if (!byCategory[key]) {
        byCategory[key] = {
          totalCost: 0,
          count: 0,
          items: [],
          categoryId: r.parentCategoryId
        }
      }
      byCategory[key].totalCost += r.totalCost
      byCategory[key].count++
      byCategory[key].items.push(r)
    })
    return byCategory
  }

  function getMonthlyTotalCost(month) {
    return costRecords.value
      .filter(r => r.month === month)
      .reduce((sum, r) => sum + r.totalCost, 0)
  }

  function getMonthlyCostSummary(month) {
    const monthRecords = costRecords.value.filter(r => r.month === month)
    const totalCost = monthRecords.reduce((sum, r) => sum + r.totalCost, 0)
    const byCategory = getMonthlyCostByCategory(month)

    const categorySummary = Object.entries(byCategory)
      .map(([name, data]) => ({
        name,
        totalCost: data.totalCost,
        count: data.count,
        percent: totalCost > 0 ? Math.round((data.totalCost / totalCost) * 100) : 0,
        categoryId: data.categoryId
      }))
      .sort((a, b) => b.totalCost - a.totalCost)

    return {
      month,
      totalCost,
      totalCount: monthRecords.length,
      categorySummary,
      details: [...monthRecords].sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt))
    }
  }

  function getCostTrend() {
    const trend = {}
    costRecords.value.forEach(r => {
      if (!trend[r.month]) {
        trend[r.month] = { totalCost: 0, count: 0, byCategory: {} }
      }
      trend[r.month].totalCost += r.totalCost
      trend[r.month].count++
      const catName = r.parentCategoryName || '其他'
      if (!trend[r.month].byCategory[catName]) {
        trend[r.month].byCategory[catName] = 0
      }
      trend[r.month].byCategory[catName] += r.totalCost
    })
    return Object.entries(trend)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  function getCorrelationAnalysis(month) {
    const monthCosts = costRecords.value.filter(r => r.month === month)
    const monthConsumptions = consumptionRecords.value.filter(r => r.month === month)

    const costByCategory = {}
    monthCosts.forEach(r => {
      const key = r.parentCategoryName || '其他'
      if (!costByCategory[key]) {
        costByCategory[key] = { totalCost: 0, count: 0 }
      }
      costByCategory[key].totalCost += r.totalCost
      costByCategory[key].count++
    })

    const consumptionByCategory = {}
    monthConsumptions.forEach(r => {
      const key = r.parentCategoryName || '其他'
      if (!consumptionByCategory[key]) {
        consumptionByCategory[key] = { consumed: 0, wasted: 0, total: 0 }
      }
      if (r.type === 'wasted') {
        consumptionByCategory[key].wasted += r.quantity
      } else {
        consumptionByCategory[key].consumed += r.quantity
      }
      consumptionByCategory[key].total++
    })

    const allCategories = new Set([
      ...Object.keys(costByCategory),
      ...Object.keys(consumptionByCategory)
    ])

    const correlation = []
    allCategories.forEach(cat => {
      const cost = costByCategory[cat] || { totalCost: 0, count: 0 }
      const consumption = consumptionByCategory[cat] || { consumed: 0, wasted: 0, total: 0 }
      const wasteRate = consumption.total > 0
        ? Math.round((consumption.wasted / (consumption.consumed + consumption.wasted)) * 100)
        : 0
      const costEfficiency = cost.totalCost > 0 && (consumption.consumed + consumption.wasted) > 0
        ? Math.round(((consumption.consumed / (consumption.consumed + consumption.wasted)) * 100))
        : 0

      let efficiencyLevel = 'good'
      if (wasteRate > 30) efficiencyLevel = 'poor'
      else if (wasteRate > 15) efficiencyLevel = 'fair'

      correlation.push({
        category: cat,
        totalCost: cost.totalCost,
        costCount: cost.count,
        consumedQty: consumption.consumed,
        wastedQty: consumption.wasted,
        wasteRate,
        costEfficiency,
        efficiencyLevel
      })
    })

    return correlation.sort((a, b) => b.totalCost - a.totalCost)
  }

  function replaceAllCostRecords(newRecords) {
    costRecords.value = []
    newRecords.forEach(r => {
      costRecords.value.push({
        id: r.id || generateId(),
        name: r.name,
        quantity: r.quantity || 0,
        unit: r.unit || '个',
        unitPrice: r.unitPrice || 0,
        totalCost: r.totalCost || (r.quantity || 0) * (r.unitPrice || 0),
        store: r.store || '',
        categoryId: r.categoryId || '',
        categoryName: r.categoryName || '',
        parentCategoryId: r.parentCategoryId || '',
        parentCategoryName: r.parentCategoryName || '',
        purchasedAt: r.purchasedAt || new Date().toISOString(),
        month: r.month || getCurrentMonth()
      })
    })
  }

  function addCostRecordsBulk(newRecords) {
    newRecords.forEach(r => {
      addCostRecord(r)
    })
  }

  watch(costRecords, (newRecords) => {
    setStoredCostRecords(newRecords)
  }, { deep: true })

  watch(consumptionRecords, (newRecords) => {
    setStoredConsumptionRecords(newRecords)
  }, { deep: true })

  return {
    costRecords,
    consumptionRecords,
    allCostMonths,
    addCostRecord,
    removeCostRecord,
    addConsumptionRecord,
    getMonthlyCostByCategory,
    getMonthlyTotalCost,
    getMonthlyCostSummary,
    getCostTrend,
    getCorrelationAnalysis,
    replaceAllCostRecords,
    addCostRecordsBulk
  }
})
