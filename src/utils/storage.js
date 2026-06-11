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
