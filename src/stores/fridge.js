import { defineStore } from 'pinia'
import { ref, computed, watch, reactive } from 'vue'
import { 
  getStoredItems, setStoredItems, generateId, daysUntilExpiry, isExpiringSoon, isExpired,
  hasBeenNotified, markAsNotified, clearNotifiedItems,
  getNotifiedItems, setNotifiedItems,
  requestNotificationPermission, sendNotification
} from '@/utils/storage'
import { useWasteRecordStore } from '@/stores/wasteRecord'
import { usePurchaseCostStore } from '@/stores/purchaseCost'
import { 
  getCategoryInfo, 
  sanitizeNutritionTags, 
  categories, 
  nutritionTags, 
  getAllSubCategories,
  getSubCategoryById
} from '@/utils/categories'
import {
  getFridgeRules,
  setFridgeRules,
  getFridgeExpiringDaysForItem,
  getExpiringDaysForItem,
  updateFridgeDefaultDays,
  updateFridgeZoneRule,
  updateFridgeCategoryRule,
  resetFridgeRules,
  FRIDGE_ZONES
} from '@/utils/expiryRules'

const NOTIFICATION_ENABLED_KEY = 'notification_enabled'
const NOTIFICATION_DAYS_KEY = 'notification_days'

function getStoredNotificationEnabled() {
  try {
    const data = localStorage.getItem(NOTIFICATION_ENABLED_KEY)
    return data ? JSON.parse(data) : false
  } catch {
    return false
  }
}

function setStoredNotificationEnabled(enabled) {
  try {
    localStorage.setItem(NOTIFICATION_ENABLED_KEY, JSON.stringify(enabled))
  } catch {
    console.error('Failed to save notification setting to localStorage')
  }
}

function getStoredNotificationDays() {
  try {
    const data = localStorage.getItem(NOTIFICATION_DAYS_KEY)
    return data ? parseInt(data, 10) : 3
  } catch {
    return 3
  }
}

function setStoredNotificationDays(days) {
  try {
    localStorage.setItem(NOTIFICATION_DAYS_KEY, days.toString())
  } catch {
    console.error('Failed to save notification days to localStorage')
  }
}

export const useFridgeStore = defineStore('fridge', () => {
  const items = ref(getStoredItems())
  const expiryRules = reactive(getFridgeRules())
  const notificationEnabled = ref(getStoredNotificationEnabled())
  const notificationDays = ref(getStoredNotificationDays())
  const notificationPermission = ref(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  const zones = FRIDGE_ZONES

  const expiringDays = computed(() => expiryRules.defaultDays)

  const filterState = ref({
    searchKeyword: '',
    activeZone: '全部',
    selectedParentCategories: [],
    selectedSubCategories: [],
    selectedNutritionTags: [],
    expiryStatus: 'all',
    tagLogic: 'AND',
    categoryLogic: 'AND'
  })

  const allParentCategories = computed(() => 
    categories.map(g => ({ id: g.id, name: g.name, count: g.children.length }))
  )

  const allSubCategories = computed(() => getAllSubCategories())

  const allNutritionTags = computed(() => nutritionTags)

  const itemsByParentCategory = computed(() => {
    const result = {}
    categories.forEach(group => {
      result[group.id] = items.value.filter(item => item.parentCategoryId === group.id)
    })
    return result
  })

  const itemsBySubCategory = computed(() => {
    const result = {}
    getAllSubCategories().forEach(sub => {
      result[sub.id] = items.value.filter(item => item.categoryId === sub.id)
    })
    return result
  })

  const itemsByNutritionTag = computed(() => {
    const result = {}
    nutritionTags.forEach(tag => {
      result[tag.id] = items.value.filter(item => 
        item.nutritionTags && item.nutritionTags.includes(tag.id)
      )
    })
    return result
  })

  const parentCategoryCounts = computed(() => {
    const counts = {}
    categories.forEach(group => {
      counts[group.id] = items.value.filter(item => item.parentCategoryId === group.id).length
    })
    return counts
  })

  const subCategoryCounts = computed(() => {
    const counts = {}
    getAllSubCategories().forEach(sub => {
      counts[sub.id] = items.value.filter(item => item.categoryId === sub.id).length
    })
    return counts
  })

  const nutritionTagCounts = computed(() => {
    const counts = {}
    nutritionTags.forEach(tag => {
      counts[tag.id] = items.value.filter(item => 
        item.nutritionTags && item.nutritionTags.includes(tag.id)
      ).length
    })
    return counts
  })

  const filteredItems = computed(() => {
    const fs = filterState.value
    let result = [...items.value]

    if (fs.searchKeyword && fs.searchKeyword.trim()) {
      const keyword = fs.searchKeyword.trim().toLowerCase()
      result = result.filter(item => 
        item.name.toLowerCase().includes(keyword) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(keyword)) ||
        (item.parentCategoryName && item.parentCategoryName.toLowerCase().includes(keyword))
      )
    }

    if (fs.activeZone !== '全部') {
      result = result.filter(item => item.zone === fs.activeZone)
    }

    const hasParentCats = fs.selectedParentCategories.length > 0
    const hasSubCats = fs.selectedSubCategories.length > 0

    if (hasParentCats || hasSubCats) {
      const parentMatchIds = hasParentCats ? new Set(fs.selectedParentCategories) : null
      const subMatchIds = hasSubCats ? new Set(fs.selectedSubCategories) : null

      let parentCoveredSubIds = null
      if (hasParentCats) {
        parentCoveredSubIds = new Set()
        categories.forEach(group => {
          if (parentMatchIds.has(group.id)) {
            group.children.forEach(sub => parentCoveredSubIds.add(sub.id))
          }
        })
      }

      result = result.filter(item => {
        const matchedByParent = parentMatchIds
          ? (parentMatchIds.has(item.parentCategoryId) || parentCoveredSubIds.has(item.categoryId))
          : false
        const matchedBySub = subMatchIds
          ? subMatchIds.has(item.categoryId)
          : false

        if (hasParentCats && hasSubCats) {
          return fs.categoryLogic === 'AND'
            ? matchedByParent && matchedBySub
            : matchedByParent || matchedBySub
        }
        return matchedByParent || matchedBySub
      })
    }

    if (fs.selectedNutritionTags.length > 0) {
      if (fs.tagLogic === 'AND') {
        result = result.filter(item => 
          item.nutritionTags && 
          fs.selectedNutritionTags.every(tag => item.nutritionTags.includes(tag))
        )
      } else {
        result = result.filter(item => 
          item.nutritionTags && 
          fs.selectedNutritionTags.some(tag => item.nutritionTags.includes(tag))
        )
      }
    }

    if (fs.expiryStatus !== 'all') {
      switch (fs.expiryStatus) {
        case 'expired':
          result = result.filter(item => isExpired(item.expiryDate))
          break
        case 'expiring':
          result = result.filter(item => 
            isExpiringSoonItem(item) && !isExpired(item.expiryDate)
          )
          break
        case 'normal':
          result = result.filter(item => 
            !isExpiringSoonItem(item) && !isExpired(item.expiryDate)
          )
          break
      }
    }

    result.sort((a, b) => {
      const daysA = daysUntilExpiry(a.expiryDate)
      const daysB = daysUntilExpiry(b.expiryDate)
      return daysA - daysB
    })

    return result
  })

  const activeFilterCount = computed(() => {
    const fs = filterState.value
    let count = 0
    if (fs.searchKeyword && fs.searchKeyword.trim()) count++
    if (fs.activeZone !== '全部') count++
    if (fs.selectedParentCategories.length > 0) count++
    if (fs.selectedSubCategories.length > 0) count++
    if (fs.selectedNutritionTags.length > 0) count++
    if (fs.expiryStatus !== 'all') count++
    return count
  })

  function setFilterState(updates) {
    filterState.value = { ...filterState.value, ...updates }
  }

  function toggleParentCategory(categoryId) {
    const idx = filterState.value.selectedParentCategories.indexOf(categoryId)
    if (idx > -1) {
      filterState.value.selectedParentCategories.splice(idx, 1)
    } else {
      filterState.value.selectedParentCategories.push(categoryId)
    }
  }

  function toggleSubCategory(categoryId) {
    const idx = filterState.value.selectedSubCategories.indexOf(categoryId)
    if (idx > -1) {
      filterState.value.selectedSubCategories.splice(idx, 1)
    } else {
      filterState.value.selectedSubCategories.push(categoryId)
    }
  }

  function toggleNutritionTag(tagId) {
    const idx = filterState.value.selectedNutritionTags.indexOf(tagId)
    if (idx > -1) {
      filterState.value.selectedNutritionTags.splice(idx, 1)
    } else {
      filterState.value.selectedNutritionTags.push(tagId)
    }
  }

  function clearAllFilters() {
    filterState.value = {
      searchKeyword: '',
      activeZone: '全部',
      selectedParentCategories: [],
      selectedSubCategories: [],
      selectedNutritionTags: [],
      expiryStatus: 'all',
      tagLogic: 'AND',
      categoryLogic: 'AND'
    }
  }

  function clearCategoryFilters() {
    filterState.value.selectedParentCategories = []
    filterState.value.selectedSubCategories = []
  }

  function clearTagFilters() {
    filterState.value.selectedNutritionTags = []
  }

  const sortedItems = computed(() => {
    return [...items.value].sort((a, b) => {
      const daysA = daysUntilExpiry(a.expiryDate)
      const daysB = daysUntilExpiry(b.expiryDate)
      return daysA - daysB
    })
  })

  const expiringSoonItems = computed(() => {
    return items.value.filter(item => 
      isExpiringSoonItem(item) && !isExpired(item.expiryDate)
    )
  })

  const notifiableItems = computed(() => {
    return items.value.filter(item => {
      const daysLeft = daysUntilExpiry(item.expiryDate)
      return daysLeft >= 0 && daysLeft <= notificationDays.value && !isExpired(item.expiryDate)
    })
  })

  const unnotifiedItems = computed(() => {
    return notifiableItems.value.filter(item => 
      !hasBeenNotified(item.id, item.expiryDate)
    )
  })

  function setExpiringDays(days) {
    const value = parseInt(days, 10)
    if (!isNaN(value) && value >= 1) {
      const updatedRules = updateFridgeDefaultDays(value)
      Object.assign(expiryRules, updatedRules)
    }
  }

  function getExpiringDaysForItem(item) {
    return getFridgeExpiringDaysForItem(item)
  }

  function isExpiringSoonItem(item) {
    if (!item || !item.expiryDate) return false
    const days = getExpiringDaysForItem(item)
    return isExpiringSoon(item.expiryDate, days)
  }

  function setZoneExpiringDays(zone, days) {
    const value = parseInt(days, 10)
    if (!isNaN(value) && value >= 1) {
      const updatedRules = updateFridgeZoneRule(zone, value)
      Object.assign(expiryRules, updatedRules)
    }
  }

  function setCategoryExpiringDays(categoryId, days) {
    const value = parseInt(days, 10)
    if (!isNaN(value) && value >= 1) {
      const updatedRules = updateFridgeCategoryRule(categoryId, value)
      Object.assign(expiryRules, updatedRules)
    }
  }

  function resetExpiryRules() {
    const defaultRules = resetFridgeRules()
    Object.assign(expiryRules, defaultRules)
  }

  async function enableNotification() {
    const granted = await requestNotificationPermission()
    if (granted) {
      notificationEnabled.value = true
      notificationPermission.value = 'granted'
    }
    return granted
  }

  function disableNotification() {
    notificationEnabled.value = false
  }

  function setNotificationDays(days) {
    const value = parseInt(days, 10)
    if (!isNaN(value) && value >= 1) {
      notificationDays.value = value
    }
  }

  function checkNotificationPermission() {
    if ('Notification' in window) {
      notificationPermission.value = Notification.permission
    }
    return notificationPermission.value
  }

  function sendExpiringNotifications() {
    if (!notificationEnabled.value || notificationPermission.value !== 'granted') {
      return []
    }

    const itemsToNotify = unnotifiedItems.value
    const notified = []

    itemsToNotify.forEach(item => {
      const daysLeft = daysUntilExpiry(item.expiryDate)
      const title = daysLeft === 0 ? '⚠️ 食材今日过期' : `⏰ 食材即将过期`
      const body = daysLeft === 0 
        ? `${item.name} ${item.quantity}${item.unit} 今天就要过期了，请尽快处理！`
        : `${item.name} ${item.quantity}${item.unit} 还剩 ${daysLeft} 天过期，请注意使用。`
      
      sendNotification(title, {
        body,
        tag: `expiring-${item.id}`,
        renotify: false
      })
      
      markAsNotified(item.id, item.expiryDate)
      notified.push(item)
    })

    return notified
  }

  function resetNotificationRecord(itemId) {
    const notified = getNotifiedItems()
    if (itemId) {
      delete notified[itemId]
    } else {
      for (const key in notified) {
        delete notified[key]
      }
    }
    setNotifiedItems(notified)
  }

  const expiredItems = computed(() => {
    return items.value.filter(item => isExpired(item.expiryDate))
  })

  const itemsByZone = computed(() => {
    const result = {}
    zones.forEach(zone => {
      result[zone] = items.value.filter(item => item.zone === zone)
    })
    return result
  })

  function addItem(itemData) {
    const categoryInfo = getCategoryInfo(itemData.name)
    const rawTags = itemData.nutritionTags && itemData.nutritionTags.length > 0
      ? itemData.nutritionTags
      : categoryInfo.nutritionTags
    const newItem = {
      id: generateId(),
      name: itemData.name,
      quantity: itemData.quantity,
      unit: itemData.unit || '个',
      expiryDate: itemData.expiryDate,
      zone: itemData.zone || '冷藏',
      categoryId: itemData.categoryId || categoryInfo.categoryId,
      categoryName: itemData.categoryName || categoryInfo.categoryName,
      parentCategoryId: itemData.parentCategoryId || categoryInfo.parentCategoryId,
      parentCategoryName: itemData.parentCategoryName || categoryInfo.parentCategoryName,
      nutritionTags: sanitizeNutritionTags(rawTags),
      createdAt: new Date().toISOString()
    }
    items.value.push(newItem)
    return newItem
  }

  function updateItem(id, updates) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      const cleanedUpdates = { ...updates }
      if (cleanedUpdates.nutritionTags) {
        cleanedUpdates.nutritionTags = sanitizeNutritionTags(cleanedUpdates.nutritionTags)
      }
      items.value[index] = { ...items.value[index], ...cleanedUpdates }
    }
  }

  function removeItem(id) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
      resetNotificationRecord(id)
    }
  }

  function getItemById(id) {
    return items.value.find(item => item.id === id)
  }

  function discardItem(id, reason = 'discarded', disposalNote = '') {
    const item = items.value.find(item => item.id === id)
    if (!item) return
    const wasteStore = useWasteRecordStore()
    wasteStore.addRecord({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      zone: item.zone,
      reason,
      disposalNote,
      expiryDate: item.expiryDate,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      parentCategoryId: item.parentCategoryId,
      parentCategoryName: item.parentCategoryName,
      nutritionTags: item.nutritionTags
    })
    const purchaseCostStore = usePurchaseCostStore()
    const isNaturalConsumption = reason === 'natural_consumption'
    purchaseCostStore.addConsumptionRecord({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      type: isNaturalConsumption ? 'consumed' : 'wasted',
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      parentCategoryId: item.parentCategoryId,
      parentCategoryName: item.parentCategoryName
    })
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
      resetNotificationRecord(id)
    }
  }

  function batchUpdateZone(ids, zone) {
    if (!ids || ids.length === 0 || !zone) return 0
    let count = 0
    ids.forEach(id => {
      const index = items.value.findIndex(item => item.id === id)
      if (index !== -1) {
        items.value[index] = { ...items.value[index], zone }
        count++
      }
    })
    return count
  }

  function batchExtendExpiry(ids, days) {
    if (!ids || ids.length === 0) return 0
    const addDays = (dateStr, d) => {
      if (!dateStr) return dateStr
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      date.setDate(date.getDate() + d)
      return date.toISOString().split('T')[0]
    }
    let count = 0
    ids.forEach(id => {
      const index = items.value.findIndex(item => item.id === id)
      if (index !== -1) {
        items.value[index] = {
          ...items.value[index],
          expiryDate: addDays(items.value[index].expiryDate, days)
        }
        resetNotificationRecord(id)
        count++
      }
    })
    return count
  }

  function replaceAllItems(newItems) {
    items.value = []
    const added = []
    newItems.forEach(itemData => {
      const addedItem = addItem(itemData)
      added.push(addedItem)
    })
    return added
  }

  function addItemsBulk(newItems) {
    const added = []
    newItems.forEach(itemData => {
      const addedItem = addItem(itemData)
      added.push(addedItem)
    })
    return added
  }

  watch(
    items,
    (newItems) => {
      setStoredItems(newItems)
    },
    { deep: true }
  )

  watch(
    notificationEnabled,
    (newVal) => {
      setStoredNotificationEnabled(newVal)
    }
  )

  watch(
    notificationDays,
    (newVal) => {
      setStoredNotificationDays(newVal)
    }
  )

  function runFilterRegressionTests() {
    const testItems = [
      { name: '菠菜', quantity: 1, unit: '斤', zone: '冷藏', expiryDate: addDaysISO(5),
        categoryId: 'leafy-veg', categoryName: '叶菜类',
        parentCategoryId: 'vegetable-fruit', parentCategoryName: '蔬菜水果',
        nutritionTags: ['high-fiber', 'high-vitamin', 'iron-rich', 'low-calorie'] },
      { name: '胡萝卜', quantity: 2, unit: '斤', zone: '冷藏', expiryDate: addDaysISO(10),
        categoryId: 'root-veg', categoryName: '根茎类',
        parentCategoryId: 'vegetable-fruit', parentCategoryName: '蔬菜水果',
        nutritionTags: ['high-vitamin', 'high-fiber', 'low-calorie'] },
      { name: '西红柿', quantity: 3, unit: '个', zone: '保鲜', expiryDate: addDaysISO(2),
        categoryId: 'fruit-veg', categoryName: '茄果类',
        parentCategoryId: 'vegetable-fruit', parentCategoryName: '蔬菜水果',
        nutritionTags: ['high-vitamin', 'low-calorie', 'high-fiber'] },
      { name: '苹果', quantity: 5, unit: '个', zone: '冷藏', expiryDate: addDaysISO(14),
        categoryId: 'fruit', categoryName: '水果类',
        parentCategoryId: 'vegetable-fruit', parentCategoryName: '蔬菜水果',
        nutritionTags: ['high-fiber', 'high-vitamin', 'low-calorie'] },
      { name: '猪里脊', quantity: 1, unit: '斤', zone: '冷冻', expiryDate: addDaysISO(30),
        categoryId: 'pork', categoryName: '猪肉类',
        parentCategoryId: 'meat', parentCategoryName: '肉禽蛋类',
        nutritionTags: ['high-protein', 'low-fat', 'iron-rich'] },
      { name: '鸡蛋', quantity: 10, unit: '个', zone: '冷藏', expiryDate: addDaysISO(20),
        categoryId: 'egg', categoryName: '蛋类',
        parentCategoryId: 'meat', parentCategoryName: '肉禽蛋类',
        nutritionTags: ['high-protein', 'calcium-rich', 'iron-rich'] },
      { name: '三文鱼', quantity: 1, unit: '斤', zone: '冷冻', expiryDate: addDaysISO(60),
        categoryId: 'fish', categoryName: '鱼类',
        parentCategoryId: 'seafood', parentCategoryName: '水产海鲜',
        nutritionTags: ['high-protein', 'low-fat', 'omega3', 'high-vitamin'] },
      { name: '虾仁', quantity: 0.5, unit: '斤', zone: '冷冻', expiryDate: addDaysISO(45),
        categoryId: 'shrimp', categoryName: '虾蟹类',
        parentCategoryId: 'seafood', parentCategoryName: '水产海鲜',
        nutritionTags: ['high-protein', 'low-fat', 'calcium-rich'] },
      { name: '豆腐', quantity: 1, unit: '盒', zone: '冷藏', expiryDate: addDaysISO(4),
        categoryId: 'soy', categoryName: '豆制品',
        parentCategoryId: 'soy-dairy', parentCategoryName: '豆奶制品',
        nutritionTags: ['high-protein', 'low-fat', 'calcium-rich', 'iron-rich'] },
      { name: '牛奶', quantity: 2, unit: '盒', zone: '冷藏', expiryDate: addDaysISO(7),
        categoryId: 'dairy', categoryName: '奶制品',
        parentCategoryId: 'soy-dairy', parentCategoryName: '豆奶制品',
        nutritionTags: ['high-protein', 'calcium-rich'] },
    ]

    const backup = JSON.parse(JSON.stringify(items.value))
    const backupFilter = JSON.parse(JSON.stringify(filterState.value))
    items.value = []
    clearAllFilters()

    const results = []
    function assert(name, actualNames, expectedNames) {
      const a = [...actualNames].sort().join(',')
      const e = [...expectedNames].sort().join(',')
      const passed = a === e
      results.push({
        name,
        passed,
        expected: expectedNames,
        actual: actualNames
      })
      return passed
    }

    function namesOf(list) {
      return list.map(i => i.name)
    }

    try {
      testItems.forEach(t => addItem(t))

      // 1. 单父类筛选
      filterState.value.selectedParentCategories = ['vegetable-fruit']
      assert('S1: 单父类「蔬菜水果」',
        namesOf(filteredItems.value),
        ['菠菜', '胡萝卜', '西红柿', '苹果'])

      // 2. 多父类OR（强制）- 验证多父类不再AND导致空集
      clearCategoryFilters()
      filterState.value.selectedParentCategories = ['vegetable-fruit', 'meat']
      assert('S2: 多父类 OR（蔬菜水果 + 肉禽蛋类）',
        namesOf(filteredItems.value),
        ['菠菜', '胡萝卜', '西红柿', '苹果', '猪里脊', '鸡蛋'])

      // 3. 单子类筛选
      clearCategoryFilters()
      filterState.value.selectedSubCategories = ['leafy-veg']
      assert('S3: 单子类「叶菜类」',
        namesOf(filteredItems.value),
        ['菠菜'])

      // 4. 多子类OR（强制）
      clearCategoryFilters()
      filterState.value.selectedSubCategories = ['leafy-veg', 'egg', 'fish']
      assert('S4: 多子类 OR（叶菜类 + 蛋类 + 鱼类）',
        namesOf(filteredItems.value),
        ['菠菜', '鸡蛋', '三文鱼'])

      // 5. 父类 + 子类 OR 并集
      clearCategoryFilters()
      filterState.value.selectedParentCategories = ['seafood']
      filterState.value.selectedSubCategories = ['egg']
      filterState.value.categoryLogic = 'OR'
      assert('S5: 父类「水产」 OR 子类「蛋类」',
        namesOf(filteredItems.value),
        ['三文鱼', '虾仁', '鸡蛋'])

      // 6. 父类 + 子类 AND 交集（子类属于父类）
      clearCategoryFilters()
      filterState.value.selectedParentCategories = ['vegetable-fruit']
      filterState.value.selectedSubCategories = ['leafy-veg', 'fruit']
      filterState.value.categoryLogic = 'AND'
      assert('S6: 父类「蔬菜」 AND 子类「叶菜,水果」（交集）',
        namesOf(filteredItems.value),
        ['菠菜', '苹果'])

      // 7. 父类 + 非其子类 AND → 空集
      clearCategoryFilters()
      filterState.value.selectedParentCategories = ['meat']
      filterState.value.selectedSubCategories = ['fruit']
      filterState.value.categoryLogic = 'AND'
      assert('S7: 父类「肉禽蛋」 AND 子类「水果」→ 空集',
        namesOf(filteredItems.value),
        [])

      // 8. 关键词筛选（名称匹配）
      clearAllFilters()
      filterState.value.searchKeyword = '胡'
      assert('S8: 关键词「胡」匹配胡萝卜',
        namesOf(filteredItems.value),
        ['胡萝卜'])

      // 9. 关键词 + 父类组合联用
      clearAllFilters()
      filterState.value.searchKeyword = '肉'
      filterState.value.selectedParentCategories = ['seafood']
      assert('S9: 关键词「肉」+ 父类「水产」(三文鱼/虾仁含肉？测试虾仁与三文名称含？实际：三文鱼/虾仁 → 关键词"肉"不匹配，但"猪里脊"含肉但不属于水产 → 空集或三文鱼虾仁的检查：实际"三文鱼"不含"肉"，"虾仁"不含"肉"，"猪里脊"含但不在水产类 → 应为空)',
        namesOf(filteredItems.value),
        [])
      // 再验证正确命中：关键词 + 父类可命中
      filterState.value.searchKeyword = '三'
      assert('S9b: 关键词「三」+ 父类「水产」 → 三文鱼',
        namesOf(filteredItems.value),
        ['三文鱼'])

      // 10. 多父类 OR + 营养标签 OR
      clearAllFilters()
      filterState.value.selectedParentCategories = ['meat', 'soy-dairy']
      filterState.value.selectedNutritionTags = ['calcium-rich']
      filterState.value.tagLogic = 'OR'
      assert('S10: 父类(肉+豆奶) OR 标签(补钙) → 命中钙-rich或在这两类中的：猪里脊(肉)、鸡蛋(肉+钙)、三文鱼？no(海鲜不在meat豆奶)、虾仁(海鲜不在)、豆腐(豆奶+钙)、牛奶(豆奶+钙)、菠菜(钙但不在肉豆奶) → 猪里脊、鸡蛋、豆腐、牛奶、菠菜(有钙)',
        namesOf(filteredItems.value),
        ['猪里脊', '鸡蛋', '豆腐', '牛奶', '菠菜'])

      // 11. 父类 + 营养标签 AND（同时满足）
      clearAllFilters()
      filterState.value.selectedParentCategories = ['vegetable-fruit']
      filterState.value.selectedNutritionTags = ['iron-rich']
      filterState.value.tagLogic = 'AND'
      assert('S11: 父类「蔬菜」AND 标签「补铁」→ 菠菜(蔬菜+铁)',
        namesOf(filteredItems.value),
        ['菠菜'])

      // 12. 关键词 + 分类 + 标签 三重联用
      clearAllFilters()
      filterState.value.searchKeyword = '豆'
      filterState.value.selectedParentCategories = ['soy-dairy']
      filterState.value.selectedNutritionTags = ['high-protein']
      filterState.value.tagLogic = 'AND'
      assert('S12: 关键词「豆」+ 父类「豆奶」 + 标签「高蛋白」 AND → 豆腐(豆奶+高蛋白+豆)、牛奶(豆奶+高蛋白+无豆→不) → 豆腐',
        namesOf(filteredItems.value),
        ['豆腐'])

    } finally {
      items.value = backup
      filterState.value = backupFilter
    }

    const passedCount = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed)
    return {
      total: results.length,
      passed: passedCount,
      failed: failed.length,
      allPassed: failed.length === 0,
      cases: results,
      summary: `筛选回归测试：${passedCount}/${results.length} 通过${failed.length > 0 ? '，失败：' + failed.map(f => f.name).join('、') : ''}`
    }
  }

  function addDaysISO(days) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  return {
    items,
    zones,
    expiringDays,
    expiryRules,
    notificationEnabled,
    notificationDays,
    notificationPermission,
    filterState,
    allParentCategories,
    allSubCategories,
    allNutritionTags,
    itemsByParentCategory,
    itemsBySubCategory,
    itemsByNutritionTag,
    parentCategoryCounts,
    subCategoryCounts,
    nutritionTagCounts,
    sortedItems,
    filteredItems,
    activeFilterCount,
    expiringSoonItems,
    notifiableItems,
    unnotifiedItems,
    expiredItems,
    itemsByZone,
    setFilterState,
    toggleParentCategory,
    toggleSubCategory,
    toggleNutritionTag,
    clearAllFilters,
    clearCategoryFilters,
    clearTagFilters,
    addItem,
    updateItem,
    removeItem,
    getItemById,
    discardItem,
    setExpiringDays,
    getExpiringDaysForItem,
    isExpiringSoonItem,
    setZoneExpiringDays,
    setCategoryExpiringDays,
    resetExpiryRules,
    enableNotification,
    disableNotification,
    setNotificationDays,
    checkNotificationPermission,
    sendExpiringNotifications,
    resetNotificationRecord,
    daysUntilExpiry,
    isExpiringSoon,
    isExpired,
    batchUpdateZone,
    batchExtendExpiry,
    replaceAllItems,
    addItemsBulk,
    runFilterRegressionTests
  }
})
