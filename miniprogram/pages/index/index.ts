// index.ts
Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: ''
    },
    greeting: '早上好'
  },

  onLoad() {
    this.setGreeting();
    this.getUserInfo();
  },

  onShow() {
    // 每次显示页面时更新用户信息
    this.getUserInfo();
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '早上好';
    if (hour >= 6 && hour < 12) {
      greeting = '早上好';
    } else if (hour >= 12 && hour < 14) {
      greeting = '中午好';
    } else if (hour >= 14 && hour < 18) {
      greeting = '下午好';
    } else if (hour >= 18 && hour < 22) {
      greeting = '晚上好';
    } else {
      greeting = '夜深了';
    }
    this.setData({ greeting });
  },

  getUserInfo() {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({ userInfo });
  },

  navigateToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  navigateToSleepPlan() {
    wx.switchTab({
      url: '/pages/sleep-plan/sleep-plan'
    });
  },

  navigateToHealthConsultation() {
    wx.switchTab({
      url: '/pages/health-consultation/health-consultation'
    });
  },

  navigateToEarScan() {
    wx.switchTab({
      url: '/pages/ear-scan/ear-scan'
    });
  },

  navigateToDeviceLocation() {
    wx.navigateTo({
      url: '/pages/device-location/device-location'
    });
  }
});
