import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { 
  getStoredItems, setStoredItems, generateId, daysUntilExpiry, isExpiringSoon, isExpired,
  hasBeenNotified, markAsNotified, clearNotifiedItems,
  getNotifiedItems, setNotifiedItems,
  requestNotificationPermission, sendNotification
} from '@/utils/storage'
import { useWasteRecordStore } from '@/stores/wasteRecord'
import { getCategoryInfo, sanitizeNutritionTags } from '@/utils/categories'

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
    sortedItems,
    expiringSoonItems,
    notifiableItems,
    unnotifiedItems,
    expiredItems,
    itemsByZone,
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
