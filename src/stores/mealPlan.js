import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { generateId } from '@/utils/storage'
import { getTotalIngredients, getAllRecipes, getRecipeSuggestions } from '@/utils/recipes'
import { matchIngredientByCategory } from '@/utils/categories'

const MEAL_PLAN_KEY = 'meal_plan'

const MEAL_TIMES = ['早餐', '午餐', '晚餐']

function getStoredMealPlan() {
  try {
    const data = localStorage.getItem(MEAL_PLAN_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function setStoredMealPlan(plan) {
  try {
    localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(plan))
  } catch {
    console.error('Failed to save meal plan to localStorage')
  }
}

function getWeekDates(baseDate = new Date()) {
  const dates = []
  const day = baseDate.getDay()
  const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(baseDate.setDate(diff))
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

export const useMealPlanStore = defineStore('mealPlan', () => {
  const mealPlan = ref(getStoredMealPlan())
  const currentWeekStart = ref(getWeekDates()[0])

  const weekDates = computed(() => {
    const base = new Date(currentWeekStart.value)
    return getWeekDates(base)
  })

  const weekDays = computed(() => {
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    return weekDates.value.map((date, index) => ({
      date,
      dayName: dayNames[index],
      isToday: date === new Date().toISOString().split('T')[0]
    }))
  })

  const mealTimes = MEAL_TIMES

  function getMeals(date, mealTime) {
    return mealPlan.value[date]?.[mealTime] || []
  }

  function addMeal(date, mealTime, recipe) {
    if (!mealPlan.value[date]) {
      mealPlan.value[date] = {}
    }
    if (!mealPlan.value[date][mealTime]) {
      mealPlan.value[date][mealTime] = []
    }
    
    const mealItem = {
      id: generateId(),
      recipeName: recipe.name,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      description: recipe.description,
      cooked: false,
      cookedAt: null,
      addedAt: new Date().toISOString()
    }
    
    mealPlan.value[date][mealTime].push(mealItem)
    return mealItem
  }

  function removeMeal(date, mealTime, mealId) {
    if (mealPlan.value[date]?.[mealTime]) {
      const index = mealPlan.value[date][mealTime].findIndex(m => m.id === mealId)
      if (index !== -1) {
        mealPlan.value[date][mealTime].splice(index, 1)
      }
    }
  }

  function toggleMealCooked(date, mealTime, mealId) {
    const meals = getMeals(date, mealTime)
    const meal = meals.find(m => m.id === mealId)
    if (meal) {
      meal.cooked = !meal.cooked
      meal.cookedAt = meal.cooked ? new Date().toISOString() : null
    }
  }

  function getMealById(date, mealTime, mealId) {
    const meals = getMeals(date, mealTime)
    return meals.find(m => m.id === mealId) || null
  }

  function deductMealFromFridge(mealId, fridgeStore) {
    let meal = null
    let mealDate = null
    let mealTime = null
    
    for (const date of weekDates.value) {
      for (const time of MEAL_TIMES) {
        const found = getMeals(date, time).find(m => m.id === mealId)
        if (found) {
          meal = found
          mealDate = date
          mealTime = time
          break
        }
      }
      if (meal) break
    }
    
    if (!meal) {
      return { success: false, message: '未找到该菜品' }
    }
    
    if (meal.cooked && meal.ingredientsDeducted) {
      return { success: false, message: '该菜品已扣减过库存' }
    }

    const results = {
      deducted: [],
      notFound: [],
      insufficient: []
    }

    meal.ingredients.forEach(ing => {
      const fridgeItem = fridgeStore.items.find(item =>
        matchIngredientByCategory(item.name, ing.name)
      )
      
      if (fridgeItem) {
        if (fridgeItem.quantity >= ing.quantity) {
          const newQty = Math.max(0, Number((fridgeItem.quantity - ing.quantity).toFixed(2)))
          if (newQty === 0) {
            fridgeStore.removeItem(fridgeItem.id)
          } else {
            fridgeStore.updateItem(fridgeItem.id, { quantity: newQty })
          }
          results.deducted.push({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            remaining: newQty
          })
        } else {
          results.insufficient.push({
            name: ing.name,
            needed: ing.quantity,
            available: fridgeItem.quantity,
            unit: ing.unit
          })
          if (fridgeItem.quantity > 0) {
            fridgeStore.updateItem(fridgeItem.id, { quantity: 0 })
          }
        }
      } else {
        results.notFound.push({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit
        })
      }
    })

    meal.cooked = true
    meal.cookedAt = new Date().toISOString()
    meal.ingredientsDeducted = true

    return {
      success: true,
      meal,
      mealDate,
      mealTime,
      ...results
    }
  }

  function clearDay(date) {
    if (mealPlan.value[date]) {
      delete mealPlan.value[date]
    }
  }

  function clearWeek() {
    weekDates.value.forEach(date => {
      if (mealPlan.value[date]) {
        delete mealPlan.value[date]
      }
    })
  }

  function previousWeek() {
    const current = new Date(currentWeekStart.value)
    current.setDate(current.getDate() - 7)
    currentWeekStart.value = current.toISOString().split('T')[0]
  }

  function nextWeek() {
    const current = new Date(currentWeekStart.value)
    current.setDate(current.getDate() + 7)
    currentWeekStart.value = current.toISOString().split('T')[0]
  }

  function goToCurrentWeek() {
    currentWeekStart.value = getWeekDates()[0]
  }

  const weekMeals = computed(() => {
    const result = {}
    weekDates.value.forEach(date => {
      result[date] = {}
      MEAL_TIMES.forEach(time => {
        result[date][time] = getMeals(date, time)
      })
    })
    return result
  })

  const weekTotalMeals = computed(() => {
    let count = 0
    weekDates.value.forEach(date => {
      MEAL_TIMES.forEach(time => {
        count += getMeals(date, time).length
      })
    })
    return count
  })

  const weekCookedMeals = computed(() => {
    let count = 0
    weekDates.value.forEach(date => {
      MEAL_TIMES.forEach(time => {
        count += getMeals(date, time).filter(m => m.cooked).length
      })
    })
    return count
  })

  const weekAllRecipes = computed(() => {
    const recipes = []
    weekDates.value.forEach(date => {
      MEAL_TIMES.forEach(time => {
        const meals = getMeals(date, time)
        meals.forEach(meal => {
          recipes.push({
            name: meal.recipeName,
            ingredients: meal.ingredients,
            steps: meal.steps,
            description: meal.description
          })
        })
      })
    })
    return recipes
  })

  const weekTotalIngredients = computed(() => {
    const uncookedRecipes = []
    weekDates.value.forEach(date => {
      MEAL_TIMES.forEach(time => {
        const meals = getMeals(date, time).filter(m => !m.cooked || !m.ingredientsDeducted)
        meals.forEach(meal => {
          uncookedRecipes.push({
            ingredients: meal.ingredients
          })
        })
      })
    })
    return getTotalIngredients(uncookedRecipes)
  })

  function autoGenerateWeekPlan(fridgeItems) {
    clearWeek()
    const allRecipes = getAllRecipes()
    const suggestedRecipes = getRecipeSuggestions(fridgeItems, 21)
    
    const usedNames = new Set()
    const priorityRecipes = suggestedRecipes.filter(r => {
      if (usedNames.has(r.name)) return false
      usedNames.add(r.name)
      return true
    })
    
    const remaining = allRecipes.filter(r => !usedNames.has(r.name))
    const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5)
    const finalPool = [...priorityRecipes, ...shuffledRemaining]
    
    const breakfastRecipes = finalPool.filter(r => r.tags?.includes('早餐') || r.category === '早餐')
    const mainRecipes = finalPool.filter(r => !r.tags?.includes('早餐') && r.category !== '早餐')
    
    weekDates.value.forEach((date, index) => {
      if (breakfastRecipes[index % breakfastRecipes.length]) {
        addMeal(date, '早餐', breakfastRecipes[index % breakfastRecipes.length])
      } else if (finalPool[index]) {
        addMeal(date, '早餐', finalPool[index])
      }
      if (mainRecipes[index]) {
        addMeal(date, '午餐', mainRecipes[index])
      }
      if (mainRecipes[(index + 3) % mainRecipes.length]) {
        addMeal(date, '晚餐', mainRecipes[(index + 3) % mainRecipes.length])
      }
    })
  }

  watch(
    mealPlan,
    (newPlan) => {
      setStoredMealPlan(newPlan)
    },
    { deep: true }
  )

  return {
    mealPlan,
    currentWeekStart,
    weekDates,
    weekDays,
    mealTimes,
    weekMeals,
    weekTotalMeals,
    weekCookedMeals,
    weekAllRecipes,
    weekTotalIngredients,
    getMeals,
    addMeal,
    removeMeal,
    toggleMealCooked,
    getMealById,
    deductMealFromFridge,
    clearDay,
    clearWeek,
    previousWeek,
    nextWeek,
    goToCurrentWeek,
    autoGenerateWeekPlan
  }
})
