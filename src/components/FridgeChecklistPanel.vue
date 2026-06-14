<template>
  <section class="fridge-checklist-panel">
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
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFridgeStore } from '@/stores/fridge'
import { useShoppingListStore } from '@/stores/shoppingList'
import { useWasteRecordStore } from '@/stores/wasteRecord'
import { useStockOrchestrator } from '@/composables/useStockOrchestrator'
import { categories, getSubCategoryById, getNutritionTagById } from '@/utils/categories'
import { exportToJSON, exportToCSV, parseJSONFile, parseCSVFile, addDaysToDate } from '@/utils/dataIO'

const emit = defineEmits(['add-to-shopping-list'])

const fridgeStore = useFridgeStore()
const shoppingStore = useShoppingListStore()
const wasteRecordStore = useWasteRecordStore()
const orchestrator = useStockOrchestrator()

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

const expandedFilterPanels = ref({
  category: true,
  tag: true,
  expiry: false
})

const filteredItems = computed(() => fridgeStore.filteredItems)

const expiryStatusOptions = [
  { value: 'all', label: '全部', color: '#78909c' },
  { value: 'normal', label: '正常', color: '#4caf50' },
  { value: 'expiring', label: '即将过期', color: '#ff9800' },
  { value: 'expired', label: '已过期', color: '#f44336' }
]

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
</script>

<style scoped>
.fridge-checklist-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.filter-btn {
  padding: 6px 14px;
  border: 1px solid #cfd8dc;
  background: white;
  border-radius: 20px;
  font-size: 13px;
  color: #546e7a;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #00897b;
  color: #00897b;
}

.filter-btn.active {
  background: linear-gradient(135deg, #00897b, #26a69a);
  border-color: #00897b;
  color: white;
  font-weight: 500;
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

.summary-label {
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
</style>