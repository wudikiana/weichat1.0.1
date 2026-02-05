// 睡眠云开发工具类
// @ts-nocheck
import { getUserId } from './authService'

const db = wx.cloud.database()
const _ = db.command

// 睡眠目标集合
const sleepTargetsCollection = db.collection('sleep_targets')
// 睡眠记录集合
const sleepRecordsCollection = db.collection('sleep_records')
// 睡眠闹钟集合
const sleepAlarmsCollection = db.collection('sleep_alarms')

export interface SleepTarget {
  _id?: string
  userId: string
  targetHours: number // 目标睡眠时长（小时）
  bedtime: string // 就寝时间，格式：HH:mm
  wakeTime: string // 起床时间，格式：HH:mm
  daysOfWeek: number[] // 生效的星期几，0-6表示周日到周六
  isActive: boolean // 是否激活
  createdAt: Date
  updatedAt: Date
}

export interface SleepRecord {
  _id?: string
  userId: string
  date: string // 日期，格式：YYYY-MM-DD
  sleepTime: string // 入睡时间，格式：HH:mm
  wakeupTime: string // 醒来时间，格式：HH:mm
  actualHours: number // 实际睡眠时长（小时）
  quality: number // 睡眠质量评分，1-5分
  notes?: string // 备注
  createdAt: Date
}

export interface SleepAlarm {
  _id?: string
  userId: string
  time: string // 闹钟时间，格式：HH:mm
  label: string // 闹钟标签
  daysOfWeek: number[] // 重复的星期几，0-6表示周日到周六
  isActive: boolean // 是否激活
  sound: string // 铃声类型（纯声音）
  wakeMethod: string // 唤醒方法
  vibrate: boolean // 是否震动
  note?: string // 备注
  createdAt: Date
  updatedAt: Date
}

// 获取当前用户ID（使用微信 openid）
async function getCurrentUserId(): Promise<string> {
  return await getUserId()
}

// 睡眠目标相关操作
export const sleepTargetService = {
  // 获取当前用户的睡眠目标
  async getCurrentTarget(): Promise<SleepTarget | null> {
    try {
      const userId = getCurrentUserId()
      const result = await sleepTargetsCollection
        .where({
          userId: userId,
          isActive: true
        })
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get()

      if (result.data.length > 0) {
        return result.data[0]
      }
      return null
    } catch (error) {
      console.error('获取睡眠目标失败:', error)
      return null
    }
  },

  // 创建或更新睡眠目标
  async saveTarget(targetData: Partial<SleepTarget>): Promise<string> {
    try {
      const userId = getCurrentUserId()
      const now = new Date()

      // 检查是否已存在活跃目标
      const existingTarget = await this.getCurrentTarget()

      if (existingTarget && existingTarget._id) {
        // 更新现有目标
        await sleepTargetsCollection.doc(existingTarget._id).update({
          data: {
            ...targetData,
            updatedAt: now
          }
        })
        return existingTarget._id
      } else {
        // 创建新目标
        const newTarget: SleepTarget = {
          userId,
          targetHours: targetData.targetHours || 8,
          bedtime: targetData.bedtime || '22:30',
          wakeTime: targetData.wakeTime || '06:30',
          daysOfWeek: targetData.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
          isActive: true,
          createdAt: now,
          updatedAt: now
        }

        const result = await sleepTargetsCollection.add({
          data: newTarget
        })
        return result._id
      }
    } catch (error) {
      console.error('保存睡眠目标失败:', error)
      throw error
    }
  },

  // 计算距离目标就寝时间的剩余时间
  calculateRemainingTime(bedtime: string): string {
    const now = new Date()
    const [hours, minutes] = bedtime.split(':').map(Number)
    const targetTime = new Date()
    targetTime.setHours(hours, minutes, 0, 0)

    // 如果目标时间已经过去，则计算到明天的目标时间
    if (targetTime < now) {
      targetTime.setDate(targetTime.getDate() + 1)
    }

    const diffMs = targetTime.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    return `${diffHours}小时${diffMinutes}分`
  }
}

// 睡眠记录相关操作
export const sleepRecordService = {
  // 获取今日睡眠记录
  async getTodayRecord(): Promise<SleepRecord | null> {
    try {
      const userId = getCurrentUserId()
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      const result = await sleepRecordsCollection
        .where({
          userId: userId,
          date: today
        })
        .limit(1)
        .get()

      if (result.data.length > 0) {
        return result.data[0]
      }
      return null
    } catch (error) {
      console.error('获取今日睡眠记录失败:', error)
      return null
    }
  },

  // 获取最近7天的睡眠记录
  async getWeekRecords(): Promise<SleepRecord[]> {
    try {
      const userId = getCurrentUserId()
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)

      const result = await sleepRecordsCollection
        .where({
          userId: userId,
          date: _.gte(weekAgo.toISOString().split('T')[0])
        })
        .orderBy('date', 'desc')
        .get()

      return result.data
    } catch (error) {
      console.error('获取周睡眠记录失败:', error)
      return []
    }
  },

  // 保存睡眠记录
  async saveRecord(recordData: Partial<SleepRecord>): Promise<string> {
    try {
      const userId = getCurrentUserId()
      const now = new Date()
      const date = recordData.date || now.toISOString().split('T')[0]

      // 检查是否已存在今日记录
      const existingRecord = await this.getTodayRecord()

      if (existingRecord && existingRecord._id) {
        // 更新现有记录
        await sleepRecordsCollection.doc(existingRecord._id).update({
          data: {
            ...recordData,
            date,
            updatedAt: now
          }
        })
        return existingRecord._id
      } else {
        // 创建新记录
        const newRecord: SleepRecord = {
          userId,
          date,
          sleepTime: recordData.sleepTime || '22:30',
          wakeupTime: recordData.wakeupTime || '06:30',
          actualHours: recordData.actualHours || 8,
          quality: recordData.quality || 3,
          notes: recordData.notes || '',
          createdAt: now
        }

        const result = await sleepRecordsCollection.add({
          data: newRecord
        })
        return result._id
      }
    } catch (error) {
      console.error('保存睡眠记录失败:', error)
      throw error
    }
  },

  // 计算平均睡眠时长和质量
  calculateStatistics(records: SleepRecord[]): {
    averageHours: number
    averageQuality: number
    totalDays: number
  } {
    if (records.length === 0) {
      return { averageHours: 0, averageQuality: 0, totalDays: 0 }
    }

    const totalHours = records.reduce((sum, record) => sum + record.actualHours, 0)
    const totalQuality = records.reduce((sum, record) => sum + record.quality, 0)

    return {
      averageHours: parseFloat((totalHours / records.length).toFixed(1)),
      averageQuality: parseFloat((totalQuality / records.length).toFixed(1)),
      totalDays: records.length
    }
  }
}

// 睡眠闹钟相关操作
export const sleepAlarmService = {
  // 获取用户的所有闹钟
  async getUserAlarms(): Promise<SleepAlarm[]> {
    try {
      const userId = getCurrentUserId()
      const result = await sleepAlarmsCollection
        .where({
          userId: userId
        })
        .orderBy('time', 'asc')
        .get()

      return result.data
    } catch (error) {
      console.error('获取闹钟失败:', error)
      return []
    }
  },

  // 创建闹钟
  async createAlarm(alarmData: Partial<SleepAlarm>): Promise<string> {
    try {
      const userId = getCurrentUserId()
      const now = new Date()

      const newAlarm: SleepAlarm = {
        userId,
        time: alarmData.time || '07:00',
        label: alarmData.label || '起床闹钟',
        daysOfWeek: alarmData.daysOfWeek || [1, 2, 3, 4, 5], // 默认周一到周五
        isActive: alarmData.isActive !== undefined ? alarmData.isActive : true,
        sound: alarmData.sound || 'default',
        wakeMethod: alarmData.wakeMethod || 'classic', // 默认经典唤醒
        vibrate: alarmData.vibrate !== undefined ? alarmData.vibrate : true,
        createdAt: now,
        updatedAt: now
      }

      const result = await sleepAlarmsCollection.add({
        data: newAlarm
      })
      return result._id
    } catch (error) {
      console.error('创建闹钟失败:', error)
      throw error
    }
  },

  // 更新闹钟
  async updateAlarm(alarmId: string, alarmData: Partial<SleepAlarm>): Promise<void> {
    try {
      // 创建更新数据副本，排除系统字段
      const updateData: any = { ...alarmData }
      
      // 删除不允许更新的系统字段
      delete updateData._id
      delete updateData._openid  // 云开发自动添加的字段
      delete updateData.userId
      delete updateData.createdAt
      
      // 确保wakeMethod字段有值
      const finalUpdateData = {
        ...updateData,
        wakeMethod: updateData.wakeMethod || 'classic', // 确保有默认值
        updatedAt: new Date()
      }
      
      await sleepAlarmsCollection.doc(alarmId).update({
        data: finalUpdateData
      })
    } catch (error) {
      console.error('更新闹钟失败:', error)
      throw error
    }
  },

  // 删除闹钟
  async deleteAlarm(alarmId: string): Promise<void> {
    try {
      await sleepAlarmsCollection.doc(alarmId).remove()
    } catch (error) {
      console.error('删除闹钟失败:', error)
      throw error
    }
  }
}

// 云函数相关操作
export const cloudFunctionService = {
  // 调用睡眠统计云函数
  async getSleepStatistics(options: {
    startDate?: string
    endDate?: string
    type?: 'week' | 'month' | 'custom'
  } = {}): Promise<any> {
    try {
      const openid = await getUserId()
      const { startDate, endDate, type = 'week' } = options

      const result = await wx.cloud.callFunction({
        name: 'sleepStatistics',
        data: {
          openid,  // 使用 openid 替代 userId
          startDate,
          endDate,
          type
        }
      })

      return result.result
    } catch (error) {
      console.error('调用睡眠统计云函数失败:', error)
      throw error
    }
  },

  // 调用睡眠建议云函数
  async getSleepSuggestions(days: number = 7): Promise<any> {
    try {
      const openid = await getUserId()

      const result = await wx.cloud.callFunction({
        name: 'sleepSuggestions',
        data: {
          openid,  // 使用 openid 替代 userId
          days
        }
      })

      return result.result
    } catch (error) {
      console.error('调用睡眠建议云函数失败:', error)
      throw error
    }
  },

  // 调用数据备份云函数
  async backupSleepData(options: {
    action: 'export' | 'summary' | 'cleanup'
    format?: 'json' | 'csv' | 'text'
    startDate?: string
    endDate?: string
  }): Promise<any> {
    try {
      const openid = await getUserId()
      const { action, format = 'json', startDate, endDate } = options

      const result = await wx.cloud.callFunction({
        name: 'sleepBackup',
        data: {
          openid,  // 使用 openid 替代 userId
          action,
          format,
          startDate,
          endDate
        }
      })

      return result.result
    } catch (error) {
      console.error('调用数据备份云函数失败:', error)
      throw error
    }
  },

  // 导出睡眠数据
  async exportSleepData(format: 'json' | 'csv' | 'text' = 'json', startDate?: string, endDate?: string): Promise<any> {
    return this.backupSleepData({
      action: 'export',
      format,
      startDate,
      endDate
    })
  },

  // 获取数据摘要
  async getDataSummary(startDate?: string, endDate?: string): Promise<any> {
    return this.backupSleepData({
      action: 'summary',
      startDate,
      endDate
    })
  },

  // 清理旧数据
  async cleanupOldData(): Promise<any> {
    return this.backupSleepData({
      action: 'cleanup'
    })
  }
}

export default {
  sleepTargetService,
  sleepRecordService,
  sleepAlarmService,
  cloudFunctionService
}
