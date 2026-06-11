import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { generateId } from '@/utils/storage'

const SHOPPING_LIST_KEY = 'shopping_list'

function getStoredList() {
  try {
    const data = localStorage.getItem(SHOPPING_LIST_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function setStoredList(list) {
  try {
    localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(list))
  } catch {
    console.error('Failed to save shopping list to localStorage')
  }
}

export const useShoppingListStore = defineStore('shoppingList', () => {
  const list = ref(getStoredList())

  const pendingItems = computed(() => list.value.filter(item => !item.purchased))
  const purchasedItems = computed(() => list.value.filter(item => item.purchased))
  const pendingCount = computed(() => pendingItems.value.length)

  function addItem(itemData) {
    const existing = list.value.find(
      item => item.name === itemData.name && !item.purchased
    )
    if (existing) {
      existing.quantity += itemData.quantity || 1
      return existing
    }
    const newItem = {
      id: generateId(),
      name: itemData.name,
      quantity: itemData.quantity || 1,
      unit: itemData.unit || '个',
      purchased: false,
      fromExpiring: itemData.fromExpiring || false,
      fromMealPlan: itemData.fromMealPlan || false,
      fridgeItemId: itemData.fridgeItemId || null,
      linkedFridgeItemId: null,
      originalQuantity: null,
      originalExpiryDate: null,
      createdAt: new Date().toISOString()
    }
    list.value.push(newItem)
    return newItem
  }

  function removeItem(id) {
    const index = list.value.findIndex(item => item.id === id)
    if (index !== -1) {
      list.value.splice(index, 1)
    }
  }

  function togglePurchased(id) {
    const item = list.value.find(item => item.id === id)
    if (item) {
      item.purchased = !item.purchased
    }
  }

  function setPurchased(id, value, extra = {}) {
    const index = list.value.findIndex(item => item.id === id)
    if (index !== -1) {
      list.value[index] = {
        ...list.value[index],
        purchased: value,
        ...extra
      }
    }
  }

  function updateItem(id, updates) {
    const index = list.value.findIndex(item => item.id === id)
    if (index !== -1) {
      list.value[index] = { ...list.value[index], ...updates }
    }
  }

  function clearPurchased() {
    list.value = list.value.filter(item => !item.purchased)
  }

  function addFromExpiring(fridgeItem) {
    addItem({
      name: fridgeItem.name,
      quantity: fridgeItem.quantity,
      unit: fridgeItem.unit,
      fromExpiring: true,
      fridgeItemId: fridgeItem.id
    })
  }

  watch(
    list,
    (newList) => {
      setStoredList(newList)
    },
    { deep: true }
  )

  return {
    list,
    pendingItems,
    purchasedItems,
    pendingCount,
    addItem,
    removeItem,
    togglePurchased,
    setPurchased,
    updateItem,
    clearPurchased,
    addFromExpiring
  }
})
