const STORAGE_KEY = 'fridge_items'

export function getStoredItems() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function setStoredItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    console.error('Failed to save to localStorage')
  }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function daysUntilExpiry(expiryDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffTime = expiry - today
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function isExpiringSoon(expiryDate, days = 3) {
  const daysLeft = daysUntilExpiry(expiryDate)
  return daysLeft >= 0 && daysLeft <= days
}

export function isExpired(expiryDate) {
  return daysUntilExpiry(expiryDate) < 0
}

const NOTIFIED_ITEMS_KEY = 'notified_expiring_items'

export function getNotifiedItems() {
  try {
    const data = localStorage.getItem(NOTIFIED_ITEMS_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

export function setNotifiedItems(items) {
  try {
    localStorage.setItem(NOTIFIED_ITEMS_KEY, JSON.stringify(items))
  } catch {
    console.error('Failed to save notified items to localStorage')
  }
}

export function hasBeenNotified(itemId, expiryDate) {
  const notified = getNotifiedItems()
  return notified[itemId] === expiryDate
}

export function markAsNotified(itemId, expiryDate) {
  const notified = getNotifiedItems()
  notified[itemId] = expiryDate
  setNotifiedItems(notified)
}

export function clearNotifiedItems() {
  setNotifiedItems({})
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('浏览器不支持通知功能')
    return false
  }
  if (Notification.permission === 'granted') {
    return true
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

export function sendNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null
  }
  const notification = new Notification(title, {
    icon: '🧊',
    badge: '🧊',
    ...options
  })
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
  return notification
}
