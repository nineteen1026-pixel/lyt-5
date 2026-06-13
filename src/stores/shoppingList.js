import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { generateId } from '@/utils/storage'

const SHOPPING_LIST_KEY = 'shopping_list'
const STORES_KEY = 'shopping_stores'
const BUDGET_KEY = 'shopping_budget'
const EXPIRING_RULE_KEY = 'expiring_rule'
const PURCHASE_HISTORY_KEY = 'purchase_history'
const AUTO_REPLENISH_KEY = 'auto_replenish'
const REPLENISH_RULES_KEY = 'replenish_rules'
const PRICE_HISTORY_KEY = 'price_history'

const DEFAULT_STORES = ['超市', '菜市场', '线上平台', '便利店']
const DEFAULT_BUDGET = 500
const DEFAULT_EXPIRING_DAYS = 3
const DEFAULT_AUTO_REPLENISH = false
const DEFAULT_REPLENISH_RULES = {
  defaultStore: '',
  quantityMultiplier: 1.5,
  autoAddToShopping: false,
  useLastPrice: true
}

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

function getStoredStores() {
  try {
    const data = localStorage.getItem(STORES_KEY)
    return data ? JSON.parse(data) : [...DEFAULT_STORES]
  } catch {
    return [...DEFAULT_STORES]
  }
}

function setStoredStores(stores) {
  try {
    localStorage.setItem(STORES_KEY, JSON.stringify(stores))
  } catch {
    console.error('Failed to save stores to localStorage')
  }
}

function getStoredBudget() {
  try {
    const data = localStorage.getItem(BUDGET_KEY)
    return data ? parseFloat(data) : DEFAULT_BUDGET
  } catch {
    return DEFAULT_BUDGET
  }
}

function setStoredBudget(budget) {
  try {
    localStorage.setItem(BUDGET_KEY, budget.toString())
  } catch {
    console.error('Failed to save budget to localStorage')
  }
}

function getStoredExpiringDays() {
  try {
    const data = localStorage.getItem(EXPIRING_RULE_KEY)
    return data ? parseInt(data, 10) : DEFAULT_EXPIRING_DAYS
  } catch {
    return DEFAULT_EXPIRING_DAYS
  }
}

function setStoredExpiringDays(days) {
  try {
    localStorage.setItem(EXPIRING_RULE_KEY, days.toString())
  } catch {
    console.error('Failed to save expiring days to localStorage')
  }
}

function getStoredPurchaseHistory() {
  try {
    const data = localStorage.getItem(PURCHASE_HISTORY_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function setStoredPurchaseHistory(history) {
  try {
    localStorage.setItem(PURCHASE_HISTORY_KEY, JSON.stringify(history))
  } catch {
    console.error('Failed to save purchase history to localStorage')
  }
}

function getStoredAutoReplenish() {
  try {
    const data = localStorage.getItem(AUTO_REPLENISH_KEY)
    return data ? JSON.parse(data) : DEFAULT_AUTO_REPLENISH
  } catch {
    return DEFAULT_AUTO_REPLENISH
  }
}

function setStoredAutoReplenish(value) {
  try {
    localStorage.setItem(AUTO_REPLENISH_KEY, JSON.stringify(value))
  } catch {
    console.error('Failed to save auto replenish setting to localStorage')
  }
}

function getStoredReplenishRules() {
  try {
    const data = localStorage.getItem(REPLENISH_RULES_KEY)
    return data ? JSON.parse(data) : { ...DEFAULT_REPLENISH_RULES }
  } catch {
    return { ...DEFAULT_REPLENISH_RULES }
  }
}

function setStoredReplenishRules(rules) {
  try {
    localStorage.setItem(REPLENISH_RULES_KEY, JSON.stringify(rules))
  } catch {
    console.error('Failed to save replenish rules to localStorage')
  }
}

function getStoredPriceHistory() {
  try {
    const data = localStorage.getItem(PRICE_HISTORY_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function setStoredPriceHistory(history) {
  try {
    localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(history))
  } catch {
    console.error('Failed to save price history to localStorage')
  }
}

export const useShoppingListStore = defineStore('shoppingList', () => {
  const list = ref(getStoredList())
  const stores = ref(getStoredStores())
  const budgetLimit = ref(getStoredBudget())
  const expiringDays = ref(getStoredExpiringDays())
  const replenishRules = ref(getStoredReplenishRules())
  const priceHistory = ref(getStoredPriceHistory())

  const pendingItems = computed(() => list.value.filter(item => !item.purchased))
  const purchasedItems = computed(() => list.value.filter(item => item.purchased))
  const pendingCount = computed(() => pendingItems.value.length)

  const pendingItemsByStore = computed(() => {
    const result = {}
    pendingItems.value.forEach(item => {
      const store = item.store || '未指定'
      if (!result[store]) {
        result[store] = []
      }
      result[store].push(item)
    })
    return result
  })

  const purchasedItemsByStore = computed(() => {
    const result = {}
    purchasedItems.value.forEach(item => {
      const store = item.store || '未指定'
      if (!result[store]) {
        result[store] = []
      }
      result[store].push(item)
    })
    return result
  })

  function getItemSubtotal(item) {
    const price = parseFloat(item.unitPrice) || 0
    const qty = parseFloat(item.quantity) || 0
    return price * qty
  }

  const pendingTotal = computed(() => {
    return pendingItems.value.reduce((sum, item) => sum + getItemSubtotal(item), 0)
  })

  const purchasedTotal = computed(() => {
    return purchasedItems.value.reduce((sum, item) => sum + getItemSubtotal(item), 0)
  })

  const totalBudget = computed(() => pendingTotal.value + purchasedTotal.value)

  const remainingBudget = computed(() => budgetLimit.value - totalBudget.value)

  const isOverBudget = computed(() => totalBudget.value > budgetLimit.value)

  const budgetUsagePercent = computed(() => {
    if (budgetLimit.value <= 0) return 0
    return Math.min(100, Math.round((totalBudget.value / budgetLimit.value) * 100))
  })

  const pendingBudgetByStore = computed(() => {
    const result = {}
    Object.keys(pendingItemsByStore.value).forEach(store => {
      result[store] = pendingItemsByStore.value[store].reduce(
        (sum, item) => sum + getItemSubtotal(item), 0
      )
    })
    return result
  })

  const purchasedBudgetByStore = computed(() => {
    const result = {}
    Object.keys(purchasedItemsByStore.value).forEach(store => {
      result[store] = purchasedItemsByStore.value[store].reduce(
        (sum, item) => sum + getItemSubtotal(item), 0
      )
    })
    return result
  })

  function addStore(storeName) {
    const name = storeName.trim()
    if (name && !stores.value.includes(name)) {
      stores.value.push(name)
    }
  }

  function removeStore(storeName) {
    const index = stores.value.indexOf(storeName)
    if (index !== -1) {
      stores.value.splice(index, 1)
    }
  }

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
      store: itemData.store || '',
      unitPrice: itemData.unitPrice || 0,
      purchased: false,
      fromExpiring: itemData.fromExpiring || false,
      fromMealPlan: itemData.fromMealPlan || false,
      fridgeItemId: itemData.fridgeItemId || null,
      linkedFridgeItemId: null,
      originalQuantity: null,
      originalExpiryDate: null,
      costRecordId: null,
      createdAt: new Date().toISOString()
    }
    list.value.push(newItem)
    if (itemData.store) {
      addStore(itemData.store)
    }
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
      const item = list.value[index]
      if (value && item.unitPrice > 0) {
        recordPriceHistory(item.name, item.unitPrice, item.store)
      }
      list.value[index] = {
        ...item,
        purchased: value,
        ...extra
      }
    }
  }

  function updateItem(id, updates) {
    const index = list.value.findIndex(item => item.id === id)
    if (index !== -1) {
      list.value[index] = { ...list.value[index], ...updates }
      if (updates.store) {
        addStore(updates.store)
      }
    }
  }

  function clearPurchased() {
    list.value = list.value.filter(item => !item.purchased)
  }

  function setBudgetLimit(budget) {
    const value = parseFloat(budget)
    if (!isNaN(value) && value >= 0) {
      budgetLimit.value = value
    }
  }

  function setExpiringDays(days) {
    const value = parseInt(days, 10)
    if (!isNaN(value) && value >= 1) {
      expiringDays.value = value
    }
  }

  function updateReplenishRules(rules) {
    replenishRules.value = { ...replenishRules.value, ...rules }
  }

  function recordPriceHistory(itemName, unitPrice, store = '') {
    if (!itemName || unitPrice <= 0) return
    const key = itemName.toLowerCase().trim()
    if (!priceHistory.value[key]) {
      priceHistory.value[key] = []
    }
    priceHistory.value[key].unshift({
      price: unitPrice,
      store,
      date: new Date().toISOString()
    })
    if (priceHistory.value[key].length > 10) {
      priceHistory.value[key] = priceHistory.value[key].slice(0, 10)
    }
  }

  function getLastPrice(itemName) {
    if (!itemName) return 0
    const key = itemName.toLowerCase().trim()
    const history = priceHistory.value[key]
    if (!history || history.length === 0) return 0
    return history[0].price
  }

  function getPriceHistory(itemName) {
    if (!itemName) return []
    const key = itemName.toLowerCase().trim()
    return priceHistory.value[key] || []
  }

  function getLastStore(itemName) {
    if (!itemName) return ''
    const key = itemName.toLowerCase().trim()
    const history = priceHistory.value[key]
    if (!history || history.length === 0) return ''
    return history[0].store || ''
  }

  function addFromExpiring(fridgeItem, extra = {}) {
    const existing = list.value.find(
      item => item.name === fridgeItem.name && !item.purchased && item.fromExpiring
    )
    if (existing) {
      return existing
    }
    
    let unitPrice = extra.unitPrice || 0
    let store = extra.store || replenishRules.value.defaultStore || ''
    
    if (replenishRules.value.useLastPrice && !unitPrice) {
      unitPrice = getLastPrice(fridgeItem.name)
    }
    
    if (!store) {
      store = getLastStore(fridgeItem.name)
    }
    
    const quantity = extra.quantity || 
      (fridgeItem.quantity * (replenishRules.value.quantityMultiplier || 1))
    
    addItem({
      name: fridgeItem.name,
      quantity: Math.max(fridgeItem.quantity, quantity),
      unit: fridgeItem.unit,
      fromExpiring: true,
      fridgeItemId: fridgeItem.id,
      store,
      unitPrice
    })
  }

  function batchAddFromExpiring(fridgeItems, extra = {}) {
    const addedItems = []
    fridgeItems.forEach(item => {
      const added = addFromExpiring(item, extra)
      if (added) addedItems.push(added)
    })
    return addedItems
  }

  function processAutoReplenish(expiringItems) {
    if (!replenishRules.value.autoAddToShopping) return []
    return batchAddFromExpiring(expiringItems)
  }

  function replaceAllItems(newItems) {
    list.value = []
    const added = []
    newItems.forEach(itemData => {
      const existing = list.value.find(
        item => item.name === itemData.name && !item.purchased
      )
      if (existing) {
        existing.quantity += itemData.quantity || 1
        added.push(existing)
      } else {
        const newItem = {
          id: generateId(),
          name: itemData.name,
          quantity: itemData.quantity || 1,
          unit: itemData.unit || '个',
          store: itemData.store || '',
          unitPrice: itemData.unitPrice || 0,
          purchased: itemData.purchased || false,
          fromExpiring: itemData.fromExpiring || false,
          fromMealPlan: itemData.fromMealPlan || false,
          fridgeItemId: itemData.fridgeItemId || null,
          linkedFridgeItemId: itemData.linkedFridgeItemId || null,
          originalQuantity: itemData.originalQuantity || null,
          originalExpiryDate: itemData.originalExpiryDate || null,
          costRecordId: itemData.costRecordId || null,
          createdAt: itemData.createdAt || new Date().toISOString()
        }
        list.value.push(newItem)
        if (itemData.store) {
          addStore(itemData.store)
        }
        added.push(newItem)
      }
    })
    return added
  }

  function addItemsBulk(newItems) {
    const added = []
    newItems.forEach(itemData => {
      const existing = list.value.find(
        item => item.name === itemData.name && !item.purchased
      )
      if (existing) {
        existing.quantity += itemData.quantity || 1
        added.push(existing)
      } else {
        const newItem = {
          id: generateId(),
          name: itemData.name,
          quantity: itemData.quantity || 1,
          unit: itemData.unit || '个',
          store: itemData.store || '',
          unitPrice: itemData.unitPrice || 0,
          purchased: itemData.purchased || false,
          fromExpiring: itemData.fromExpiring || false,
          fromMealPlan: itemData.fromMealPlan || false,
          fridgeItemId: itemData.fridgeItemId || null,
          linkedFridgeItemId: null,
          originalQuantity: null,
          originalExpiryDate: null,
          costRecordId: null,
          createdAt: itemData.createdAt || new Date().toISOString()
        }
        list.value.push(newItem)
        if (itemData.store) {
          addStore(itemData.store)
        }
        added.push(newItem)
      }
    })
    return added
  }

  watch(
    list,
    (newList) => {
      setStoredList(newList)
    },
    { deep: true }
  )

  watch(
    stores,
    (newStores) => {
      setStoredStores(newStores)
    },
    { deep: true }
  )

  watch(
    budgetLimit,
    (newBudget) => {
      setStoredBudget(newBudget)
    }
  )

  watch(
    expiringDays,
    (newDays) => {
      setStoredExpiringDays(newDays)
    }
  )

  return {
    list,
    stores,
    budgetLimit,
    expiringDays,
    replenishRules,
    priceHistory,
    pendingItems,
    purchasedItems,
    pendingCount,
    pendingItemsByStore,
    purchasedItemsByStore,
    pendingTotal,
    purchasedTotal,
    totalBudget,
    remainingBudget,
    isOverBudget,
    budgetUsagePercent,
    pendingBudgetByStore,
    purchasedBudgetByStore,
    getItemSubtotal,
    addStore,
    removeStore,
    addItem,
    removeItem,
    togglePurchased,
    setPurchased,
    updateItem,
    clearPurchased,
    addFromExpiring,
    batchAddFromExpiring,
    setBudgetLimit,
    setExpiringDays,
    updateReplenishRules,
    getLastPrice,
    getLastStore,
    getPriceHistory,
    processAutoReplenish,
    replaceAllItems,
    addItemsBulk
  }
})
