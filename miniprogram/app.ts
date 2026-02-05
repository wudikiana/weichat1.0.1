// app.ts
import { IAppOption } from '../typings'

const app = App as IAppOptionConstructor<IAppOption>

app({
  globalData: {
    userInfo: undefined as any,
    openid: '',
    isLoggedIn: false,
    token: ''
  },

  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 初始化云开发
    this.initCloudBase()

    // 尝试自动登录
    this.autoLogin()
  },

  // 初始化云开发
  initCloudBase() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    // 初始化云开发环境
    wx.cloud.init({
      env: 'cloudbase-9ghm3xfo6fefd1bb', // 用户提供的环境ID
      traceUser: true,
    })

    console.log('云开发初始化完成')

    // 启动闹钟触发服务
    this.startAlarmTriggerService()
  },

  // 启动闹钟触发服务
  startAlarmTriggerService() {
    try {
      // 使用require代替动态导入，避免小程序环境兼容性问题
      const alarmTriggerService = require('./utils/alarmTriggerService')
      alarmTriggerService.startAlarmTriggerService()
      console.log('闹钟触发服务已启动')
    } catch (error) {
      console.error('启动闹钟触发服务失败:', error)
    }
  },

  // 微信用户登录
  async login() {
    try {
      wx.showLoading({ title: '正在登录...', mask: true })

      // 获取用户信息（需要用户授权）
      const userProfileRes = await wx.getUserProfile({
        desc: '用于完善用户资料',
        lang: 'zh_CN',
      })

      // 调用云函数登录
      const cloudRes = await wx.cloud.callFunction({
        name: 'login',
        data: {
          userInfo: {
            nickName: userProfileRes.userInfo.nickName,
            avatarUrl: userProfileRes.userInfo.avatarUrl,
            city: userProfileRes.userInfo.city,
            province: userProfileRes.userInfo.province,
            country: userProfileRes.userInfo.country,
            language: userProfileRes.userInfo.language,
            gender: userProfileRes.userInfo.gender
          },
          loginType: 'wechat'
        }
      }) as any

      wx.hideLoading()

      if (cloudRes.result && cloudRes.result.success) {
        const { userInfo, token, isNewUser } = cloudRes.result.data

        // 构建完整的用户信息
        const fullUserInfo = {
          ...userProfileRes.userInfo,
          ...userInfo,
          openid: cloudRes.result.data.openid,
          age: userInfo.age || 28,
          gender: userInfo.gender || (userProfileRes.userInfo.gender === 1 ? '男' : userProfileRes.userInfo.gender === 2 ? '女' : '未知'),
          height: userInfo.height || 170,
          weight: userInfo.weight || 65,
          phone: userInfo.phone || ''
        }

        // 保存用户信息到全局
        this.globalData.userInfo = fullUserInfo
        this.globalData.openid = cloudRes.result.data.openid
        this.globalData.isLoggedIn = true
        this.globalData.token = token

        // 保存到本地存储
        wx.setStorageSync('userInfo', fullUserInfo)
        wx.setStorageSync('openid', cloudRes.result.data.openid)
        wx.setStorageSync('token', token)
        wx.setStorageSync('isLoggedIn', true)

        // 保存到云数据库
        try {
          // 保存到 users 集合（用于登录认证）
          await this.updateUserInfo(fullUserInfo)
          console.log('用户信息已保存到 users 集合')

          // 保存到 user_health_profiles 集合（健康档案）
          await this.saveHealthProfile('userInfo', fullUserInfo)
          console.log('用户健康档案已保存到 user_health_profiles 集合')
        } catch (cloudError) {
          console.error('保存到云数据库失败:', cloudError)
        }

        // 如果是新用户，显示欢迎提示
        if (isNewUser) {
          wx.showToast({
            title: '注册成功，欢迎使用',
            icon: 'success',
            duration: 2000
          })
        } else {
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1500
          })
        }

        return {
          success: true,
          userInfo: fullUserInfo,
          isNewUser
        }
      } else {
        throw new Error(cloudRes.result?.message || '登录失败')
      }

    } catch (error: any) {
      wx.hideLoading()
      console.error('微信登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none'
      })
      throw error
    }
  },

  // 游客登录（无需授权，快速体验）
  async guestLogin() {
    try {
      wx.showLoading({ title: '正在登录...', mask: true })

      // 调用云函数获取游客身份
      const cloudRes = await wx.cloud.callFunction({
        name: 'login',
        data: {
          userInfo: {
            nickName: '游客用户',
            avatarUrl: ''
          },
          loginType: 'guest'
        }
      }) as any

      wx.hideLoading()

      if (cloudRes.result && cloudRes.result.success) {
        const { userInfo, token } = cloudRes.result.data

        // 构建完整的用户信息
        const fullUserInfo = {
          ...userInfo,
          openid: cloudRes.result.data.openid,
          nickName: userInfo.nickName || '游客用户',
          age: userInfo.age || 28,
          gender: userInfo.gender || '男',
          height: userInfo.height || 170,
          weight: userInfo.weight || 65,
          phone: userInfo.phone || ''
        }

        // 保存用户信息到全局
        this.globalData.userInfo = fullUserInfo
        this.globalData.openid = cloudRes.result.data.openid
        this.globalData.isLoggedIn = true
        this.globalData.token = token

        // 保存到本地存储
        wx.setStorageSync('userInfo', fullUserInfo)
        wx.setStorageSync('openid', cloudRes.result.data.openid)
        wx.setStorageSync('token', token)
        wx.setStorageSync('isLoggedIn', true)

        // 保存到云数据库
        try {
          // 保存到 users 集合（用于登录认证）
          await this.updateUserInfo(fullUserInfo)
          console.log('用户信息已保存到 users 集合')

          // 保存到 user_health_profiles 集合（健康档案）
          await this.saveHealthProfile('userInfo', fullUserInfo)
          console.log('用户健康档案已保存到 user_health_profiles 集合')
        } catch (cloudError) {
          console.error('保存到云数据库失败:', cloudError)
        }

        wx.showToast({
          title: '欢迎回来',
          icon: 'success',
          duration: 1500
        })

        return {
          success: true,
          userInfo: fullUserInfo,
          isNewUser: cloudRes.result.data.isNewUser
        }
      } else {
        throw new Error(cloudRes.result?.message || '游客登录失败')
      }

    } catch (error: any) {
      wx.hideLoading()
      console.error('游客登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none'
      })
      throw error
    }
  },

  // 自动登录（检查本地缓存）
  async autoLogin() {
    try {
      const localUserInfo = wx.getStorageSync('userInfo')
      const localOpenid = wx.getStorageSync('openid')
      const localToken = wx.getStorageSync('token')
      const isLoggedIn = wx.getStorageSync('isLoggedIn')

      if (localUserInfo && localOpenid && isLoggedIn) {
        // 验证Token是否有效
        try {
          const cloudRes = await wx.cloud.callFunction({
            name: 'login',
            data: {
              loginType: 'auto'
            }
          }) as any

          if (cloudRes.result && cloudRes.result.success) {
            this.globalData.userInfo = localUserInfo
            this.globalData.openid = localOpenid
            this.globalData.token = localToken
            this.globalData.isLoggedIn = true

            console.log('自动登录成功')
          } else {
            // Token无效，清除本地缓存
            this.logout()
          }
        } catch (error) {
          console.error('自动登录验证失败:', error)
          // 网络错误时，使用本地缓存
          this.globalData.userInfo = localUserInfo
          this.globalData.openid = localOpenid
          this.globalData.token = localToken
          this.globalData.isLoggedIn = true
        }
      }
    } catch (error) {
      console.error('自动登录检查失败:', error)
    }
  },

  // 退出登录
  logout() {
    // 清除全局数据
    this.globalData.userInfo = undefined
    this.globalData.openid = ''
    this.globalData.isLoggedIn = false
    this.globalData.token = ''

    // 清除本地存储
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('openid')
    wx.removeStorageSync('token')
    wx.removeStorageSync('isLoggedIn')

    console.log('已退出登录')
  },

  // 更新用户信息到云数据库
  async updateUserInfo(userInfo: any): Promise<void> {
    try {
      // 调用云函数保存用户信息
      const res = await wx.cloud.callFunction({
        name: 'saveUserInfo',
        data: {
          userInfo: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender,
            age: userInfo.age,
            height: userInfo.height,
            weight: userInfo.weight,
            phone: userInfo.phone,
            city: userInfo.city,
            province: userInfo.province
          }
        }
      }) as any

      if (res.result && res.result.success) {
        console.log('用户信息已保存到云数据库:', res.result.message)
      } else {
        throw new Error(res.result?.message || '保存用户信息失败')
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      throw error
    }
  },

  // 从云数据库获取用户信息
  async getUserFromCloud(): Promise<any> {
    try {
      // 调用云函数获取用户信息
      const res = await wx.cloud.callFunction({
        name: 'getUserInfo',
        data: {}
      }) as any

      if (res.result && res.result.success) {
        return res.result.data
      }
      return null
    } catch (error) {
      console.error('从云获取用户信息失败:', error)
      return null
    }
  },

  // 保存用户健康档案到云数据库
  async saveHealthProfile(profileType: string, data: any): Promise<void> {
    try {
      const res = await wx.cloud.callFunction({
        name: 'saveHealthProfile',
        data: {
          profileType: profileType,
          data: data
        }
      }) as any

      if (res.result && res.result.success) {
        console.log('用户健康档案已保存:', res.result.message)
      } else {
        throw new Error(res.result?.message || '保存用户健康档案失败')
      }
    } catch (error) {
      console.error('保存用户健康档案失败:', error)
      throw error
    }
  },

  // 从云数据库获取用户健康档案
  async getHealthProfile(profileType?: string): Promise<any> {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getHealthProfile',
        data: {
          profileType: profileType || 'full'
        }
      }) as any

      if (res.result && res.result.success) {
        return res.result.data
      }
      return null
    } catch (error) {
      console.error('获取用户健康档案失败:', error)
      return null
    }
  }
})

// 辅助类型，用于绕过严格的类型检查
interface IAppOptionConstructor<T> {
  (options: T): void
}
