import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { generateId } from '@/utils/storage'
import { getTotalIngredients, getAllRecipes } from '@/utils/recipes'

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
    return getTotalIngredients(weekAllRecipes.value)
  })

  function autoGenerateWeekPlan(fridgeItems) {
    clearWeek()
    const allRecipes = getAllRecipes()
    const shuffled = [...allRecipes].sort(() => Math.random() - 0.5)
    
    const dinnerRecipes = shuffled.slice(0, 7)
    const lunchRecipes = shuffled.slice(0, 7).reverse()
    
    weekDates.value.forEach((date, index) => {
      if (dinnerRecipes[index]) {
        addMeal(date, '晚餐', dinnerRecipes[index])
      }
      if (lunchRecipes[index]) {
        addMeal(date, '午餐', lunchRecipes[index])
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
    weekAllRecipes,
    weekTotalIngredients,
    getMeals,
    addMeal,
    removeMeal,
    clearDay,
    clearWeek,
    previousWeek,
    nextWeek,
    goToCurrentWeek,
    autoGenerateWeekPlan
  }
})
