<template>
  <section class="right-section">
    <div class="right-tabs">
      <button
        class="right-tab"
        :class="{ active: activeRightTab === 'items' }"
        @click="activeRightTab = 'items'"
      >
        📋 食材清单
      </button>
      <button
        class="right-tab"
        :class="{ active: activeRightTab === 'calendar' }"
        @click="activeRightTab = 'calendar'"
      >
        📅 过期日历
      </button>
      <button
        class="right-tab"
        :class="{ active: activeRightTab === 'analysis' }"
        @click="activeRightTab = 'analysis'"
      >
        📊 成本分析
      </button>
    </div>

    <div v-show="activeRightTab === 'items'">
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-num">{{ fridgeStore.items.length }}</span>
          <span class="stat-label">总食材</span>
        </div>
        <div class="stat-item warning">
          <span class="stat-num">{{ fridgeStore.expiringSoonItems.length }}</span>
          <span class="stat-label">即将过期</span>
        </div>
        <div class="stat-item danger">
          <span class="stat-num">{{ fridgeStore.expiredItems.length }}</span>
          <span class="stat-label">已过期</span>
        </div>
        <div class="stat-item shopping">
          <span class="stat-num">{{ shoppingStore.pendingCount }}</span>
          <span class="stat-label">待采购</span>
        </div>
      </div>

      <div class="io-toolbar card">
        <div class="io-group">
          <span class="io-label">📤 导出</span>
          <button class="btn btn-small btn-io" @click="handleExportJSON">JSON</button>
          <button class="btn btn-small btn-io" @click="handleExportCSV">CSV</button>
        </div>
        <div class="io-divider"></div>
        <div class="io-group">
          <span class="io-label">📥 导入</span>
          <label class="btn btn-small btn-io btn-file-label">
            JSON
            <input
              type="file"
              accept=".json,application/json"
              style="display:none"
              @change="handleImportJSON"
            />
          </label>
          <label class="btn btn-small btn-io btn-file-label">
            CSV
            <input
              type="file"
              accept=".csv,text/csv"
              style="display:none"
              @change="handleImportCSV"
            />
          </label>
        </div>
      </div>

      <div v-if="selectedItemIds.size > 0" class="batch-toolbar card">
        <div class="batch-info">
          ✅ 已选中 <strong>{{ selectedItemIds.size }}</strong> 项
        </div>
        <div class="batch-actions">
          <button class="btn btn-small btn-batch" @click="selectAllItems">全选当前</button>
          <button class="btn btn-small btn-batch" @click="clearSelected">取消选择</button>
          <button class="btn btn-small btn-batch btn-batch-zone" @click="showBatchZoneDialog = true">
            🔀 改分区
          </button>
          <button class="btn btn-small btn-batch btn-batch-expiry" @click="showBatchExpiryDialog = true">
            ⏳ 延保质期
          </button>
        </div>
      </div>

      <div class="advanced-filter card">
        <div class="filter-header">
          <div class="filter-title-row">
            <h2>🔍 多维筛选</h2>
            <div class="filter-count-badge" v-if="fridgeStore.activeFilterCount > 0">
              已选 {{ fridgeStore.activeFilterCount }} 个条件
            </div>
          </div>
          <div class="filter-header-actions">
            <button
              class="btn btn-small btn-regression"
              @click="handleRunRegressionTests"
              title="运行筛选回归测试"
            >
              🧪 验证筛选
            </button>
            <button
              v-if="fridgeStore.activeFilterCount > 0"
              class="btn btn-small btn-clear-all"
              @click="fridgeStore.clearAllFilters"
            >
              🗑 清空筛选
            </button>
          </div>
        </div>

        <div class="search-bar">
          <div class="search-input-wrap">
            <span class="search-icon">🔎</span>
            <input
              v-model="fridgeStore.filterState.searchKeyword"
              type="text"
              class="search-input"
              placeholder="搜索食材名称、分类..."
              @input="onSearchInput"
            />
            <button
              v-if="fridgeStore.filterState.searchKeyword"
              class="search-clear"
              @click="fridgeStore.filterState.searchKeyword = ''"
            >
              ✕
            </button>
          </div>
          <div class="search-result-hint" v-if="fridgeStore.filterState.searchKeyword">
            找到 {{ filteredItems.length }} 条匹配结果
          </div>
        </div>

        <div class="zone-filter-bar">
          <span class="filter-label">分区</span>
          <div class="filter-btn-group">
            <button
              v-for="zone in ['全部', ...fridgeStore.zones]"
              :key="zone"
              class="filter-btn"
              :class="{ active: fridgeStore.filterState.activeZone === zone }"
              @click="fridgeStore.setFilterState({ activeZone: zone })"
            >
              {{ zone }}
            </button>
          </div>
        </div>

        <div class="filter-panel">
          <div
            class="filter-panel-header"
            @click="expandedFilterPanels.category = !expandedFilterPanels.category"
          >
            <span class="panel-toggle">{{ expandedFilterPanels.category ? '▼' : '▶' }}</span>
            <span class="panel-title">📦 分类筛选</span>
            <div class="panel-summary" v-if="fridgeStore.filterState.selectedParentCategories.length > 0 || fridgeStore.filterState.selectedSubCategories.length > 0">
              已选 {{ fridgeStore.filterState.selectedParentCategories.length + fridgeStore.filterState.selectedSubCategories.length }} 个
            </div>
            <div class="filter-logic-switch">
              <span class="logic-label">大类+子类</span>
              <select
                v-model="fridgeStore.filterState.categoryLogic" class="logic-select">
                <option value="OR">并集 (OR)</option>
                <option value="AND">交集 (AND)</option>
              </select>
            </div>
            <button
              v-if="fridgeStore.filterState.selectedParentCategories.length > 0 || fridgeStore.filterState.selectedSubCategories.length > 0"
              class="btn btn-small btn-panel-clear"
              @click.stop="fridgeStore.clearCategoryFilters"
            >清除</button>
          </div>
          <div v-show="expandedFilterPanels.category" class="filter-panel-body">
            <div class="filter-hint-tip">
              💡 多选同层级为「或」关系（一个食材只能归属一个大类/一个子类），<br>
              「并集」表示命中大类范围 或 子类范围；「交集」表示同时在两类范围中。
            </div>
            <div class="filter-sub-label">大类</div>
            <div class="category-grid parent-cat-grid">
              <button
                v-for="group in categories"
                :key="group.id"
                class="chip"
                :class="{ active: fridgeStore.filterState.selectedParentCategories.includes(group.id) }"
                @click="fridgeStore.toggleParentCategory(group.id)"
              >
                <span class="chip-name">{{ group.name }}</span>
                <span class="chip-count">{{ fridgeStore.parentCategoryCounts[group.id] || 0 }}</span>
              </button>
            </div>
            <div class="filter-sub-label">子类</div>
            <div class="category-grid">
              <button
                v-for="sub in fridgeStore.allSubCategories"
                :key="sub.id"
                class="chip sub-chip"
                :class="{
                  active: fridgeStore.filterState.selectedSubCategories.includes(sub.id),
                  'from-parent': isSubCatFromSelectedParent(sub.id)
                }"
                @click="fridgeStore.toggleSubCategory(sub.id)"
              >
                <span class="chip-icon">{{ sub.icon }}</span>
                <span class="chip-name">{{ sub.name }}</span>
                <span class="chip-count">{{ fridgeStore.subCategoryCounts[sub.id] || 0 }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="filter-panel">
          <div
            class="filter-panel-header"
            @click="expandedFilterPanels.tag = !expandedFilterPanels.tag"
          >
            <span class="panel-toggle">{{ expandedFilterPanels.tag ? '▼' : '▶' }}</span>
            <span class="panel-title">🏷️ 营养标签</span>
            <div class="panel-summary" v-if="fridgeStore.filterState.selectedNutritionTags.length > 0">
              已选 {{ fridgeStore.filterState.selectedNutritionTags.length }} 个
            </div>
            <div class="filter-logic-switch">
              <span class="logic-label">匹配</span>
              <select
                v-model="fridgeStore.filterState.tagLogic" class="logic-select">
                <option value="AND">全部 (AND)</option>
                <option value="OR">任一 (OR)</option>
              </select>
            </div>
            <button
              v-if="fridgeStore.filterState.selectedNutritionTags.length > 0"
              class="btn btn-small btn-panel-clear"
              @click.stop="fridgeStore.clearTagFilters"
            >清除</button>
          </div>
          <div v-show="expandedFilterPanels.tag" class="filter-panel-body">
            <div class="nutrition-tags-filter">
              <button
                v-for="tag in fridgeStore.allNutritionTags"
                :key="tag.id"
                class="nutrition-tag-filter-btn"
                :class="{ active: fridgeStore.filterState.selectedNutritionTags.includes(tag.id) }"
                :style="{
                  borderColor: tag.color,
                  color: fridgeStore.filterState.selectedNutritionTags.includes(tag.id) ? 'white' : tag.color,
                  background: fridgeStore.filterState.selectedNutritionTags.includes(tag.id) ? tag.color : 'transparent' }"
                @click="fridgeStore.toggleNutritionTag(tag.id)"
              >
                {{ tag.name }}
                <span class="tag-filter-count">{{ fridgeStore.nutritionTagCounts[tag.id] || 0 }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="filter-panel">
          <div
            class="filter-panel-header"
            @click="expandedFilterPanels.expiry = !expandedFilterPanels.expiry"
          >
            <span class="panel-toggle">{{ expandedFilterPanels.expiry ? '▼' : '▶' }}</span>
            <span class="panel-title">⏰ 保质期状态</span>
          </div>
          <div v-show="expandedFilterPanels.expiry" class="filter-panel-body">
            <div class="expiry-filter-row">
              <button
                v-for="opt in expiryStatusOptions"
                :key="opt.value"
                class="expiry-filter-btn"
                :class="{ active: fridgeStore.filterState.expiryStatus === opt.value }"
                :style="{
                  borderColor: opt.color,
                  color: fridgeStore.filterState.expiryStatus === opt.value ? 'white' : opt.color,
                  background: fridgeStore.filterState.expiryStatus === opt.value ? opt.color : 'transparent'
                }"
                @click="fridgeStore.setFilterState({ expiryStatus: opt.value })"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="active-filters-summary" v-if="fridgeStore.activeFilterCount > 0">
          <span class="summary-label">当前筛选：</span>
          <span v-if="fridgeStore.filterState.searchKeyword" class="summary-chip">
            🔎 {{ fridgeStore.filterState.searchKeyword }}
            <button @click="fridgeStore.filterState.searchKeyword = ''">✕</button>
          </span>
          <span v-if="fridgeStore.filterState.activeZone !== '全部'" class="summary-chip">
            📍 {{ fridgeStore.filterState.activeZone }}
            <button @click="fridgeStore.setFilterState({ activeZone: '全部' })">✕</button>
          </span>
          <span
            v-for="catId in fridgeStore.filterState.selectedParentCategories"
            :key="'p-'+catId"
            class="summary-chip"
          >
            📦 {{ getParentCategoryName(catId) }}
            <button @click="fridgeStore.toggleParentCategory(catId)">✕</button>
          </span>
          <span
            v-for="catId in fridgeStore.filterState.selectedSubCategories"
            :key="'s-'+catId"
            class="summary-chip"
          >
            📁 {{ getSubCategoryName(catId) }}
            <button @click="fridgeStore.toggleSubCategory(catId)">✕</button>
          </span>
          <span
            v-for="tagId in fridgeStore.filterState.selectedNutritionTags"
            :key="'t-'+tagId"
            class="summary-chip"
            :style="{ borderColor: getTagInfo(tagId)?.color, color: getTagInfo(tagId)?.color }"
          >
            🏷️ {{ getTagInfo(tagId)?.name }}
            <button @click="fridgeStore.toggleNutritionTag(tagId)">✕</button>
          </span>
          <span v-if="fridgeStore.filterState.expiryStatus !== 'all'" class="summary-chip">
            ⏰ {{ getExpiryStatusLabel(fridgeStore.filterState.expiryStatus) }}
            <button @click="fridgeStore.setFilterState({ expiryStatus: 'all' })">✕</button>
          </span>
        </div>
      </div>

      <div class="items-list card">
        <div class="items-list-header">
          <h2>📋 食材清单</h2>
          <div class="items-list-meta">
            <span class="items-count">共 {{ filteredItems.length }} 项</span>
            <span v-if="fridgeStore.activeFilterCount > 0" class="items-filtered-hint">
              (筛选自 {{ fridgeStore.items.length }} 项)
            </span>
          </div>
        </div>
        <div v-if="filteredItems.length === 0" class="empty-tip">
          <template v-if="fridgeStore.activeFilterCount > 0">
            没有符合筛选条件的食材，试试调整筛选条件吧～
          </template>
          <template v-else>
            暂无食材，快去添加吧～
          </template>
        </div>
        <div v-else class="item-cards">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="item-card"
            :class="{
              'expiring-soon': fridgeStore.isExpiringSoonItem(item) && !fridgeStore.isExpired(item.expiryDate),
              'expired': fridgeStore.isExpired(item.expiryDate),
              'selected': selectedItemIds.has(item.id)
            }"
          >
            <div class="item-select-row">
              <input
                type="checkbox"
                class="item-checkbox"
                :checked="selectedItemIds.has(item.id)"
                @change="toggleItemSelection(item.id)"
              />
              <div class="item-header">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-zone">{{ item.zone }}</span>
              </div>
            </div>
            <div v-if="item.categoryName" class="item-category">
              <span class="item-category-label">{{ item.parentCategoryName }} · {{ item.categoryName }}</span>
            </div>
            <div v-if="item.nutritionTags && item.nutritionTags.length > 0" class="item-nutrition-tags">
              <span
                v-for="tagId in item.nutritionTags"
                :key="tagId"
                class="item-nutrition-tag"
                :style="{ backgroundColor: getTagInfo(tagId)?.color + '20', color: getTagInfo(tagId)?.color }"
              >
                {{ getTagInfo(tagId)?.name }}
              </span>
            </div>
            <div class="item-info">
              <span class="item-quantity">
                {{ item.quantity }} {{ item.unit }}
              </span>
              <span class="item-expiry">
                <span v-if="fridgeStore.isExpired(item.expiryDate)" class="badge expired">
                  已过期
                </span>
                <span v-else-if="fridgeStore.isExpiringSoonItem(item)" class="badge warning">
                  还剩 {{ fridgeStore.daysUntilExpiry(item.expiryDate) }} 天
                </span>
                <span v-else class="badge normal">
                  保质期: {{ formatDate(item.expiryDate) }}
                </span>
              </span>
            </div>
            <div class="item-actions">
              <button
                v-if="fridgeStore.isExpiringSoonItem(item) && !fridgeStore.isExpired(item.expiryDate)"
                  class="btn btn-small btn-shopping"
                  @click="addToShoppingList(item)"
              >
                🛒 补货
              </button>
              <button class="btn btn-small" @click="useItem(item)">
                消耗
              </button>
              <button class="btn btn-small btn-danger" @click="deleteItem(item.id)">
                {{ fridgeStore.isExpired(item.expiryDate) ? '丢弃' : '删除' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeRightTab === 'calendar'" class="expiry-calendar-tab">
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
    </div>

    <div v-show="activeRightTab === 'analysis'" class="cost-analysis-tab">
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

    <div v-if="showBatchZoneDialog" class="batch-dialog-overlay" @click.self="showBatchZoneDialog = false">
      <div class="batch-dialog">
        <div class="batch-dialog-header">
          <h3>🔀 批量修改分区</h3>
          <button class="batch-dialog-close" @click="showBatchZoneDialog = false">✕</button>
        </div>
        <div class="batch-dialog-body">
          <p class="batch-dialog-tip">将对选中的 <strong>{{ selectedItemIds.size }}</strong> 项食材修改分区</p>
          <div class="form-group">
            <label>选择目标分区</label>
            <select v-model="batchForm.zone">
              <option v-for="zone in fridgeStore.zones" :key="zone" :value="zone">{{ zone }}</option>
            </select>
          </div>
        </div>
        <div class="batch-dialog-footer">
          <button class="btn btn-small" @click="showBatchZoneDialog = false">取消</button>
          <button class="btn btn-primary btn-footer" @click="confirmBatchZone">确认修改</button>
        </div>
      </div>
    </div>

    <div v-if="showBatchExpiryDialog" class="batch-dialog-overlay" @click.self="showBatchExpiryDialog = false">
      <div class="batch-dialog">
        <div class="batch-dialog-header">
          <h3>⏳ 批量延长保质期</h3>
          <button class="batch-dialog-close" @click="showBatchExpiryDialog = false">✕</button>
        </div>
        <div class="batch-dialog-body">
          <p class="batch-dialog-tip">将对选中的 <strong>{{ selectedItemIds.size }}</strong> 项食材延长保质期</p>
          <div class="form-group">
            <label>延长天数</label>
            <select v-model.number="batchForm.expiryDays">
              <option :value="1">+ 1 天</option>
              <option :value="3">+ 3 天</option>
              <option :value="7">+ 7 天</option>
              <option :value="14">+ 14 天</option>
              <option :value="30">+ 30 天</option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="batchForm.negativeDaysAllowed" />
              <span>允许减少天数（负数）</span>
            </label>
          </div>
          <div v-if="batchForm.negativeDaysAllowed" class="form-group">
            <label>自定义天数（正数增加，负数减少）</label>
            <input v-model.number="batchForm.expiryDaysCustom" type="number" placeholder="如：-2 表示缩短2天" />
          </div>
        </div>
        <div class="batch-dialog-footer">
          <button class="btn btn-small" @click="showBatchExpiryDialog = false">取消</button>
          <button class="btn btn-primary btn-footer" @click="confirmBatchExpiry">确认延长</button>
        </div>
      </div>
    </div>

    <div v-if="showImportPreview" class="import-dialog-overlay" @click.self="cancelImport">
      <div class="import-dialog">
        <div class="import-dialog-header">
          <h3>📥 导入预览</h3>
          <button class="import-dialog-close" @click="cancelImport">✕</button>
        </div>
        <div class="import-dialog-body" v-if="importPreviewData">
          <div v-if="importPreviewData.version" class="import-version-row">
            <span class="import-version-label">数据版本</span>
            <span class="import-version-value">{{ importPreviewData.version }}</span>
          </div>
          <div v-if="importPreviewData.exportedAt" class="import-version-row">
            <span class="import-version-label">导出时间</span>
            <span class="import-version-value">{{ formatDateTime(importPreviewData.exportedAt) }}</span>
          </div>

          <div class="import-summary">
            <div class="import-summary-item">
              <span class="summary-icon">🧊</span>
              <div>
                <span class="summary-count">{{ importPreviewData.fridgeItems.length }}</span>
                <span class="summary-label">条冰箱食材</span>
              </div>
            </div>
            <div class="import-summary-item">
              <span class="summary-icon">🛒</span>
              <div>
                <span class="summary-count">{{ importPreviewData.shoppingItems.length }}</span>
                <span class="summary-label">条购物清单项</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>导入模式</label>
            <div class="import-mode-options">
              <label class="import-mode-option">
                <input type="radio" v-model="importMode" value="merge" />
                <div class="import-mode-content">
                  <div class="import-mode-title">🧩 合并追加</div>
                  <div class="import-mode-desc">保留现有数据，将导入数据追加到末尾</div>
                </div>
              </label>
              <label class="import-mode-option">
                <input type="radio" v-model="importMode" value="replace" />
                <div class="import-mode-content">
                  <div class="import-mode-title">🔄 覆盖替换</div>
                  <div class="import-mode-desc">删除所有现有数据，用导入数据完全替换</div>
                </div>
              </label>
            </div>
          </div>

          <div v-if="importPreviewData.fridgeItems.length > 0" class="import-preview-section">
            <h4>🍎 冰箱食材预览（前5条）</h4>
            <table class="import-preview-table">
              <thead>
                <tr><th>名称</th><th>数量</th><th>保质期</th><th>分区</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in importPreviewData.fridgeItems.slice(0, 5)" :key="idx">
                  <td>{{ item.name }}</td>
                  <td>{{ item.quantity }}{{ item.unit }}</td>
                  <td>{{ item.expiryDate || '-' }}</td>
                  <td>{{ item.zone || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="importPreviewData.shoppingItems.length > 0" class="import-preview-section">
            <h4>🛒 购物清单预览（前5条）</h4>
            <table class="import-preview-table">
              <thead>
                <tr><th>名称</th><th>数量</th><th>单价</th><th>状态</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in importPreviewData.shoppingItems.slice(0, 5)" :key="idx">
                  <td>{{ item.name }}</td>
                  <td>{{ item.quantity }}{{ item.unit }}</td>
                  <td>¥{{ item.unitPrice || 0 }}</td>
                  <td>{{ item.purchased ? '已购' : '待购' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="import-dialog-footer">
          <button class="btn btn-small" @click="cancelImport">取消</button>
          <button class="btn btn-primary btn-footer" @click="confirmImport">
            {{ importMode === 'replace' ? '⚠ 确认覆盖导入' : '确认合并导入' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRegressionDialog" class="regression-dialog-overlay" @click.self="closeRegressionDialog">
      <div class="regression-dialog" :class="regressionResult?.allPassed ? 'all-passed' : 'has-failed'">
        <div class="regression-dialog-header">
          <h3>🧪 筛选逻辑回归测试报告</h3>
          <button class="regression-dialog-close" @click="closeRegressionDialog">✕</button>
        </div>
        <div class="regression-dialog-body" v-if="regressionResult">
          <div class="regression-summary" :class="regressionResult.allPassed ? 'success' : 'fail'">
            <div class="regression-summary-icon">
              {{ regressionResult.allPassed ? '✅' : '⚠️' }}
            </div>
            <div class="regression-summary-text">
              <div class="regression-summary-title">
                {{ regressionResult.allPassed ? '全部通过！' : '存在失败用例' }}
              </div>
              <div class="regression-summary-stats">
                <span class="stat pass">通过 {{ regressionResult.passed }}/{{ regressionResult.total }}</span>
                <span v-if="regressionResult.failed > 0" class="stat fail">失败 {{ regressionResult.failed }}</span>
              </div>
            </div>
          </div>

          <div class="regression-cases-title">详细用例</div>
          <div class="regression-cases-list">
            <div
              v-for="(c, idx) in regressionResult.cases"
              :key="idx"
              class="regression-case"
              :class="c.passed ? 'case-pass' : 'case-fail'"
            >
              <div class="case-header">
                <span class="case-status">{{ c.passed ? '✅' : '❌' }}</span>
                <span class="case-name">{{ c.name }}</span>
              </div>
              <div v-if="!c.passed" class="case-detail">
                <div class="case-row">
                  <span class="case-row-label">期望：</span>
                  <span class="case-value">{{ c.expected.length > 0 ? c.expected.join('、') : '空集' }}</span>
                </div>
                <div class="case-row">
                  <span class="case-row-label">实际：</span>
                  <span class="case-value">{{ c.actual.length > 0 ? c.actual.join('、') : '空集' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="regression-dialog-footer">
          <button class="btn btn-primary" @click="closeRegressionDialog">
            关闭
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRecipeTestDialog" class="regression-dialog-overlay" @click.self="closeRecipeTestDialog">
      <div class="regression-dialog" :class="recipeTestResult?.allPassed ? 'all-passed' : 'has-failed'">
        <div class="regression-dialog-header">
          <h3>🍳 菜谱推荐回归测试报告</h3>
          <button class="regression-dialog-close" @click="closeRecipeTestDialog">✕</button>
        </div>
        <div class="regression-dialog-body" v-if="recipeTestResult">
          <div class="regression-summary" :class="recipeTestResult.allPassed ? 'success' : 'fail'">
            <div class="regression-summary-icon">
              {{ recipeTestResult.allPassed ? '✅' : '⚠️' }}
            </div>
            <div class="regression-summary-text">
              <div class="regression-summary-title">
                {{ recipeTestResult.allPassed ? '全部通过！' : '存在失败用例' }}
              </div>
              <div class="regression-summary-stats">
                <span class="stat pass">通过 {{ recipeTestResult.passed }}/{{ recipeTestResult.total }}</span>
                <span v-if="recipeTestResult.failed > 0" class="stat fail">失败 {{ recipeTestResult.failed }}</span>
              </div>
            </div>
          </div>

          <div class="regression-cases-title">详细用例</div>
          <div class="regression-cases-list">
            <div
              v-for="(c, idx) in recipeTestResult.cases"
              :key="idx"
              class="regression-case"
              :class="c.passed ? 'case-pass' : 'case-fail'"
            >
              <div class="case-header">
                <span class="case-status">{{ c.passed ? '✅' : '❌' }}</span>
                <span class="case-name">{{ c.name }}</span>
              </div>
              <div v-if="!c.passed" class="case-detail">
                <div class="case-row">
                  <span class="case-row-label">期望：</span>
                  <span class="case-value">{{ c.expected }}</span>
                </div>
                <div class="case-row">
                  <span class="case-row-label">实际：</span>
                  <span class="case-value">{{ c.actual }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="regression-dialog-footer">
          <button class="btn btn-primary" @click="closeRecipeTestDialog">
            关闭
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDisposalDialog" class="disposal-dialog-overlay" @click.self="cancelDisposal">
      <div class="disposal-dialog">
        <div class="disposal-dialog-header">
          <h3>🗑️ 处置原因</h3>
          <button class="disposal-dialog-close" @click="cancelDisposal">✕</button>
        </div>
        <div class="disposal-dialog-body" v-if="disposalDialogItem">
          <div class="disposal-item-info">
            <div class="disposal-item-name">{{ disposalDialogItem.name }}</div>
            <div class="disposal-item-meta">
              <span class="disposal-item-qty">{{ disposalDialogItem.quantity }} {{ disposalDialogItem.unit }}</span>
              <span class="disposal-item-zone">{{ disposalDialogItem.zone }}</span>
              <span
                class="disposal-item-expiry"
                :class="{
                  'expired': fridgeStore.isExpired(disposalDialogItem.expiryDate),
                  'expiring': fridgeStore.isExpiringSoonItem(disposalDialogItem) && !fridgeStore.isExpired(disposalDialogItem.expiryDate)
                }"
              >
                {{ fridgeStore.isExpired(disposalDialogItem.expiryDate) ? '已过期' : '还剩 ' + fridgeStore.daysUntilExpiry(disposalDialogItem.expiryDate) + ' 天' }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>选择处置原因</label>
            <div class="disposal-reason-grid">
              <button
                v-for="(info, key) in wasteRecordStore.DISPOSAL_REASONS"
                :key="key"
                type="button"
                class="disposal-reason-btn"
                :class="{
                  active: disposalForm.reason === key,
                  'is-waste': info.isWaste,
                  'is-consumption': !info.isWaste
                }"
                @click="disposalForm.reason = key"
              >
                <span class="reason-icon">{{ info.icon }}</span>
                <span class="reason-label">{{ info.label }}</span>
                <span v-if="!info.isWaste" class="reason-badge">非浪费</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>备注说明（可选）</label>
            <textarea
              v-model="disposalForm.disposalNote"
              class="disposal-note-input"
              placeholder="请输入处置的具体原因或说明..."
              rows="3"
            ></textarea>
          </div>

          <div class="disposal-summary" :class="wasteRecordStore.DISPOSAL_REASONS[disposalForm.reason].isWaste ? 'waste' : 'consumption'">
            <span class="summary-icon">
              {{ wasteRecordStore.DISPOSAL_REASONS[disposalForm.reason].isWaste ? '⚠️' : '✅' }}
            </span>
            <span class="summary-text">
              {{ wasteRecordStore.DISPOSAL_REASONS[disposalForm.reason].isWaste
                ? '此记录将计入浪费统计'
                : '此记录将计入自然消耗，不计入浪费' }}
            </span>
          </div>
        </div>
        <div class="disposal-dialog-footer">
          <button class="btn btn-small" @click="cancelDisposal">取消</button>
          <button class="btn btn-primary" @click="confirmDisposal">
            确认处置
          </button>
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
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useFridgeStore } from '@/stores/fridge'
import { useShoppingListStore } from '@/stores/shoppingList'
import { usePurchaseCostStore } from '@/stores/purchaseCost'
import { useWasteRecordStore } from '@/stores/wasteRecord'
import { useStockOrchestrator } from '@/composables/useStockOrchestrator'
import { categories, getSubCategoryById, getNutritionTagById, matchIngredientByCategory } from '@/utils/categories'
import { exportToJSON, exportToCSV, parseJSONFile, parseCSVFile, addDaysToDate } from '@/utils/dataIO'

const emit = defineEmits(['add-to-shopping-list'])

const fridgeStore = useFridgeStore()
const shoppingStore = useShoppingListStore()
const purchaseCostStore = usePurchaseCostStore()
const wasteRecordStore = useWasteRecordStore()
const orchestrator = useStockOrchestrator()

const activeRightTab = ref('items')
const selectedItemIds = ref(new Set())
const showBatchZoneDialog = ref(false)
const showBatchExpiryDialog = ref(false)
const batchForm = ref({
  zone: '冷藏',
  expiryDays: 7,
  negativeDaysAllowed: false,
  expiryDaysCustom: 0
})

const showImportPreview = ref(false)
const importPreviewData = ref(null)
const importMode = ref('merge')

const showDisposalDialog = ref(false)
const disposalDialogItem = ref(null)
const disposalForm = ref({
  reason: 'discarded',
  disposalNote: ''
})

const showRegressionDialog = ref(false)
const regressionResult = ref(null)

const showRecipeTestDialog = ref(false)
const recipeTestResult = ref(null)

const showCalendarDetail = ref(false)
const selectedDateCell = ref(null)
const selectedDateItems = ref([])
const selectedDateLabel = ref('')

const now = new Date()
const calendarYear = ref(now.getFullYear())
const calendarMonth = ref(now.getMonth())

const analysisDimension = ref('category')
const analysisMonth = ref(getCurrentCostMonth())
const analysisFilters = ref({
  category: '全部',
  zone: '全部',
  store: '全部'
})

const expandedFilterPanels = ref({
  category: true,
  tag: true,
  expiry: false
})

function getCurrentCostMonth() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

function useItem(item) {
  const amount = parseFloat(prompt(`消耗多少 ${item.unit}？`, '1'))
  if (isNaN(amount) || amount <= 0) return
  orchestrator.useItemFromFridge(item, amount)
}

function deleteItem(id) {
  const item = fridgeStore.getItemById(id)
  if (!item) return
  const isExpired = fridgeStore.isExpired(item.expiryDate)
  const isExpiringSoon = fridgeStore.isExpiringSoonItem(item)

  if (isExpired || isExpiringSoon) {
    disposalDialogItem.value = item
    disposalForm.value.reason = isExpired ? 'expired' : 'natural_consumption'
    disposalForm.value.disposalNote = ''
    showDisposalDialog.value = true
  } else {
    if (confirm('确定要删除这个食材吗？此操作将记录到浪费报表。')) {
      orchestrator.discardFromFridge(id, 'discarded', '')
    }
  }
}

function confirmDisposal() {
  if (!disposalDialogItem.value) return
  const reason = disposalForm.value.reason
  const disposalNote = disposalForm.value.disposalNote.trim()
  const reasonInfo = wasteRecordStore.DISPOSAL_REASONS[reason]
  const confirmText = reasonInfo.isWaste
    ? `确定要${reasonInfo.label}这个食材吗？此操作将记录到浪费报表。`
    : `确定要记录为「${reasonInfo.label}」吗？此操作将纳入消耗统计。`
  if (confirm(confirmText)) {
    orchestrator.discardFromFridge(disposalDialogItem.value.id, reason, disposalNote)
    cancelDisposal()
  }
}

function cancelDisposal() {
  showDisposalDialog.value = false
  disposalDialogItem.value = null
  disposalForm.value.reason = 'discarded'
  disposalForm.value.disposalNote = ''
}

function addToShoppingList(item) {
  emit('add-to-shopping-list', item)
}

function handleCalendarUse(item) {
  useItem(item)
  if (selectedDateCell.value) {
    refreshSelectedDateItems()
  }
}

function handleCalendarDelete(item) {
  deleteItem(item.id)
  setTimeout(() => {
    if (selectedDateCell.value) {
      refreshSelectedDateItems()
    }
  }, 100)
}

function handleCalendarAddToShopping(item) {
  addToShoppingList(item)
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatDateTime(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

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

let searchDebounceTimer = null
function onSearchInput() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    const keyword = fridgeStore.filterState.searchKeyword.trim().toLowerCase()
    if (!keyword) return
    for (const group of categories) {
      if (group.name.toLowerCase().includes(keyword)) {
        if (!fridgeStore.filterState.selectedParentCategories.includes(group.id)) {
          expandedFilterPanels.value.category = true
        }
        break
      }
      for (const sub of group.children) {
        if (sub.name.toLowerCase().includes(keyword)) {
          if (!fridgeStore.filterState.selectedSubCategories.includes(sub.id)) {
            expandedFilterPanels.value.category = true
          }
          return
        }
      }
    }
  }, 300)
}

function isSubCatFromSelectedParent(subCatId) {
  const sub = getSubCategoryById(subCatId)
  if (!sub) return false
  return fridgeStore.filterState.selectedParentCategories.includes(sub.parentId)
}

function getParentCategoryName(catId) {
  const group = categories.find(g => g.id === catId)
  return group ? group.name : catId
}

function getSubCategoryName(catId) {
  const sub = getSubCategoryById(catId)
  return sub ? sub.name : catId
}

const expiryStatusOptions = [
  { value: 'all', label: '全部', color: '#78909c' },
  { value: 'normal', label: '正常', color: '#4caf50' },
  { value: 'expiring', label: '即将过期', color: '#ff9800' },
  { value: 'expired', label: '已过期', color: '#f44336' }
]

function getExpiryStatusLabel(status) {
  const opt = expiryStatusOptions.find(o => o.value === status)
  return opt ? opt.label : status
}

function getTagInfo(tagId) {
  return getNutritionTagById(tagId)
}

function toggleItemSelection(id) {
  const next = new Set(selectedItemIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedItemIds.value = next
}

function selectAllItems() {
  const next = new Set(filteredItems.value.map(i => i.id))
  selectedItemIds.value = next
}

function clearSelected() {
  selectedItemIds.value = new Set()
}

function confirmBatchZone() {
  if (selectedItemIds.value.size === 0 || !batchForm.value.zone) return
  const ids = Array.from(selectedItemIds.value)
  const count = fridgeStore.batchUpdateZone(ids, batchForm.value.zone)
  showBatchZoneDialog.value = false
  clearSelected()
  alert(`已成功修改 ${count} 项食材的分区为「${batchForm.value.zone}」`)
}

function confirmBatchExpiry() {
  if (selectedItemIds.value.size === 0) return
  let days = batchForm.value.expiryDays
  if (batchForm.value.negativeDaysAllowed && !isNaN(batchForm.value.expiryDaysCustom)) {
    days = batchForm.value.expiryDaysCustom
  }
  if (isNaN(days)) {
    alert('请输入有效的天数')
    return
  }
  const ids = Array.from(selectedItemIds.value)
  const count = fridgeStore.batchExtendExpiry(ids, days)
  showBatchExpiryDialog.value = false
  clearSelected()
  const action = days >= 0 ? '延长' : '缩短'
  alert(`已成功${action} ${count} 项食材的保质期 ${Math.abs(days)} 天`)
}

function handleExportJSON() {
  exportToJSON(fridgeStore.items, shoppingStore.list)
  alert('JSON 数据已导出！')
}

function handleExportCSV() {
  exportToCSV(fridgeStore.items, shoppingStore.list)
  alert('CSV 数据已导出！')
}

async function handleImportJSON(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const data = await parseJSONFile(file)
    importPreviewData.value = data
    importMode.value = 'merge'
    showImportPreview.value = true
  } catch (err) {
    alert('导入失败：' + err.message)
  }
}

async function handleImportCSV(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const data = await parseCSVFile(file)
    importPreviewData.value = data
    importMode.value = 'merge'
    showImportPreview.value = true
  } catch (err) {
    alert('导入失败：' + err.message)
  }
}

function cancelImport() {
  showImportPreview.value = false
  importPreviewData.value = null
}

function confirmImport() {
  if (!importPreviewData.value) return
  const { fridgeItems, shoppingItems } = importPreviewData.value
  const isReplace = importMode.value === 'replace'

  if (isReplace) {
    const confirmText = `确认要覆盖现有数据吗？\n\n将删除 ${fridgeStore.items.length} 条食材和 ${shoppingStore.list.length} 条购物项，替换为导入的 ${fridgeItems.length} 条食材和 ${shoppingItems.length} 条购物项。\n\n此操作不可恢复！`
    if (!confirm(confirmText)) return
  }

  try {
    if (isReplace) {
      fridgeStore.replaceAllItems(fridgeItems)
      shoppingStore.replaceAllItems(shoppingItems)
    } else {
      if (fridgeItems.length > 0) fridgeStore.addItemsBulk(fridgeItems)
      if (shoppingItems.length > 0) shoppingStore.addItemsBulk(shoppingItems)
    }
    cancelImport()
    const action = isReplace ? '覆盖替换' : '合并追加'
    alert(`导入成功！\n模式：${action}\n冰箱食材：${fridgeItems.length} 条\n购物清单：${shoppingItems.length} 条`)
  } catch (err) {
    alert('导入出错：' + err.message)
  }
}

function handleRunRegressionTests() {
  try {
    const result = fridgeStore.runFilterRegressionTests()
    regressionResult.value = result
    showRegressionDialog.value = true
    console.log('[筛选回归测试]', result.summary, result.cases)
  } catch (err) {
    console.error('[筛选回归测试] 执行出错：', err)
    alert('筛选回归测试执行出错：' + err.message)
  }
}

function closeRegressionDialog() {
  showRegressionDialog.value = false
  regressionResult.value = null
}

function closeRecipeTestDialog() {
  showRecipeTestDialog.value = false
  recipeTestResult.value = null
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

const filteredItems = computed(() => fridgeStore.filteredItems)

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

.btn-primary {
  width: 100%;
  background: linear-gradient(135deg, #00897b, #26a69a);
  color: white;
  font-weight: 500;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 137, 123, 0.3);
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

.btn-regression {
  background: linear-gradient(135deg, #ede7f6, #e1bee7);
  color: #6a1b9a;
  font-weight: 500;
  border: 1px solid #ce93d8;
}

.btn-regression:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(106, 27, 154, 0.2);
}

.right-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: white;
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.right-tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #78909c;
  cursor: pointer;
  transition: all 0.2s ease;
}

.right-tab:hover {
  background: #f5f7fa;
  color: #455a64;
}

.right-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  background: white;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-item.warning {
  border-top: 3px solid #f44336;
}

.stat-item.warning .stat-num {
  color: #d32f2f;
}

.stat-item.warning .stat-label {
  color: #e53935;
}

.stat-item.danger {
  border-top: 3px solid #f44336;
}

.stat-item.shopping {
  border-top: 3px solid #00897b;
}

.stat-item.shopping .stat-num {
  color: #00897b;
}

.stat-item.shopping .stat-label {
  color: #00796b;
}

.stat-num {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #37474f;
}

.stat-label {
  display: block;
  font-size: 13px;
  color: #78909c;
  margin-top: 4px;
}

.io-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  flex-wrap: wrap;
}

.io-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.io-label {
  font-size: 13px;
  font-weight: 600;
  color: #37474f;
}

.io-divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
}

.btn-io {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  color: #1565c0;
  border: 1px solid #90caf9;
  font-weight: 500;
}

.btn-io:hover {
  background: linear-gradient(135deg, #bbdefb, #90caf9);
  color: #0d47a1;
}

.btn-file-label {
  display: inline-block;
  cursor: pointer;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border: 1px solid #ffd54f;
}

.batch-info {
  font-size: 14px;
  color: #e65100;
  font-weight: 500;
}

.batch-info strong {
  font-size: 16px;
  color: #bf360c;
}

.batch-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-batch {
  background: white;
  color: #5d4037;
  border: 1px solid #d7ccc8;
}

.btn-batch:hover {
  background: #fff3e0;
  color: #e65100;
  border-color: #ffab91;
}

.btn-batch-zone {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  color: #2e7d32;
  border-color: #81c784;
}

.btn-batch-zone:hover {
  background: linear-gradient(135deg, #c8e6c9, #a5d6a7);
  color: #1b5e20;
}

.btn-batch-expiry {
  background: linear-gradient(135deg, #f3e5f5, #e1bee7);
  color: #6a1b9a;
  border-color: #ba68c8;
}

.btn-batch-expiry:hover {
  background: linear-gradient(135deg, #e1bee7, #ce93d8);
  color: #4a148c;
}

.item-select-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.item-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #00897b;
  cursor: pointer;
  margin-top: 2px;
  flex-shrink: 0;
}

.item-card.selected {
  border: 2px solid #00897b;
  background: linear-gradient(135deg, #e0f2f1 0%, #ffffff 100%);
  box-shadow: 0 2px 8px rgba(0, 137, 123, 0.15);
}

.item-card.selected .item-header {
  width: 100%;
}

.advanced-filter {
  margin-bottom: 20px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filter-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-title-row h2 {
  margin: 0;
  font-size: 18px;
  color: #37474f;
}

.filter-count-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, #00897b, #26a69a);
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.btn-clear-all {
  background: #ffebee;
  color: #c62828;
  font-weight: 500;
}

.btn-clear-all:hover {
  background: #ffcdd2;
}

.filter-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-bar {
  margin-bottom: 16px;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 10px;
  padding: 0 12px;
  transition: all 0.2s;
}

.search-input-wrap:focus-within {
  border-color: #00897b;
  background: white;
}

.search-icon {
  font-size: 16px;
  margin-right: 8px;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-size: 14px;
  outline: none;
}

.search-clear {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 50%;
  color: #90a4ae;
  font-size: 12px;
  transition: all 0.2s;
}

.search-clear:hover {
  background: #e0e0e0;
  color: #455a64;
}

.search-result-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #00897b;
  font-weight: 500;
}

.zone-filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8faf9;
  border-radius: 10px;
}

.filter-label {
  font-size: 13px;
  font-weight: 500;
  color: #546e7a;
  flex-shrink: 0;
}

.filter-btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-panel {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
}

.filter-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #fafafa;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.filter-panel-header:hover {
  background: #f0f0f0;
}

.panel-toggle {
  font-size: 12px;
  color: #78909c;
  width: 16px;
}

.panel-title {
  font-size: 14px;
  font-weight: 500;
  color: #37474f;
  flex: 1;
}

.panel-summary {
  font-size: 12px;
  color: #00897b;
  font-weight: 500;
}

.filter-logic-switch {
  display: flex;
  align-items: center;
  gap: 6px;
}

.logic-label {
  font-size: 12px;
  color: #78909c;
}

.logic-select {
  padding: 4px 8px;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  font-size: 12px;
  background: white;
  cursor: pointer;
  outline: none;
}

.logic-select:focus {
  border-color: #00897b;
}

.btn-panel-clear {
  font-size: 11px;
  padding: 4px 10px;
  background: #eceff1;
  color: #546e7a;
}

.btn-panel-clear:hover {
  background: #cfd8dc;
}

.filter-panel-body {
  padding: 14px;
  border-top: 1px solid #eef0f1;
}

.filter-hint-tip {
  padding: 10px 12px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 8px;
  font-size: 12px;
  color: #795548;
  line-height: 1.6;
  margin-bottom: 12px;
}

.filter-sub-label {
  font-size: 12px;
  color: #78909c;
  margin-bottom: 8px;
  font-weight: 500;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.parent-cat-grid {
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1.5px solid #e0e0e0;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: #546e7a;
}

.chip:hover {
  border-color: #b0bec5;
  background: #fafafa;
}

.chip.active {
  background: linear-gradient(135deg, #00897b, #26a69a);
  border-color: #00897b;
  color: white;
}

.sub-chip.from-parent {
  border-color: #80cbc4;
  background: #e0f2f1;
}

.sub-chip.from-parent:not(.active) {
  color: #00695c;
}

.chip-icon {
  font-size: 14px;
}

.chip-name {
  font-weight: 500;
}

.chip-count {
  font-size: 11px;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  opacity: 0.8;
}

.chip.active .chip-count {
  background: rgba(255, 255, 255, 0.25);
}

.nutrition-tags-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nutrition-tag-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1.5px solid;
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 500;
}

.nutrition-tag-filter-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tag-filter-count {
  font-size: 11px;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  opacity: 0.8;
}

.nutrition-tag-filter-btn.active .tag-filter-count {
  background: rgba(255, 255, 255, 0.25);
}

.expiry-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.expiry-filter-btn {
  padding: 8px 20px;
  border: 1.5px solid;
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 500;
}

.expiry-filter-btn:hover {
  transform: translateY(-1px);
}

.active-filters-summary {
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #e8f5e9, #e0f2f1);
  border-radius: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.summary-label {
  font-size: 13px;
  font-weight: 500;
  color: #37474f;
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: white;
  border: 1px solid #cfd8dc;
  border-radius: 14px;
  font-size: 12px;
  color: #546e7a;
}

.summary-chip button {
  border: none;
  background: #eceff1;
  color: #78909c;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s;
}

.summary-chip button:hover {
  background: #ef5350;
  color: white;
}

.items-list .item-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.item-card {
  padding: 14px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #eceff1;
  transition: all 0.2s;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.item-card.expiring-soon {
  background: #ffebee;
  border-color: #ef5350;
  border-width: 2px;
  box-shadow: 0 0 0 1px rgba(244, 67, 54, 0.15);
}

.item-card.expired {
  background: #ffebee;
  border-color: #ef9a9a;
  opacity: 0.8;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-name {
  font-weight: 600;
  font-size: 16px;
  color: #263238;
}

.item-zone {
  font-size: 12px;
  padding: 2px 8px;
  background: #e0f2f1;
  color: #00695c;
  border-radius: 10px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.item-quantity {
  font-size: 14px;
  color: #546e7a;
}

.badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.badge.normal {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge.warning {
  background: #fdecea;
  color: #c62828;
  font-weight: 600;
  border: 1px solid #ef9a9a;
}

.badge.expired {
  background: #ffebee;
  color: #c62828;
  font-weight: 500;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.btn-shopping {
  background: #e0f2f1;
  color: #00695c;
}

.btn-shopping:hover {
  background: #b2dfdb;
}

.items-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.items-list-header h2 {
  margin: 0;
  font-size: 18px;
  color: #37474f;
}

.items-list-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.items-count {
  font-size: 13px;
  color: #00897b;
  font-weight: 600;
}

.items-filtered-hint {
  font-size: 12px;
  color: #90a4ae;
}

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 40px 20px;
  font-size: 14px;
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

.item-category {
  margin-bottom: 6px;
}

.item-category-label {
  font-size: 12px;
  color: #00897b;
  background: #e0f2f1;
  padding: 2px 8px;
  border-radius: 10px;
}

.item-nutrition-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.item-nutrition-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 500;
}

.form-group {
  margin-bottom: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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

.legend-dot.cost-dot {
  background: #667eea;
}

.legend-dot.consumption-dot {
  background: #11998e;
}

.legend-dot.waste-dot {
  background: #f5576c;
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

.cost-month-select {
  padding: 6px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 13px;
  color: #37474f;
  background: white;
  cursor: pointer;
}

.cost-month-select:focus {
  outline: none;
  border-color: #00897b;
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

.waste-rate-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.waste-rate-badge.good {
  background: #e8f5e9;
  color: #2e7d32;
}

.waste-rate-badge.fair {
  background: #fff3e0;
  color: #e65100;
}

.waste-rate-badge.poor {
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

.batch-dialog-overlay,
.import-dialog-overlay {
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
}

.batch-dialog,
.import-dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 520px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.import-dialog {
  max-width: 620px;
}

.batch-dialog-header,
.import-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 1px solid #ffcc80;
}

.import-dialog-header {
  background: linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%);
  border-bottom-color: #9fa8da;
}

.batch-dialog-header h3,
.import-dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #e65100;
}

.import-dialog-header h3 {
  color: #283593;
}

.batch-dialog-close,
.import-dialog-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #e65100;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.import-dialog-close {
  color: #283593;
}

.batch-dialog-close:hover {
  background: rgba(230, 81, 0, 0.1);
}

.import-dialog-close:hover {
  background: rgba(40, 53, 147, 0.1);
}

.batch-dialog-body,
.import-dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.batch-dialog-tip {
  margin: 0 0 16px;
  padding: 10px 14px;
  background: #fff8e1;
  border-radius: 8px;
  border-left: 3px solid #ffb300;
  font-size: 14px;
  color: #5d4037;
}

.batch-dialog-body .form-group,
.import-dialog-body .form-group {
  margin-bottom: 16px;
}

.batch-dialog-body label,
.import-dialog-body label {
  display: block;
  font-size: 14px;
  color: #546e7a;
  margin-bottom: 6px;
}

.batch-dialog-body select,
.batch-dialog-body input,
.import-dialog-body select,
.import-dialog-body input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.batch-dialog-footer,
.import-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
}

.btn-footer {
  width: auto;
  padding: 8px 20px;
}

.import-version-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px dashed #e0e0e0;
}

.import-version-label {
  color: #78909c;
}

.import-version-value {
  color: #283593;
  font-weight: 600;
}

.import-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 16px 0;
}

.import-summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #f5f5f5, #eeeeee);
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.summary-icon {
  font-size: 32px;
}

.summary-count {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #37474f;
}

.summary-label-text {
  font-size: 13px;
  color: #78909c;
}

.import-mode-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.import-mode-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.import-mode-option:hover {
  border-color: #90a4ae;
  background: #fafafa;
}

.import-mode-option input[type="radio"] {
  width: 18px;
  height: 18px;
  accent-color: #00897b;
  margin-top: 2px;
}

.import-mode-option:has(input:checked) {
  border-color: #00897b;
  background: linear-gradient(135deg, #e0f2f1, #ffffff);
}

.import-mode-title {
  font-size: 15px;
  font-weight: 600;
  color: #263238;
  margin-bottom: 2px;
}

.import-mode-desc {
  font-size: 12px;
  color: #78909c;
  line-height: 1.5;
}

.import-preview-section {
  margin-top: 18px;
  padding: 12px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #eceff1;
}

.import-preview-section h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #37474f;
}

.import-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.import-preview-table th,
.import-preview-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.import-preview-table th {
  background: #eceff1;
  color: #546e7a;
  font-weight: 600;
}

.import-preview-table tr:last-child td {
  border-bottom: none;
}

.regression-dialog-overlay {
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

.regression-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.regression-dialog.all-passed {
  border: 2px solid #66bb6a;
}

.regression-dialog.has-failed {
  border: 2px solid #ef5350;
}

.regression-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eceff1;
  background: #fafafa;
}

.regression-dialog-header h3 {
  margin: 0;
  font-size: 17px;
  color: #37474f;
}

.regression-dialog-close {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: #90a4ae;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.regression-dialog-close:hover {
  background: #e0e0e0;
  color: #455a64;
}

.regression-dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.regression-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.regression-summary.success {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border: 1px solid #a5d6a7;
}

.regression-summary.fail {
  background: linear-gradient(135deg, #ffebee, #ffcdd2);
  border: 1px solid #ef9a9a;
}

.regression-summary-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.regression-summary-text {
  flex: 1;
}

.regression-summary-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #2e7d32;
}

.regression-summary.fail .regression-summary-title {
  color: #c62828;
}

.regression-summary-stats {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.regression-summary-stats .stat.pass {
  color: #2e7d32;
  font-weight: 600;
}

.regression-summary-stats .stat.fail {
  color: #c62828;
  font-weight: 600;
}

.regression-cases-title {
  font-size: 14px;
  font-weight: 600;
  color: #455a64;
  margin-bottom: 10px;
}

.regression-cases-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.regression-case {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.regression-case.case-pass {
  background: #f8faf9;
  border-color: #c8e6c9;
}

.regression-case.case-fail {
  background: #fff5f5;
  border-color: #ef9a9a;
}

.case-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #37474f;
}

.case-status {
  font-size: 14px;
}

.case-name {
  flex: 1;
}

.case-detail {
  margin-top: 8px;
  padding: 8px 10px;
  background: rgba(239, 83, 80, 0.08);
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.case-row {
  display: flex;
  gap: 6px;
}

.case-row-label {
  color: #607d8b;
  font-weight: 500;
  flex-shrink: 0;
}

.case-value {
  color: #c62828;
  font-weight: 500;
}

.regression-dialog-footer {
  padding: 14px 20px;
  border-top: 1px solid #eceff1;
  background: #fafafa;
  display: flex;
  justify-content: flex-end;
}

.regression-dialog-footer .btn {
  min-width: 120px;
}

.disposal-dialog-overlay {
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

.disposal-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.disposal-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #eceff1;
}

.disposal-dialog-header h3 {
  margin: 0;
  font-size: 20px;
  color: #37474f;
}

.disposal-dialog-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #90a4ae;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.disposal-dialog-close:hover {
  background: #f5f5f5;
  color: #546e7a;
}

.disposal-dialog-body {
  padding: 24px;
}

.disposal-item-info {
  background: linear-gradient(135deg, #f3e5f5 0%, #e8f5e9 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.disposal-item-name {
  font-size: 18px;
  font-weight: 600;
  color: #37474f;
  margin-bottom: 8px;
}

.disposal-item-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.disposal-item-qty,
.disposal-item-zone {
  font-size: 13px;
  padding: 4px 10px;
  background: white;
  border-radius: 12px;
  color: #546e7a;
  font-weight: 500;
}

.disposal-item-expiry {
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.disposal-item-expiry.expired {
  background: #ffebee;
  color: #c62828;
}

.disposal-item-expiry.expiring {
  background: #fff3e0;
  color: #e65100;
}

.disposal-reason-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 8px;
}

.disposal-reason-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  position: relative;
}

.disposal-reason-btn:hover {
  border-color: #90caf9;
  background: #f5faff;
}

.disposal-reason-btn.active {
  border-color: #1976d2;
  background: #e3f2fd;
}

.disposal-reason-btn.active.is-waste {
  border-color: #c62828;
  background: #ffebee;
}

.disposal-reason-btn.active.is-consumption {
  border-color: #2e7d32;
  background: #e8f5e9;
}

.disposal-reason-btn .reason-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.disposal-reason-btn .reason-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #37474f;
}

.reason-badge {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 10px;
  padding: 2px 6px;
  background: #c8e6c9;
  color: #2e7d32;
  border-radius: 8px;
  font-weight: 600;
}

.disposal-note-input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  color: #37474f;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  margin-top: 8px;
}

.disposal-note-input:focus {
  outline: none;
  border-color: #1976d2;
}

.disposal-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  margin-top: 20px;
}

.disposal-summary.waste {
  background: #fff3e0;
  border: 1px solid #ffe0b2;
}

.disposal-summary.consumption {
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
}

.disposal-summary .summary-icon {
  font-size: 20px;
}

.disposal-summary .summary-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #546e7a;
}

.disposal-dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid #eceff1;
  background: #fafafa;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.disposal-dialog-footer .btn {
  min-width: 100px;
}

.correlation-insight {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border-radius: 8px;
  border: 1px solid #ffd54f;
  border-left: 4px solid #ff9800;
}

.insight-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.insight-text {
  font-size: 13px;
  color: #5d4037;
  line-height: 1.5;
}

.cost-category-bars {
  margin-bottom: 18px;
  padding: 14px;
  background: #f8faf9;
  border-radius: 10px;
}

.cost-category-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.cost-category-row:last-child {
  margin-bottom: 0;
}

.cost-cat-name {
  width: 72px;
  font-size: 12px;
  color: #546e7a;
  font-weight: 500;
  flex-shrink: 0;
  text-align: right;
}

.cost-cat-bar-track {
  flex: 1;
  height: 18px;
  background: #eceff1;
  border-radius: 9px;
  overflow: hidden;
}

.cost-cat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #26a69a, #00897b);
  border-radius: 9px;
  transition: width 0.3s ease;
  min-width: 4px;
}

.cost-cat-amount {
  width: 56px;
  font-size: 12px;
  font-weight: 600;
  color: #00796b;
  flex-shrink: 0;
}

.cost-cat-percent {
  width: 36px;
  font-size: 11px;
  color: #78909c;
  flex-shrink: 0;
}

.cost-detail-list {
  margin-top: 4px;
}

.cost-detail-items {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cost-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8faf9;
  border-radius: 8px;
  border: 1px solid #eceff1;
}

.cost-detail-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cost-detail-name {
  font-size: 13px;
  font-weight: 500;
  color: #37474f;
}

.cost-detail-cat {
  font-size: 11px;
  padding: 1px 6px;
  background: #e0f2f1;
  color: #00695c;
  border-radius: 8px;
}

.cost-detail-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cost-detail-qty {
  font-size: 12px;
  color: #78909c;
}

.cost-detail-total {
  font-size: 14px;
  font-weight: 600;
  color: #00796b;
}

.cost-correlation {
  margin-bottom: 18px;
  padding: 14px;
  background: #f5f7fa;
  border-radius: 10px;
}

.correlation-table {
  font-size: 12px;
}

.correlation-header-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.6fr 0.6fr 0.7fr 0.7fr;
  gap: 6px;
  padding: 8px 10px;
  background: #eceff1;
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  color: #546e7a;
}

.correlation-data-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.6fr 0.6fr 0.7fr 0.7fr;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid #eceff1;
  align-items: center;
}

.correlation-data-row:last-child {
  border-bottom: none;
}

.corr-col {
  text-align: center;
  color: #455a64;
}

.corr-name {
  text-align: left;
  font-weight: 500;
  color: #37474f;
}

.corr-waste-high {
  color: #c62828;
  font-weight: 600;
}

.cost-summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.cost-summary-item {
  padding: 14px;
  border-radius: 10px;
  text-align: center;
}

.cost-summary-item.total {
  background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
  border: 1px solid #80cbc4;
}

.cost-summary-item.count {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border: 1px solid #a5d6a7;
}

.cost-summary-num {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #00695c;
}

.cost-summary-item.count .cost-summary-num {
  font-size: 26px;
  color: #2e7d32;
}

.cost-summary-label {
  display: block;
  font-size: 12px;
  color: #546e7a;
  margin-top: 4px;
}

.cost-preview-group {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.cost-preview-value {
  font-size: 18px;
  font-weight: 700;
  color: #00796b;
  padding: 8px 0;
}

.cost-subtitle {
  margin: 0 0 12px;
  font-size: 15px;
  color: #37474f;
  font-weight: 600;
}

@media (max-width: 900px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .calendar-stats {
    grid-template-columns: repeat(2, 1fr);
  }
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

@media (max-width: 600px) {
  .disposal-reason-grid {
    grid-template-columns: 1fr;
  }

  .disposal-dialog {
    max-height: 85vh;
  }

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
  .analysis-summary-cards {
    grid-template-columns: 1fr;
  }

  .right-tabs {
    flex-direction: column;
  }

  .trend-legend {
    flex-wrap: wrap;
    gap: 8px;
  }

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
