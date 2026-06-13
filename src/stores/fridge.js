import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
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

const EXPIRING_DAYS_KEY = 'expiring_rule'
const NOTIFICATION_ENABLED_KEY = 'notification_enabled'
const NOTIFICATION_DAYS_KEY = 'notification_days'

function getStoredExpiringDays() {
  try {
    const data = localStorage.getItem(EXPIRING_DAYS_KEY)
    return data ? parseInt(data, 10) : 3
  } catch {
    return 3
  }
}

function setStoredExpiringDays(days) {
  try {
    localStorage.setItem(EXPIRING_DAYS_KEY, days.toString())
  } catch {
    console.error('Failed to save expiring days to localStorage')
  }
}

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
  const expiringDays = ref(getStoredExpiringDays())
  const notificationEnabled = ref(getStoredNotificationEnabled())
  const notificationDays = ref(getStoredNotificationDays())
  const notificationPermission = ref(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  const zones = ['冷藏', '冷冻', '保鲜', '门架']

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

    if (fs.selectedParentCategories.length > 0) {
      if (fs.categoryLogic === 'AND') {
        result = result.filter(item => 
          fs.selectedParentCategories.every(cat => item.parentCategoryId === cat)
        )
      } else {
        result = result.filter(item => 
          fs.selectedParentCategories.includes(item.parentCategoryId)
        )
      }
    }

    if (fs.selectedSubCategories.length > 0) {
      if (fs.categoryLogic === 'AND') {
        result = result.filter(item => 
          fs.selectedSubCategories.every(cat => item.categoryId === cat)
        )
      } else {
        result = result.filter(item => 
          fs.selectedSubCategories.includes(item.categoryId)
        )
      }
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
            isExpiringSoon(item.expiryDate, expiringDays.value) && !isExpired(item.expiryDate)
          )
          break
        case 'normal':
          result = result.filter(item => 
            !isExpiringSoon(item.expiryDate, expiringDays.value) && !isExpired(item.expiryDate)
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
      isExpiringSoon(item.expiryDate, expiringDays.value) && !isExpired(item.expiryDate)
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
      expiringDays.value = value
    }
  }

  function isExpiringSoonItem(expiryDate) {
    return isExpiringSoon(expiryDate, expiringDays.value)
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

  function discardItem(id, reason = 'discarded') {
    const item = items.value.find(item => item.id === id)
    if (!item) return
    const wasteStore = useWasteRecordStore()
    wasteStore.addRecord({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      zone: item.zone,
      reason,
      expiryDate: item.expiryDate,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      parentCategoryId: item.parentCategoryId,
      parentCategoryName: item.parentCategoryName,
      nutritionTags: item.nutritionTags
    })
    const purchaseCostStore = usePurchaseCostStore()
    purchaseCostStore.addConsumptionRecord({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      type: 'wasted',
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
    expiringDays,
    (newDays) => {
      setStoredExpiringDays(newDays)
    }
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

  return {
    items,
    zones,
    expiringDays,
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
    isExpiringSoonItem,
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
    addItemsBulk
  }
})
