// alarm.ts
import { sleepAlarmService, type SleepAlarm } from '../../utils/sleepCloud'

// 微信小程序类型声明
declare const Page: any
declare const wx: any

Page({
  data: {
    alarms: [] as Array<{
      _id: string
      time: string
      repeat: string
      type: string
      enabled: boolean
      note?: string
      label: string
      daysOfWeek: number[]
      sound: string
      wakeMethod: string
    }>,
    loading: false
  },

  onLoad() {
    this.loadAlarms();
  },

  onShow() {
    // 页面显示时重新加载数据
    this.loadAlarms();
  },

  async loadAlarms() {
    this.setData({ loading: true })
    
    try {
      // 从云开发获取闹钟数据
      const cloudAlarms = await sleepAlarmService.getUserAlarms()
      
      // 转换数据格式
      const alarms = cloudAlarms.map((alarm: any) => {
        const repeatText = this.getRepeatText(alarm.daysOfWeek)
        const typeText = this.getAlarmTypeText(alarm.sound, alarm.wakeMethod)
        
        return {
          _id: alarm._id || '',
          time: alarm.time,
          repeat: repeatText,
          type: typeText,
          enabled: alarm.isActive,
          note: alarm.note,
          label: alarm.label,
          daysOfWeek: alarm.daysOfWeek,
          sound: alarm.sound,
          wakeMethod: alarm.wakeMethod || 'classic'
        }
      })
      
      this.setData({ alarms })
      
      // 同时保存到本地存储作为备份
      wx.setStorageSync('alarms', alarms)
    } catch (error) {
      console.error('加载闹钟失败:', error)
      
      // 如果云开发失败，使用本地存储的数据
      const localAlarms = wx.getStorageSync('alarms') || []
      this.setData({ alarms: localAlarms })
      
      wx.showToast({
        title: '使用本地数据',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 获取重复文本
  getRepeatText(daysOfWeek: number[]): string {
    if (!daysOfWeek || daysOfWeek.length === 0) {
      return '不重复'
    }
    
    if (daysOfWeek.length === 7) {
      return '每天'
    }
    
    if (daysOfWeek.length === 5 && 
        daysOfWeek.includes(1) && daysOfWeek.includes(2) && daysOfWeek.includes(3) && 
        daysOfWeek.includes(4) && daysOfWeek.includes(5) && 
        !daysOfWeek.includes(0) && !daysOfWeek.includes(6)) {
      return '工作日'
    }
    
    if (daysOfWeek.length === 2 && 
        ((daysOfWeek.includes(0) && daysOfWeek.includes(6)) || 
         (daysOfWeek.includes(6) && daysOfWeek.includes(0)))) {
      return '周末'
    }
    
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const dayTexts = daysOfWeek.map(day => dayNames[day])
    return dayTexts.join('、')
  },

  // 获取闹钟类型文本（铃声+唤醒方法）
  getAlarmTypeText(sound: string, wakeMethod: string): string {
    // 铃声映射
    const soundMap: Record<string, string> = {
      'default': '默认铃声',
      'birds': '鸟鸣声',
      'waves': '海浪声',
      'piano': '钢琴曲',
      'chimes': '风铃声'
    }
    
    // 唤醒方法映射
    const methodMap: Record<string, string> = {
      'gentle': '轻柔唤醒',
      'natural': '自然唤醒',
      'smart': '智能唤醒',
      'classic': '经典唤醒'
    }
    
    const soundText = soundMap[sound] || '默认铃声'
    const methodText = methodMap[wakeMethod] || '经典唤醒'
    
    // 如果是经典唤醒，只显示铃声
    if (wakeMethod === 'classic') {
      return soundText
    }
    
    // 其他情况显示组合
    return `${soundText} + ${methodText}`
  },

  // 获取铃声类型文本（兼容旧版本）
  getSoundTypeText(sound: string): string {
    const soundMap: Record<string, string> = {
      'default': '默认铃声',
      'gentle': '轻柔唤醒',
      'natural': '自然唤醒',
      'smart': '智能唤醒',
      'classic': '经典闹钟',
      'birds': '鸟鸣声',
      'waves': '海浪声'
    }
    return soundMap[sound] || '默认铃声'
  },

  // 切换闹钟状态
  async toggleAlarm(e: any) {
    const id = e.currentTarget.dataset.id;
    const enabled = e.detail.value;
    
    try {
      // 更新云开发中的闹钟状态
      await sleepAlarmService.updateAlarm(id, { isActive: enabled })
      
      // 更新本地数据
      const alarms = this.data.alarms.map((alarm: any) => {
        if (alarm._id === id) {
          return { ...alarm, enabled };
        }
        return alarm;
      });
      this.setData({ alarms });
      
      wx.showToast({
        title: enabled ? '闹钟已启用' : '闹钟已禁用',
        icon: 'success'
      });
    } catch (error) {
      console.error('切换闹钟状态失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      })
    }
  },

  // 添加闹钟
  addAlarm() {
    wx.navigateTo({
      url: '/pages/alarm-edit/alarm-edit'
    });
  },

  // 编辑闹钟
  editAlarm(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/alarm-edit/alarm-edit?id=${id}`
    });
  },

  // 删除闹钟
  async deleteAlarm(e: any) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个闹钟吗？',
      success: async (res: any) => {
        if (res.confirm) {
          try {
            // 从云开发删除
            await sleepAlarmService.deleteAlarm(id)
            
            // 更新本地数据
            const alarms = this.data.alarms.filter((alarm: any) => alarm._id !== id);
            this.setData({ alarms });
            
            wx.showToast({
              title: '已删除',
              icon: 'success'
            });
          } catch (error) {
            console.error('删除闹钟失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 跳转到测试页面
  goToTestPage() {
    wx.navigateTo({
      url: '/pages/alarm-test/alarm-test'
    });
  }
});
