// sleep-statistics.ts
import { sleepRecordService } from '../../utils/sleepCloud'

Page({
  data: {
    stats: {
      averageHours: '0',
      quality: 0,
      continuousDays: 0,
      bestDay: '暂无',
      worstDay: '暂无'
    },
    weekData: [] as Array<{day: string, height: number, label: string, actualHours?: number}>,
    qualityData: [
      { name: '深度睡眠', value: '0小时', percent: 0, color: '#0052D9' },
      { name: '浅度睡眠', value: '0小时', percent: 0, color: '#00A870' },
      { name: '快速眼动', value: '0小时', percent: 0, color: '#8B5CF6' }
    ],
    records: [] as Array<{
      date: string,
      status: string,
      timeRange: string,
      duration: number,
      quality: number,
      notes?: string
    }>,
    suggestion: '开始记录您的睡眠数据，查看详细统计和分析。',
    loading: true,
    timeRange: 'week', // 'week', 'month', 'year'
    hasData: false
  },

  onLoad() {
    this.loadStatistics();
  },

  async loadStatistics() {
    this.setData({ loading: true })
    
    try {
      // 加载睡眠记录
      const records = await sleepRecordService.getWeekRecords()
      
      if (records.length === 0) {
        this.setData({
          loading: false,
          hasData: false,
          suggestion: '暂无睡眠记录，开始记录您的睡眠数据。'
        })
        return
      }
      
      // 计算统计数据
      const stats = this.calculateStatistics(records)
      
      // 准备周数据图表
      const weekData = this.prepareWeekChartData(records)
      
      // 准备质量数据（模拟数据，实际应用中可能需要更详细的睡眠阶段数据）
      const qualityData = this.prepareQualityData(records)
      
      // 准备详细记录
      const formattedRecords = this.prepareRecords(records)
      
      // 生成建议
      const suggestion = this.generateSuggestion(stats)
      
      this.setData({
        stats,
        weekData,
        qualityData,
        records: formattedRecords,
        suggestion,
        loading: false,
        hasData: true
      })
      
      // 保存到本地存储作为备份
      wx.setStorageSync('sleepStats', stats)
      wx.setStorageSync('sleepRecords', formattedRecords)
    } catch (error) {
      console.error('加载统计失败:', error)
      
      // 使用本地存储的备份数据
      const localStats = wx.getStorageSync('sleepStats')
      const localRecords = wx.getStorageSync('sleepRecords')
      
      if (localStats && localRecords) {
        this.setData({
          stats: localStats,
          records: localRecords,
          loading: false,
          hasData: true
        })
      } else {
        this.setData({
          loading: false,
          hasData: false
        })
      }
    }
  },

  calculateStatistics(records: any[]) {
    if (records.length === 0) {
      return {
        averageHours: '0',
        quality: 0,
        continuousDays: 0,
        bestDay: '暂无',
        worstDay: '暂无'
      }
    }
    
    // 计算平均时长和质量
    const stats = sleepRecordService.calculateStatistics(records)
    
    // 查找最佳和最差睡眠日
    let bestRecord = records[0]
    let worstRecord = records[0]
    
    records.forEach(record => {
      if (record.actualHours > bestRecord.actualHours) {
        bestRecord = record
      }
      if (record.actualHours < worstRecord.actualHours) {
        worstRecord = record
      }
    })
    
    // 计算连续记录天数（简化版）
    const sortedRecords = [...records].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    let continuousDays = 1
    for (let i = 1; i < sortedRecords.length; i++) {
      const prevDate = new Date(sortedRecords[i-1].date)
      const currDate = new Date(sortedRecords[i].date)
      const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        continuousDays++
      } else {
        break
      }
    }
    
    return {
      averageHours: stats.averageHours.toFixed(1),
      quality: Math.round(stats.averageQuality * 20), // 转换为百分比（1-5分转换为20-100%）
      continuousDays,
      bestDay: bestRecord.date,
      worstDay: worstRecord.date
    }
  },

  prepareWeekChartData(records: any[]) {
    const daysOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    
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
        actualHours: actualHours
      })
    }
    
    return weekData
  },

  prepareQualityData(records: any[]) {
    // 模拟睡眠阶段数据（实际应用中需要从设备获取）
    const totalRecords = records.length
    const avgHours = parseFloat(this.data.stats.averageHours) || 7.5
    
    // 基于平均质量评分分配睡眠阶段
    const avgQuality = parseFloat(this.data.stats.quality) / 20 || 3 // 转换回1-5分
    
    let deepSleepPercent, lightSleepPercent, remSleepPercent
    
    if (avgQuality >= 4) {
      // 高质量睡眠：深度睡眠比例较高
      deepSleepPercent = 35
      lightSleepPercent = 50
      remSleepPercent = 15
    } else if (avgQuality >= 3) {
      // 中等质量睡眠
      deepSleepPercent = 25
      lightSleepPercent = 60
      remSleepPercent = 15
    } else {
      // 低质量睡眠
      deepSleepPercent = 20
      lightSleepPercent = 65
      remSleepPercent = 15
    }
    
    return [
      { 
        name: '深度睡眠', 
        value: `${(avgHours * deepSleepPercent / 100).toFixed(1)}小时`, 
        percent: deepSleepPercent, 
        color: '#0052D9' 
      },
      { 
        name: '浅度睡眠', 
        value: `${(avgHours * lightSleepPercent / 100).toFixed(1)}小时`, 
        percent: lightSleepPercent, 
        color: '#00A870' 
      },
      { 
        name: '快速眼动', 
        value: `${(avgHours * remSleepPercent / 100).toFixed(1)}小时`, 
        percent: remSleepPercent, 
        color: '#8B5CF6' 
      }
    ]
  },

  prepareRecords(records: any[]) {
    return records.slice(0, 10).map(record => {
      const status = this.getQualityText(record.quality)
      const timeRange = `${record.sleepTime} - ${record.wakeupTime}`
      
      return {
        date: record.date,
        status,
        timeRange,
        duration: record.actualHours,
        quality: record.quality,
        notes: record.notes
      }
    })
  },

  getQualityText(qualityScore: number): string {
    if (qualityScore >= 4.5) return '优秀'
    if (qualityScore >= 4.0) return '很好'
    if (qualityScore >= 3.0) return '良好'
    if (qualityScore >= 2.0) return '一般'
    return '较差'
  },

  generateSuggestion(stats: any): string {
    const avgHours = parseFloat(stats.averageHours)
    const quality = stats.quality
    
    if (avgHours === 0) {
      return '开始记录您的睡眠数据，获取个性化建议。'
    }
    
    let suggestion = ''
    
    if (avgHours < 7) {
      suggestion += '您的睡眠时长不足，建议增加睡眠时间至7-9小时。'
    } else if (avgHours > 9) {
      suggestion += '您的睡眠时间偏长，建议保持7-9小时的睡眠时长。'
    } else {
      suggestion += '您的睡眠时长在健康范围内。'
    }
    
    if (quality < 60) {
      suggestion += ' 睡眠质量有待提高，建议改善睡眠环境。'
    } else if (quality >= 80) {
      suggestion += ' 睡眠质量优秀，请继续保持。'
    } else {
      suggestion += ' 睡眠质量良好，仍有提升空间。'
    }
    
    if (stats.continuousDays >= 7) {
      suggestion += ' 您已连续记录7天以上，保持规律作息对健康很重要。'
    }
    
    return suggestion
  },

  // 切换时间范围
  switchTimeRange(e: any) {
    const range = e.currentTarget.dataset.range
    this.setData({ timeRange: range })
    
    // 在实际应用中，这里应该根据选择的时间范围加载不同的数据
    // 目前我们只实现了周数据，所以只是重新加载
    this.loadStatistics()
  },

  // 手动刷新数据
  refreshData() {
    this.loadStatistics()
  },

  // 跳转到睡眠记录页面（如果存在）
  navigateToRecord() {
    wx.showToast({
      title: '记录睡眠功能开发中',
      icon: 'none'
    })
  }
})
