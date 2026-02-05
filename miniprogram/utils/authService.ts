/**
 * 用户认证服务
 * 统一管理用户登录状态和 openid 获取
 */
const db = wx.cloud.database()
const _ = db.command

// 数据库集合
const usersCollection = db.collection('users')

// 存储键
const STORAGE_KEYS = {
  OPENID: 'openid',
  USER_INFO: 'userInfo',
  IS_LOGGED_IN: 'isLoggedIn',
  TOKEN: 'token',
  USER_ID: 'userId'
}

// 内存缓存
let cachedOpenid: string | null = null

/**
 * 安全获取全局应用实例
 */
function getAppInstance(): any {
  try {
    const app = getApp()
    return app || null
  } catch (e) {
    return null
  }
}

/**
 * 获取全局数据中的 openid
 */
function getGlobalOpenid(): string | null {
  const app = getAppInstance()
  if (app && app.globalData) {
    return app.globalData.openid || null
  }
  return null
}

/**
 * 设置全局数据中的 openid
 */
function setGlobalOpenid(openid: string): void {
  const app = getAppInstance()
  if (app && app.globalData) {
    app.globalData.openid = openid
  }
}

/**
 * 获取当前用户 openid
 * 优先级：
 * 1. 从内存缓存获取
 * 2. 从全局变量获取
 * 3. 从本地存储获取
 * 4. 调用云函数获取
 */
export async function getOpenid(): Promise<string | null> {
  // 1. 从内存缓存获取
  if (cachedOpenid) {
    return cachedOpenid
  }

  // 2. 从全局变量获取
  const globalOpenid = getGlobalOpenid()
  if (globalOpenid) {
    cachedOpenid = globalOpenid
    return globalOpenid
  }

  // 3. 从本地存储获取
  const localOpenid = wx.getStorageSync(STORAGE_KEYS.OPENID)
  if (localOpenid) {
    cachedOpenid = localOpenid
    setGlobalOpenid(localOpenid)
    return localOpenid
  }

  // 4. 调用云函数获取
  try {
    const res = await wx.cloud.callFunction({
      name: 'login',
      data: { loginType: 'openid' }
    }) as any

    if (res.result && res.result.success && res.result.data?.openid) {
      const openid = res.result.data.openid
      cachedOpenid = openid
      setGlobalOpenid(openid)
      wx.setStorageSync(STORAGE_KEYS.OPENID, openid)
      return openid
    }
  } catch (error) {
    console.error('获取 openid 失败:', error)
  }

  return null
}

/**
 * 获取当前用户 ID（用于数据库查询）
 * 使用 openid 作为用户唯一标识
 */
export async function getUserId(): Promise<string> {
  const openid = await getOpenid()
  if (openid) {
    return openid
  }

  // 如果无法获取 openid，使用本地存储的临时 ID
  let userId = wx.getStorageSync(STORAGE_KEYS.USER_ID)
  if (!userId) {
    userId = 'guest_' + Date.now()
    wx.setStorageSync(STORAGE_KEYS.USER_ID, userId)
  }
  return userId
}

/**
 * 检查用户是否已登录
 */
export function isLoggedIn(): boolean {
  // 清除缓存的 openid（如果用户已退出）
  if (cachedOpenid && !wx.getStorageSync(STORAGE_KEYS.OPENID)) {
    cachedOpenid = null
  }

  // 从全局变量获取
  const app = getAppInstance()
  if (app && app.globalData && app.globalData.isLoggedIn) {
    return true
  }

  // 从本地存储获取
  return wx.getStorageSync(STORAGE_KEYS.IS_LOGGED_IN) || false
}

/**
 * 获取用户信息
 */
export function getUserInfo(): any {
  const app = getAppInstance()
  if (app && app.globalData && app.globalData.userInfo) {
    return app.globalData.userInfo
  }
  return wx.getStorageSync(STORAGE_KEYS.USER_INFO)
}

/**
 * 用户登录（微信授权登录）
 */
export async function loginWithWechat(): Promise<{ success: boolean; message?: string; userInfo?: any }> {
  try {
    wx.showLoading({ title: '正在登录...', mask: true })

    // 获取用户信息
    const userProfileRes = await wx.getUserProfile({
      desc: '用于完善用户资料',
      lang: 'zh_CN',
    })

    // 调用云函数
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
      const openid = cloudRes.result.data.openid

      // 更新缓存
      cachedOpenid = openid

      // 保存到全局
      const app = getAppInstance()
      if (app && app.globalData) {
        app.globalData.userInfo = { ...userProfileRes.userInfo, ...userInfo }
        app.globalData.openid = openid
        app.globalData.isLoggedIn = true
        app.globalData.token = token
      }

      // 保存到本地存储
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, {
        ...userInfo,
        avatarUrl: userProfileRes.userInfo.avatarUrl,
        nickName: userProfileRes.userInfo.nickName
      })
      wx.setStorageSync(STORAGE_KEYS.OPENID, openid)
      wx.setStorageSync(STORAGE_KEYS.TOKEN, token)
      wx.setStorageSync(STORAGE_KEYS.IS_LOGGED_IN, true)

      wx.showToast({
        title: isNewUser ? '注册成功，欢迎使用' : '登录成功',
        icon: 'success',
        duration: 1500
      })

      return { success: true, userInfo }
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
    return { success: false, message: error.message }
  }
}

/**
 * 游客登录
 */
export async function loginAsGuest(): Promise<{ success: boolean; message?: string }> {
  try {
    wx.showLoading({ title: '正在登录...', mask: true })

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
      const openid = cloudRes.result.data.openid

      // 更新缓存
      cachedOpenid = openid

      const app = getAppInstance()
      if (app && app.globalData) {
        app.globalData.userInfo = undefined
        app.globalData.openid = openid
        app.globalData.isLoggedIn = true
        app.globalData.token = token
      }

      wx.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo)
      wx.setStorageSync(STORAGE_KEYS.OPENID, openid)
      wx.setStorageSync(STORAGE_KEYS.TOKEN, token)
      wx.setStorageSync(STORAGE_KEYS.IS_LOGGED_IN, true)

      wx.showToast({
        title: '欢迎回来',
        icon: 'success',
        duration: 1500
      })

      return { success: true }
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
    return { success: false, message: error.message }
  }
}

/**
 * 退出登录
 */
export function logout(): void {
  // 清除内存缓存
  cachedOpenid = null

  // 清除全局数据
  const app = getAppInstance()
  if (app && app.globalData) {
    app.globalData.userInfo = undefined
    app.globalData.openid = ''
    app.globalData.isLoggedIn = false
    app.globalData.token = ''
  }

  // 清除本地存储
  wx.removeStorageSync(STORAGE_KEYS.USER_INFO)
  wx.removeStorageSync(STORAGE_KEYS.OPENID)
  wx.removeStorageSync(STORAGE_KEYS.TOKEN)
  wx.removeStorageSync(STORAGE_KEYS.IS_LOGGED_IN)
  wx.removeStorageSync(STORAGE_KEYS.USER_ID)

  console.log('已退出登录')
}

/**
 * 获取或创建用户记录
 * @param userInfo 用户信息（可选，如果不传则从存储中获取）
 */
export async function getOrCreateUser(userInfo?: {
  nickName?: string
  avatarUrl?: string
  gender?: number
  city?: string
  province?: string
}): Promise<any> {
  const openid = await getOpenid()
  if (!openid) {
    throw new Error('无法获取用户 openid')
  }

  try {
    // 查询用户是否存在
    const existRes = await usersCollection.where({
      openid: openid
    }).get()

    if (existRes.data && existRes.data.length > 0) {
      // 用户已存在，更新登录时间
      await usersCollection.doc(existRes.data[0]._id).update({
        data: {
          updateTime: new Date()
        }
      })
      return existRes.data[0]
    }

    // 用户不存在，创建新用户
    const info = userInfo || wx.getStorageSync(STORAGE_KEYS.USER_INFO) || {}
    const newUser = {
      openid,
      nickName: info.nickName || '微信用户',
      avatarUrl: info.avatarUrl || '',
      gender: info.gender !== undefined ? (info.gender === 1 ? '男' : info.gender === 2 ? '女' : '未知') : '未知',
      city: info.city || '',
      province: info.province || '',
      isGuest: false,
      createTime: new Date(),
      updateTime: new Date()
    }

    const addRes = await usersCollection.add({
      data: newUser
    })

    return {
      _id: addRes.id,
      ...newUser
    }
  } catch (error) {
    console.error('获取/创建用户失败:', error)
    throw error
  }
}

/**
 * 更新用户信息
 * 如果用户不存在则创建，存在则更新
 */
export async function updateUserInfo(userInfo: {
  nickName?: string
  avatarUrl?: string
  gender?: string
  age?: number
  height?: number
  weight?: number
  phone?: string
  city?: string
  province?: string
  openid?: string
}): Promise<void> {
  const openid = await getOpenid()
  if (!openid) {
    throw new Error('无法获取用户 openid')
  }

  try {
    // 先查询用户是否存在
    const existRes = await usersCollection.where({
      openid: openid
    }).get()

    const now = new Date()

    // 创建更新数据副本，排除不允许的字段
    const updateData: any = { ...userInfo }
    delete updateData._id
    delete updateData.openid
    delete updateData._openid
    delete updateData.createTime

    if (existRes.data && existRes.data.length > 0) {
      // 用户已存在，更新信息
      await usersCollection.doc(existRes.data[0]._id).update({
        data: {
          ...updateData,
          updateTime: now
        }
      })
      console.log('用户信息已更新:', existRes.data[0]._id)
    } else {
      // 用户不存在，创建新记录
      const newUser = {
        openid: openid,
        nickName: userInfo.nickName || '微信用户',
        avatarUrl: userInfo.avatarUrl || '',
        gender: userInfo.gender || '未知',
        age: userInfo.age || 28,
        height: userInfo.height || 170,
        weight: userInfo.weight || 65,
        phone: userInfo.phone || '',
        city: userInfo.city || '',
        province: userInfo.province || '',
        createTime: now,
        updateTime: now
      }

      await usersCollection.add({
        data: newUser
      })
      console.log('新用户已创建:', openid)
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    throw error
  }
}

/**
 * 获取用户详细信息
 */
export async function getUserDetail(): Promise<any | null> {
  const openid = await getOpenid()
  if (!openid) {
    return null
  }

  try {
    const res = await usersCollection.where({
      openid: openid
    }).get()

    if (res.data && res.data.length > 0) {
      return res.data[0]
    }
    return null
  } catch (error) {
    console.error('获取用户详情失败:', error)
    return null
  }
}

export default {
  getOpenid,
  getUserId,
  isLoggedIn,
  getUserInfo,
  loginWithWechat,
  loginAsGuest,
  logout,
  getOrCreateUser,
  updateUserInfo,
  getUserDetail
}

