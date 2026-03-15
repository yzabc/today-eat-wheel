const STORAGE_KEY = 'lunch-wheel-menu-v1';

const defaultMenus = {
  currentMenuKey: 'lunch',
  menus: {
    lunch: {
      key: 'lunch',
      name: '午餐',
      items: ['黄焖鸡米饭', '番茄牛腩饭', '轻食沙拉', '寿司', '兰州拉面', '砂锅菜']
    },
    dinner: {
      key: 'dinner',
      name: '晚餐',
      items: ['火锅', '烧烤', '煲仔饭', '椰子鸡', '馄饨面', '烤鱼']
    }
  }
};

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizeMenus(data) {
  if (!data || typeof data !== 'object') {
    return clone(defaultMenus);
  }

  const result = clone(defaultMenus);
  const menus = data.menus || {};
  ['lunch', 'dinner'].forEach((key) => {
    const source = menus[key] || {};
    const items = Array.isArray(source.items)
      ? source.items.map((item) => String(item || '').trim()).filter(Boolean)
      : result.menus[key].items;

    result.menus[key] = {
      key,
      name: String(source.name || result.menus[key].name).trim() || result.menus[key].name,
      items: items.length ? items : clone(defaultMenus.menus[key].items)
    };
  });

  result.currentMenuKey = data.currentMenuKey === 'dinner' ? 'dinner' : 'lunch';
  return result;
}

function getMenus() {
  try {
    const local = wx.getStorageSync(STORAGE_KEY);
    return normalizeMenus(local);
  } catch (error) {
    return clone(defaultMenus);
  }
}

function saveMenus(data) {
  const normalized = normalizeMenus(data);
  wx.setStorageSync(STORAGE_KEY, normalized);
  return normalized;
}

module.exports = {
  STORAGE_KEY,
  defaultMenus,
  getMenus,
  saveMenus,
  normalizeMenus
};
