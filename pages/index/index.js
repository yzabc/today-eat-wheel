const { getMenus, saveMenus, normalizeMenus } = require('../../utils/storage');

const palette = ['#111111', '#1f7aff', '#34c759', '#ff9f0a', '#5856d6', '#ff375f', '#5ac8fa', '#30b0c7'];
const wheelSize = 620;

Page({
  data: {
    statusBarHeight: 20,
    menuTabs: [
      { key: 'lunch', name: '午餐' },
      { key: 'dinner', name: '晚餐' }
    ],
    menus: {},
    currentMenuKey: 'lunch',
    editingMenuKey: 'lunch',
    currentMenu: { name: '午餐', items: [] },
    editingMenu: { name: '午餐', items: [] },
    wheelItems: [],
    lastResult: '',
    spinning: false,
    wheelRotation: 0,
    spinDuration: 0,
    editPanelVisible: false,
    panelTouchStartX: 0,
    panelTouchCurrentX: 0
  },

  onLoad() {
    const systemInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 20
    });
    this.loadMenus();
  },

  onReady() {
    this.drawWheel();
  },

  noop() {},

  loadMenus() {
    const data = getMenus();
    this.applyMenuState(data, false);
  },

  applyMenuState(rawData, redraw = true) {
    const data = normalizeMenus(rawData);
    const currentMenu = data.menus[data.currentMenuKey];
    const editingKey = data.menus[this.data.editingMenuKey] ? this.data.editingMenuKey : data.currentMenuKey;
    const editingMenu = data.menus[editingKey];

    this.setData({
      menus: data.menus,
      currentMenuKey: data.currentMenuKey,
      currentMenu,
      editingMenuKey: editingKey,
      editingMenu,
      wheelItems: currentMenu.items
    }, () => {
      if (redraw) {
        this.drawWheel();
      }
    });
  },

  persistMenus(nextMenus) {
    const saved = saveMenus(nextMenus);
    this.applyMenuState(saved);
  },

  openEditor() {
    this.setData({
      editPanelVisible: true,
      editingMenuKey: this.data.currentMenuKey,
      editingMenu: this.data.menus[this.data.currentMenuKey]
    });
  },

  closeEditor() {
    this.setData({
      editPanelVisible: false,
      panelTouchStartX: 0,
      panelTouchCurrentX: 0
    });
  },

  handlePanelTouchStart(event) {
    const touch = event.touches[0];
    this.setData({
      panelTouchStartX: touch.clientX,
      panelTouchCurrentX: touch.clientX
    });
  },

  handlePanelTouchMove(event) {
    const touch = event.touches[0];
    this.setData({ panelTouchCurrentX: touch.clientX });
  },

  handlePanelTouchEnd() {
    const distance = this.data.panelTouchCurrentX - this.data.panelTouchStartX;
    if (distance > 80) {
      this.closeEditor();
    }
  },

  switchEditingMenu(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      editingMenuKey: key,
      editingMenu: this.data.menus[key]
    });
  },

  handleMenuNameInput(event) {
    const value = event.detail.value;
    const key = this.data.editingMenuKey;
    const nextMenus = normalizeMenus({
      menus: this.data.menus,
      currentMenuKey: this.data.currentMenuKey
    });
    nextMenus.menus[key].name = value.trim() || (key === 'lunch' ? '午餐' : '晚餐');
    this.persistMenus(nextMenus);
  },

  handleFoodInput(event) {
    const index = Number(event.currentTarget.dataset.index);
    const value = event.detail.value;
    const key = this.data.editingMenuKey;
    const nextMenus = normalizeMenus({
      menus: this.data.menus,
      currentMenuKey: this.data.currentMenuKey
    });
    nextMenus.menus[key].items[index] = value;
    nextMenus.menus[key].items = nextMenus.menus[key].items.map((item) => String(item || '').trim()).filter(Boolean);
    if (!nextMenus.menus[key].items.length) {
      nextMenus.menus[key].items = ['待定'];
    }
    this.persistMenus(nextMenus);
  },

  addFoodItem() {
    const key = this.data.editingMenuKey;
    const nextMenus = normalizeMenus({
      menus: this.data.menus,
      currentMenuKey: this.data.currentMenuKey
    });
    nextMenus.menus[key].items.push(`菜品 ${nextMenus.menus[key].items.length + 1}`);
    this.persistMenus(nextMenus);
  },

  removeFoodItem(event) {
    const index = Number(event.currentTarget.dataset.index);
    const key = this.data.editingMenuKey;
    const nextMenus = normalizeMenus({
      menus: this.data.menus,
      currentMenuKey: this.data.currentMenuKey
    });
    nextMenus.menus[key].items.splice(index, 1);
    if (!nextMenus.menus[key].items.length) {
      nextMenus.menus[key].items = ['待定'];
    }
    this.persistMenus(nextMenus);
  },

  useCurrentEditingMenu() {
    const nextMenus = normalizeMenus({
      menus: this.data.menus,
      currentMenuKey: this.data.editingMenuKey
    });
    this.persistMenus(nextMenus);
    wx.showToast({
      title: '已切换',
      icon: 'success'
    });
  },

  startSpin() {
    const items = this.data.wheelItems;
    if (this.data.spinning || !items.length) {
      return;
    }

    const resultIndex = Math.floor(Math.random() * items.length);
    const sectorAngle = 360 / items.length;
    const baseRounds = 6 + Math.floor(Math.random() * 4);
    const targetAngle = 360 - (resultIndex * sectorAngle + sectorAngle / 2);
    const normalizeCurrent = ((this.data.wheelRotation % 360) + 360) % 360;
    let delta = targetAngle - normalizeCurrent;
    if (delta < 0) {
      delta += 360;
    }
    const totalRotation = this.data.wheelRotation + baseRounds * 360 + delta;
    const duration = 4200 + Math.floor(Math.random() * 900);

    this.setData({
      spinning: true,
      spinDuration: duration,
      wheelRotation: totalRotation,
      lastResult: ''
    });

    clearTimeout(this.spinTimer);
    this.spinTimer = setTimeout(() => {
      this.setData({
        spinning: false,
        lastResult: items[resultIndex]
      });
    }, duration + 80);
  },

  drawWheel() {
    const query = wx.createSelectorQuery();
    query.select('#wheelCanvas').fields({ node: true, size: true }).exec((res) => {
      const info = res && res[0];
      if (!info || !info.node) {
        return;
      }
      const canvas = info.node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
      canvas.width = wheelSize * dpr;
      canvas.height = wheelSize * dpr;
      ctx.scale(dpr, dpr);
      this.paintWheel(ctx, wheelSize, wheelSize, this.data.wheelItems);
    });
  },

  paintWheel(ctx, width, height, items) {
    const count = items.length || 1;
    const radius = width / 2;
    const innerRadius = 78;
    const sector = (Math.PI * 2) / count;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(radius, radius);

    for (let i = 0; i < count; i += 1) {
      const start = -Math.PI / 2 + i * sector;
      const end = start + sector;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 10, start, end);
      ctx.closePath();
      ctx.fillStyle = palette[i % palette.length];
      ctx.fill();

      ctx.save();
      ctx.rotate(start + sector / 2);
      ctx.translate(radius * 0.63, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.wrapText(ctx, items[i], 0, 0, 120, 28);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill();
    ctx.restore();
  },

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const raw = String(text || '待定');
    const chars = raw.split('');
    const lines = [];
    let current = '';

    chars.forEach((char) => {
      const temp = current + char;
      if (ctx.measureText(temp).width > maxWidth && current) {
        lines.push(current);
        current = char;
      } else {
        current = temp;
      }
    });

    if (current) {
      lines.push(current);
    }

    const finalLines = lines.slice(0, 2);
    finalLines.forEach((line, index) => {
      const offset = (index - (finalLines.length - 1) / 2) * lineHeight;
      ctx.fillText(line, x, y + offset);
    });
  },

  onUnload() {
    clearTimeout(this.spinTimer);
  }
});
