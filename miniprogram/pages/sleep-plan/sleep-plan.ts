// sleep-plan.ts
import { sleepTargetService, sleepRecordService, sleepAlarmService } from '../../utils/sleepCloud'

Page({
  data: {
    sleepTarget: {
      hours: 8,
      bedtime: '22:30',
      wakeTime: '06:30',
      remainingTime: '6小时30分'
    },
    alarmCount: 0,
    weekData: [] as Array<{day: string, height: number, label: string, isToday: boolean, actualHours?: number}>,
    averageSleep: '0',
    sleepQuality: '暂无数据',
    suggestion: '开始记录您的睡眠数据，获取个性化建议。',
    loading: true,
    hasData: false
  },

  onLoad() {
    this.loadSleepData();
  },

  onShow() {
    this.loadSleepData();
  },

  async loadSleepData() {
    this.setData({ loading: true })
    
    try {
      // 1. 加载睡眠目标
      await this.loadSleepTarget()
      
      // 2. 加载闹钟数量
      await this.loadAlarmCount()
      
      // 3. 加载本周睡眠数据
      await this.loadWeekSleepData()
      
      // 4. 生成睡眠建议
      this.generateSleepSuggestion()
      
      this.setData({ 
        loading: false,
        hasData: true 
      })
    } catch (error) {
      console.error('加载睡眠数据失败:', error)
      this.setData({ 
        loading: false,
        hasData: false 
      })
    }
  },

  async loadSleepTarget() {
    try {
      const target = await sleepTargetService.getCurrentTarget()
      
      if (target) {
        const remainingTime = sleepTargetService.calculateRemainingTime(target.bedtime)
        this.setData({
          sleepTarget: {
            hours: target.targetHours,
            bedtime: target.bedtime,
            wakeTime: target.wakeTime,
            remainingTime: remainingTime
          }
        })
        
        // 保存到本地存储作为备份
        wx.setStorageSync('sleepTarget', {
          hours: target.targetHours,
          bedtime: target.bedtime,
          wakeTime: target.wakeTime,
          remainingTime: remainingTime
        })
      } else {
        // 使用默认值
        const remainingTime = sleepTargetService.calculateRemainingTime(this.data.sleepTarget.bedtime)
        this.setData({
          'sleepTarget.remainingTime': remainingTime
        })
      }
    } catch (error) {
      console.error('加载睡眠目标失败:', error)
      // 使用本地存储的备份数据
      const localTarget = wx.getStorageSync('sleepTarget')
      if (localTarget) {
        this.setData({ sleepTarget: localTarget })
      }
    }
  },

  async loadAlarmCount() {
    try {
      const alarms = await sleepAlarmService.getUserAlarms()
      const activeAlarms = alarms.filter(alarm => alarm.isActive)
      this.setData({ alarmCount: activeAlarms.length })
      
      // 保存到本地存储作为备份
      wx.setStorageSync('alarmCount', activeAlarms.length)
    } catch (error) {
      console.error('加载闹钟数量失败:', error)
      // 使用本地存储的备份数据
      const localCount = wx.getStorageSync('alarmCount')
      if (localCount !== undefined) {
        this.setData({ alarmCount: localCount })
      }
    }
  },

  async loadWeekSleepData() {
    try {
      const records = await sleepRecordService.getWeekRecords()
      
      if (records.length === 0) {
        // 没有数据，显示示例数据
        this.setData({
          weekData: this.getSampleWeekData(),
          averageSleep: '0',
          sleepQuality: '暂无数据'
        })
        return
      }
      
      // 计算统计数据
      const stats = sleepRecordService.calculateStatistics(records)
      
      // 准备周数据图表
      const weekData = this.prepareWeekChartData(records)
      
      // 根据平均质量评分确定质量描述
      const qualityText = this.getQualityText(stats.averageQuality)
      
      this.setData({
        weekData: weekData,
        averageSleep: stats.averageHours.toString(),
        sleepQuality: qualityText
      })
      
      // 保存到本地存储作为备份
      wx.setStorageSync('weekSleepData', {
        weekData: weekData,
        averageSleep: stats.averageHours,
        sleepQuality: qualityText
      })
    } catch (error) {
      console.error('加载周睡眠数据失败:', error)
      // 使用本地存储的备份数据或示例数据
      const localData = wx.getStorageSync('weekSleepData')
      if (localData) {
        this.setData({
          weekData: localData.weekData,
          averageSleep: localData.averageSleep.toString(),
          sleepQuality: localData.sleepQuality
        })
      } else {
        this.setData({
          weekData: this.getSampleWeekData(),
          averageSleep: '0',
          sleepQuality: '暂无数据'
        })
      }
    }
  },

  prepareWeekChartData(records: any[]): Array<{day: string, height: number, label: string, isToday: boolean, actualHours?: number}> {
    const daysOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const today = new Date().getDay() // 0-6，0表示周日
    
    // 创建过去7天的数据
    const weekData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayIndex = date.getDay()
      const dayName = daysOfWeek[dayIndex]
      
      // 查找当天的记录
      const dateStr = date.toISOString().split('T')[0]
      const record = records.find(r => r.date === dateStr)
      
      // 计算柱状图高度（基于8小时为100%）
      const actualHours = record ? record.actualHours : 0
      const height = Math.min(Math.round((actualHours / 8) * 100), 100)
      
      weekData.push({
        day: dayName,
        height: height,
        label: dayName,
        isToday: dayIndex === today,
        actualHours: actualHours
      })
    }
    
    return weekData
  },

  getSampleWeekData() {
    const daysOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const today = new Date().getDay()
    
    return daysOfWeek.map((day, index) => ({
      day: day,
      height: Math.floor(Math.random() * 30) + 70, // 70-100之间的随机高度
      label: day,
      isToday: index === today
    }))
  },

  getQualityText(qualityScore: number): string {
    if (qualityScore >= 4.5) return '优秀'
    if (qualityScore >= 4.0) return '很好'
    if (qualityScore >= 3.0) return '良好'
    if (qualityScore >= 2.0) return '一般'
    return '较差'
  },

  generateSleepSuggestion() {
    const avgSleep = parseFloat(this.data.averageSleep)
    const quality = this.data.sleepQuality
    
    let suggestion = ''
    
    if (avgSleep === 0) {
      suggestion = '开始记录您的睡眠数据，获取个性化建议。'
    } else if (avgSleep < 7) {
      suggestion = '您的睡眠时长不足，建议增加睡眠时间至7-9小时，保持规律作息。'
    } else if (avgSleep > 9) {
      suggestion = '您的睡眠时间偏长，建议保持7-9小时的睡眠时长，白天适当增加活动量。'
    } else if (quality === '较差' || quality === '一般') {
      suggestion = '睡眠质量有待提高，建议睡前1小时避免使用电子设备，保持卧室安静黑暗。'
    } else {
      suggestion = '您的睡眠习惯良好，请继续保持规律的作息时间。'
    }
    
    this.setData({ suggestion })
  },

  navigateToAlarm() {
    wx.navigateTo({
      url: '/pages/alarm/alarm'
    });
  },

  navigateToStatistics() {
    wx.navigateTo({
      url: '/pages/sleep-statistics/sleep-statistics'
    });
  },

  // 跳转到睡眠设置页面
  navigateToSettings() {
    wx.navigateTo({
      url: '/pages/sleep-settings/sleep-settings'
    });
  },

  // 手动刷新数据
  refreshData() {
    this.loadSleepData();
  }
});
