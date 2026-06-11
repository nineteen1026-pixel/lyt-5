const recipes = [
  {
    name: '番茄炒蛋',
    ingredients: ['番茄', '鸡蛋'],
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
    ingredients: ['青椒', '猪肉'],
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
    ingredients: ['土豆', '牛肉'],
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
    ingredients: ['西兰花', '大蒜'],
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
    ingredients: ['黄瓜', '木耳'],
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
    ingredients: ['白菜', '豆腐'],
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
    ingredients: ['胡萝卜', '猪肉'],
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
    ingredients: ['洋葱', '鸡蛋'],
    description: '简单快手，洋葱甜香，鸡蛋鲜嫩。',
    steps: [
      '洋葱切丝，鸡蛋打散',
      '热锅下油，炒鸡蛋盛出',
      '锅中炒洋葱至透明变软',
      '加入鸡蛋翻炒，加盐调味'
    ]
  }
]

export function getRecipeSuggestions(fridgeItems, count = 2) {
  const ingredientNames = fridgeItems.map(item => item.name.toLowerCase())

  const scoredRecipes = recipes.map(recipe => {
    const matchCount = recipe.ingredients.filter(ing =>
      ingredientNames.some(name => name.includes(ing.toLowerCase()) || ing.toLowerCase().includes(name))
    ).length
    return {
      ...recipe,
      matchCount,
      matchRatio: matchCount / recipe.ingredients.length
    }
  })

  scoredRecipes.sort((a, b) => b.matchCount - a.matchCount || b.matchRatio - a.matchRatio)

  const topRecipes = scoredRecipes.filter(r => r.matchCount > 0)

  if (topRecipes.length >= count) {
    return topRecipes.slice(0, count)
  }

  const shuffled = [...recipes].sort(() => Math.random() - 0.5)
  return [...topRecipes, ...shuffled].slice(0, count)
}

export function getAllRecipes() {
  return recipes
}
