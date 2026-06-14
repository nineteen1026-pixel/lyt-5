<template>
  <div class="cost-analysis-tab">
    <div class="cost-analysis-header card">
      <h2>📊 成本与浪费分析</h2>
      <p class="analysis-subtitle">按月展示采购、消耗与浪费数据，支持多维度下钻</p>
    </div>

    <div class="analysis-filters card">
      <div class="filter-row">
        <div class="filter-group">
          <label>选择月份</label>
          <select v-model="analysisMonth" class="filter-select">
            <option v-for="month in analysisMonthOptions" :key="month" :value="month">
              {{ formatAnalysisMonth(month) }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>品类筛选</label>
          <select v-model="analysisFilters.category" class="filter-select">
            <option value="全部">全部品类</option>
            <option v-for="cat in availableFilters.categories" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>分区筛选</label>
          <select v-model="analysisFilters.zone" class="filter-select">
            <option value="全部">全部分区</option>
            <option v-for="zone in availableFilters.zones" :key="zone" :value="zone">
              {{ zone }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>门店筛选</label>
          <select v-model="analysisFilters.store" class="filter-select">
            <option value="全部">全部门店</option>
            <option v-for="store in availableFilters.stores" :key="store" :value="store">
              {{ store }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="!hasAnalysisData" class="empty-state card">
      <div class="empty-icon">📭</div>
      <p>暂无分析数据</p>
      <p class="empty-hint">添加采购记录并产生消耗后，将自动生成分析报告</p>
    </div>

    <template v-else>
      <div class="analysis-summary-cards">
        <div class="analysis-card cost">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <div class="card-value">¥{{ costAnalysis.totalCost.toFixed(2) }}</div>
            <div class="card-label">本月采购额</div>
            <div class="card-change" :class="costAnalysis.totalCostChange >= 0 ? 'up' : 'down'">
              <span v-if="costAnalysis.totalCostChange >= 0">↑</span><span v-else>↓</span>
              {{ Math.abs(costAnalysis.totalCostChange) }}% 环比
            </div>
          </div>
        </div>
        <div class="analysis-card consumption">
          <div class="card-icon">🍽️</div>
          <div class="card-content">
            <div class="card-value">{{ wasteAnalysis.naturalConsumptionQty }}</div>
            <div class="card-label">自然消耗量</div>
            <div class="card-change" :class="wasteAnalysis.consumptionChange >= 0 ? 'up' : 'down'">
              <span v-if="wasteAnalysis.consumptionChange >= 0">↑</span><span v-else>↓</span>
              {{ Math.abs(wasteAnalysis.consumptionChange) }}% 环比
            </div>
          </div>
        </div>
        <div class="analysis-card waste">
          <div class="card-icon">🗑️</div>
          <div class="card-content">
            <div class="card-value">{{ wasteAnalysis.totalWasteQty }}</div>
            <div class="card-label">浪费量</div>
            <div class="card-change" :class="wasteAnalysis.wasteChange >= 0 ? 'up' : 'down'">
              <span v-if="wasteAnalysis.wasteChange >= 0">↑</span><span v-else>↓</span>
              {{ Math.abs(wasteAnalysis.wasteChange) }}% 环比
            </div>
          </div>
        </div>
        <div class="analysis-card efficiency">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <div class="card-value">{{ wasteAnalysis.utilizationRate }}%</div>
            <div class="card-label">利用率</div>
            <div class="card-change" :class="wasteAnalysis.utilizationChange >= 0 ? 'up' : 'down'">
              <span v-if="wasteAnalysis.utilizationChange >= 0">↑</span><span v-else>↓</span>
              {{ Math.abs(wasteAnalysis.utilizationChange) }}% 环比
            </div>
          </div>
        </div>
      </div>

      <div class="analysis-trend card">
        <div class="trend-header">
          <h3>📈 月度趋势</h3>
          <div class="trend-legend">
            <span class="legend-item">
              <span class="legend-dot cost-dot"></span>采购额
            </span>
            <span class="legend-item">
              <span class="legend-dot consumption-dot"></span>自然消耗
            </span>
            <span class="legend-item">
              <span class="legend-dot waste-dot"></span>浪费量
            </span>
          </div>
        </div>
        <div class="trend-chart-container">
          <div
            v-for="item in trendCombinedData"
            :key="item.month"
            class="trend-bar-group"
          >
            <div class="trend-bars">
              <div
                class="trend-bar cost-bar"
                :style="{ height: getTrendBarHeight(item.totalCost, maxTrendCost) + 'px' }"
                :title="`采购额: ¥${item.totalCost.toFixed(2)}`"
              ></div>
              <div
                class="trend-bar consumption-bar"
                :style="{ height: getTrendBarHeight(item.consumptionQty, maxTrendQty) + 'px' }"
                :title="`自然消耗: ${item.consumptionQty}`"
              ></div>
              <div
                class="trend-bar waste-bar"
                :style="{ height: getTrendBarHeight(item.wasteQty, maxTrendQty) + 'px' }"
                :title="`浪费量: ${item.wasteQty}`"
              ></div>
            </div>
            <div class="trend-label">{{ formatAnalysisMonthShort(item.month) }}</div>
          </div>
        </div>
      </div>

      <div class="analysis-dimension-tabs card">
        <div class="dim-tabs">
          <button
            class="dim-tab"
            :class="{ active: analysisDimension === 'category' }"
            @click="analysisDimension = 'category'"
          >
            按品类
          </button>
          <button
            class="dim-tab"
            :class="{ active: analysisDimension === 'zone' }"
            @click="analysisDimension = 'zone'"
          >
            按分区
          </button>
          <button
            class="dim-tab"
            :class="{ active: analysisDimension === 'store' }"
            @click="analysisDimension = 'store'"
          >
            按门店
          </button>
        </div>

        <div v-if="dimensionCostData.length > 0" class="dimension-analysis">
          <div class="dim-header-row">
            <span class="dim-col dim-name">{{ analysisDimensionLabel }}</span>
            <span class="dim-col">采购额</span>
            <span class="dim-col">占比</span>
            <span class="dim-col">消耗量</span>
            <span class="dim-col">浪费量</span>
            <span class="dim-col">利用率</span>
            <span class="dim-col">环比</span>
          </div>
          <div
            v-for="(item, index) in combinedDimensionData"
            :key="item.name"
            class="dim-data-row"
          >
            <span class="dim-col dim-name">
              <span class="dim-rank">{{ index + 1 }}</span>
              {{ item.name || '未分类' }}
            </span>
            <span class="dim-col">¥{{ (item.totalCost || 0).toFixed(0) }}</span>
            <span class="dim-col">
              <div class="dim-percent-bar">
                <div class="dim-percent-fill" :style="{ width: (item.percent || 0) + '%' }"></div>
              </div>
              <span class="dim-percent-text">{{ item.percent || 0 }}%</span>
            </span>
            <span class="dim-col">{{ item.consumptionQty || 0 }}</span>
            <span class="dim-col dim-waste" :class="{ high: (item.wasteRate || 0) > 30 }">
              {{ item.wasteQty || 0 }}
              <span v-if="(item.wasteRate || 0) > 15" class="waste-tag">{{ item.wasteRate }}%</span>
            </span>
            <span class="dim-col">
              <span
                class="efficiency-badge"
                :class="getEfficiencyLevel(item.wasteRate || 0)"
              >
                {{ item.utilizationRate || 0 }}%
              </span>
            </span>
            <span class="dim-col dim-change" :class="(item.costChange || 0) >= 0 ? 'up' : 'down'">
              <span v-if="(item.costChange || 0) >= 0">↑</span><span v-else>↓</span>
              {{ Math.abs(item.costChange || 0) }}%
            </span>
          </div>
        </div>
        <div v-else class="empty-tip">
          暂无该维度数据
        </div>
      </div>

      <div class="waste-reason-breakdown card">
        <h3>🏷️ 浪费原因分布</h3>
        <div class="reason-bars">
          <div
            v-for="(data, key) in wasteAnalysis.byWasteType"
            :key="key"
            class="reason-row"
            v-if="data.quantity > 0 || data.count > 0"
          >
            <span class="reason-label">
              <span class="reason-icon">{{ wasteRecordStore.DISPOSAL_REASONS[key]?.icon }}</span>
              {{ wasteRecordStore.DISPOSAL_REASONS[key]?.label }}
            </span>
            <div class="reason-bar-track">
              <div
                class="reason-bar-fill"
                :class="key"
                :style="{ width: getReasonBarPercent(data.quantity) + '%' }"
              ></div>
            </div>
            <span class="reason-count">{{ data.quantity }} / {{ data.count }}件</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePurchaseCostStore } from '@/stores/purchaseCost'
import { useWasteRecordStore } from '@/stores/wasteRecord'

const purchaseCostStore = usePurchaseCostStore()
const wasteRecordStore = useWasteRecordStore()

const analysisDimension = ref('category')
const analysisMonth = ref(getCurrentCostMonth())
const analysisFilters = ref({
  category: '全部',
  zone: '全部',
  store: '全部'
})

function getCurrentCostMonth() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

function formatAnalysisMonth(month) {
  if (!month) return ''
  const [y, m] = month.split('-')
  return `${y}年${parseInt(m)}月`
}

function formatAnalysisMonthShort(month) {
  if (!month) return ''
  const [y, m] = month.split('-')
  return `${parseInt(m)}月`
}

function getTrendBarHeight(value, max) {
  if (max === 0) return 0
  const minHeight = 4
  const maxHeight = 120
  return Math.max(minHeight, (value / max) * maxHeight)
}

function getEfficiencyLevel(wasteRate) {
  if (wasteRate > 30) return 'poor'
  if (wasteRate > 15) return 'fair'
  return 'good'
}

function getReasonBarPercent(qty) {
  if (maxReasonQty.value === 0) return 0
  return (qty / maxReasonQty.value) * 100
}

const analysisMonthOptions = computed(() => {
  const monthSet = new Set([
    ...purchaseCostStore.allCostMonths,
    ...wasteRecordStore.allMonths
  ])
  const months = [...monthSet].sort().reverse()
  if (months.length === 0) {
    months.push(getCurrentCostMonth())
  }
  return months
})

const availableFilters = computed(() => {
  const base = purchaseCostStore.getAvailableFilters()
  const wasteRecords = wasteRecordStore.records
  const cats = new Set(base.categories)
  const zones = new Set(base.zones)
  const stores = new Set(base.stores)

  wasteRecords.forEach(r => {
    if (r.parentCategoryName) cats.add(r.parentCategoryName)
    if (r.zone) zones.add(r.zone)
    if (r.store) stores.add(r.store)
  })

  return {
    categories: Array.from(cats).sort(),
    zones: Array.from(zones).sort(),
    stores: Array.from(stores).sort()
  }
})

const costAnalysis = computed(() => {
  if (!analysisMonth.value) {
    return { totalCost: 0, totalCount: 0, totalCostChange: 0, totalCountChange: 0 }
  }
  return purchaseCostStore.getMonthlyAnalysis(analysisMonth.value, analysisFilters.value)
})

const wasteAnalysis = computed(() => {
  if (!analysisMonth.value) {
    return {
      totalWasteQty: 0, naturalConsumptionQty: 0, utilizationRate: 0,
      wasteChange: 0, consumptionChange: 0, utilizationChange: 0,
      byWasteType: {}, byReason: {}
    }
  }
  return wasteRecordStore.getMonthlyWasteAnalysis(analysisMonth.value, analysisFilters.value)
})

const hasAnalysisData = computed(() => {
  return costAnalysis.value.totalCost > 0 || wasteAnalysis.value.totalQty > 0
})

const dimensionCostData = computed(() => {
  if (!analysisMonth.value) return []
  return purchaseCostStore.getDimensionAnalysis(analysisMonth.value, analysisDimension.value, analysisFilters.value)
})

const dimensionWasteData = computed(() => {
  if (!analysisMonth.value) return []
  return wasteRecordStore.getWasteDimensionAnalysis(analysisMonth.value, analysisDimension.value, analysisFilters.value)
})

const combinedDimensionData = computed(() => {
  const costData = dimensionCostData.value
  const wasteData = dimensionWasteData.value
  const wasteMap = {}
  wasteData.forEach(w => {
    wasteMap[w.name] = w
  })
  return costData.map(c => {
    const w = wasteMap[c.name] || {}
    return {
      ...c,
      consumptionQty: w.consumptionQty || 0,
      wasteQty: w.wasteQty || 0,
      utilizationRate: w.utilizationRate || 0,
      wasteRate: w.wasteRate || 0
    }
  })
})

const analysisDimensionLabel = computed(() => {
  const labels = { category: '品类', zone: '分区', store: '门店' }
  return labels[analysisDimension.value] || '维度'
})

const costTrendData = computed(() => {
  return purchaseCostStore.getCostTrendWithDimensions(analysisFilters.value)
})

const wasteTrendData = computed(() => {
  return wasteRecordStore.getWasteTrendWithFilters(analysisFilters.value)
})

const trendCombinedData = computed(() => {
  const costMap = {}
  costTrendData.value.forEach(c => {
    costMap[c.month] = c
  })
  const wasteMap = {}
  wasteTrendData.value.forEach(w => {
    wasteMap[w.month] = w
  })
  const allMonths = new Set([
    ...Object.keys(costMap),
    ...Object.keys(wasteMap)
  ])
  return [...allMonths].sort().map(month => ({
    month,
    totalCost: costMap[month]?.totalCost || 0,
    consumptionQty: wasteMap[month]?.consumptionQty || 0,
    wasteQty: wasteMap[month]?.wasteQty || 0
  }))
})

const maxTrendCost = computed(() => {
  if (trendCombinedData.value.length === 0) return 1
  return Math.max(...trendCombinedData.value.map(d => d.totalCost), 1)
})

const maxTrendQty = computed(() => {
  if (trendCombinedData.value.length === 0) return 1
  const maxConsumption = Math.max(...trendCombinedData.value.map(d => d.consumptionQty), 0)
  const maxWaste = Math.max(...trendCombinedData.value.map(d => d.wasteQty), 0)
  return Math.max(maxConsumption, maxWaste, 1)
})

const maxReasonQty = computed(() => {
  return Math.max(...Object.values(wasteAnalysis.value.byWasteType || {}).map(d => d?.quantity || 0), 1)
})

watch(() => purchaseCostStore.allCostMonths, (newMonths) => {
  if (newMonths.length > 0 && !newMonths.includes(analysisMonth.value)) {
    analysisMonth.value = newMonths[0]
  }
})

watch(() => wasteRecordStore.allMonths, (newMonths) => {
  if (newMonths.length > 0 && purchaseCostStore.allCostMonths.length === 0) {
    if (!newMonths.includes(analysisMonth.value)) {
      analysisMonth.value = newMonths[0]
    }
  }
})
</script>

<style scoped>
.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 40px 20px;
  font-size: 14px;
}

.cost-analysis-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cost-analysis-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  border-radius: 16px;
}

.cost-analysis-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
}

.analysis-subtitle {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.analysis-filters {
  padding: 20px;
}

.analysis-filters .filter-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.analysis-filters .filter-group {
  flex: 1;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.analysis-filters label {
  font-size: 13px;
  font-weight: 500;
  color: #546e7a;
}

.filter-select {
  padding: 10px 12px;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
}

.empty-state .empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state p {
  margin: 0 0 8px 0;
  color: #546e7a;
  font-size: 15px;
}

.empty-state .empty-hint {
  font-size: 13px;
  color: #90a4ae;
}

.analysis-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.analysis-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s ease;
}

.analysis-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.analysis-card .card-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.analysis-card.cost .card-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.analysis-card.consumption .card-icon {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.analysis-card.waste .card-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.analysis-card.efficiency .card-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.analysis-card .card-content {
  flex: 1;
  min-width: 0;
}

.analysis-card .card-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a237e;
  margin-bottom: 4px;
}

.analysis-card .card-label {
  font-size: 13px;
  color: #78909c;
  margin-bottom: 6px;
}

.analysis-card .card-change {
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.analysis-card .card-change.up {
  color: #f5576c;
}

.analysis-card .card-change.down {
  color: #11998e;
}

.analysis-trend {
  padding: 20px;
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.trend-header h3 {
  margin: 0;
  font-size: 16px;
  color: #1a237e;
}

.trend-legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #78909c;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot.cost-dot {
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
}

.legend-dot.consumption-dot {
  background: linear-gradient(180deg, #11998e 0%, #38ef7d 100%);
}

.legend-dot.waste-dot {
  background: linear-gradient(180deg, #f5576c 0%, #f093fb 100%);
}

.trend-chart-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  height: 180px;
  padding: 20px 0;
  overflow-x: auto;
}

.trend-bar-group {
  flex: 1;
  min-width: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.trend-bars {
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 140px;
}

.trend-bar {
  width: 12px;
  border-radius: 3px 3px 0 0;
  transition: all 0.3s ease;
}

.trend-bar:hover {
  opacity: 0.8;
}

.trend-bar.cost-bar {
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
}

.trend-bar.consumption-bar {
  background: linear-gradient(180deg, #11998e 0%, #38ef7d 100%);
}

.trend-bar.waste-bar {
  background: linear-gradient(180deg, #f5576c 0%, #f093fb 100%);
}

.trend-label {
  font-size: 11px;
  color: #78909c;
}

.analysis-dimension-tabs {
  padding: 20px;
}

.dim-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e6ed;
}

.dim-tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #78909c;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.dim-tab:hover {
  color: #455a64;
}

.dim-tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.dimension-analysis {
  overflow-x: auto;
}

.dim-header-row,
.dim-data-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1.5fr 1fr 1fr 1fr 1fr;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
}

.dim-header-row {
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #546e7a;
  margin-bottom: 8px;
}

.dim-data-row {
  border-bottom: 1px solid #f0f4f8;
  font-size: 14px;
  transition: background 0.2s;
}

.dim-data-row:hover {
  background: #f8f9fa;
}

.dim-col {
  min-width: 0;
}

.dim-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #1a237e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dim-rank {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.dim-percent-bar {
  flex: 1;
  height: 8px;
  background: #e0e6ed;
  border-radius: 4px;
  overflow: hidden;
}

.dim-percent-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.dim-col:has(.dim-percent-bar) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dim-percent-text {
  font-size: 12px;
  color: #78909c;
  min-width: 40px;
  text-align: right;
}

.dim-waste {
  color: #546e7a;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dim-waste.high {
  color: #f5576c;
  font-weight: 600;
}

.waste-tag {
  font-size: 11px;
  padding: 2px 6px;
  background: #ffebee;
  color: #f5576c;
  border-radius: 4px;
  font-weight: 500;
}

.efficiency-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.efficiency-badge.good {
  background: #e8f5e9;
  color: #2e7d32;
}

.efficiency-badge.fair {
  background: #fff8e1;
  color: #f57f17;
}

.efficiency-badge.poor {
  background: #ffebee;
  color: #c62828;
}

.dim-change {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 2px;
}

.dim-change.up {
  color: #f5576c;
}

.dim-change.down {
  color: #2e7d32;
}

.waste-reason-breakdown {
  padding: 20px;
}

.waste-reason-breakdown h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1a237e;
}

.waste-reason-breakdown .reason-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f4f8;
}

.waste-reason-breakdown .reason-label {
  min-width: 100px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #455a64;
}

.waste-reason-breakdown .reason-icon {
  font-size: 18px;
}

.waste-reason-breakdown .reason-bar-track {
  flex: 1;
  height: 24px;
  background: #f5f7fa;
  border-radius: 12px;
  overflow: hidden;
}

.waste-reason-breakdown .reason-bar-fill {
  height: 100%;
  border-radius: 12px;
  transition: width 0.5s ease;
}

.waste-reason-breakdown .reason-bar-fill.expired {
  background: linear-gradient(90deg, #ff9800 0%, #ffc107 100%);
}

.waste-reason-breakdown .reason-bar-fill.spoiled {
  background: linear-gradient(90deg, #9c27b0 0%, #e040fb 100%);
}

.waste-reason-breakdown .reason-bar-fill.discarded {
  background: linear-gradient(90deg, #f44336 0%, #ff5722 100%);
}

.waste-reason-breakdown .reason-bar-fill.other {
  background: linear-gradient(90deg, #607d8b 0%, #90a4ae 100%);
}

.waste-reason-breakdown .reason-count {
  min-width: 80px;
  text-align: right;
  font-size: 13px;
  color: #546e7a;
  font-weight: 500;
}

@media (max-width: 768px) {
  .analysis-summary-cards {
    grid-template-columns: 1fr 1fr;
  }

  .dim-header-row,
  .dim-data-row {
    grid-template-columns: 2fr 1fr 1.5fr 1fr 1fr 1fr 1fr;
    min-width: 700px;
  }

  .analysis-filters .filter-row {
    flex-direction: column;
  }

  .analysis-filters .filter-group {
    min-width: 100%;
  }
}

@media (max-width: 480px) {
  .analysis-summary-cards {
    grid-template-columns: 1fr;
  }

  .trend-legend {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
