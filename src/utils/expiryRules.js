const FRIDGE_RULES_KEY = 'fridge_expiry_rules'
const LEFTOVER_RULES_KEY = 'leftover_expiry_rules'

const DEFAULT_FRIDGE_DAYS = 3
const DEFAULT_LEFTOVER_DAYS = 1

const FRIDGE_ZONES = ['冷藏', '冷冻', '保鲜', '门架']
const LEFTOVER_ZONES = ['冷藏', '冷冻']

const DEFAULT_FRIDGE_ZONE_RULES = {
  '冷藏': 3,
  '冷冻': 7,
  '保鲜': 2,
  '门架': 3
}

const DEFAULT_LEFTOVER_ZONE_RULES = {
  '冷藏': 1,
  '冷冻': 7
}

const DEFAULT_FRIDGE_CATEGORY_RULES = {
  'leafy-veg': 2,
  'root-veg': 5,
  'fruit-veg': 3,
  'melon-veg': 3,
  'mushroom': 2,
  'cruciferous': 3,
  'fruit': 5,
  'pork': 3,
  'beef': 3,
  'lamb': 3,
  'poultry': 3,
  'egg': 5,
  'processed-meat': 5,
  'fish': 3,
  'shrimp': 3,
  'shellfish': 3,
  'other-seafood': 3,
  'soy': 3,
  'dairy': 3,
  'rice': 30,
  'noodle': 30,
  'coarse-grain': 60,
  'starch': 30,
  'oil': 90,
  'sauce': 90,
  'spice': 90,
  'sugar-salt': 180,
  'dry-veg': 60,
  'nuts': 60,
  'dry-seafood': 60,
  'frozen': 30,
  'drink': 7,
  'snack': 15,
  'other-food': 3
}

const DEFAULT_LEFTOVER_CATEGORY_RULES = {
  'leafy-veg': 1,
  'root-veg': 2,
  'fruit-veg': 1,
  'melon-veg': 1,
  'mushroom': 1,
  'cruciferous': 1,
  'fruit': 2,
  'pork': 1,
  'beef': 1,
  'lamb': 1,
  'poultry': 1,
  'egg': 1,
  'processed-meat': 2,
  'fish': 1,
  'shrimp': 1,
  'shellfish': 1,
  'other-seafood': 1,
  'soy': 1,
  'dairy': 1,
  'rice': 1,
  'noodle': 1,
  'coarse-grain': 3,
  'starch': 1,
  'oil': 7,
  'sauce': 7,
  'spice': 7,
  'sugar-salt': 15,
  'dry-veg': 7,
  'nuts': 7,
  'dry-seafood': 7,
  'frozen': 7,
  'drink': 1,
  'snack': 3,
  'other-food': 1,
  'cooked-veg': 1,
  'cooked-meat': 1,
  'cooked-grain': 1,
  'soup': 1
}

function getStoredRules(storageKey, defaultRules) {
  try {
    const data = localStorage.getItem(storageKey)
    if (data) {
      return JSON.parse(data)
    }
  } catch {
    console.error('Failed to read expiry rules from localStorage')
  }
  return { ...defaultRules }
}

function setStoredRules(storageKey, rules) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(rules))
  } catch {
    console.error('Failed to save expiry rules to localStorage')
  }
}

function createDefaultRules(defaultDays, zoneRules, categoryRules) {
  return {
    defaultDays,
    zoneRules: { ...zoneRules },
    categoryRules: { ...categoryRules }
  }
}

function getFridgeDefaultRules() {
  return createDefaultRules(
    DEFAULT_FRIDGE_DAYS,
    DEFAULT_FRIDGE_ZONE_RULES,
    DEFAULT_FRIDGE_CATEGORY_RULES
  )
}

function getLeftoverDefaultRules() {
  return createDefaultRules(
    DEFAULT_LEFTOVER_DAYS,
    DEFAULT_LEFTOVER_ZONE_RULES,
    DEFAULT_LEFTOVER_CATEGORY_RULES
  )
}

function getFridgeRules() {
  return getStoredRules(FRIDGE_RULES_KEY, getFridgeDefaultRules())
}

function setFridgeRules(rules) {
  setStoredRules(FRIDGE_RULES_KEY, rules)
}

function getLeftoverRules() {
  return getStoredRules(LEFTOVER_RULES_KEY, getLeftoverDefaultRules())
}

function setLeftoverRules(rules) {
  setStoredRules(LEFTOVER_RULES_KEY, rules)
}

function getExpiringDaysForItem(rules, item) {
  if (item && item.categoryId && rules.categoryRules[item.categoryId]) {
    return rules.categoryRules[item.categoryId]
  }
  if (item && item.zone && rules.zoneRules[item.zone]) {
    return rules.zoneRules[item.zone]
  }
  return rules.defaultDays
}

function getFridgeExpiringDaysForItem(item) {
  const rules = getFridgeRules()
  return getExpiringDaysForItem(rules, item)
}

function getLeftoverExpiringDaysForItem(item) {
  const rules = getLeftoverRules()
  return getExpiringDaysForItem(rules, item)
}

function updateFridgeDefaultDays(days) {
  const rules = getFridgeRules()
  rules.defaultDays = parseInt(days, 10) || DEFAULT_FRIDGE_DAYS
  setFridgeRules(rules)
  return rules
}

function updateFridgeZoneRule(zone, days) {
  const rules = getFridgeRules()
  rules.zoneRules[zone] = parseInt(days, 10)
  setFridgeRules(rules)
  return rules
}

function updateFridgeCategoryRule(categoryId, days) {
  const rules = getFridgeRules()
  rules.categoryRules[categoryId] = parseInt(days, 10)
  setFridgeRules(rules)
  return rules
}

function updateLeftoverDefaultDays(days) {
  const rules = getLeftoverRules()
  rules.defaultDays = parseInt(days, 10) || DEFAULT_LEFTOVER_DAYS
  setLeftoverRules(rules)
  return rules
}

function updateLeftoverZoneRule(zone, days) {
  const rules = getLeftoverRules()
  rules.zoneRules[zone] = parseInt(days, 10)
  setLeftoverRules(rules)
  return rules
}

function updateLeftoverCategoryRule(categoryId, days) {
  const rules = getLeftoverRules()
  rules.categoryRules[categoryId] = parseInt(days, 10)
  setLeftoverRules(rules)
  return rules
}

function resetFridgeRules() {
  const defaultRules = getFridgeDefaultRules()
  setFridgeRules(defaultRules)
  return defaultRules
}

function resetLeftoverRules() {
  const defaultRules = getLeftoverDefaultRules()
  setLeftoverRules(defaultRules)
  return defaultRules
}

export {
  FRIDGE_ZONES,
  LEFTOVER_ZONES,
  getFridgeRules,
  setFridgeRules,
  getLeftoverRules,
  setLeftoverRules,
  getFridgeExpiringDaysForItem,
  getLeftoverExpiringDaysForItem,
  getExpiringDaysForItem,
  updateFridgeDefaultDays,
  updateFridgeZoneRule,
  updateFridgeCategoryRule,
  updateLeftoverDefaultDays,
  updateLeftoverZoneRule,
  updateLeftoverCategoryRule,
  resetFridgeRules,
  resetLeftoverRules,
  getFridgeDefaultRules,
  getLeftoverDefaultRules
}
