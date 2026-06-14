import { useFridgeStore } from '@/stores/fridge'
import { useLeftoverStore } from '@/stores/leftover'
import { usePurchaseCostStore } from '@/stores/purchaseCost'
import { useWasteRecordStore } from '@/stores/wasteRecord'
import { useShoppingListStore } from '@/stores/shoppingList'

export function useStockOrchestrator() {
  const fridgeStore = useFridgeStore()
  const leftoverStore = useLeftoverStore()
  const purchaseCostStore = usePurchaseCostStore()
  const wasteRecordStore = useWasteRecordStore()
  const shoppingListStore = useShoppingListStore()

  function stockInToFridge(itemData) {
    if (itemData.unitPrice > 0) {
      purchaseCostStore.addCostRecord(itemData)
    }
    return fridgeStore.addItem(itemData)
  }

  function stockInToLeftover(itemData) {
    if (itemData.unitPrice > 0) {
      purchaseCostStore.addCostRecord(itemData)
    }
    return leftoverStore.addItem(itemData)
  }

  function consumeFromFridge(itemId) {
    fridgeStore.discardItem(itemId, 'natural_consumption')
  }

  function consumeFromLeftover(itemId, consumedQuantity) {
    return leftoverStore.consumeItem(itemId, consumedQuantity)
  }

  function discardFromFridge(itemId, reason, disposalNote) {
    fridgeStore.discardItem(itemId, reason, disposalNote)
  }

  function discardFromLeftover(itemId, reason) {
    leftoverStore.discardItem(itemId, reason)
  }

  function moveFridgeItemToLeftover(fridgeItemId, consumedQuantity) {
    const fridgeItem = fridgeStore.getItemById(fridgeItemId)
    if (!fridgeItem) return null
    const newLeftoverItem = leftoverStore.addFromFridgeItem(fridgeItem, consumedQuantity)
    fridgeStore.removeItem(fridgeItemId)
    return newLeftoverItem
  }

  function addExpiringToShoppingList(fridgeItems, extra) {
    return shoppingListStore.batchAddFromExpiring(fridgeItems, extra)
  }

  function processAutoReplenish(expiringItems) {
    return shoppingListStore.processAutoReplenish(expiringItems)
  }

  function useItemFromFridge(item, amount) {
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

  function getDefaultDate() {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0]
  }

  function markShoppingPurchased(shoppingItemId) {
    const item = shoppingListStore.list.find(i => i.id === shoppingItemId)
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

    shoppingListStore.setPurchased(item.id, true, {
      linkedFridgeItemId,
      originalQuantity,
      originalExpiryDate,
      costRecordId
    })
  }

  function undoShoppingPurchased(shoppingItemId) {
    const item = shoppingListStore.list.find(i => i.id === shoppingItemId)
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

    shoppingListStore.setPurchased(item.id, false, {
      linkedFridgeItemId: null,
      originalQuantity: null,
      originalExpiryDate: null,
      costRecordId: null
    })
  }

  function clearPurchasedFromShopping() {
    shoppingListStore.purchasedItems.forEach(item => {
      if (item.costRecordId) {
        purchaseCostStore.removeCostRecord(item.costRecordId)
      }
    })
    shoppingListStore.clearPurchased()
  }

  function handleShoppingToggle(shoppingItemId) {
    const currentItem = shoppingListStore.list.find(i => i.id === shoppingItemId)
    if (!currentItem) return
    if (currentItem.purchased) {
      undoShoppingPurchased(shoppingItemId)
    } else {
      markShoppingPurchased(shoppingItemId)
    }
  }

  return {
    stockInToFridge,
    stockInToLeftover,
    consumeFromFridge,
    consumeFromLeftover,
    discardFromFridge,
    discardFromLeftover,
    moveFridgeItemToLeftover,
    addExpiringToShoppingList,
    processAutoReplenish,
    useItemFromFridge,
    markShoppingPurchased,
    undoShoppingPurchased,
    clearPurchasedFromShopping,
    handleShoppingToggle
  }
}
