import { daysUntilExpiry, isExpiringSoon, isExpired } from '@/utils/storage'
import { matchIngredientByCategory, getCategoryInfo } from '@/utils/categories'

const recipes = [
  {
    name: '番茄炒蛋',
    category: '家常菜',
    tags: ['午餐', '晚餐'],
    ingredients: [
      { name: '番茄', quantity: 2, unit: '个' },
      { name: '鸡蛋', quantity: 3, unit: '个' }
    ],
    description: '经典家常菜，酸甜可口，简单易做。',
    steps: [
      '番茄切块，鸡蛋打散备用',
      '热锅下油，倒入蛋液炒至凝固盛出',
      '锅中再加少许油，放入番茄翻炒出汁',
      '加入炒好的鸡蛋，加盐调味即可'
    ]
  },
  {
    name: '青椒肉丝',
    category: '家常菜',
    tags: ['午餐', '晚餐'],
    ingredients: [
      { name: '青椒', quantity: 2, unit: '个' },
      { name: '猪肉', quantity: 200, unit: '克' }
    ],
    description: '下饭神器，青椒爽脆，肉丝嫩滑。',
    steps: [
      '猪肉切丝，加生抽淀粉腌制10分钟',
      '青椒切丝备用',
      '热锅下油，滑炒肉丝至变色盛出',
      '锅中加油爆炒青椒，加入肉丝调味'
    ]
  },
  {
    name: '土豆烧牛肉',
    category: '硬菜',
    tags: ['午餐', '晚餐'],
    ingredients: [
      { name: '土豆', quantity: 2, unit: '个' },
      { name: '牛肉', quantity: 300, unit: '克' }
    ],
    description: '浓郁鲜香，土豆软糯，牛肉入味。',
    steps: [
      '牛肉切块焯水，土豆切块',
      '锅中炒糖色，放入牛肉上色',
      '加入调料和水，炖煮40分钟',
      '加入土豆继续炖至软烂收汁'
    ]
  },
  {
    name: '蒜蓉西兰花',
    category: '素菜',
    tags: ['午餐', '晚餐'],
    ingredients: [
      { name: '西兰花', quantity: 1, unit: '个' },
      { name: '大蒜', quantity: 3, unit: '瓣' }
    ],
    description: '清爽健康，蒜香浓郁的素菜。',
    steps: [
      '西兰花切小朵，焯水备用',
      '大蒜切末',
      '热锅下油，爆香蒜末',
      '放入西兰花翻炒，加盐调味'
    ]
  },
  {
    name: '黄瓜拌木耳',
    category: '凉菜',
    tags: ['午餐', '晚餐'],
    ingredients: [
      { name: '黄瓜', quantity: 1, unit: '根' },
      { name: '木耳', quantity: 50, unit: '克' }
    ],
    description: '清凉爽口，夏季开胃小菜。',
    steps: [
      '木耳泡发焯水，黄瓜拍碎切段',
      '蒜末、生抽、醋、香油调成料汁',
      '将木耳和黄瓜混合',
      '淋上料汁拌匀即可'
    ]
  },
  {
    name: '白菜豆腐汤',
    category: '汤羹',
    tags: ['午餐', '晚餐'],
    ingredients: [
      { name: '白菜', quantity: 200, unit: '克' },
      { name: '豆腐', quantity: 1, unit: '盒' }
    ],
    description: '清淡鲜美，暖胃营养的家常汤。',
    steps: [
      '白菜切段，豆腐切块',
      '锅中加水烧开，放入豆腐',
      '加入白菜煮至变软',
      '加盐、香油调味出锅'
    ]
  },
  {
    name: '胡萝卜炒肉片',
    category: '家常菜',
    tags: ['午餐', '晚餐'],
    ingredients: [
      { name: '胡萝卜', quantity: 1, unit: '根' },
      { name: '猪肉', quantity: 150, unit: '克' }
    ],
    description: '营养丰富，胡萝卜甜润，肉片香嫩。',
    steps: [
      '胡萝卜切片，猪肉切片腌制',
      '热锅下油，炒肉片至变色盛出',
      '锅中炒胡萝卜片至微软',
      '加入肉片一起翻炒调味'
    ]
  },
  {
    name: '洋葱炒鸡蛋',
    category: '家常菜',
    tags: ['午餐', '晚餐'],
    ingredients: [
      { name: '洋葱', quantity: 1, unit: '个' },
      { name: '鸡蛋', quantity: 2, unit: '个' }
    ],
    description: '简单快手，洋葱甜香，鸡蛋鲜嫩。',
    steps: [
      '洋葱切丝，鸡蛋打散',
      '热锅下油，炒鸡蛋盛出',
      '锅中炒洋葱至透明变软',
      '加入鸡蛋翻炒，加盐调味'
    ]
  },
  {
    name: '牛奶燕麦粥',
    category: '早餐',
    tags: ['早餐'],
    ingredients: [
      { name: '燕麦', quantity: 50, unit: '克' },
      { name: '牛奶', quantity: 250, unit: '毫升' }
    ],
    description: '营养健康的经典早餐，简单快捷。',
    steps: [
      '将燕麦片放入碗中',
      '加入牛奶搅拌均匀',
      '微波炉加热2分钟或小火煮3分钟',
      '可根据喜好加蜂蜜或水果'
    ]
  },
  {
    name: '水煮蛋配吐司',
    category: '早餐',
    tags: ['早餐'],
    ingredients: [
      { name: '鸡蛋', quantity: 2, unit: '个' },
      { name: '面包', quantity: 2, unit: '片' }
    ],
    description: '简单经典的西式早餐组合。',
    steps: [
      '鸡蛋冷水下锅，水开后煮6-8分钟',
      '捞出过冷水剥壳',
      '面包片烤至金黄',
      '搭配食用，可撒少许盐和黑胡椒'
    ]
  },
  {
    name: '豆浆油条',
    category: '早餐',
    tags: ['早餐'],
    ingredients: [
      { name: '黄豆', quantity: 50, unit: '克' },
      { name: '油条', quantity: 2, unit: '根' }
    ],
    description: '传统中式早餐，豆浆香浓配酥脆油条。',
    steps: [
      '黄豆提前泡发4小时以上',
      '用豆浆机打成豆浆并过滤',
      '豆浆煮沸加糖调味',
      '油条切段配热豆浆食用'
    ]
  },
  {
    name: '鸡蛋灌饼',
    category: '早餐',
    tags: ['早餐'],
    ingredients: [
      { name: '面粉', quantity: 100, unit: '克' },
      { name: '鸡蛋', quantity: 1, unit: '个' }
    ],
    description: '外酥里嫩，鸡蛋香嫩的街头美食。',
    steps: [
      '面粉加水揉成软面团醒20分钟',
      '擀成薄饼刷油折叠再擀开',
      '平底锅烙至起泡，戳洞灌入蛋液',
      '两面煎熟刷酱卷生菜即可'
    ]
  },
  {
    name: '皮蛋瘦肉粥',
    category: '早餐',
    tags: ['早餐', '午餐'],
    ingredients: [
      { name: '大米', quantity: 80, unit: '克' },
      { name: '皮蛋', quantity: 1, unit: '个' },
      { name: '猪肉', quantity: 80, unit: '克' }
    ],
    description: '广东经典早茶，粥绵密肉香嫩。',
    steps: [
      '大米洗净加水煮成白粥',
      '猪肉切丝用料酒盐腌制',
      '皮蛋切小块',
      '粥煮开后加入肉丝和皮蛋，调味撒葱花'
    ]
  },
  {
    name: '西红柿鸡蛋面',
    category: '主食',
    tags: ['早餐', '午餐', '晚餐'],
    ingredients: [
      { name: '番茄', quantity: 1, unit: '个' },
      { name: '鸡蛋', quantity: 2, unit: '个' },
      { name: '面条', quantity: 100, unit: '克' }
    ],
    description: '家常汤面，酸甜开胃营养全面。',
    steps: [
      '番茄切块，鸡蛋打散',
      '热锅炒鸡蛋盛出，炒番茄出汁',
      '加水煮开，放入面条煮熟',
      '加入鸡蛋，调味撒葱花'
    ]
  },
  {
    name: '葱花鸡蛋饼',
    category: '早餐',
    tags: ['早餐'],
    ingredients: [
      { name: '面粉', quantity: 80, unit: '克' },
      { name: '鸡蛋', quantity: 2, unit: '个' },
      { name: '葱', quantity: 2, unit: '根' }
    ],
    description: '松软香嫩，葱香四溢的快手早餐。',
    steps: [
      '面粉加水搅成无颗粒面糊',
      '打入鸡蛋搅匀',
      '加入葱花和少许盐',
      '平底锅刷油倒入面糊，两面煎至金黄'
    ]
  },
  {
    name: '清炒时蔬',
    category: '素菜',
    tags: ['午餐', '晚餐'],
    ingredients: [
      { name: '青菜', quantity: 300, unit: '克' },
      { name: '大蒜', quantity: 2, unit: '瓣' }
    ],
    description: '简单清爽，保留蔬菜原味。',
    steps: [
      '青菜洗净沥干，大蒜切末',
      '热锅下油爆香蒜末',
      '下青菜大火快炒',
      '加盐调味出锅'
    ]
  },
  {
    name: '红烧茄子',
    category: '家常菜',
    tags: ['午餐', '晚餐'],
    ingredients: [
      { name: '茄子', quantity: 2, unit: '根' },
      { name: '大蒜', quantity: 3, unit: '瓣' }
    ],
    description: '酱香浓郁，软糯入味的下饭神器。',
    steps: [
      '茄子切滚刀块撒盐腌10分钟',
      '挤干水分裹少许淀粉',
      '油炸至金黄捞出',
      '爆香蒜末，加酱汁炒匀收汁'
    ]
  },
  {
    name: '小米南瓜粥',
    category: '早餐',
    tags: ['早餐', '晚餐'],
    ingredients: [
      { name: '小米', quantity: 60, unit: '克' },
      { name: '南瓜', quantity: 200, unit: '克' }
    ],
    description: '养胃香甜，色泽金黄的健康粥品。',
    steps: [
      '南瓜去皮切块',
      '小米洗净加水煮开',
      '加入南瓜小火煮30分钟',
      '搅拌至南瓜融于粥中即可'
    ]
  }
]

export function getRecipeSuggestions(fridgeItems, count = 2) {
  const expiringItems = fridgeItems.filter(item =>
    isExpiringSoon(item.expiryDate) && !isExpired(item.expiryDate)
  )

  const scoredRecipes = recipes.map(recipe => {
    const matchedIngredients = []
    const matchedExpiringIngredients = []
    let matchCount = 0
    let expiringMatchCount = 0
    let expiringUrgencyScore = 0

    recipe.ingredients.forEach(ing => {
      const matchedItem = fridgeItems.find(item => {
        return matchIngredientByCategory(item.name, ing.name)
      })

      if (matchedItem) {
        matchCount++
        matchedIngredients.push(ing.name)

        const isExpiringItem = expiringItems.some(ei => ei.id === matchedItem.id)

        if (isExpiringItem && !isExpired(matchedItem.expiryDate)) {
          expiringMatchCount++
          matchedExpiringIngredients.push({
            name: ing.name,
            daysLeft: daysUntilExpiry(matchedItem.expiryDate)
          })
          const daysLeft = daysUntilExpiry(matchedItem.expiryDate)
          expiringUrgencyScore += Math.max(0, 4 - daysLeft)
        }
      }
    })

    const matchRatio = matchCount / recipe.ingredients.length
    const expiringBonus = expiringMatchCount * 3 + expiringUrgencyScore
    const priorityScore = matchCount + expiringBonus

    return {
      ...recipe,
      matchCount,
      matchRatio,
      expiringMatchCount,
      matchedExpiringIngredients,
      expiringUrgencyScore,
      priorityScore
    }
  })

  scoredRecipes.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore
    }
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount
    }
    return b.matchRatio - a.matchRatio
  })

  const topRecipes = scoredRecipes.filter(r => r.matchCount > 0)

  if (topRecipes.length >= count) {
    return topRecipes.slice(0, count)
  }

  const shuffled = scoredRecipes
    .filter(r => r.matchCount === 0)
    .sort(() => Math.random() - 0.5)
  return [...topRecipes, ...shuffled].slice(0, count)
}

export function getAllRecipes() {
  return recipes
}

export function getIngredientNames(recipe) {
  return recipe.ingredients.map(ing => ing.name)
}

export function getTotalIngredients(recipeList) {
  const total = {}
  recipeList.forEach(recipe => {
    recipe.ingredients.forEach(ing => {
      const key = `${ing.name}_${ing.unit}`
      if (total[key]) {
        total[key].quantity += ing.quantity
      } else {
        total[key] = { ...ing }
      }
    })
  })
  return Object.values(total)
}
