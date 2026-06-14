import { defineStore } from 'pinia'
import { ref, computed, watch, reactive } from 'vue'
import {
  generateId,
  daysUntilExpiry,
  isExpiringSoon,
  isExpired,
  hasBeenNotified,
  markAsNotified,
  getNotifiedItems,
  setNotifiedItems,
  requestNotificationPermission,
  sendNotification
} from '@/utils/storage'
import { getCategoryInfo } from '@/utils/categories'
import { useWasteRecordStore } from '@/stores/wasteRecord'
import { usePurchaseCostStore } from '@/stores/purchaseCost'
import {
  getLeftoverRules,
  getLeftoverExpiringDaysForItem,
  updateLeftoverDefaultDays,
  updateLeftoverZoneRule,
  updateLeftoverCategoryRule,
  resetLeftoverRules,
  LEFTOVER_ZONES
} from '@/utils/expiryRules'

const LEFTOVER_STORAGE_KEY = 'leftover_items'
const LEFTOVER_NOTIFICATION_ENABLED_KEY = 'leftover_notification_enabled'
const LEFTOVER_NOTIFICATION_DAYS_KEY = 'leftover_notification_days'
const LEFTOVER_NOTIFIED_KEY = 'leftover_notified_items'

function getStoredLeftoverItems() {
  try {
    const data = localStorage.getItem(LEFTOVER_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function setStoredLeftoverItems(items) {
  try {
    localStorage.setItem(LEFTOVER_STORAGE_KEY, JSON.stringify(items))
  } catch {
    console.error('Failed to save leftover items to localStorage')
  }
}

function getStoredLeftoverNotificationEnabled() {
  try {
    const data = localStorage.getItem(LEFTOVER_NOTIFICATION_ENABLED_KEY)
    return data ? JSON.parse(data) : false
  } catch {
    return false
  }
}

function setStoredLeftoverNotificationEnabled(enabled) {
  try {
    localStorage.setItem(LEFTOVER_NOTIFICATION_ENABLED_KEY, JSON.stringify(enabled))
  } catch {
    console.error('Failed to save leftover notification setting')
  }
}

function getStoredLeftoverNotificationDays() {
  try {
    const data = localStorage.getItem(LEFTOVER_NOTIFICATION_DAYS_KEY)
    return data ? parseInt(data, 10) : 1
  } catch {
    return 1
  }
}

function setStoredLeftoverNotificationDays(days) {
  try {
    localStorage.setItem(LEFTOVER_NOTIFICATION_DAYS_KEY, days.toString())
  } catch {
    console.error('Failed to save leftover notification days')
  }
}

function getLeftoverNotifiedItems() {
  try {
    const data = localStorage.getItem(LEFTOVER_NOTIFIED_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function setLeftoverNotifiedItems(items) {
  try {
    localStorage.setItem(LEFTOVER_NOTIFIED_KEY, JSON.stringify(items))
  } catch {
    console.error('Failed to save leftover notified items')
  }
}

function hasLeftoverBeenNotified(itemId, expiryDate) {
  const notified = getLeftoverNotifiedItems()
  return notified[itemId] === expiryDate
}

function markLeftoverAsNotified(itemId, expiryDate) {
  const notified = getLeftoverNotifiedItems()
  notified[itemId] = expiryDate
  setLeftoverNotifiedItems(notified)
}

function resetLeftoverNotificationRecord(itemId) {
  const notified = getLeftoverNotifiedItems()
  if (itemId) {
    delete notified[itemId]
  } else {
    for (const key in notified) {
      delete notified[key]
    }
  }
  setLeftoverNotifiedItems(notified)
}

function calcExpiryDate(openDate, storageDays) {
  if (!openDate || !storageDays) return ''
  const date = new Date(openDate)
  date.setDate(date.getDate() + parseInt(storageDays, 10))
  return date.toISOString().split('T')[0]
}

export const useLeftoverStore = defineStore('leftover', () => {
  const items = ref(getStoredLeftoverItems())
  const expiryRules = reactive(getLeftoverRules())
  const notificationEnabled = ref(getStoredLeftoverNotificationEnabled())
  const notificationDays = ref(getStoredLeftoverNotificationDays())
  const notificationPermission = ref(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  const storageZones = LEFTOVER_ZONES

  const expiringDays = computed(() => expiryRules.defaultDays)

  const defaultStorageDays = {
    '叶菜类': 1,
    '根茎类': 3,
    '茄果类': 2,
    '瓜类': 2,
    '菌菇类': 2,
    '甘蓝类': 2,
    '水果类': 3,
    '猪肉类': 2,
    '牛肉类': 2,
    '羊肉类': 2,
    '禽肉类': 2,
    '蛋类': 2,
    '肉制品': 3,
    '鱼类': 1,
    '虾蟹类': 1,
    '贝类': 1,
    '其他水产': 1,
    '豆制品': 2,
    '奶制品': 2,
    '米面类': 2,
    '面制品': 2,
    '杂粮类': 7,
    '淀粉类': 3,
    '油脂类': 30,
    '酱醋类': 30,
    '香辛料': 30,
    '糖盐类': 60,
    '干货类': 30,
    '坚果类': 30,
    '海产干货': 30,
    '速冻食品': 30,
    '饮品': 3,
    '零食': 7,
    '其他食材': 2,
    '熟菜类': 1,
    '主食类': 1,
    '汤品类': 1
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

  const expiredItems = computed(() => {
    return items.value.filter(item => isExpired(item.expiryDate))
  })

  const notifiableItems = computed(() => {
    return items.value.filter(item => {
      const daysLeft = daysUntilExpiry(item.expiryDate)
      return daysLeft >= 0 && daysLeft <= notificationDays.value && !isExpired(item.expiryDate)
    })
  })

  const unnotifiedItems = computed(() => {
    return notifiableItems.value.filter(item =>
      !hasLeftoverBeenNotified(item.id, item.expiryDate)
    )
  })

  const itemsByZone = computed(() => {
    const result = {}
    storageZones.forEach(zone => {
      result[zone] = items.value.filter(item => item.zone === zone)
    })
    return result
  })

  const itemsBySource = computed(() => {
    const result = { fridge: [], manual: [] }
    items.value.forEach(item => {
      if (item.sourceFridgeItemId) {
        result.fridge.push(item)
      } else {
        result.manual.push(item)
      }
    })
    return result
  })

  function getDefaultStorageDays(categoryName) {
    if (categoryName && defaultStorageDays[categoryName]) {
      return defaultStorageDays[categoryName]
    }
    return 2
  }

  function getExpiringDaysForItem(item) {
    return getLeftoverExpiringDaysForItem(item)
  }

  function isExpiringSoonItem(item) {
    if (!item || !item.expiryDate) return false
    const days = getExpiringDaysForItem(item)
    return isExpiringSoon(item.expiryDate, days)
  }

  function setExpiringDays(days) {
    const value = parseInt(days, 10)
    if (!isNaN(value) && value >= 1) {
      const updatedRules = updateLeftoverDefaultDays(value)
      Object.assign(expiryRules, updatedRules)
    }
  }

  function setZoneExpiringDays(zone, days) {
    const value = parseInt(days, 10)
    if (!isNaN(value) && value >= 1) {
      const updatedRules = updateLeftoverZoneRule(zone, value)
      Object.assign(expiryRules, updatedRules)
    }
  }

  function setCategoryExpiringDays(categoryId, days) {
    const value = parseInt(days, 10)
    if (!isNaN(value) && value >= 1) {
      const updatedRules = updateLeftoverCategoryRule(categoryId, value)
      Object.assign(expiryRules, updatedRules)
    }
  }

  function resetExpiryRules() {
    const defaultRules = resetLeftoverRules()
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
      const title = daysLeft === 0 ? '⚠️ 剩余菜品今日到期' : `⏰ 剩余菜品即将到期`
      const body = daysLeft === 0
        ? `${item.name} ${item.quantity}${item.unit} 今天就要到期了，请尽快食用！`
        : `${item.name} ${item.quantity}${item.unit} 还剩 ${daysLeft} 天到期，请注意食用。`

      sendNotification(title, {
        body,
        tag: `leftover-expiring-${item.id}`,
        renotify: false
      })

      markLeftoverAsNotified(item.id, item.expiryDate)
      notified.push(item)
    })

    return notified
  }

  function addItem(itemData) {
    const categoryInfo = itemData.categoryName
      ? { categoryName: itemData.categoryName, parentCategoryName: itemData.parentCategoryName || '' }
      : getCategoryInfo(itemData.name)

    const storageDaysValue = itemData.storageDays || getDefaultStorageDays(categoryInfo.categoryName)
    const openDate = itemData.openDate || new Date().toISOString().split('T')[0]
    const expiryDate = itemData.expiryDate || calcExpiryDate(openDate, storageDaysValue)

    const newItem = {
      id: generateId(),
      name: itemData.name,
      quantity: itemData.quantity,
      unit: itemData.unit || '份',
      openDate: openDate,
      storageDays: storageDaysValue,
      expiryDate: expiryDate,
      zone: itemData.zone || '冷藏',
      categoryId: itemData.categoryId || '',
      categoryName: itemData.categoryName || categoryInfo.categoryName,
      parentCategoryId: itemData.parentCategoryId || '',
      parentCategoryName: itemData.parentCategoryName || categoryInfo.parentCategoryName,
      sourceFridgeItemId: itemData.sourceFridgeItemId || null,
      notes: itemData.notes || '',
      createdAt: new Date().toISOString()
    }
    items.value.push(newItem)
    return newItem
  }

  function updateItem(id, updates) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      const cleanedUpdates = { ...updates }
      if (cleanedUpdates.openDate || cleanedUpdates.storageDays) {
        const current = items.value[index]
        const newOpenDate = cleanedUpdates.openDate || current.openDate
        const newStorageDays = cleanedUpdates.storageDays || current.storageDays
        cleanedUpdates.expiryDate = calcExpiryDate(newOpenDate, newStorageDays)
        resetLeftoverNotificationRecord(id)
      }
      items.value[index] = { ...items.value[index], ...cleanedUpdates }
    }
  }

  function removeItem(id) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
      resetLeftoverNotificationRecord(id)
    }
  }

  function discardItem(id, reason = 'spoiled') {
    const item = items.value.find(item => item.id === id)
    if (!item) return

    const wasteStore = useWasteRecordStore()
    wasteStore.addRecord({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      zone: item.zone,
      reason: reason === 'expired' ? 'expired' : 'leftover_spoiled',
      expiryDate: item.expiryDate,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      parentCategoryId: item.parentCategoryId,
      parentCategoryName: item.parentCategoryName
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
      resetLeftoverNotificationRecord(id)
    }
  }

  function consumeItem(id, consumedQuantity = null) {
    const index = items.value.findIndex(item => item.id === id)
    if (index === -1) return null

    const item = items.value[index]
    const actualConsumed = consumedQuantity === null ? item.quantity : Math.min(consumedQuantity, item.quantity)

    const purchaseCostStore = usePurchaseCostStore()
    purchaseCostStore.addConsumptionRecord({
      name: item.name,
      quantity: actualConsumed,
      unit: item.unit,
      type: 'consumed',
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      parentCategoryId: item.parentCategoryId,
      parentCategoryName: item.parentCategoryName
    })

    if (consumedQuantity === null || consumedQuantity >= item.quantity) {
      items.value.splice(index, 1)
      resetLeftoverNotificationRecord(id)
      return { ...item, fullyConsumed: true }
    } else {
      item.quantity = Math.max(0, item.quantity - consumedQuantity)
      items.value[index] = { ...item }
      return { ...item, fullyConsumed: false, remainingQuantity: item.quantity }
    }
  }

  function extendStorage(id, days) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      const item = items.value[index]
      const newStorageDays = item.storageDays + days
      const newExpiryDate = calcExpiryDate(item.openDate, newStorageDays)
      items.value[index] = {
        ...item,
        storageDays: newStorageDays,
        expiryDate: newExpiryDate
      }
      resetLeftoverNotificationRecord(id)
    }
  }

  function addFromFridgeItem(fridgeItem, consumedQuantity = null) {
    const quantity = consumedQuantity || fridgeItem.quantity
    const newItem = addItem({
      name: fridgeItem.name,
      quantity: quantity,
      unit: fridgeItem.unit,
      zone: fridgeItem.zone === '冷冻' ? '冷冻' : '冷藏',
      categoryId: fridgeItem.categoryId,
      categoryName: fridgeItem.categoryName,
      parentCategoryId: fridgeItem.parentCategoryId,
      parentCategoryName: fridgeItem.parentCategoryName,
      sourceFridgeItemId: fridgeItem.id
    })
    return newItem
  }

  watch(
    items,
    (newItems) => {
      setStoredLeftoverItems(newItems)
    },
    { deep: true }
  )

  watch(
    notificationEnabled,
    (newVal) => {
      setStoredLeftoverNotificationEnabled(newVal)
    }
  )

  watch(
    notificationDays,
    (newVal) => {
      setStoredLeftoverNotificationDays(newVal)
    }
  )

  return {
    items,
    storageZones,
    expiringDays,
    expiryRules,
    notificationEnabled,
    notificationDays,
    notificationPermission,
    sortedItems,
    expiringSoonItems,
    expiredItems,
    notifiableItems,
    unnotifiedItems,
    itemsByZone,
    itemsBySource,
    defaultStorageDays,
    getDefaultStorageDays,
    getExpiringDaysForItem,
    isExpiringSoonItem,
    setExpiringDays,
    setZoneExpiringDays,
    setCategoryExpiringDays,
    resetExpiryRules,
    enableNotification,
    disableNotification,
    setNotificationDays,
    checkNotificationPermission,
    sendExpiringNotifications,
    addItem,
    updateItem,
    removeItem,
    discardItem,
    consumeItem,
    extendStorage,
    addFromFridgeItem,
    daysUntilExpiry,
    isExpiringSoon,
    isExpired
  }
})
