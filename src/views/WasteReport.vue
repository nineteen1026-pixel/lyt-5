<template>
  <div class="waste-report">
    <header class="header">
      <h1>📊 浪费报表</h1>
      <p class="subtitle">按月汇总食材过期与丢弃记录，分析浪费趋势</p>
    </header>

    <div class="report-content">
      <div class="filter-section card">
        <div class="filter-row">
          <div class="filter-group">
            <label>选择月份</label>
            <select v-model="selectedMonth" class="filter-select">
              <option v-for="month in wasteStore.allMonths" :key="month" :value="month">
                {{ formatMonth(month) }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>分区筛选</label>
            <select v-model="selectedZone" class="filter-select">
              <option value="全部">全部分区</option>
              <option v-for="zone in zones" :key="zone" :value="zone">
                {{ zone }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="!selectedMonth" class="empty-state card">
        <div class="empty-icon">📭</div>
        <p>暂无浪费记录</p>
        <p class="empty-hint">当食材过期或被丢弃时，记录将自动归档到这里</p>
      </div>

      <template v-else>
        <div class="summary-cards">
          <div class="summary-card total">
            <div class="summary-icon">🗑️</div>
            <div class="summary-num">{{ currentSummary.totalCount }}</div>
            <div class="summary-label">浪费总计</div>
          </div>
          <div class="summary-card expired">
            <div class="summary-icon">⏰</div>
            <div class="summary-num">{{ currentSummary.expiredCount }}</div>
            <div class="summary-label">过期丢弃</div>
          </div>
          <div class="summary-card discarded">
            <div class="summary-icon">🚫</div>
            <div class="summary-num">{{ currentSummary.discardedCount }}</div>
            <div class="summary-label">手动丢弃</div>
          </div>
        </div>

        <div class="trend-chart card">
          <h2>📈 浪费趋势</h2>
          <div class="chart-container">
            <div
              v-for="item in trendData"
              :key="item.month"
              class="chart-bar-group"
            >
              <div class="chart-bars">
                <div
                  class="chart-bar expired-bar"
                  :style="{ height: getBarHeight(item.expired, maxTrendValue) + 'px' }"
                  :title="`过期: ${item.expired}`"
                ></div>
                <div
                  class="chart-bar discarded-bar"
                  :style="{ height: getBarHeight(item.discarded, maxTrendValue) + 'px' }"
                  :title="`丢弃: ${item.discarded}`"
                ></div>
              </div>
              <div class="chart-label">{{ formatMonthShort(item.month) }}</div>
            </div>
          </div>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-dot expired-dot"></span>过期丢弃
            </span>
            <span class="legend-item">
              <span class="legend-dot discarded-dot"></span>手动丢弃
            </span>
          </div>
        </div>

        <div class="zone-breakdown card" v-if="Object.keys(currentSummary.byZone).length > 0">
          <h2>🏷️ 分区浪费分布</h2>
          <div class="zone-bars">
            <div
              v-for="(data, zone) in currentSummary.byZone"
              :key="zone"
              class="zone-row"
            >
              <span class="zone-label">{{ zone }}</span>
              <div class="zone-bar-track">
                <div
                  class="zone-bar-fill expired-fill"
                  :style="{ width: (data.expired / currentSummary.totalCount * 100) + '%' }"
                ></div>
                <div
                  class="zone-bar-fill discarded-fill"
                  :style="{ width: (data.discarded / currentSummary.totalCount * 100) + '%' }"
                ></div>
              </div>
              <span class="zone-count">{{ data.total }}件</span>
            </div>
          </div>
        </div>

        <div class="top-wasted card" v-if="currentSummary.topWastedItems.length > 0">
          <h2>🔥 高频浪费食材 TOP5</h2>
          <div class="top-list">
            <div
              v-for="(item, index) in currentSummary.topWastedItems"
              :key="item.name"
              class="top-item"
            >
              <span class="top-rank">{{ index + 1 }}</span>
              <span class="top-name">{{ item.name }}</span>
              <span class="top-qty">{{ item.totalQuantity }}{{ item.unit }}</span>
              <div class="top-reasons">
                <span v-if="item.reasons.expired > 0" class="reason-tag expired-tag">
                  过期×{{ item.reasons.expired }}
                </span>
                <span v-if="item.reasons.discarded > 0" class="reason-tag discarded-tag">
                  丢弃×{{ item.reasons.discarded }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-list card">
          <h2>📋 浪费明细</h2>
          <div v-if="currentSummary.details.length === 0" class="empty-tip">
            该月份暂无记录
          </div>
          <div v-else class="detail-items">
            <div
              v-for="record in currentSummary.details"
              :key="record.id"
              class="detail-item"
              :class="{ 'reason-expired': record.reason === 'expired', 'reason-discarded': record.reason === 'discarded' }"
            >
              <div class="detail-left">
                <span class="detail-reason-icon">
                  {{ record.reason === 'expired' ? '⏰' : '🚫' }}
                </span>
                <span class="detail-name">{{ record.name }}</span>
                <span class="detail-zone-tag">{{ record.zone }}</span>
              </div>
              <div class="detail-right">
                <span class="detail-qty">{{ record.quantity }} {{ record.unit }}</span>
                <span class="detail-date">{{ formatDateTime(record.discardedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWasteRecordStore } from '@/stores/wasteRecord'
import { useFridgeStore } from '@/stores/fridge'

const wasteStore = useWasteRecordStore()
const fridgeStore = useFridgeStore()

const zones = fridgeStore.zones
const selectedMonth = ref(wasteStore.allMonths.length > 0 ? wasteStore.allMonths[0] : '')
const selectedZone = ref('全部')

const currentSummary = computed(() => {
  if (!selectedMonth.value) {
    return { month: '', totalCount: 0, expiredCount: 0, discardedCount: 0, byZone: {}, topWastedItems: [], details: [] }
  }
  return wasteStore.getMonthlySummary(selectedMonth.value, selectedZone.value)
})

const trendData = computed(() => {
  return wasteStore.getWasteTrend(selectedZone.value)
})

const maxTrendValue = computed(() => {
  if (trendData.value.length === 0) return 1
  return Math.max(...trendData.value.map(d => Math.max(d.expired, d.discarded)), 1)
})

function getBarHeight(value, max) {
  if (max === 0) return 0
  return Math.max(4, (value / max) * 120)
}

function formatMonth(month) {
  const [y, m] = month.split('-')
  return `${y}年${parseInt(m)}月`
}

function formatMonthShort(month) {
  const [, m] = month.split('-')
  return `${parseInt(m)}月`
}

function formatDateTime(isoStr) {
  const d = new Date(isoStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.waste-report {
  min-height: 100vh;
  background: linear-gradient(135deg, #fce4ec 0%, #fff3e0 100%);
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 32px;
  color: #c62828;
}

.subtitle {
  margin: 8px 0 0;
  color: #546e7a;
}

.report-content {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.card h2 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #37474f;
}

.filter-section .filter-row {
  display: flex;
  gap: 16px;
}

.filter-group {
  flex: 1;
}

.filter-group label {
  display: block;
  font-size: 13px;
  color: #78909c;
  margin-bottom: 6px;
}

.filter-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  color: #37474f;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: #c62828;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  color: #78909c;
  font-size: 16px;
  margin: 4px 0;
}

.empty-hint {
  font-size: 13px !important;
  color: #b0bec5 !important;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.summary-card.total::before {
  background: linear-gradient(90deg, #c62828, #ef5350);
}

.summary-card.expired::before {
  background: linear-gradient(90deg, #e65100, #ff9800);
}

.summary-card.discarded::before {
  background: linear-gradient(90deg, #455a64, #78909c);
}

.summary-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.summary-num {
  font-size: 36px;
  font-weight: 700;
  color: #37474f;
}

.summary-card.total .summary-num {
  color: #c62828;
}

.summary-card.expired .summary-num {
  color: #e65100;
}

.summary-card.discarded .summary-num {
  color: #455a64;
}

.summary-label {
  font-size: 13px;
  color: #78909c;
  margin-top: 4px;
}

.chart-container {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 160px;
  padding: 0 8px;
  border-bottom: 2px solid #eceff1;
}

.chart-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.chart-bars {
  display: flex;
  gap: 3px;
  align-items: flex-end;
}

.chart-bar {
  width: 18px;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;
}

.expired-bar {
  background: linear-gradient(180deg, #ff9800, #e65100);
}

.discarded-bar {
  background: linear-gradient(180deg, #90a4ae, #455a64);
}

.chart-label {
  font-size: 11px;
  color: #90a4ae;
  margin-top: 8px;
  white-space: nowrap;
}

.chart-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #78909c;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.legend-dot.expired-dot {
  background: #e65100;
}

.legend-dot.discarded-dot {
  background: #607d8b;
}

.zone-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.zone-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zone-label {
  width: 48px;
  font-size: 13px;
  color: #546e7a;
  font-weight: 500;
  flex-shrink: 0;
}

.zone-bar-track {
  flex: 1;
  height: 20px;
  background: #f5f5f5;
  border-radius: 10px;
  display: flex;
  overflow: hidden;
}

.zone-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.expired-fill {
  background: linear-gradient(90deg, #ff9800, #e65100);
}

.discarded-fill {
  background: linear-gradient(90deg, #90a4ae, #607d8b);
}

.zone-count {
  width: 40px;
  font-size: 13px;
  color: #78909c;
  text-align: right;
  flex-shrink: 0;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.top-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fef5f0;
  border-radius: 8px;
  border: 1px solid #fce4ec;
}

.top-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c62828, #ef5350);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.top-name {
  font-weight: 600;
  font-size: 15px;
  color: #37474f;
  flex: 1;
}

.top-qty {
  font-size: 13px;
  color: #78909c;
}

.top-reasons {
  display: flex;
  gap: 6px;
}

.reason-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.expired-tag {
  background: #fff3e0;
  color: #e65100;
}

.discarded-tag {
  background: #eceff1;
  color: #455a64;
}

.detail-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-radius: 8px;
  border-left: 4px solid #cfd8dc;
  background: #fafafa;
  transition: background 0.2s;
}

.detail-item:hover {
  background: #f5f5f5;
}

.detail-item.reason-expired {
  border-left-color: #e65100;
}

.detail-item.reason-discarded {
  border-left-color: #607d8b;
}

.detail-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-reason-icon {
  font-size: 16px;
}

.detail-name {
  font-weight: 500;
  font-size: 14px;
  color: #37474f;
}

.detail-zone-tag {
  font-size: 11px;
  padding: 1px 6px;
  background: #e0f2f1;
  color: #00695c;
  border-radius: 8px;
}

.detail-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-qty {
  font-size: 13px;
  color: #546e7a;
}

.detail-date {
  font-size: 12px;
  color: #b0bec5;
}

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 40px 20px;
  font-size: 14px;
}

@media (max-width: 600px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }

  .filter-section .filter-row {
    flex-direction: column;
  }

  .top-item {
    flex-wrap: wrap;
  }

  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .detail-right {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
