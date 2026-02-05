// health-consultation.ts
Page({
  data: {

  },

  onLoad() {
  },

  navigateToDoctors() {
    wx.navigateTo({
      url: '/pages/doctors/doctors'
    });
  },

  navigateToKnowledge() {
    wx.navigateTo({
      url: '/pages/knowledge/knowledge'
    });
  }
});

