<template>
  <div class="expiry-calendar-tab">
    <div class="calendar-header card">
      <div class="calendar-title-row">
        <h2>📅 过期日历</h2>
        <p class="calendar-subtitle">按日期查看临期及已过期食材，及时处理避免浪费</p>
      </div>
      <div class="calendar-stats">
        <div class="calendar-stat-item expired">
          <span class="calendar-stat-num">{{ calendarStats.expired }}</span>
          <span class="calendar-stat-label">已过期</span>
        </div>
        <div class="calendar-stat-item expiring-today">
          <span class="calendar-stat-num">{{ calendarStats.today }}</span>
          <span class="calendar-stat-label">今日到期</span>
        </div>
        <div class="calendar-stat-item expiring-soon">
          <span class="calendar-stat-num">{{ calendarStats.soon }}</span>
          <span class="calendar-stat-label">临期 ({{ fridgeStore.expiringDays }}天内)</span>
        </div>
        <div class="calendar-stat-item normal">
          <span class="calendar-stat-num">{{ calendarStats.normal }}</span>
          <span class="calendar-stat-label">正常</span>
        </div>
      </div>
    </div>

    <div class="calendar-container card">
      <div class="calendar-month-nav">
        <button class="btn btn-small btn-calendar-nav" @click="prevMonth">
          ◀ 上月
        </button>
        <h3 class="calendar-month-title">
          {{ calendarYear }}年{{ calendarMonth + 1 }}月
        </h3>
        <button class="btn btn-small btn-calendar-nav" @click="nextMonth">
          下月 ▶
        </button>
      </div>

      <div class="calendar-legend">
        <span class="legend-item"><span class="legend-dot expired"></span>已过期</span>
        <span class="legend-item"><span class="legend-dot today"></span>今日到期</span>
        <span class="legend-item"><span class="legend-dot soon"></span>临期</span>
        <span class="legend-item"><span class="legend-dot normal"></span>正常</span>
      </div>

      <div class="calendar-weekdays">
        <div v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="weekday-cell">
          {{ day }}
        </div>
      </div>

      <div class="calendar-grid">
        <div
          v-for="(cell, index) in calendarCells"
          :key="index"
          class="calendar-cell"
          :class="{
            'other-month': !cell.currentMonth,
            'today': cell.isToday,
            'has-items': cell.items.length > 0,
            'has-expired': cell.hasExpired,
            'has-today': cell.hasTodayExpiry,
            'has-soon': cell.hasSoonExpiry
          }"
          @click="cell.items.length > 0 && showDateDetail(cell)"
        >
          <div class="cell-date">{{ cell.date }}</div>
          <div v-if="cell.items.length > 0" class="cell-items">
            <div
              v-for="item in cell.items.slice(0, 2)"
              :key="item.id"
              class="cell-item"
              :class="getItemExpiryClass(item)"
            >
              {{ item.name }}
            </div>
            <div v-if="cell.items.length > 2" class="cell-more">
              +{{ cell.items.length - 2 }} 项
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCalendarDetail" class="calendar-detail-overlay" @click.self="closeDateDetail">
      <div class="calendar-detail-dialog">
        <div class="calendar-detail-header">
          <h3>📅 {{ selectedDateLabel }}</h3>
          <button class="calendar-detail-close" @click="closeDateDetail">✕</button>
        </div>
        <div class="calendar-detail-body">
          <div v-if="selectedDateItems.length === 0" class="empty-tip">
            该日期没有食材到期
          </div>
          <div v-else class="calendar-detail-list">
            <div
              v-for="item in selectedDateItems"
              :key="item.id"
              class="calendar-detail-item"
              :class="getItemExpiryClass(item)"
            >
              <div class="detail-item-header">
                <span class="detail-item-name">{{ item.name }}</span>
                <span
                  class="detail-item-badge"
                  :class="getItemExpiryClass(item)"
                >
                  {{ getItemExpiryLabel(item) }}
                </span>
              </div>
              <div class="detail-item-info">
                <span class="detail-item-qty">{{ item.quantity }}{{ item.unit }}</span>
                <span class="detail-item-zone">{{ item.zone }}</span>
                <span v-if="item.categoryName" class="detail-item-cat">{{ item.categoryName }}</span>
              </div>
              <div class="detail-item-expiry">
                保质期: {{ formatDate(item.expiryDate) }}
                <span class="detail-days-left">
                  {{ getDaysLeftText(item) }}
                </span>
              </div>
              <div class="detail-item-actions">
                <button
                  v-if="fridgeStore.isExpiringSoonItem(item) && !fridgeStore.isExpired(item.expiryDate)"
                    class="btn btn-small btn-shopping"
                    @click="handleCalendarAddToShopping(item)"
                >
                  🛒 补货
                </button>
                <button class="btn btn-small" @click="handleCalendarUse(item)">
                  消耗
                </button>
                <button class="btn btn-small btn-danger" @click="handleCalendarDelete(item)">
                  {{ fridgeStore.isExpired(item.expiryDate) ? '丢弃' : '删除' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="calendar-detail-footer">
          <button class="btn btn-small" @click="closeDateDetail">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFridgeStore } from '@/stores/fridge'
import { useStockOrchestrator } from '@/composables/useStockOrchestrator'

const emit = defineEmits(['add-to-shopping-list'])

const fridgeStore = useFridgeStore()
const orchestrator = useStockOrchestrator()

const now = new Date()
const calendarYear = ref(now.getFullYear())
const calendarMonth = ref(now.getMonth())

const showCalendarDetail = ref(false)
const selectedDateCell = ref(null)
const selectedDateItems = ref([])
const selectedDateLabel = ref('')

const calendarStats = computed(() => {
  const items = fridgeStore.items
  const expiringDays = fridgeStore.expiringDays
  let expired = 0
  let today = 0
  let soon = 0
  let normal = 0

  items.forEach(item => {
    const daysLeft = fridgeStore.daysUntilExpiry(item.expiryDate)
    if (daysLeft < 0) {
      expired++
    } else if (daysLeft === 0) {
      today++
    } else if (daysLeft <= expiringDays) {
      soon++
    } else {
      normal++
    }
  })

  return { expired, today, soon, normal }
})

function createCalendarCell(day, date, dateKey, currentMonth, today, items) {
  const isToday = date.getTime() === today.getTime()
  const expiringDays = fridgeStore.expiringDays

  let hasExpired = false
  let hasTodayExpiry = false
  let hasSoonExpiry = false

  items.forEach(item => {
    const daysLeft = fridgeStore.daysUntilExpiry(item.expiryDate)
    if (daysLeft < 0) {
      hasExpired = true
    } else if (daysLeft === 0) {
      hasTodayExpiry = true
    } else if (daysLeft <= expiringDays) {
      hasSoonExpiry = true
    }
  })

  return {
    date: day,
    dateKey,
    currentMonth,
    isToday,
    items,
    hasExpired,
    hasTodayExpiry,
    hasSoonExpiry
  }
}

const calendarCells = computed(() => {
  const year = calendarYear.value
  const month = calendarMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cells = []
  const itemsByDate = {}

  fridgeStore.items.forEach(item => {
    const dateKey = item.expiryDate
    if (!itemsByDate[dateKey]) {
      itemsByDate[dateKey] = []
    }
    itemsByDate[dateKey].push(item)
  })

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const date = new Date(year, month - 1, day)
    const dateKey = date.toISOString().split('T')[0]
    cells.push(createCalendarCell(day, date, dateKey, false, today, itemsByDate[dateKey] || []))
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dateKey = date.toISOString().split('T')[0]
    cells.push(createCalendarCell(day, date, dateKey, true, today, itemsByDate[dateKey] || []))
  }

  const remainingCells = 42 - cells.length
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day)
    const dateKey = date.toISOString().split('T')[0]
    cells.push(createCalendarCell(day, date, dateKey, false, today, itemsByDate[dateKey] || []))
  }

  return cells
})

function prevMonth() {
  if (calendarMonth.value === 0) {
    calendarMonth.value = 11
    calendarYear.value--
  } else {
    calendarMonth.value--
  }
}

function nextMonth() {
  if (calendarMonth.value === 11) {
    calendarMonth.value = 0
    calendarYear.value++
  } else {
    calendarMonth.value++
  }
}

function showDateDetail(cell) {
  selectedDateCell.value = cell
  selectedDateItems.value = [...cell.items].sort((a, b) => {
    return fridgeStore.daysUntilExpiry(a.expiryDate) - fridgeStore.daysUntilExpiry(b.expiryDate)
  })

  const date = new Date(cell.dateKey)
  selectedDateLabel.value = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 到期食材`
  showCalendarDetail.value = true
}

function closeDateDetail() {
  showCalendarDetail.value = false
  selectedDateCell.value = null
  selectedDateItems.value = []
}

function getItemExpiryClass(item) {
  const daysLeft = fridgeStore.daysUntilExpiry(item.expiryDate)
  if (daysLeft < 0) return 'expired'
  if (daysLeft === 0) return 'today'
  if (daysLeft <= fridgeStore.expiringDays) return 'soon'
  return 'normal'
}

function getItemExpiryLabel(item) {
  const daysLeft = fridgeStore.daysUntilExpiry(item.expiryDate)
  if (daysLeft < 0) return `已过期 ${Math.abs(daysLeft)} 天`
  if (daysLeft === 0) return '今日到期'
  if (daysLeft <= fridgeStore.expiringDays) return `还剩 ${daysLeft} 天`
  return `还剩 ${daysLeft} 天`
}

function getDaysLeftText(item) {
  const daysLeft = fridgeStore.daysUntilExpiry(item.expiryDate)
  if (daysLeft < 0) return `(已过期 ${Math.abs(daysLeft)} 天)`
  if (daysLeft === 0) return '(今日到期)'
  return `(还剩 ${daysLeft} 天)`
}

function refreshSelectedDateItems() {
  if (!selectedDateCell.value) return
  const items = fridgeStore.items.filter(item => item.expiryDate === selectedDateCell.value.dateKey)
  selectedDateItems.value = [...items].sort((a, b) => {
    return fridgeStore.daysUntilExpiry(a.expiryDate) - fridgeStore.daysUntilExpiry(b.expiryDate)
  })
  if (selectedDateItems.value.length === 0) {
    closeDateDetail()
  }
}

function handleCalendarAddToShopping(item) {
  emit('add-to-shopping-list', item)
}

function handleCalendarUse(item) {
  const amount = parseFloat(prompt(`消耗多少 ${item.unit}？`, '1'))
  if (isNaN(amount) || amount <= 0) return
  orchestrator.useItemFromFridge(item, amount)
  if (selectedDateCell.value) {
    refreshSelectedDateItems()
  }
}

function handleCalendarDelete(item) {
  const isExpired = fridgeStore.isExpired(item.expiryDate)
  const reason = isExpired ? 'expired' : 'discarded'
  if (confirm(`确定要${isExpired ? '丢弃' : '删除'}这个食材吗？`)) {
    orchestrator.discardFromFridge(item.id, reason, '')
    setTimeout(() => {
      if (selectedDateCell.value) {
        refreshSelectedDateItems()
      }
    }, 100)
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
</script>

<style scoped>
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

.btn {
  display: inline-block;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  background: #eceff1;
  color: #455a64;
}

.btn-small:hover {
  background: #cfd8dc;
}

.btn-danger {
  background: #ffcdd2;
  color: #c62828;
}

.btn-danger:hover {
  background: #ef9a9a;
}

.btn-shopping {
  background: #e0f2f1;
  color: #00695c;
}

.btn-shopping:hover {
  background: #b2dfdb;
}

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 40px 20px;
  font-size: 14px;
}

.expiry-calendar-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.calendar-header {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
  color: white;
  padding: 24px;
  border-radius: 16px;
}

.calendar-title-row h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #37474f;
}

.calendar-subtitle {
  margin: 0;
  font-size: 13px;
  color: #546e7a;
}

.calendar-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 20px;
}

.calendar-stat-item {
  background: white;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
}

.calendar-stat-item:hover {
  transform: translateY(-2px);
}

.calendar-stat-item.expired {
  border-top: 3px solid #f44336;
}

.calendar-stat-item.expired .calendar-stat-num {
  color: #d32f2f;
}

.calendar-stat-item.expiring-today {
  border-top: 3px solid #ff9800;
}

.calendar-stat-item.expiring-today .calendar-stat-num {
  color: #f57c00;
}

.calendar-stat-item.expiring-soon {
  border-top: 3px solid #ffb74d;
}

.calendar-stat-item.expiring-soon .calendar-stat-num {
  color: #ef6c00;
}

.calendar-stat-item.normal {
  border-top: 3px solid #4caf50;
}

.calendar-stat-item.normal .calendar-stat-num {
  color: #388e3c;
}

.calendar-stat-num {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #37474f;
}

.calendar-stat-label {
  display: block;
  font-size: 12px;
  color: #78909c;
  margin-top: 4px;
}

.calendar-container {
  padding: 20px;
}

.calendar-month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.btn-calendar-nav {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  color: #1565c0;
  border: 1px solid #90caf9;
  font-weight: 500;
}

.btn-calendar-nav:hover {
  background: linear-gradient(135deg, #bbdefb, #90caf9);
  color: #0d47a1;
}

.calendar-month-title {
  margin: 0;
  font-size: 18px;
  color: #37474f;
  font-weight: 600;
}

.calendar-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #546e7a;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot.expired {
  background: #f44336;
}

.legend-dot.today {
  background: #ff9800;
}

.legend-dot.soon {
  background: #ffb74d;
}

.legend-dot.normal {
  background: #4caf50;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday-cell {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #546e7a;
  padding: 8px 0;
  background: #f5f7fa;
  border-radius: 8px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-cell {
  min-height: 80px;
  padding: 6px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: default;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.calendar-cell.other-month {
  background: #fafafa;
  opacity: 0.5;
}

.calendar-cell.today {
  border: 2px solid #2196f3;
  background: linear-gradient(135deg, #e3f2fd, #ffffff);
}

.calendar-cell.has-items {
  cursor: pointer;
}

.calendar-cell.has-items:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.calendar-cell.has-expired {
  border-left: 4px solid #f44336;
  background: linear-gradient(135deg, #ffebee, #ffffff);
}

.calendar-cell.has-today {
  border-left: 4px solid #ff9800;
  background: linear-gradient(135deg, #fff3e0, #ffffff);
}

.calendar-cell.has-soon {
  border-left: 4px solid #ffb74d;
  background: linear-gradient(135deg, #fff8e1, #ffffff);
}

.calendar-cell.has-expired.has-today {
  border-left: 4px solid #f44336;
}

.calendar-cell.has-expired.has-soon {
  border-left: 4px solid #f44336;
}

.calendar-cell.has-today.has-soon {
  border-left: 4px solid #ff9800;
}

.cell-date {
  font-size: 13px;
  font-weight: 600;
  color: #37474f;
  text-align: right;
}

.cell-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow: hidden;
}

.cell-item {
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.cell-item.expired {
  background: #ffebee;
  color: #c62828;
}

.cell-item.today {
  background: #fff3e0;
  color: #e65100;
}

.cell-item.soon {
  background: #fff8e1;
  color: #ef6c00;
}

.cell-item.normal {
  background: #e8f5e9;
  color: #2e7d32;
}

.cell-more {
  font-size: 10px;
  color: #78909c;
  text-align: center;
  padding: 2px 0;
}

.calendar-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.calendar-detail-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.calendar-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 1px solid #ffcc80;
}

.calendar-detail-header h3 {
  margin: 0;
  font-size: 18px;
  color: #e65100;
}

.calendar-detail-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #e65100;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.calendar-detail-close:hover {
  background: rgba(230, 81, 0, 0.1);
}

.calendar-detail-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.calendar-detail-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calendar-detail-item {
  padding: 16px;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.calendar-detail-item.expired {
  background: #ffebee;
  border-color: #ef9a9a;
}

.calendar-detail-item.today {
  background: #fff3e0;
  border-color: #ffcc80;
}

.calendar-detail-item.soon {
  background: #fff8e1;
  border-color: #ffe0b2;
}

.calendar-detail-item.normal {
  background: #e8f5e9;
  border-color: #c8e6c9;
}

.detail-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.detail-item-name {
  font-size: 16px;
  font-weight: 600;
  color: #37474f;
}

.detail-item-badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.detail-item-badge.expired {
  background: #f44336;
  color: white;
}

.detail-item-badge.today {
  background: #ff9800;
  color: white;
}

.detail-item-badge.soon {
  background: #ffb74d;
  color: white;
}

.detail-item-badge.normal {
  background: #4caf50;
  color: white;
}

.detail-item-info {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.detail-item-qty,
.detail-item-zone,
.detail-item-cat {
  font-size: 12px;
  padding: 3px 8px;
  background: white;
  border-radius: 8px;
  color: #546e7a;
  font-weight: 500;
}

.detail-item-expiry {
  font-size: 13px;
  color: #546e7a;
  margin-bottom: 12px;
}

.detail-days-left {
  font-weight: 600;
  margin-left: 4px;
}

.expired .detail-days-left {
  color: #c62828;
}

.today .detail-days-left {
  color: #e65100;
}

.soon .detail-days-left {
  color: #ef6c00;
}

.normal .detail-days-left {
  color: #2e7d32;
}

.detail-item-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.calendar-detail-footer {
  padding: 14px 20px;
  border-top: 1px solid #eceff1;
  background: #fafafa;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .calendar-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .calendar-cell {
    min-height: 60px;
    padding: 4px;
  }

  .cell-item {
    font-size: 10px;
    padding: 2px 4px;
  }

  .calendar-month-nav {
    flex-wrap: wrap;
    gap: 10px;
  }

  .calendar-month-title {
    order: -1;
    width: 100%;
    text-align: center;
  }

  .calendar-legend {
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .calendar-stats {
    grid-template-columns: 1fr 1fr;
  }

  .calendar-cell {
    min-height: 60px;
  }

  .cell-item {
    font-size: 10px;
    padding: 2px 4px;
  }
}
</style>
