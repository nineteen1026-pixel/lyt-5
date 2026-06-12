import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { getStoredItems, setStoredItems, generateId, daysUntilExpiry, isExpiringSoon, isExpired } from '@/utils/storage'
import { useWasteRecordStore } from '@/stores/wasteRecord'

const EXPIRING_DAYS_KEY = 'expiring_rule'

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

export const useFridgeStore = defineStore('fridge', () => {
  const items = ref(getStoredItems())
  const expiringDays = ref(getStoredExpiringDays())

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

  function setExpiringDays(days) {
    const value = parseInt(days, 10)
    if (!isNaN(value) && value >= 1) {
      expiringDays.value = value
    }
  }

  function isExpiringSoonItem(expiryDate) {
    return isExpiringSoon(expiryDate, expiringDays.value)
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
    const newItem = {
      id: generateId(),
      name: itemData.name,
      quantity: itemData.quantity,
      unit: itemData.unit || '个',
      expiryDate: itemData.expiryDate,
      zone: itemData.zone || '冷藏',
      createdAt: new Date().toISOString()
    }
    items.value.push(newItem)
    return newItem
  }

  function updateItem(id, updates) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value[index] = { ...items.value[index], ...updates }
    }
  }

  function removeItem(id) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
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
      expiryDate: item.expiryDate
    })
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
    }
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

  return {
    items,
    zones,
    expiringDays,
    sortedItems,
    expiringSoonItems,
    expiredItems,
    itemsByZone,
    addItem,
    updateItem,
    removeItem,
    getItemById,
    discardItem,
    setExpiringDays,
    isExpiringSoonItem,
    daysUntilExpiry,
    isExpiringSoon,
    isExpired
  }
})
