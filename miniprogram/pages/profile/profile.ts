// profile.ts
import { IAppOption } from '../../../typings'

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      age: 28,
      gender: '男',
      height: 170,
      weight: 65
    },
    healthData: {
      status: '未评测',
      date: '',
      score: 0,
      sasScore: 0,
      sdsScore: 0
    },
    deviceCount: 0,
    isLoggedIn: false,
    isLoading: true
  },

  onLoad() {
    this.getUserInfo()
    this.getHealthData()
    this.getDeviceCount()
  },

  onShow() {
    this.getUserInfo()
    this.getHealthData()
    this.getDeviceCount()
    // 从云数据库同步最新用户信息
    if (this.data.isLoggedIn) {
      this.loadUserInfoFromCloud()
    }
  },

  getUserInfo() {
    const app = getApp() as IAppOption
    
    // 先检查全局数据
    if (app.globalData.userInfo && app.globalData.isLoggedIn) {
      this.setData({
        userInfo: app.globalData.userInfo,
        isLoggedIn: app.globalData.isLoggedIn,
        isLoading: false
      })
      return
    }

    // 检查本地存储
    const localUserInfo = wx.getStorageSync('userInfo')
    if (localUserInfo && localUserInfo.openid) {
      this.setData({
        userInfo: localUserInfo,
        isLoggedIn: true,
        isLoading: false
      })
      // 同步到全局
      app.globalData.userInfo = localUserInfo
      app.globalData.openid = localUserInfo.openid
      app.globalData.isLoggedIn = true
      return
    }

    // 未登录
    this.setData({
      userInfo: {
        avatarUrl: '',
        nickName: '',
        age: 28,
        gender: '男',
        height: 170,
        weight: 65
      },
      isLoggedIn: false,
      isLoading: false
    })
  },

  // 从云数据库获取用户信息
  async loadUserInfoFromCloud() {
    const app = getApp() as IAppOption
    
    try {
      const cloudUserInfo = await app.getUserFromCloud()
      
      if (cloudUserInfo) {
        // 构建用户信息对象
        const userInfo = {
          avatarUrl: cloudUserInfo.avatarUrl || '',
          nickName: cloudUserInfo.nickName || '',
          age: cloudUserInfo.age || 28,
          gender: cloudUserInfo.gender || '男',
          height: cloudUserInfo.height || 170,
          weight: cloudUserInfo.weight || 65,
          phone: cloudUserInfo.phone || '',
          openid: cloudUserInfo.openid || app.globalData.openid
        }
        
        // 计算 BMI
        if (userInfo.height && userInfo.weight) {
          const heightInMeters = userInfo.height / 100
          userInfo.bmi = parseFloat((userInfo.weight / (heightInMeters * heightInMeters)).toFixed(1))
        }
        
        // 更新全局数据
        app.globalData.userInfo = userInfo
        app.globalData.openid = cloudUserInfo.openid || app.globalData.openid
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', userInfo)
        wx.setStorageSync('openid', cloudUserInfo.openid || app.globalData.openid)
        
        // 更新页面数据
        this.setData({
          userInfo,
          isLoggedIn: true
        })
      }
    } catch (error) {
      console.error('从云获取用户信息失败:', error)
    }
  },

  getHealthData() {
    const app = getApp() as IAppOption
    
    if (!app.globalData.openid) {
      // 尝试从本地加载
      const localData = wx.getStorageSync('healthData')
      if (localData) {
        this.setData({ healthData: localData })
      }
      return
    }

    const db = wx.cloud.database()
    db.collection('health_assessments')
      .where({ openid: app.globalData.openid })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
      .then((res: any) => {
        if (res.data && res.data.length > 0) {
          const latest = res.data[0]
          const healthData = {
            status: latest.status || '未评测',
            date: latest.date || '',
            score: latest.totalScore || 0,
            sasScore: latest.sasScore || 0,
            sdsScore: latest.sdsScore || 0
          }
          this.setData({ healthData })
          // 保存到本地
          wx.setStorageSync('healthData', healthData)
        }
      })
      .catch(() => {
        const localData = wx.getStorageSync('healthData')
        if (localData) {
          this.setData({ healthData: localData })
        }
      })
  },

  getDeviceCount() {
    const devices = wx.getStorageSync('bluetoothDevices') || []
    const connectedCount = devices.filter((d: any) => d.connected).length
    this.setData({ deviceCount: connectedCount })
  },

  navigateToEdit() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' })
  },

  navigateToBluetooth() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/bluetooth/bluetooth' })
  },

  navigateToHealthAssessment() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/health-assessment/health-assessment' })
  },

  navigateToFeedback() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/feedback/feedback' })
  },

  async login() {
    const app = getApp() as IAppOption
    
    try {
      wx.showLoading({ title: '登录中...' })
      
      // 调用登录方法
      await app.login()
      
      wx.hideLoading()
      
      // 更新页面数据
      this.getUserInfo()
      this.getHealthData()
      
      wx.showToast({ title: '登录成功', icon: 'success' })
      
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  },

  async guestLogin() {
    const app = getApp() as IAppOption
    
    try {
      wx.showLoading({ title: '登录中...' })
      
      await app.guestLogin()
      
      wx.hideLoading()
      
      // 更新页面数据
      this.getUserInfo()
      
      wx.showToast({ title: '欢迎回来', icon: 'success' })
      
    } catch (error) {
      wx.hideLoading()
      console.error('游客登录失败:', error)
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  },

  logout() {
    const app = getApp() as IAppOption
    
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 调用退出登录
          app.logout()
          
          // 重置页面数据
          this.setData({
            userInfo: {
              avatarUrl: '',
              nickName: '',
              age: 28,
              gender: '男',
              height: 170,
              weight: 65
            },
            isLoggedIn: false,
            healthData: {
              status: '未评测',
              date: '',
              score: 0,
              sasScore: 0,
              sdsScore: 0
            }
          })
          
          wx.showToast({ title: '已退出登录', icon: 'none' })
        }
      }
    })
  }
})
