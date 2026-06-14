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

  return {
    stockInToFridge,
    stockInToLeftover,
    consumeFromFridge,
    consumeFromLeftover,
    discardFromFridge,
    discardFromLeftover,
    moveFridgeItemToLeftover,
    addExpiringToShoppingList,
    processAutoReplenish
  }
}
