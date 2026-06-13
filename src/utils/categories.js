export const categories = [
  {
    id: 'vegetable-fruit',
    name: '蔬菜水果',
    children: [
      { id: 'leafy-veg', name: '叶菜类', icon: '🥬' },
      { id: 'root-veg', name: '根茎类', icon: '🥕' },
      { id: 'fruit-veg', name: '茄果类', icon: '🍅' },
      { id: 'melon-veg', name: '瓜类', icon: '🥒' },
      { id: 'mushroom', name: '菌菇类', icon: '🍄' },
      { id: 'cruciferous', name: '甘蓝类', icon: '🥦' },
      { id: 'fruit', name: '水果类', icon: '🍎' }
    ]
  },
  {
    id: 'meat',
    name: '肉禽蛋类',
    children: [
      { id: 'pork', name: '猪肉类', icon: '🥩' },
      { id: 'beef', name: '牛肉类', icon: '🥩' },
      { id: 'lamb', name: '羊肉类', icon: '🍖' },
      { id: 'poultry', name: '禽肉类', icon: '🍗' },
      { id: 'egg', name: '蛋类', icon: '🥚' },
      { id: 'processed-meat', name: '肉制品', icon: '🥓' }
    ]
  },
  {
    id: 'seafood',
    name: '水产海鲜',
    children: [
      { id: 'fish', name: '鱼类', icon: '🐟' },
      { id: 'shrimp', name: '虾蟹类', icon: '🦐' },
      { id: 'shellfish', name: '贝类', icon: '🦪' },
      { id: 'other-seafood', name: '其他水产', icon: '🦑' }
    ]
  },
  {
    id: 'soy-dairy',
    name: '豆奶制品',
    children: [
      { id: 'soy', name: '豆制品', icon: '🧈' },
      { id: 'dairy', name: '奶制品', icon: '🥛' }
    ]
  },
  {
    id: 'grain',
    name: '主食杂粮',
    children: [
      { id: 'rice', name: '米面类', icon: '🍚' },
      { id: 'noodle', name: '面制品', icon: '🍜' },
      { id: 'coarse-grain', name: '杂粮类', icon: '🌾' },
      { id: 'starch', name: '淀粉类', icon: '🥔' }
    ]
  },
  {
    id: 'seasoning',
    name: '调味辅料',
    children: [
      { id: 'oil', name: '油脂类', icon: '🫒' },
      { id: 'sauce', name: '酱醋类', icon: '🍶' },
      { id: 'spice', name: '香辛料', icon: '🌶️' },
      { id: 'sugar-salt', name: '糖盐类', icon: '🧂' }
    ]
  },
  {
    id: 'dry-goods',
    name: '干货坚果',
    children: [
      { id: 'dry-veg', name: '干货类', icon: '🍄' },
      { id: 'nuts', name: '坚果类', icon: '🥜' },
      { id: 'dry-seafood', name: '海产干货', icon: '🦐' }
    ]
  },
  {
    id: 'other',
    name: '其他',
    children: [
      { id: 'frozen', name: '速冻食品', icon: '🧊' },
      { id: 'drink', name: '饮品', icon: '🥤' },
      { id: 'snack', name: '零食', icon: '🍪' },
      { id: 'other-food', name: '其他食材', icon: '📦' }
    ]
  }
]

export const nutritionTags = [
  { id: 'high-protein', name: '高蛋白', color: '#e91e63' },
  { id: 'low-fat', name: '低脂肪', color: '#4caf50' },
  { id: 'high-fiber', name: '高纤维', color: '#ff9800' },
  { id: 'high-vitamin', name: '高维生素', color: '#9c27b0' },
  { id: 'low-carb', name: '低碳水', color: '#2196f3' },
  { id: 'iron-rich', name: '补铁', color: '#795548' },
  { id: 'calcium-rich', name: '补钙', color: '#00bcd4' },
  { id: 'low-calorie', name: '低热量', color: '#8bc34a' },
  { id: 'high-potassium', name: '高钾', color: '#ff5722' },
  { id: 'omega3', name: '富含Omega-3', color: '#3f51b5' }
]

export const ingredientCategoryMap = {
  '番茄': { category: 'fruit-veg', tags: ['high-vitamin', 'low-calorie', 'high-fiber'] },
  '西红柿': { category: 'fruit-veg', tags: ['high-vitamin', 'low-calorie', 'high-fiber'] },
  '鸡蛋': { category: 'egg', tags: ['high-protein', 'calcium-rich', 'iron-rich'] },
  '青椒': { category: 'fruit-veg', tags: ['high-vitamin', 'low-calorie', 'high-fiber'] },
  '辣椒': { category: 'fruit-veg', tags: ['high-vitamin', 'low-calorie'] },
  '猪肉': { category: 'pork', tags: ['high-protein', 'iron-rich'] },
  '五花肉': { category: 'pork', tags: ['high-protein'] },
  '里脊': { category: 'pork', tags: ['high-protein', 'low-fat', 'iron-rich'] },
  '牛肉': { category: 'beef', tags: ['high-protein', 'iron-rich', 'low-fat'] },
  '土豆': { category: 'starch', tags: ['high-potassium', 'high-fiber'] },
  '马铃薯': { category: 'starch', tags: ['high-potassium', 'high-fiber'] },
  '西兰花': { category: 'cruciferous', tags: ['high-vitamin', 'high-fiber', 'low-calorie'] },
  '花椰菜': { category: 'cruciferous', tags: ['high-vitamin', 'high-fiber', 'low-calorie'] },
  '大蒜': { category: 'spice', tags: ['high-vitamin'] },
  '黄瓜': { category: 'melon-veg', tags: ['low-calorie', 'high-vitamin', 'high-fiber'] },
  '木耳': { category: 'mushroom', tags: ['high-fiber', 'iron-rich', 'low-calorie'] },
  '白菜': { category: 'cruciferous', tags: ['low-calorie', 'high-fiber', 'high-vitamin'] },
  '小白菜': { category: 'cruciferous', tags: ['low-calorie', 'high-fiber', 'high-vitamin', 'calcium-rich'] },
  '豆腐': { category: 'soy', tags: ['high-protein', 'low-fat', 'calcium-rich', 'iron-rich'] },
  '胡萝卜': { category: 'root-veg', tags: ['high-vitamin', 'high-fiber', 'low-calorie'] },
  '红萝卜': { category: 'root-veg', tags: ['high-vitamin', 'high-fiber', 'low-calorie'] },
  '洋葱': { category: 'root-veg', tags: ['high-vitamin', 'low-calorie', 'high-fiber'] },
  '菠菜': { category: 'leafy-veg', tags: ['iron-rich', 'high-vitamin', 'high-fiber', 'low-calorie', 'calcium-rich'] },
  '生菜': { category: 'leafy-veg', tags: ['low-calorie', 'high-vitamin', 'high-fiber'] },
  '油麦菜': { category: 'leafy-veg', tags: ['low-calorie', 'high-vitamin', 'high-fiber'] },
  '芹菜': { category: 'leafy-veg', tags: ['high-fiber', 'low-calorie', 'high-potassium'] },
  '韭菜': { category: 'leafy-veg', tags: ['high-fiber', 'high-vitamin'] },
  '茄子': { category: 'fruit-veg', tags: ['high-fiber', 'low-calorie'] },
  '玉米': { category: 'coarse-grain', tags: ['high-fiber', 'high-vitamin'] },
  '莲藕': { category: 'root-veg', tags: ['high-fiber', 'high-vitamin', 'iron-rich'] },
  '山药': { category: 'root-veg', tags: ['high-fiber', 'low-calorie'] },
  '南瓜': { category: 'melon-veg', tags: ['high-vitamin', 'high-fiber', 'low-calorie'] },
  '冬瓜': { category: 'melon-veg', tags: ['low-calorie', 'high-fiber', 'high-potassium'] },
  '丝瓜': { category: 'melon-veg', tags: ['low-calorie', 'high-vitamin'] },
  '苦瓜': { category: 'melon-veg', tags: ['low-calorie', 'high-vitamin', 'high-fiber'] },
  '豆角': { category: 'fruit-veg', tags: ['high-protein', 'high-fiber', 'high-vitamin'] },
  '四季豆': { category: 'fruit-veg', tags: ['high-protein', 'high-fiber', 'high-vitamin'] },
  '豌豆': { category: 'fruit-veg', tags: ['high-protein', 'high-fiber', 'high-vitamin'] },
  '扁豆': { category: 'fruit-veg', tags: ['high-protein', 'high-fiber'] },
  '香菇': { category: 'mushroom', tags: ['high-protein', 'low-fat', 'high-fiber'] },
  '平菇': { category: 'mushroom', tags: ['high-protein', 'low-fat', 'high-fiber'] },
  '金针菇': { category: 'mushroom', tags: ['high-protein', 'low-fat', 'high-fiber'] },
  '杏鲍菇': { category: 'mushroom', tags: ['high-protein', 'low-fat'] },
  '鸡肉': { category: 'poultry', tags: ['high-protein', 'low-fat'] },
  '鸡胸': { category: 'poultry', tags: ['high-protein', 'low-fat', 'low-calorie'] },
  '鸡腿': { category: 'poultry', tags: ['high-protein', 'iron-rich'] },
  '鸭肉': { category: 'poultry', tags: ['high-protein', 'iron-rich'] },
  '羊肉': { category: 'lamb', tags: ['high-protein', 'iron-rich'] },
  '鱼': { category: 'fish', tags: ['high-protein', 'low-fat', 'omega3'] },
  '草鱼': { category: 'fish', tags: ['high-protein', 'low-fat'] },
  '鲫鱼': { category: 'fish', tags: ['high-protein', 'low-fat', 'calcium-rich'] },
  '鲈鱼': { category: 'fish', tags: ['high-protein', 'low-fat', 'omega3'] },
  '三文鱼': { category: 'fish', tags: ['high-protein', 'omega3', 'high-vitamin'] },
  '虾': { category: 'shrimp', tags: ['high-protein', 'low-fat', 'calcium-rich'] },
  '虾仁': { category: 'shrimp', tags: ['high-protein', 'low-fat', 'calcium-rich'] },
  '螃蟹': { category: 'shrimp', tags: ['high-protein', 'low-fat'] },
  '蟹': { category: 'shrimp', tags: ['high-protein', 'low-fat'] },
  '鱿鱼': { category: 'other-seafood', tags: ['high-protein', 'low-fat', 'iron-rich'] },
  '墨鱼': { category: 'other-seafood', tags: ['high-protein', 'low-fat'] },
  '海带': { category: 'dry-seafood', tags: ['high-fiber', 'calcium-rich', 'iodine-rich', 'low-calorie'] },
  '紫菜': { category: 'dry-seafood', tags: ['high-protein', 'high-fiber', 'calcium-rich', 'low-calorie'] },
  '牛奶': { category: 'dairy', tags: ['high-protein', 'calcium-rich'] },
  '酸奶': { category: 'dairy', tags: ['high-protein', 'calcium-rich', 'high-vitamin'] },
  '奶酪': { category: 'dairy', tags: ['high-protein', 'calcium-rich'] },
  '豆浆': { category: 'soy', tags: ['high-protein', 'low-fat', 'calcium-rich'] },
  '豆干': { category: 'soy', tags: ['high-protein', 'iron-rich', 'calcium-rich'] },
  '腐竹': { category: 'soy', tags: ['high-protein', 'iron-rich'] },
  '豆皮': { category: 'soy', tags: ['high-protein', 'iron-rich'] },
  '千张': { category: 'soy', tags: ['high-protein', 'iron-rich'] },
  '大米': { category: 'rice', tags: ['high-carb'] },
  '小米': { category: 'coarse-grain', tags: ['high-fiber', 'iron-rich'] },
  '面粉': { category: 'noodle', tags: ['high-carb'] },
  '面条': { category: 'noodle', tags: ['high-carb'] },
  '挂面': { category: 'noodle', tags: ['high-carb'] },
  '馒头': { category: 'noodle', tags: ['high-carb'] },
  '面包': { category: 'noodle', tags: ['high-carb'] },
  '燕麦': { category: 'coarse-grain', tags: ['high-fiber', 'low-fat'] },
  '糙米': { category: 'coarse-grain', tags: ['high-fiber'] },
  '红薯': { category: 'starch', tags: ['high-fiber', 'high-vitamin', 'low-fat'] },
  '紫薯': { category: 'starch', tags: ['high-fiber', 'high-vitamin', 'low-fat'] },
  '花生': { category: 'nuts', tags: ['high-protein', 'high-fiber'] },
  '核桃': { category: 'nuts', tags: ['omega3', 'high-protein'] },
  '杏仁': { category: 'nuts', tags: ['high-protein', 'high-fiber', 'calcium-rich'] },
  '芝麻': { category: 'nuts', tags: ['calcium-rich', 'iron-rich', 'high-fiber'] },
  '红枣': { category: 'dry-veg', tags: ['iron-rich', 'high-vitamin'] },
  '枸杞': { category: 'dry-veg', tags: ['high-vitamin', 'low-calorie'] },
  '桂圆': { category: 'dry-veg', tags: ['iron-rich'] },
  '莲子': { category: 'dry-veg', tags: ['high-protein', 'high-fiber'] },
  '银耳': { category: 'dry-veg', tags: ['high-fiber', 'low-calorie'] },
  '百合': { category: 'dry-veg', tags: ['low-calorie'] },
  '苹果': { category: 'fruit', tags: ['high-fiber', 'high-vitamin', 'low-calorie'] },
  '香蕉': { category: 'fruit', tags: ['high-potassium', 'high-vitamin'] },
  '橙': { category: 'fruit', tags: ['high-vitamin', 'high-fiber', 'low-calorie'] },
  '橙子': { category: 'fruit', tags: ['high-vitamin', 'high-fiber', 'low-calorie'] },
  '梨': { category: 'fruit', tags: ['high-fiber', 'high-vitamin', 'low-calorie'] },
  '葡萄': { category: 'fruit', tags: ['high-vitamin', 'high-fiber'] },
  '西瓜': { category: 'fruit', tags: ['low-calorie', 'high-vitamin'] },
  '草莓': { category: 'fruit', tags: ['high-vitamin', 'high-fiber', 'low-calorie'] },
  '蓝莓': { category: 'fruit', tags: ['high-vitamin', 'high-fiber', 'antioxidant'] },
  '芒果': { category: 'fruit', tags: ['high-vitamin', 'high-fiber'] },
  '猕猴桃': { category: 'fruit', tags: ['high-vitamin', 'high-fiber', 'low-calorie'] },
  '菠萝': { category: 'fruit', tags: ['high-vitamin', 'high-fiber'] },
  '柠檬': { category: 'fruit', tags: ['high-vitamin', 'low-calorie'] },
  '生抽': { category: 'sauce', tags: [] },
  '酱油': { category: 'sauce', tags: [] },
  '老抽': { category: 'sauce', tags: [] },
  '醋': { category: 'sauce', tags: [] },
  '陈醋': { category: 'sauce', tags: [] },
  '米醋': { category: 'sauce', tags: [] },
  '料酒': { category: 'sauce', tags: [] },
  '蚝油': { category: 'sauce', tags: [] },
  '豆瓣酱': { category: 'sauce', tags: [] },
  '甜面酱': { category: 'sauce', tags: [] },
  '辣椒酱': { category: 'sauce', tags: [] },
  '番茄酱': { category: 'sauce', tags: ['high-vitamin'] },
  '盐': { category: 'sugar-salt', tags: [] },
  '糖': { category: 'sugar-salt', tags: [] },
  '白糖': { category: 'sugar-salt', tags: [] },
  '冰糖': { category: 'sugar-salt', tags: [] },
  '红糖': { category: 'sugar-salt', tags: ['iron-rich'] },
  '味精': { category: 'sugar-salt', tags: [] },
  '鸡精': { category: 'sugar-salt', tags: [] },
  '食用油': { category: 'oil', tags: [] },
  '花生油': { category: 'oil', tags: [] },
  '大豆油': { category: 'oil', tags: [] },
  '菜籽油': { category: 'oil', tags: [] },
  '橄榄油': { category: 'oil', tags: ['omega3', 'low-fat'] },
  '香油': { category: 'oil', tags: [] },
  '花椒': { category: 'spice', tags: [] },
  '八角': { category: 'spice', tags: [] },
  '桂皮': { category: 'spice', tags: [] },
  '香叶': { category: 'spice', tags: [] },
  '姜': { category: 'spice', tags: ['high-vitamin'] },
  '生姜': { category: 'spice', tags: ['high-vitamin'] },
  '葱': { category: 'spice', tags: ['high-vitamin'] },
  '小葱': { category: 'spice', tags: ['high-vitamin'] },
  '大葱': { category: 'spice', tags: ['high-vitamin'] },
  '香菜': { category: 'spice', tags: ['high-vitamin', 'high-fiber'] },
  '孜然': { category: 'spice', tags: [] },
  '辣椒面': { category: 'spice', tags: [] },
  '胡椒粉': { category: 'spice', tags: [] },
  '饺子': { category: 'frozen', tags: ['high-carb', 'high-protein'] },
  '馄饨': { category: 'frozen', tags: ['high-carb', 'high-protein'] },
  '包子': { category: 'frozen', tags: ['high-carb', 'high-protein'] },
  '汤圆': { category: 'frozen', tags: ['high-carb'] },
  '速冻丸子': { category: 'frozen', tags: ['high-protein'] }
}

export function getAllSubCategories() {
  const result = []
  categories.forEach(group => {
    group.children.forEach(sub => {
      result.push({
        ...sub,
        parentId: group.id,
        parentName: group.name
      })
    })
  })
  return result
}

export function getSubCategoryById(id) {
  return getAllSubCategories().find(c => c.id === id)
}

export function getCategoryInfo(ingredientName) {
  const name = ingredientName.trim()
  let result = ingredientCategoryMap[name]
  if (!result) {
    for (const key in ingredientCategoryMap) {
      if (name.includes(key) || key.includes(name)) {
        result = ingredientCategoryMap[key]
        break
      }
    }
  }
  if (result) {
    const subCategory = getSubCategoryById(result.category)
    return {
      categoryId: result.category,
      categoryName: subCategory ? subCategory.name : '',
      parentCategoryId: subCategory ? subCategory.parentId : '',
      parentCategoryName: subCategory ? subCategory.parentName : '',
      nutritionTags: result.tags || []
    }
  }
  return {
    categoryId: 'other-food',
    categoryName: '其他食材',
    parentCategoryId: 'other',
    parentCategoryName: '其他',
    nutritionTags: []
  }
}

export function matchIngredientByCategory(ingredientName1, ingredientName2) {
  const info1 = getCategoryInfo(ingredientName1)
  const info2 = getCategoryInfo(ingredientName2)
  if (info1.categoryId && info2.categoryId) {
    return info1.categoryId === info2.categoryId
  }
  return false
}

export function getNutritionTagById(id) {
  return nutritionTags.find(t => t.id === id)
}

export function getNutritionTagNames(ids) {
  return ids
    .map(id => getNutritionTagById(id))
    .filter(t => t)
    .map(t => t.name)
}
