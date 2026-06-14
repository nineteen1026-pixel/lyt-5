<template>
  <div class="fridge-manager">
    <header class="header">
      <h1>🧊 家庭冰箱管理</h1>
      <p class="subtitle">记录食材，合理规划，减少浪费</p>
    </header>

    <div class="todo-section card">
      <h2 class="todo-title">📋 今日待办</h2>
      <div class="todo-cards">
        <div class="todo-card expiring" @click="goToExpiringItems">
          <div class="todo-icon">⏰</div>
          <div class="todo-info">
            <span class="todo-count">{{ fridgeStore.expiringSoonItems.length }}</span>
            <span class="todo-label">快过期食材</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
        <div class="todo-card missing" @click="goToMealPlan">
          <div class="todo-icon">🍳</div>
          <div class="todo-info">
            <span class="todo-count">{{ missingIngredientRecipesCount }}</span>
            <span class="todo-label">缺料菜谱</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
        <div class="todo-card shopping" @click="goToShoppingList">
          <div class="todo-icon">🛒</div>
          <div class="todo-info">
            <span class="todo-count">{{ shoppingStore.pendingCount }}</span>
            <span class="todo-label">未买采购</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
        <div class="todo-card leftover" @click="goToLeftoverItems">
          <div class="todo-icon">🍱</div>
          <div class="todo-info">
            <span class="todo-count">{{ leftoverStore.expiringSoonItems.length }}</span>
            <span class="todo-label">临期剩菜</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
      </div>
    </div>

    <div class="main-content">
      <section class="left-section">
        <div class="add-form card">
          <h2>📝 添加食材</h2>
          <form @submit.prevent="handleAdd">
            <div class="form-group">
              <label>食材名称</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="如：西红柿、鸡蛋"
                required
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>剩余量</label>
                <input
                  v-model.number="form.quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  required
                />
              </div>
              <div class="form-group">
                <label>单位</label>
                <select v-model="form.unit">
                  <option value="个">个</option>
                  <option value="斤">斤</option>
                  <option value="克">克</option>
                  <option value="袋">袋</option>
                  <option value="盒">盒</option>
                  <option value="瓶">瓶</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>保质期</label>
                <input
                  v-model="form.expiryDate"
                  type="date"
                  required
                />
              </div>
              <div class="form-group">
                <label>分区位置</label>
                <select v-model="form.zone">
                  <option v-for="zone in fridgeStore.zones" :key="zone" :value="zone">
                    {{ zone }}
                  </option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>采购单价 (元)</label>
                <input
                  v-model.number="form.unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="选填"
                />
              </div>
              <div class="form-group cost-preview-group">
                <label>小计</label>
                <div class="cost-preview-value">
                  ¥{{ (form.quantity * (form.unitPrice || 0)).toFixed(2) }}
                </div>
              </div>
            </div>
            <div class="form-group">
              <div class="category-header">
                <label>食材品类</label>
                <label class="auto-detect-label">
                  <input type="checkbox" v-model="autoDetectCategory" />
                  <span>自动识别</span>
                </label>
              </div>
              <div v-if="form.categoryName" class="selected-category">
                已选：{{ form.parentCategoryName }} / {{ form.categoryName }}
              </div>
              <div class="category-selector">
                <div v-for="group in categories" :key="group.id" class="category-group">
                  <div class="category-group-title">{{ group.name }}</div>
                  <div class="category-items">
                    <button
                      v-for="sub in group.children"
                      :key="sub.id"
                      type="button"
                      class="category-item"
                      :class="{ active: form.categoryId === sub.id }"
                      @click="handleCategorySelect(sub.id)"
                    >
                      <span class="category-icon">{{ sub.icon }}</span>
                      <span class="category-name">{{ sub.name }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>营养标签</label>
              <div class="nutrition-tags">
                <button
                  v-for="tag in nutritionTags"
                  :key="tag.id"
                  type="button"
                  class="nutrition-tag-btn"
                  :class="{ active: form.nutritionTags.includes(tag.id) }"
                  :style="{ borderColor: tag.color, color: form.nutritionTags.includes(tag.id) ? 'white' : tag.color, background: form.nutritionTags.includes(tag.id) ? tag.color : 'transparent' }"
                  @click="toggleNutritionTag(tag.id)"
                >
                  {{ tag.name }}
                </button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary">
              ➕ 添加食材
            </button>
          </form>
        </div>

        <div class="recipe-suggestions card">
          <h2>🍳 今日菜谱建议</h2>
          <div v-if="suggestions.length === 0" class="empty-tip">
            添加食材后为您推荐菜谱
          </div>
          <div v-else class="recipe-list">
            <div
              v-for="(recipe, index) in suggestions"
              :key="index"
              class="recipe-item"
              :class="{ 'has-expiring': recipe.expiringMatchCount > 0 }"
            >
              <div class="recipe-header">
                <div class="recipe-title-row">
                  <span class="recipe-name">{{ recipe.name }}</span>
                  <span v-if="recipe.expiringMatchCount > 0" class="badge-expiring-priority">
                    ⚡ 优先推荐
                  </span>
                </div>
                <div class="recipe-meta">
                  <span class="recipe-match" v-if="recipe.matchCount">
                    可用食材: {{ recipe.matchCount }}/{{ recipe.ingredients.length }}
                  </span>
                  <span v-if="recipe.expiringMatchCount > 0" class="recipe-expiring-match">
                    消耗临期: {{ recipe.expiringMatchCount }}
                  </span>
                </div>
              </div>
              <p class="recipe-desc">{{ recipe.description }}</p>
              <div v-if="recipe.expiringMatchCount > 0" class="expiring-tip">
                💡 可消耗临期食材：
                <span v-for="(exp, i) in recipe.matchedExpiringIngredients" :key="exp.name">
                  {{ exp.name }}(剩{{ exp.daysLeft }}天){{ i < recipe.matchedExpiringIngredients.length - 1 ? '、' : '' }}
                </span>
              </div>
              <div class="recipe-ingredients">
                <span
                  v-for="ing in recipe.ingredients"
                  :key="ing.name"
                  class="ingredient-tag"
                  :class="{
                    available: hasIngredient(ing.name),
                    expiring: isExpiringIngredient(ing.name, recipe)
                  }"
                >
                  {{ ing.name }} {{ ing.quantity }}{{ ing.unit }}
                  <span v-if="isExpiringIngredient(ing.name, recipe)" class="expiring-dot">⚠</span>
                </span>
              </div>
              <div class="recipe-steps">
                <p class="steps-title">做法：</p>
                <ol>
                  <li v-for="(step, i) in recipe.steps" :key="i">{{ step }}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div class="cost-analysis card">
          <div class="cost-analysis-header">
            <h2>💰 采购成本分析</h2>
            <select v-model="costMonth" class="cost-month-select">
              <option v-for="month in costMonthOptions" :key="month" :value="month">
                {{ formatCostMonth(month) }}
              </option>
            </select>
          </div>

          <div v-if="!costMonth" class="empty-tip">
            暂无采购记录
          </div>
          <template v-else>
            <div class="cost-summary-row">
              <div class="cost-summary-item total">
                <span class="cost-summary-num">¥{{ currentCostSummary.totalCost.toFixed(2) }}</span>
                <span class="cost-summary-label">本月采购总计</span>
              </div>
              <div class="cost-summary-item count">
                <span class="cost-summary-num">{{ currentCostSummary.totalCount }}</span>
                <span class="cost-summary-label">采购笔数</span>
              </div>
            </div>

            <div v-if="currentCostSummary.categorySummary.length > 0" class="cost-category-bars">
              <h3 class="cost-subtitle">📊 品类支出分布</h3>
              <div
                v-for="cat in currentCostSummary.categorySummary"
                :key="cat.name"
                class="cost-category-row"
              >
                <span class="cost-cat-name">{{ cat.name }}</span>
                <div class="cost-cat-bar-track">
                  <div
                    class="cost-cat-bar-fill"
                    :style="{ width: cat.percent + '%' }"
                  ></div>
                </div>
                <span class="cost-cat-amount">¥{{ cat.totalCost.toFixed(0) }}</span>
                <span class="cost-cat-percent">{{ cat.percent }}%</span>
              </div>
            </div>

            <div v-if="correlationData.length > 0" class="cost-correlation">
              <h3 class="cost-subtitle">🔗 成本-消耗-浪费关联分析</h3>
              <div class="correlation-table">
                <div class="correlation-header-row">
                  <span class="corr-col">品类</span>
                  <span class="corr-col">采购额</span>
                  <span class="corr-col">消耗</span>
                  <span class="corr-col">浪费</span>
                  <span class="corr-col">浪费率</span>
                  <span class="corr-col">利用率</span>
                </div>
                <div
                  v-for="item in correlationData"
                  :key="item.category"
                  class="correlation-data-row"
                >
                  <span class="corr-col corr-name">{{ item.category }}</span>
                  <span class="corr-col">¥{{ item.totalCost.toFixed(0) }}</span>
                  <span class="corr-col">{{ item.consumedQty }}</span>
                  <span class="corr-col" :class="{ 'corr-waste-high': item.wastedQty > 0 }">
                    {{ item.wastedQty > 0 ? item.wastedQty : '-' }}
                  </span>
                  <span class="corr-col">
                    <span
                      class="waste-rate-badge"
                      :class="item.efficiencyLevel"
                    >
                      {{ item.wasteRate }}%
                    </span>
                  </span>
                  <span class="corr-col">
                    <span class="efficiency-badge" :class="item.efficiencyLevel">
                      {{ item.costEfficiency }}%
                    </span>
                  </span>
                </div>
              </div>
              <div v-if="highWasteCategories.length > 0" class="correlation-insight">
                <div class="insight-icon">💡</div>
                <div class="insight-text">
                  <strong>浪费预警：</strong>
                  <span v-for="(cat, i) in highWasteCategories" :key="cat.category">
                    {{ cat.category }}(浪费率{{ cat.wasteRate }}%){{ i < highWasteCategories.length - 1 ? '、' : '' }}
                  </span>
                  建议减少采购量或优化存储方式
                </div>
              </div>
            </div>

            <div v-if="currentCostSummary.details.length > 0" class="cost-detail-list">
              <h3 class="cost-subtitle" @click="showCostDetail = !showCostDetail" style="cursor:pointer">
                📋 采购明细 {{ showCostDetail ? '▼' : '▶' }}
              </h3>
              <div v-if="showCostDetail" class="cost-detail-items">
                <div
                  v-for="record in currentCostSummary.details"
                  :key="record.id"
                  class="cost-detail-item"
                >
                  <div class="cost-detail-left">
                    <span class="cost-detail-name">{{ record.name }}</span>
                    <span class="cost-detail-cat">{{ record.parentCategoryName }}</span>
                  </div>
                  <div class="cost-detail-right">
                    <span class="cost-detail-qty">{{ record.quantity }}{{ record.unit }}×¥{{ record.unitPrice }}</span>
                    <span class="cost-detail-total">¥{{ record.totalCost.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="shopping-list card">
          <div class="shopping-header">
            <h2>🛒 购物清单</h2>
            <div class="shopping-header-actions">
              <button
                v-if="fridgeStore.expiringSoonItems.length > 0"
                class="btn btn-small btn-batch-expiring"
                @click="handleBatchExpiring"
              >
                ⚡ 一键补货
              </button>
              <button class="btn btn-small btn-settings" @click="openSettings">
                ⚙ 设置
              </button>
            </div>
          </div>

          <div class="shopping-budget-summary" :class="{ 'over-budget': shoppingStore.isOverBudget }">
            <div class="budget-item">
              <span class="budget-label">预算上限</span>
              <span class="budget-value limit">¥{{ shoppingStore.budgetLimit.toFixed(2) }}</span>
            </div>
            <div class="budget-item">
              <span class="budget-label">已用</span>
              <span class="budget-value total" :class="{ danger: shoppingStore.isOverBudget }">
                ¥{{ shoppingStore.totalBudget.toFixed(2) }}
              </span>
            </div>
            <div class="budget-item">
              <span class="budget-label">剩余</span>
              <span class="budget-value" :class="shoppingStore.remainingBudget >= 0 ? 'remaining' : 'over'">
                {{ shoppingStore.remainingBudget >= 0 ? '' : '-' }}¥{{ Math.abs(shoppingStore.remainingBudget).toFixed(2) }}
              </span>
            </div>
          </div>

          <div class="budget-progress-bar">
            <div
              class="budget-progress-fill"
              :class="{ danger: shoppingStore.isOverBudget, warning: shoppingStore.budgetUsagePercent >= 80 && !shoppingStore.isOverBudget }"
              :style="{ width: Math.min(100, shoppingStore.budgetUsagePercent) + '%' }"
            ></div>
            <span class="budget-progress-text">{{ shoppingStore.budgetUsagePercent }}%</span>
          </div>

          <div v-if="shoppingStore.isOverBudget" class="budget-warning">
            ⚠️ 已超出预算 ¥{{ Math.abs(shoppingStore.remainingBudget).toFixed(2) }}
          </div>
          <div class="shopping-add-form">
            <div class="shopping-form-row">
              <input
                v-model="shoppingForm.name"
                type="text"
                placeholder="添加采购项"
                @keyup.enter="handleShoppingAdd"
              />
            </div>
            <div class="shopping-form-row">
              <input
                v-model.number="shoppingForm.quantity"
                type="number"
                min="1"
                step="0.1"
                class="shopping-qty-input"
                placeholder="数量"
              />
              <select v-model="shoppingForm.unit" class="shopping-unit-select">
                <option value="个">个</option>
                <option value="斤">斤</option>
                <option value="克">克</option>
                <option value="袋">袋</option>
                <option value="盒">盒</option>
                <option value="瓶">瓶</option>
              </select>
              <input
                v-model.number="shoppingForm.unitPrice"
                type="number"
                min="0"
                step="0.01"
                class="shopping-price-input"
                placeholder="单价(元)"
              />
              <select v-model="shoppingForm.store" class="shopping-store-select">
                <option value="">门店</option>
                <option v-for="s in shoppingStore.stores" :key="s" :value="s">{{ s }}</option>
              </select>
              <button class="btn btn-shopping-add" @click="handleShoppingAdd">➕</button>
            </div>
          </div>
          <div class="shopping-tabs">
            <button
              class="shopping-tab"
              :class="{ active: shoppingTab === 'pending' }"
              @click="shoppingTab = 'pending'"
            >
              待购 ({{ shoppingStore.pendingCount }})
            </button>
            <button
              class="shopping-tab"
              :class="{ active: shoppingTab === 'purchased' }"
              @click="shoppingTab = 'purchased'"
            >
              已购 ({{ shoppingStore.purchasedItems.length }})
            </button>
          </div>
          <div v-if="displayShoppingStoreKeys.length === 0" class="empty-tip">
            {{ shoppingTab === 'pending' ? '购物清单为空' : '暂无已购项' }}
          </div>
          <div v-else class="shopping-groups">
            <div
              v-for="store in displayShoppingStoreKeys"
              :key="store"
              class="shopping-store-group"
            >
              <div class="shopping-store-header">
                <span class="shopping-store-name">🏪 {{ store }}</span>
                <span class="shopping-store-budget">
                  小计: ¥{{ getStoreBudget(store).toFixed(2) }}
                  ({{ getStoreItems(store).length }}项)
                </span>
              </div>
              <div class="shopping-items">
                <div
                  v-for="item in getStoreItems(store)"
                  :key="item.id"
                  class="shopping-item"
                  :class="{ purchased: item.purchased, 'from-expiring': item.fromExpiring }"
                >
                  <div class="shopping-item-left">
                    <input
                      type="checkbox"
                      :checked="item.purchased"
                      class="shopping-checkbox"
                      @change="handleShoppingToggle(item.id)"
                    />
                    <div class="shopping-item-main">
                      <div class="shopping-item-name-row">
                        <span class="shopping-item-name">{{ item.name }}</span>
                        <span v-if="item.fromExpiring" class="badge-from-expiring">临期</span>
                        <span v-if="item.fromMealPlan" class="badge-from-mealplan">周计划</span>
                      </div>
                      <div class="shopping-item-edit-row" v-if="!item.purchased">
                        <input
                          v-model.number="item.quantity"
                          type="number"
                          min="0.1"
                          step="0.1"
                          class="shopping-inline-input qty"
                          @change="handleItemUpdate(item)"
                        />
                        <span class="shopping-inline-unit">{{ item.unit }}</span>
                        <span class="shopping-inline-sep">×</span>
                        <span class="shopping-inline-label">¥</span>
                        <input
                          v-model.number="item.unitPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          class="shopping-inline-input price"
                          @change="handleItemUpdate(item)"
                        />
                        <select
                          v-model="item.store"
                          class="shopping-inline-select"
                          @change="handleItemUpdate(item)"
                        >
                          <option value="">未指定</option>
                          <option v-for="s in shoppingStore.stores" :key="s" :value="s">{{ s }}</option>
                        </select>
                      </div>
                      <div class="shopping-item-readonly-row" v-else>
                        <span class="shopping-item-qty">{{ item.quantity }} {{ item.unit }}</span>
                        <span v-if="item.unitPrice > 0" class="shopping-item-price">
                          ¥{{ item.unitPrice }}/{{ item.unit }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="shopping-item-right">
                    <div class="shopping-item-subtotal">
                      ¥{{ shoppingStore.getItemSubtotal(item).toFixed(2) }}
                    </div>
                    <button class="btn btn-small btn-danger" @click="shoppingStore.removeItem(item.id)">✕</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="shoppingStore.purchasedItems.length > 0" class="shopping-footer">
            <button class="btn btn-small btn-clear-purchased" @click="clearPurchasedItems">
              🗑 清除已购
            </button>
          </div>
        </div>
      </section>

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
      </section>
    </div>

    <div v-if="showExpiringDialog" class="expiring-dialog-overlay" @click.self="cancelExpiringAdd">
      <div class="expiring-dialog">
        <div class="expiring-dialog-header">
          <h3>🛒 临期补货</h3>
          <button class="expiring-dialog-close" @click="cancelExpiringAdd">✕</button>
        </div>
        <div class="expiring-dialog-body" v-if="expiringDialogItem">
          <div class="expiring-dialog-info">
            <span class="expiring-dialog-name">{{ expiringDialogItem.name }}</span>
            <span class="expiring-dialog-badge">
              还剩 {{ fridgeStore.daysUntilExpiry(expiringDialogItem.expiryDate) }} 天
            </span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>补货数量</label>
              <input
                v-model.number="expiringDialogForm.quantity"
                type="number"
                min="0.1"
                step="0.1"
              />
            </div>
            <div class="form-group">
              <label>单位</label>
              <select v-model="expiringDialogForm.unit">
                <option value="个">个</option>
                <option value="斤">斤</option>
                <option value="克">克</option>
                <option value="袋">袋</option>
                <option value="盒">盒</option>
                <option value="瓶">瓶</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>单价 (元)</label>
              <input
                v-model.number="expiringDialogForm.unitPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="预估单价"
              />
            </div>
            <div class="form-group">
              <label>门店</label>
              <select v-model="expiringDialogForm.store">
                <option value="">未指定</option>
                <option v-for="s in shoppingStore.stores" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>
          <div class="expiring-dialog-summary">
            预计花费: ¥{{ (expiringDialogForm.quantity * (expiringDialogForm.unitPrice || 0)).toFixed(2) }}
          </div>
        </div>
        <div class="expiring-dialog-footer">
          <button class="btn btn-small" @click="cancelExpiringAdd">取消</button>
          <button class="btn btn-primary" @click="confirmExpiringAdd">加入购物清单</button>
        </div>
      </div>
    </div>

    <div v-if="showSettings" class="settings-dialog-overlay" @click.self="closeSettings">
      <div class="settings-dialog">
        <div class="settings-dialog-header">
          <h3>⚙ 购物清单设置</h3>
          <button class="settings-dialog-close" @click="closeSettings">✕</button>
        </div>
        <div class="settings-dialog-body">
          <div class="settings-section">
            <h4>💰 预算设置</h4>
            <div class="form-group">
              <label>预算上限 (元)</label>
              <input
                v-model.number="settingsForm.budgetLimit"
                type="number"
                min="0"
                step="10"
                @change="handleBudgetChange"
              />
            </div>
          </div>

          <div class="settings-section">
            <h4>⏰ 临期预警规则</h4>
            <div class="form-group">
              <label>临期预警天数配置</label>
              <div class="expiry-rules-entry">
                <span class="expiry-rules-summary">
                  默认 {{ fridgeStore.expiringDays }} 天
                  <span class="expiry-rules-detail">
                    （分区 {{ Object.keys(fridgeStore.expiryRules.zoneRules).length }} 项，
                    品类 {{ Object.keys(fridgeStore.expiryRules.categoryRules).length }} 项）
                  </span>
                </span>
                <button class="btn btn-small btn-primary" @click="openExpiryRulesDialog">⚙️ 详细配置</button>
              </div>
            </div>
            <div class="form-group">
              <label>默认门店</label>
              <select v-model="settingsForm.defaultStore" @change="handleDefaultStoreChange">
                <option value="">未指定</option>
                <option v-for="s in shoppingStore.stores" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>补货数量倍率</label>
              <select v-model.number="settingsForm.quantityMultiplier" @change="handleQuantityMultiplierChange">
                <option :value="1">1 倍（原量）</option>
                <option :value="1.5">1.5 倍</option>
                <option :value="2">2 倍</option>
                <option :value="2.5">2.5 倍</option>
                <option :value="3">3 倍</option>
              </select>
            </div>
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="settingsForm.autoAddToShopping"
                  @change="handleAutoAddChange"
                />
                <span>临期自动加入购物清单</span>
              </label>
            </div>
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="settingsForm.useLastPrice"
                  @change="handleUseLastPriceChange"
                />
                <span>自动填充历史单价</span>
              </label>
            </div>
            <p class="settings-desc">
              食材保质期不足设定天数时，将标记为临期并可一键补货。开启自动补货后，临期食材会自动加入购物清单。
            </p>
          </div>

          <div class="settings-section">
            <h4>🔔 临期浏览器通知</h4>
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="settingsForm.notificationEnabled"
                @change="handleNotificationEnabledChange"
              />
              <span>启用浏览器通知</span>
            </label>
            </div>
            <div v-if="settingsForm.notificationEnabled" class="notification-subsection">
              <div class="form-group">
                <label>提前通知天数</label>
                <select v-model.number="settingsForm.notificationDays" @change="handleNotificationDaysChange">
                  <option :value="1">1 天</option>
                  <option :value="2">2 天</option>
                  <option :value="3">3 天</option>
                  <option :value="5">5 天</option>
                  <option :value="7">7 天</option>
                </select>
              </div>
              <div class="form-group">
                <label>
                  通知权限状态：
                  <span :class="{
                    'status-granted': fridgeStore.notificationPermission === 'granted',
                    'status-denied': fridgeStore.notificationPermission === 'denied',
                    'status-default': fridgeStore.notificationPermission === 'default'
                  }">
                    {{ getPermissionStatusText() }}
                  </span>
                </label>
                <button
                  v-if="fridgeStore.notificationPermission !== 'granted'"
                  class="btn btn-small btn-primary"
                  type="button"
                  @click="handleRequestNotificationPermission"
                >
                  {{ fridgeStore.notificationPermission === 'denied' ? '已被拒绝，请在浏览器设置中开启' : '请求通知权限' }}
                </button>
              </div>
              <div class="form-group">
                <button
                  class="btn btn-small"
                  type="button"
                  @click="handleTestNotification"
                  :disabled="fridgeStore.notificationPermission !== 'granted'"
                >
                  发送测试通知
                </button>
              </div>
            </div>
            <p class="settings-desc">
              开启后，当食材在设定天数内即将过期时，浏览器会推送桌面通知提醒您。同一项食材只会在保质期内提醒一次，避免重复打扰。
            </p>
          </div>

          <div class="settings-section">
            <h4>🏪 门店管理</h4>
            <div class="store-manage-row">
              <input
                v-model="newStoreName"
                type="text"
                placeholder="输入新门店名称"
                @keyup.enter="addNewStore"
              />
              <button class="btn btn-small btn-primary" @click="addNewStore">添加</button>
            </div>
            <div class="store-list">
              <div
                v-for="store in shoppingStore.stores"
                :key="store"
                class="store-item"
              >
                <span class="store-name">{{ store }}</span>
                <button
                  class="btn btn-small btn-danger btn-remove-store"
                  @click="removeStore(store)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="settings-dialog-footer">
          <button class="btn btn-primary" @click="closeSettings">完成</button>
        </div>
      </div>
    </div>

    <div v-if="showExpiryRulesDialog" class="expiry-rules-dialog-overlay" @click.self="closeExpiryRulesDialog">
      <div class="expiry-rules-dialog">
        <div class="expiry-rules-dialog-header">
          <h3>⏰ 临期预警规则配置</h3>
          <button class="expiry-rules-dialog-close" @click="closeExpiryRulesDialog">✕</button>
        </div>
        <div class="expiry-rules-dialog-body">
          <div class="expiry-rules-section">
            <h4>📐 默认预警天数</h4>
            <p class="expiry-rules-hint">当食材没有匹配的分区或品类规则时，使用此默认值</p>
            <div class="expiry-rules-row">
              <label>默认天数</label>
              <select v-model.number="expiryRulesForm.defaultDays" @change="handleExpiryDefaultDaysChange">
                <option :value="1">1 天</option>
                <option :value="2">2 天</option>
                <option :value="3">3 天</option>
                <option :value="5">5 天</option>
                <option :value="7">7 天</option>
                <option :value="10">10 天</option>
                <option :value="14">14 天</option>
              </select>
            </div>
          </div>

          <div class="expiry-rules-section">
            <h4>📍 按分区配置</h4>
            <p class="expiry-rules-hint">不同冰箱分区的食材，临期预警天数可以不同（如冷冻区食材保质期较长，预警天数可更大）</p>
            <div
              v-for="zone in fridgeStore.zones"
              :key="zone"
              class="expiry-rules-row"
            >
              <label>{{ zone }}</label>
              <div class="expiry-rules-input-group">
                <input
                  type="number"
                  min="1"
                  max="365"
                  :value="fridgeStore.expiryRules.zoneRules[zone] || fridgeStore.expiryRules.defaultDays"
                  @change="handleExpiryZoneRuleChange(zone, $event)"
                />
                <span class="expiry-rules-unit">天</span>
              </div>
            </div>
          </div>

          <div class="expiry-rules-section">
            <h4>📦 按品类配置</h4>
            <p class="expiry-rules-hint">不同品类的食材，临期预警天数可以不同（如叶菜类易坏预警天数可更小）</p>
            <div
              v-for="group in categories"
              :key="group.id"
              class="expiry-rules-category-group"
            >
              <div class="expiry-rules-category-group-title">{{ group.name }}</div>
              <div
                v-for="sub in group.children"
                :key="sub.id"
                class="expiry-rules-row"
              >
                <label>
                  <span class="expiry-rules-cat-icon">{{ sub.icon }}</span>
                  {{ sub.name }}
                </label>
                <div class="expiry-rules-input-group">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    :value="fridgeStore.expiryRules.categoryRules[sub.id] || fridgeStore.expiryRules.defaultDays"
                    @change="handleExpiryCategoryRuleChange(sub.id, $event)"
                  />
                  <span class="expiry-rules-unit">天</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="expiry-rules-dialog-footer">
          <button class="btn btn-small btn-danger" @click="handleResetExpiryRules">🔄 恢复默认</button>
          <button class="btn btn-primary" @click="closeExpiryRulesDialog">完成</button>
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
import { ref, computed, watch, onMounted, onUnmounted, inject, nextTick } from 'vue'
import { useFridgeStore } from '@/stores/fridge'
import { useShoppingListStore } from '@/stores/shoppingList'
import { useMealPlanStore } from '@/stores/mealPlan'
import { usePurchaseCostStore } from '@/stores/purchaseCost'
import { useWasteRecordStore } from '@/stores/wasteRecord'
import { useLeftoverStore } from '@/stores/leftover'
import { getRecipeSuggestions } from '@/utils/recipes'
import { sendNotification } from '@/utils/storage'
import { 
  categories, 
  nutritionTags, 
  getCategoryInfo, 
  getNutritionTagById,
  getAllSubCategories,
  getSubCategoryById,
  matchIngredientByCategory,
  sanitizeNutritionTags,
  isFallbackCategory
} from '@/utils/categories'
import {
  exportToJSON,
  exportToCSV,
  parseJSONFile,
  parseCSVFile,
  addDaysToDate
} from '@/utils/dataIO'

const fridgeStore = useFridgeStore()
const shoppingStore = useShoppingListStore()
const mealPlanStore = useMealPlanStore()
const purchaseCostStore = usePurchaseCostStore()
const wasteRecordStore = useWasteRecordStore()
const leftoverStore = useLeftoverStore()
const switchView = inject('switchView')
const scrollTarget = inject('scrollTarget')

const missingIngredientRecipesCount = computed(() => {
  let count = 0
  for (const date of mealPlanStore.weekDates) {
    for (const mealTime of mealPlanStore.mealTimes) {
      const meals = mealPlanStore.getMeals(date, mealTime)
      for (const meal of meals) {
        if (meal.ingredientsDeducted) continue
        let hasMissing = false
        for (const ing of meal.ingredients) {
          const fridgeItem = fridgeStore.items.find(item =>
            matchIngredientByCategory(item.name, ing.name)
          )
          if (!fridgeItem || fridgeItem.quantity < ing.quantity) {
            hasMissing = true
            break
          }
        }
        if (hasMissing) count++
      }
    }
  }
  return count
})

const itemsListRef = ref(null)
const shoppingListRef = ref(null)

function goToExpiringItems() {
  fridgeStore.setFilterState({ activeZone: '全部', expiryStatus: 'expiring' })
  nextTick(() => {
    const itemsListEl = document.querySelector('.items-list')
    if (itemsListEl) {
      itemsListEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

function goToMealPlan() {
  if (switchView) {
    switchView('mealplan')
  }
}

function goToShoppingList() {
  shoppingTab.value = 'pending'
  nextTick(() => {
    const shoppingListEl = document.querySelector('.shopping-list')
    if (shoppingListEl) {
      shoppingListEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

function goToLeftoverItems() {
  if (switchView) {
    switchView('leftover', '#expiring')
  }
}

onMounted(() => {
  if (scrollTarget && scrollTarget.value) {
    nextTick(() => {
      const targetEl = document.querySelector(scrollTarget.value)
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      scrollTarget.value = null
    })
  }
})

const shoppingTab = ref('pending')
const shoppingForm = ref({ name: '', quantity: 1, unit: '个', store: '', unitPrice: 0 })

const expandedFilterPanels = ref({
  category: true,
  tag: true,
  expiry: false
})
const showExpiringDialog = ref(false)
const expiringDialogItem = ref(null)
const expiringDialogForm = ref({ quantity: 1, unit: '个', store: '', unitPrice: 0 })
const showSettings = ref(false)
const settingsForm = ref({ 
  budgetLimit: 0, 
  defaultStore: '',
  quantityMultiplier: 1.5,
  autoAddToShopping: false,
  useLastPrice: true,
  notificationEnabled: false,
  notificationDays: 3
})
const showExpiryRulesDialog = ref(false)
const expiryRulesForm = ref({
  defaultDays: 3
})
const newStoreName = ref('')

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

const costMonth = ref(purchaseCostStore.allCostMonths.length > 0 ? purchaseCostStore.allCostMonths[0] : getCurrentCostMonth())
const showCostDetail = ref(false)

function getCurrentCostMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

watch(() => purchaseCostStore.allCostMonths, (newMonths, oldMonths) => {
  if (newMonths.length > 0) {
    const latestMonth = newMonths[0]
    const prevLatest = (oldMonths && oldMonths.length > 0) ? oldMonths[0] : null
    const latestMonthChanged = prevLatest !== null && latestMonth !== prevLatest
    const currentInvalid = !costMonth.value || !newMonths.includes(costMonth.value)
    if (latestMonthChanged || currentInvalid) {
      costMonth.value = latestMonth
    }
  } else {
    costMonth.value = getCurrentCostMonth()
  }
}, { immediate: true })

const costMonthOptions = computed(() => {
  const months = [...purchaseCostStore.allCostMonths]
  if (months.length === 0) {
    months.push(getCurrentCostMonth())
  }
  return months
})

const currentCostSummary = computed(() => {
  if (!costMonth.value) {
    return { month: '', totalCost: 0, totalCount: 0, categorySummary: [], details: [] }
  }
  return purchaseCostStore.getMonthlyCostSummary(costMonth.value)
})

const correlationData = computed(() => {
  if (!costMonth.value) return []
  return purchaseCostStore.getCorrelationAnalysis(costMonth.value)
})

const highWasteCategories = computed(() => {
  return correlationData.value.filter(item => item.wasteRate > 15)
})

function formatCostMonth(month) {
  const [y, m] = month.split('-')
  return `${y}年${parseInt(m)}月`
}

const activeRightTab = ref('items')

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

function handleCalendarAddToShopping(item) {
  addToShoppingList(item)
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

const analysisDimension = ref('category')
const analysisMonth = ref(getCurrentCostMonth())
const analysisFilters = ref({
  category: '全部',
  zone: '全部',
  store: '全部'
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
  const categories = new Set(base.categories)
  const zones = new Set(base.zones)
  const stores = new Set(base.stores)

  wasteRecords.forEach(r => {
    if (r.parentCategoryName) categories.add(r.parentCategoryName)
    if (r.zone) zones.add(r.zone)
    if (r.store) stores.add(r.store)
  })

  return {
    categories: Array.from(categories).sort(),
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

const maxReasonQty = computed(() => {
  return Math.max(...Object.values(wasteAnalysis.value.byWasteType || {}).map(d => d?.quantity || 0), 1)
})

function getReasonBarPercent(qty) {
  if (maxReasonQty.value === 0) return 0
  return (qty / maxReasonQty.value) * 100
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

function formatDateTime(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
  const totalItems = fridgeItems.length + shoppingItems.length

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

watch(() => shoppingForm.value.name, (newName) => {
  if (newName && newName.trim()) {
    const lastPrice = shoppingStore.getLastPrice(newName)
    const lastStore = shoppingStore.getLastStore(newName)
    if (lastPrice > 0 && shoppingForm.value.unitPrice === 0) {
      shoppingForm.value.unitPrice = lastPrice
    }
    if (lastStore && !shoppingForm.value.store) {
      shoppingForm.value.store = lastStore
    }
  }
})

const autoReplenishProcessed = ref(new Set())

watch(() => fridgeStore.expiringSoonItems, (newExpiringItems) => {
  if (!shoppingStore.replenishRules.autoAddToShopping) return
  
  const newItems = newExpiringItems.filter(item => !autoReplenishProcessed.value.has(item.id))
  if (newItems.length > 0) {
    const added = shoppingStore.processAutoReplenish(newItems)
    added.forEach(item => {
      if (item.fridgeItemId) {
        autoReplenishProcessed.value.add(item.fridgeItemId)
      }
    })
  }
}, { deep: true, immediate: true })

watch(() => shoppingStore.replenishRules.autoAddToShopping, (enabled) => {
  if (enabled) {
    autoReplenishProcessed.value.clear()
    const added = shoppingStore.processAutoReplenish(fridgeStore.expiringSoonItems)
    added.forEach(item => {
      if (item.fridgeItemId) {
        autoReplenishProcessed.value.add(item.fridgeItemId)
      }
    })
  }
})

const form = ref({
  name: '',
  quantity: 1,
  unit: '个',
  expiryDate: getDefaultDate(),
  zone: '冷藏',
  categoryId: '',
  categoryName: '',
  parentCategoryId: '',
  parentCategoryName: '',
  nutritionTags: [],
  unitPrice: 0
})

const autoDetectCategory = ref(true)

watch(() => form.value.name, (newName) => {
  if (autoDetectCategory.value && newName && newName.trim()) {
    const categoryInfo = getCategoryInfo(newName.trim())
    form.value.categoryId = categoryInfo.categoryId
    form.value.categoryName = categoryInfo.categoryName
    form.value.parentCategoryId = categoryInfo.parentCategoryId
    form.value.parentCategoryName = categoryInfo.parentCategoryName
    form.value.nutritionTags = [...categoryInfo.nutritionTags]
  }
})

const suggestions = computed(() => {
  return getRecipeSuggestions(fridgeStore.items, 2)
})

const filteredItems = computed(() => fridgeStore.filteredItems)

const displayShoppingItemsByStore = computed(() => {
  return shoppingTab.value === 'pending'
    ? shoppingStore.pendingItemsByStore
    : shoppingStore.purchasedItemsByStore
})

const displayShoppingStoreKeys = computed(() => {
  return Object.keys(displayShoppingItemsByStore.value)
})

const displayBudgetByStore = computed(() => {
  return shoppingTab.value === 'pending'
    ? shoppingStore.pendingBudgetByStore
    : shoppingStore.purchasedBudgetByStore
})

function getStoreItems(store) {
  return displayShoppingItemsByStore.value[store] || []
}

function getStoreBudget(store) {
  return displayBudgetByStore.value[store] || 0
}

function handleItemUpdate(item) {
  shoppingStore.updateItem(item.id, {
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    store: item.store
  })
}

function getDefaultDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().split('T')[0]
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function handleAdd() {
  if (!form.value.name.trim()) return
  const cleanedTags = sanitizeNutritionTags(form.value.nutritionTags)
  const newItem = fridgeStore.addItem({
    name: form.value.name.trim(),
    quantity: form.value.quantity,
    unit: form.value.unit,
    expiryDate: form.value.expiryDate,
    zone: form.value.zone,
    categoryId: form.value.categoryId,
    categoryName: form.value.categoryName,
    parentCategoryId: form.value.parentCategoryId,
    parentCategoryName: form.value.parentCategoryName,
    nutritionTags: cleanedTags
  })
  if (form.value.unitPrice > 0) {
    purchaseCostStore.addCostRecord({
      name: form.value.name.trim(),
      quantity: form.value.quantity,
      unit: form.value.unit,
      unitPrice: form.value.unitPrice,
      zone: form.value.zone,
      categoryId: newItem.categoryId,
      categoryName: newItem.categoryName,
      parentCategoryId: newItem.parentCategoryId,
      parentCategoryName: newItem.parentCategoryName
    })
  }
  form.value.name = ''
  form.value.quantity = 1
  form.value.categoryId = ''
  form.value.categoryName = ''
  form.value.parentCategoryId = ''
  form.value.parentCategoryName = ''
  form.value.nutritionTags = []
  form.value.unitPrice = 0
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
    const reason = 'discarded'
    if (confirm('确定要删除这个食材吗？此操作将记录到浪费报表。')) {
      fridgeStore.discardItem(id, reason, '')
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
    fridgeStore.discardItem(disposalDialogItem.value.id, reason, disposalNote)
    cancelDisposal()
  }
}

function cancelDisposal() {
  showDisposalDialog.value = false
  disposalDialogItem.value = null
  disposalForm.value.reason = 'discarded'
  disposalForm.value.disposalNote = ''
}

function useItem(item) {
  const amount = parseFloat(prompt(`消耗多少 ${item.unit}？`, '1'))
  if (isNaN(amount) || amount <= 0) return
  const actualAmount = Math.min(amount, item.quantity)
  purchaseCostStore.addConsumptionRecord({
    name: item.name,
    quantity: actualAmount,
    unit: item.unit,
    type: 'consumed',
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    parentCategoryId: item.parentCategoryId,
    parentCategoryName: item.parentCategoryName
  })
  wasteRecordStore.addRecord({
    name: item.name,
    quantity: actualAmount,
    unit: item.unit,
    zone: item.zone,
    reason: 'natural_consumption',
    disposalNote: '正常消耗',
    expiryDate: item.expiryDate,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    parentCategoryId: item.parentCategoryId,
    parentCategoryName: item.parentCategoryName,
    nutritionTags: item.nutritionTags
  })
  const newQuantity = Math.max(0, item.quantity - actualAmount)
  if (newQuantity === 0) {
    if (confirm('用量已归零，是否删除？')) {
      fridgeStore.removeItem(item.id)
    } else {
      fridgeStore.updateItem(item.id, { quantity: newQuantity })
    }
  } else {
    fridgeStore.updateItem(item.id, { quantity: newQuantity })
  }
}

function hasIngredient(ingredientName) {
  return fridgeStore.items.some(item =>
    matchIngredientByCategory(item.name, ingredientName)
  )
}

function isExpiringIngredient(ingredientName, recipe) {
  if (!recipe.matchedExpiringIngredients) return false
  return recipe.matchedExpiringIngredients.some(
    exp => matchIngredientByCategory(exp.name, ingredientName)
  )
}

const allSubCategories = getAllSubCategories()

function handleCategorySelect(categoryId) {
  autoDetectCategory.value = false
  const subCategory = allSubCategories.find(c => c.id === categoryId)
  if (subCategory) {
    form.value.categoryId = subCategory.id
    form.value.categoryName = subCategory.name
    form.value.parentCategoryId = subCategory.parentId
    form.value.parentCategoryName = subCategory.parentName
  }
}

function toggleNutritionTag(tagId) {
  autoDetectCategory.value = false
  const index = form.value.nutritionTags.indexOf(tagId)
  if (index > -1) {
    form.value.nutritionTags.splice(index, 1)
  } else {
    form.value.nutritionTags.push(tagId)
  }
}

function getTagInfo(tagId) {
  return getNutritionTagById(tagId)
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

function getParentCategoryName(catId) {
  const group = categories.find(g => g.id === catId)
  return group ? group.name : catId
}

function getSubCategoryName(catId) {
  const sub = getSubCategoryById(catId)
  return sub ? sub.name : catId
}

function isSubCatFromSelectedParent(subCatId) {
  const sub = getSubCategoryById(subCatId)
  if (!sub) return false
  return fridgeStore.filterState.selectedParentCategories.includes(sub.parentId)
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

const showRegressionDialog = ref(false)
const regressionResult = ref(null)

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

function addToShoppingList(item) {
  expiringDialogItem.value = item
  
  const rules = shoppingStore.replenishRules
  let unitPrice = 0
  let store = rules.defaultStore || ''
  
  if (rules.useLastPrice) {
    unitPrice = shoppingStore.getLastPrice(item.name)
  }
  if (!store) {
    store = shoppingStore.getLastStore(item.name)
  }
  
  const quantity = item.quantity * (rules.quantityMultiplier || 1)
  
  expiringDialogForm.value = {
    quantity: Math.max(item.quantity, quantity),
    unit: item.unit,
    store,
    unitPrice
  }
  showExpiringDialog.value = true
}

function confirmExpiringAdd() {
  if (!expiringDialogItem.value) return
  shoppingStore.addFromExpiring(expiringDialogItem.value, {
    store: expiringDialogForm.value.store,
    unitPrice: expiringDialogForm.value.unitPrice,
    quantity: expiringDialogForm.value.quantity
  })
  showExpiringDialog.value = false
  expiringDialogItem.value = null
}

function cancelExpiringAdd() {
  showExpiringDialog.value = false
  expiringDialogItem.value = null
}

function handleShoppingAdd() {
  if (!shoppingForm.value.name.trim()) return
  shoppingStore.addItem({
    name: shoppingForm.value.name.trim(),
    quantity: shoppingForm.value.quantity,
    unit: shoppingForm.value.unit,
    store: shoppingForm.value.store,
    unitPrice: shoppingForm.value.unitPrice
  })
  shoppingForm.value.name = ''
  shoppingForm.value.quantity = 1
  shoppingForm.value.unitPrice = 0
  shoppingForm.value.store = ''
}

function handleShoppingToggle(itemId) {
  const currentItem = shoppingStore.list.find(i => i.id === itemId)
  if (!currentItem) return
  if (currentItem.purchased) {
    undoPurchased(itemId)
  } else {
    handlePurchased(itemId)
  }
}

function handlePurchased(itemId) {
  const item = shoppingStore.list.find(i => i.id === itemId)
  if (!item) return
  let linkedFridgeItemId = null
  let originalQuantity = null
  let originalExpiryDate = null
  let costRecordId = item.costRecordId

  if (item.fromExpiring && item.fridgeItemId) {
    const originalItem = fridgeStore.getItemById(item.fridgeItemId)
    if (originalItem) {
      originalQuantity = originalItem.quantity
      originalExpiryDate = originalItem.expiryDate
      fridgeStore.updateItem(item.fridgeItemId, {
        quantity: originalItem.quantity + item.quantity,
        expiryDate: getDefaultDate()
      })
      linkedFridgeItemId = item.fridgeItemId
    }
  }

  if (linkedFridgeItemId === null) {
    const newFridgeItem = fridgeStore.addItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: getDefaultDate(),
      zone: '冷藏'
    })
    linkedFridgeItemId = newFridgeItem.id
  }

  if (item.unitPrice > 0 && !costRecordId) {
    const fridgeItem = fridgeStore.getItemById(linkedFridgeItemId)
    const costRecord = purchaseCostStore.addCostRecord({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      store: item.store || '',
      zone: fridgeItem?.zone || '冷藏',
      categoryId: fridgeItem?.categoryId || '',
      categoryName: fridgeItem?.categoryName || '',
      parentCategoryId: fridgeItem?.parentCategoryId || '',
      parentCategoryName: fridgeItem?.parentCategoryName || ''
    })
    costRecordId = costRecord.id
  }

  shoppingStore.setPurchased(item.id, true, {
    linkedFridgeItemId,
    originalQuantity,
    originalExpiryDate,
    costRecordId
  })
}

function undoPurchased(itemId) {
  const item = shoppingStore.list.find(i => i.id === itemId)
  if (!item) return
  if (item.fromExpiring && item.fridgeItemId && item.originalQuantity !== null) {
    const originalItem = fridgeStore.getItemById(item.fridgeItemId)
    if (originalItem) {
      fridgeStore.updateItem(item.fridgeItemId, {
        quantity: item.originalQuantity,
        expiryDate: item.originalExpiryDate
      })
    }
  } else if (item.linkedFridgeItemId) {
    fridgeStore.removeItem(item.linkedFridgeItemId)
  }

  if (item.costRecordId) {
    purchaseCostStore.removeCostRecord(item.costRecordId)
  }

  shoppingStore.setPurchased(item.id, false, {
    linkedFridgeItemId: null,
    originalQuantity: null,
    originalExpiryDate: null,
    costRecordId: null
  })
}

function clearPurchasedItems() {
  if (confirm('确定清除所有已购项吗？')) {
    shoppingStore.purchasedItems.forEach(item => {
      if (item.costRecordId) {
        purchaseCostStore.removeCostRecord(item.costRecordId)
      }
    })
    shoppingStore.clearPurchased()
  }
}

function openSettings() {
  settingsForm.value.budgetLimit = shoppingStore.budgetLimit
  settingsForm.value.defaultStore = shoppingStore.replenishRules.defaultStore
  settingsForm.value.quantityMultiplier = shoppingStore.replenishRules.quantityMultiplier
  settingsForm.value.autoAddToShopping = shoppingStore.replenishRules.autoAddToShopping
  settingsForm.value.useLastPrice = shoppingStore.replenishRules.useLastPrice
  settingsForm.value.notificationEnabled = fridgeStore.notificationEnabled
  settingsForm.value.notificationDays = fridgeStore.notificationDays
  fridgeStore.checkNotificationPermission()
  showSettings.value = true
}

watch(() => fridgeStore.expiringDays, (newDays) => {
  if (shoppingStore.expiringDays !== newDays) {
    shoppingStore.setExpiringDays(newDays)
  }
})

watch(() => shoppingStore.expiringDays, (newDays) => {
  if (fridgeStore.expiringDays !== newDays) {
    fridgeStore.setExpiringDays(newDays)
  }
})

function closeSettings() {
  showSettings.value = false
  newStoreName.value = ''
}

function handleBudgetChange() {
  shoppingStore.setBudgetLimit(settingsForm.value.budgetLimit)
}

function openExpiryRulesDialog() {
  expiryRulesForm.value.defaultDays = fridgeStore.expiringDays
  showExpiryRulesDialog.value = true
}

function closeExpiryRulesDialog() {
  showExpiryRulesDialog.value = false
}

function handleExpiryDefaultDaysChange() {
  fridgeStore.setExpiringDays(expiryRulesForm.value.defaultDays)
  shoppingStore.setExpiringDays(expiryRulesForm.value.defaultDays)
}

function handleExpiryZoneRuleChange(zone, event) {
  const value = parseInt(event.target.value, 10)
  if (!isNaN(value) && value >= 1) {
    fridgeStore.setZoneExpiringDays(zone, value)
  }
}

function handleExpiryCategoryRuleChange(categoryId, event) {
  const value = parseInt(event.target.value, 10)
  if (!isNaN(value) && value >= 1) {
    fridgeStore.setCategoryExpiringDays(categoryId, value)
  }
}

function handleResetExpiryRules() {
  if (confirm('确定要恢复临期预警规则为默认值吗？所有自定义配置将丢失。')) {
    fridgeStore.resetExpiryRules()
    expiryRulesForm.value.defaultDays = fridgeStore.expiringDays
  }
}

function handleDefaultStoreChange() {
  shoppingStore.updateReplenishRules({
    defaultStore: settingsForm.value.defaultStore
  })
}

function handleQuantityMultiplierChange() {
  const value = parseFloat(settingsForm.value.quantityMultiplier)
  if (!isNaN(value) && value >= 1) {
    shoppingStore.updateReplenishRules({
      quantityMultiplier: value
    })
  }
}

function handleAutoAddChange() {
  shoppingStore.updateReplenishRules({
    autoAddToShopping: settingsForm.value.autoAddToShopping
  })
}

function handleUseLastPriceChange() {
  shoppingStore.updateReplenishRules({
    useLastPrice: settingsForm.value.useLastPrice
  })
}

function addNewStore() {
  const name = newStoreName.value.trim()
  if (name) {
    shoppingStore.addStore(name)
    newStoreName.value = ''
  }
}

function removeStore(storeName) {
  if (confirm(`确定要删除门店"${storeName}"吗？相关购物项的门店将变为"未指定"。`)) {
    shoppingStore.removeStore(storeName)
  }
}

function handleBatchExpiring() {
  const expiringItems = fridgeStore.expiringSoonItems
  if (expiringItems.length === 0) return

  const addedItems = shoppingStore.batchAddFromExpiring(expiringItems)
  const count = addedItems.length
  addedItems.forEach(item => {
    if (item.fridgeItemId) {
      autoReplenishProcessed.value.add(item.fridgeItemId)
    }
  })
  if (count > 0) {
    alert(`已将 ${count} 种临期食材加入购物清单！`)
  } else {
    alert('临期食材已全部在购物清单中。')
  }
}

function getPermissionStatusText() {
  switch (fridgeStore.notificationPermission) {
    case 'granted':
      return '已允许'
    case 'denied':
      return '已拒绝'
    case 'default':
      return '未设置'
    default:
      return '不支持'
  }
}

async function handleRequestNotificationPermission() {
  const granted = await fridgeStore.enableNotification()
  if (granted) {
    settingsForm.value.notificationEnabled = true
    fridgeStore.checkNotificationPermission()
  }
}

function handleNotificationEnabledChange() {
  if (settingsForm.value.notificationEnabled) {
    fridgeStore.enableNotification()
  } else {
    fridgeStore.disableNotification()
  }
}

function handleNotificationDaysChange() {
  fridgeStore.setNotificationDays(settingsForm.value.notificationDays)
}

function handleTestNotification() {
  if (fridgeStore.notificationPermission !== 'granted') {
    alert('请先允许浏览器通知权限')
    return
  }
  sendNotification('🧊 冰箱管理 - 测试通知', {
    body: '浏览器通知功能已正常启用！当有食材即将过期时，您将收到提醒。',
    tag: 'test-notification'
  })
}

let notificationCheckTimer = null

function startNotificationCheck() {
  if (notificationCheckTimer) {
    clearInterval(notificationCheckTimer)
  }
  
  fridgeStore.sendExpiringNotifications()
  
  notificationCheckTimer = setInterval(() => {
    fridgeStore.sendExpiringNotifications()
  }, 60 * 1000)
}

function stopNotificationCheck() {
  if (notificationCheckTimer) {
    clearInterval(notificationCheckTimer)
    notificationCheckTimer = null
  }
}

onMounted(() => {
  fridgeStore.checkNotificationPermission()
  startNotificationCheck()
})

onUnmounted(() => {
  stopNotificationCheck()
})

watch(() => fridgeStore.notificationEnabled, (enabled) => {
  if (enabled) {
    startNotificationCheck()
  } else {
    stopNotificationCheck()
  }
})
</script>

<style scoped>
.fridge-manager {
  min-height: 100vh;
  background: linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 100%);
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 32px;
  color: #00796b;
}

.subtitle {
  margin: 8px 0 0;
  color: #546e7a;
}

.todo-section {
  max-width: 1200px;
  margin: 0 auto 20px;
}

.todo-title {
  margin: 0 0 16px;
  font-size: 18px;
  color: #37474f;
}

.todo-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .todo-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

.todo-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.todo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.todo-card.expiring {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-color: #ffcc80;
}

.todo-card.expiring:hover {
  border-color: #ff9800;
}

.todo-card.missing {
  background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
  border-color: #f48fb1;
}

.todo-card.missing:hover {
  border-color: #e91e63;
}

.todo-card.shopping {
  background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
  border-color: #80cbc4;
}

.todo-card.shopping:hover {
  border-color: #00897b;
}

.todo-card.leftover {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-color: #ffcc80;
}

.todo-card.leftover:hover {
  border-color: #ff9800;
}

.todo-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.todo-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.todo-count {
  font-size: 28px;
  font-weight: 700;
  color: #37474f;
}

.todo-label {
  font-size: 14px;
  color: #546e7a;
  font-weight: 500;
}

.todo-arrow {
  font-size: 20px;
  color: #90a4ae;
  font-weight: 600;
  transition: transform 0.2s;
}

.todo-card:hover .todo-arrow {
  transform: translateX(4px);
  color: #546e7a;
}

@media (max-width: 768px) {
  .todo-cards {
    grid-template-columns: 1fr;
  }
}

.main-content {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
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

.left-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.add-form .form-group {
  margin-bottom: 12px;
}

.add-form .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.add-form label {
  display: block;
  font-size: 14px;
  color: #546e7a;
  margin-bottom: 6px;
}

.add-form input,
.add-form select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.add-form input:focus,
.add-form select:focus {
  outline: none;
  border-color: #00897b;
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

.recipe-suggestions .recipe-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recipe-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
  transition: all 0.2s;
}

.recipe-item.has-expiring {
  border-left-color: #f44336;
  background: linear-gradient(135deg, #fff5f5 0%, #f5f7fa 100%);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.1);
}

.recipe-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.recipe-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recipe-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-expiring-priority {
  font-size: 11px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #ff7043, #f44336);
  color: white;
  border-radius: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.recipe-expiring-match {
  font-size: 12px;
  color: #c62828;
  background: #ffebee;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.expiring-tip {
  font-size: 12px;
  color: #bf360c;
  background: #fbe9e7;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 8px;
  line-height: 1.5;
}

.recipe-name {
  font-weight: 600;
  color: #e65100;
  font-size: 16px;
}

.recipe-match {
  font-size: 12px;
  color: #f57c00;
  background: #fff3e0;
  padding: 2px 8px;
  border-radius: 10px;
}

.recipe-desc {
  margin: 0 0 8px;
  font-size: 13px;
  color: #607d8b;
}

.recipe-ingredients {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.ingredient-tag {
  font-size: 12px;
  padding: 2px 8px;
  background: #e0e0e0;
  color: #757575;
  border-radius: 10px;
}

.ingredient-tag.available {
  background: #c8e6c9;
  color: #2e7d32;
}

.ingredient-tag.expiring {
  background: linear-gradient(135deg, #ffccbc, #ffab91);
  color: #bf360c;
  font-weight: 500;
  position: relative;
}

.expiring-dot {
  margin-left: 2px;
  font-size: 10px;
}

.recipe-steps {
  font-size: 13px;
  color: #546e7a;
}

.steps-title {
  margin: 0 0 4px;
  font-weight: 500;
}

.recipe-steps ol {
  margin: 0;
  padding-left: 20px;
}

.recipe-steps li {
  margin-bottom: 2px;
}

.right-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 16px;
  border: 1px solid #cfd8dc;
  background: white;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  color: #546e7a;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #00897b;
  color: #00897b;
}

.filter-btn.active {
  background: #00897b;
  color: white;
  border-color: #00897b;
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

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 40px 20px;
  font-size: 14px;
}

.btn-shopping {
  background: #e0f2f1;
  color: #00695c;
}

.btn-shopping:hover {
  background: #b2dfdb;
}

.shopping-list .shopping-add-form {
  margin-bottom: 12px;
}

.shopping-form-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.shopping-form-row input[type="text"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
}

.shopping-form-row input[type="text"]:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-qty-input {
  width: 60px;
  padding: 8px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.shopping-qty-input:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-unit-select {
  width: 56px;
  padding: 8px 4px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
}

.shopping-unit-select:focus {
  outline: none;
  border-color: #00897b;
}

.btn-shopping-add {
  padding: 8px 14px;
  background: linear-gradient(135deg, #00897b, #26a69a);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-shopping-add:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 137, 123, 0.3);
}

.shopping-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-bottom: 2px solid #eceff1;
}

.shopping-tab {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: none;
  font-size: 14px;
  color: #78909c;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.shopping-tab:hover {
  color: #00897b;
}

.shopping-tab.active {
  color: #00897b;
  border-bottom-color: #00897b;
  font-weight: 600;
}

.shopping-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.shopping-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #eceff1;
  transition: all 0.2s;
}

.shopping-item:hover {
  background: #eef5f4;
}

.shopping-item.purchased {
  background: #e8f5e9;
  border-color: #c8e6c9;
}

.shopping-item.purchased .shopping-item-name {
  text-decoration: line-through;
  color: #81c784;
}

.shopping-item.from-expiring {
  border-left: 3px solid #ff9800;
}

.shopping-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shopping-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #00897b;
  cursor: pointer;
}

.shopping-item-name {
  font-size: 14px;
  color: #263238;
  font-weight: 500;
}

.badge-from-expiring {
  font-size: 11px;
  padding: 1px 6px;
  background: #fff3e0;
  color: #e65100;
  border-radius: 8px;
  font-weight: 500;
}

.badge-from-mealplan {
  font-size: 11px;
  padding: 1px 6px;
  background: #f3e5f5;
  color: #7b1fa2;
  border-radius: 8px;
  font-weight: 500;
}

.shopping-item-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shopping-item-qty {
  font-size: 13px;
  color: #78909c;
}

.btn-clear-purchased {
  background: #eceff1;
  color: #78909c;
}

.btn-clear-purchased:hover {
  background: #cfd8dc;
  color: #455a64;
}

.shopping-footer {
  margin-top: 12px;
  text-align: right;
}

.shopping-budget-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #f1f8e9 0%, #e8f5e9 100%);
  border-radius: 10px;
  border: 1px solid #c5e1a5;
}

.budget-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.budget-label {
  font-size: 12px;
  color: #689f38;
}

.budget-value {
  font-size: 18px;
  font-weight: 700;
}

.budget-value.total {
  color: #2e7d32;
}

.budget-value.pending {
  color: #ef6c00;
}

.budget-value.purchased {
  color: #1976d2;
}

.shopping-price-input {
  width: 80px;
  padding: 8px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
}

.shopping-price-input:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-store-select {
  width: 80px;
  padding: 8px 4px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
}

.shopping-store-select:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 480px;
  overflow-y: auto;
}

.shopping-store-group {
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.shopping-store-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-bottom: 1px solid #90caf9;
}

.shopping-store-name {
  font-weight: 600;
  font-size: 14px;
  color: #1565c0;
}

.shopping-store-budget {
  font-size: 12px;
  color: #1976d2;
  font-weight: 500;
}

.shopping-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
}

.shopping-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #eceff1;
  transition: all 0.2s;
}

.shopping-item:hover {
  background: #eef5f4;
}

.shopping-item.purchased {
  background: #e8f5e9;
  border-color: #c8e6c9;
}

.shopping-item.purchased .shopping-item-name {
  text-decoration: line-through;
  color: #81c784;
}

.shopping-item.from-expiring {
  border-left: 3px solid #ff9800;
}

.shopping-item-left {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.shopping-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #00897b;
  cursor: pointer;
  margin-top: 2px;
}

.shopping-item-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.shopping-item-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.shopping-item-name {
  font-size: 14px;
  color: #263238;
  font-weight: 500;
}

.shopping-item-edit-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.shopping-inline-input {
  padding: 4px 6px;
  border: 1px solid #cfd8dc;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
  width: 50px;
}

.shopping-inline-input.qty {
  width: 50px;
}

.shopping-inline-input.price {
  width: 60px;
}

.shopping-inline-input:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-inline-unit {
  font-size: 12px;
  color: #78909c;
}

.shopping-inline-sep {
  font-size: 12px;
  color: #90a4ae;
}

.shopping-inline-label {
  font-size: 12px;
  color: #78909c;
}

.shopping-inline-select {
  padding: 4px 4px;
  border: 1px solid #cfd8dc;
  border-radius: 4px;
  font-size: 12px;
  max-width: 80px;
}

.shopping-inline-select:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-item-readonly-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shopping-item-qty {
  font-size: 13px;
  color: #78909c;
}

.shopping-item-price {
  font-size: 12px;
  color: #00897b;
  background: #e0f2f1;
  padding: 2px 6px;
  border-radius: 4px;
}

.shopping-item-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.shopping-item-subtotal {
  font-size: 14px;
  font-weight: 600;
  color: #00796b;
  white-space: nowrap;
}

.expiring-dialog-overlay {
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

.expiring-dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.expiring-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 1px solid #ffcc80;
}

.expiring-dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #e65100;
}

.expiring-dialog-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #e65100;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.expiring-dialog-close:hover {
  background: rgba(230, 81, 0, 0.1);
}

.expiring-dialog-body {
  padding: 20px;
}

.expiring-dialog-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #fff8e1;
  border-radius: 8px;
  border-left: 3px solid #ff9800;
}

.expiring-dialog-name {
  font-size: 16px;
  font-weight: 600;
  color: #e65100;
}

.expiring-dialog-badge {
  font-size: 12px;
  padding: 2px 10px;
  background: linear-gradient(135deg, #ff7043, #f44336);
  color: white;
  border-radius: 10px;
  font-weight: 600;
}

.expiring-dialog-summary {
  margin-top: 12px;
  padding: 10px 14px;
  background: #e8f5e9;
  border-radius: 8px;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: #2e7d32;
}

.expiring-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
}

.expiring-dialog-footer .btn-primary {
  width: auto;
  padding: 8px 20px;
}

.checkbox-group {
  margin-bottom: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #546e7a;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #00897b;
  cursor: pointer;
}

.settings-desc {
  font-size: 12px;
  color: #90a4ae;
  margin: 8px 0 0;
  line-height: 1.5;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.category-header label {
  margin-bottom: 0;
}

.auto-detect-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #546e7a;
  cursor: pointer;
}

.auto-detect-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #00897b;
}

.selected-category {
  font-size: 13px;
  color: #00897b;
  background: #e0f2f1;
  padding: 4px 10px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.category-selector {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
}

.category-group {
  margin-bottom: 10px;
}

.category-group:last-child {
  margin-bottom: 0;
}

.category-group-title {
  font-size: 12px;
  font-weight: 600;
  color: #546e7a;
  margin-bottom: 6px;
}

.category-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #cfd8dc;
  background: white;
  border-radius: 16px;
  font-size: 12px;
  color: #546e7a;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  border-color: #00897b;
  color: #00897b;
}

.category-item.active {
  background: #00897b;
  color: white;
  border-color: #00897b;
}

.category-icon {
  font-size: 14px;
}

.nutrition-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.nutrition-tag-btn {
  padding: 4px 10px;
  border: 1.5px solid;
  background: transparent;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.nutrition-tag-btn:hover {
  transform: translateY(-1px);
}

.nutrition-tag-btn.active {
  color: white;
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

.notification-subsection {
  margin-top: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #00897b;
}

.notification-subsection .form-group {
  margin-bottom: 14px;
}

.notification-subsection .form-group:last-child {
  margin-bottom: 0;
}

.status-granted {
  color: #2e7d32;
  font-weight: 600;
}

.status-denied {
  color: #c62828;
  font-weight: 600;
}

.status-default {
  color: #f57c00;
  font-weight: 600;
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

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .shopping-form-row {
    flex-wrap: wrap;
  }

  .shopping-price-input,
  .shopping-store-select {
    width: calc(50% - 4px);
  }
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

.cost-analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.cost-analysis-header h2 {
  margin: 0;
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

.cost-subtitle {
  margin: 0 0 12px;
  font-size: 15px;
  color: #37474f;
  font-weight: 600;
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

.waste-rate-badge,
.efficiency-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.waste-rate-badge.good,
.efficiency-badge.good {
  background: #e8f5e9;
  color: #2e7d32;
}

.waste-rate-badge.fair,
.efficiency-badge.fair {
  background: #fff3e0;
  color: #e65100;
}

.waste-rate-badge.poor,
.efficiency-badge.poor {
  background: #ffebee;
  color: #c62828;
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

.reason-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.reason-label {
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

@media (max-width: 600px) {
  .disposal-reason-grid {
    grid-template-columns: 1fr;
  }
  
  .disposal-dialog {
    max-height: 85vh;
  }
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
  border-radius: 3px;
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

.expiry-rules-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #fff8e1, #fff3e0);
  border-radius: 10px;
  border: 1px solid #ffe0b2;
}

.expiry-rules-summary {
  font-size: 15px;
  font-weight: 600;
  color: #e65100;
}

.expiry-rules-detail {
  font-size: 12px;
  font-weight: 400;
  color: #bf360c;
  opacity: 0.7;
}

.expiry-rules-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.expiry-rules-dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 640px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.expiry-rules-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 1px solid #ffcc80;
}

.expiry-rules-dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #e65100;
}

.expiry-rules-dialog-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #e65100;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.expiry-rules-dialog-close:hover {
  background: rgba(230, 81, 0, 0.1);
}

.expiry-rules-dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.expiry-rules-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.expiry-rules-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.expiry-rules-section h4 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #37474f;
}

.expiry-rules-hint {
  margin: 0 0 14px;
  font-size: 12px;
  color: #90a4ae;
  line-height: 1.5;
}

.expiry-rules-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.expiry-rules-row:last-child {
  border-bottom: none;
}

.expiry-rules-row label {
  font-size: 14px;
  color: #546e7a;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.expiry-rules-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.expiry-rules-input-group input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.expiry-rules-input-group input:focus {
  border-color: #00897b;
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 137, 123, 0.15);
}

.expiry-rules-unit {
  font-size: 13px;
  color: #90a4ae;
}

.expiry-rules-cat-icon {
  font-size: 14px;
}

.expiry-rules-category-group {
  margin-bottom: 12px;
}

.expiry-rules-category-group:last-child {
  margin-bottom: 0;
}

.expiry-rules-category-group-title {
  font-size: 13px;
  font-weight: 600;
  color: #00796b;
  padding: 6px 10px;
  margin-bottom: 4px;
  background: #e0f2f1;
  border-radius: 6px;
}

.expiry-rules-dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
}
</style>
