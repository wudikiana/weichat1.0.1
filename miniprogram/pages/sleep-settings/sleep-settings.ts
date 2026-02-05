// sleep-settings.ts
import { sleepTargetService } from '../../utils/sleepCloud'

Page({
  data: {
    sleepTarget: {
      hours: 8,
      bedtime: '22:30',
      wakeTime: '06:30'
    },
    smartRecommend: true,
    reminders: {
      bedtime: true,
      wakeup: true
    },
    loading: false,
    showTimePicker: false,
    timePickerType: 'bedtime', // 'bedtime' or 'wakeTime'
    timePickerValue: '22:30'
  },

  onLoad() {
    this.loadSettings();
  },

  async loadSettings() {
    this.setData({ loading: true })
    
    try {
      // 加载睡眠目标
      const target = await sleepTargetService.getCurrentTarget()
      
      if (target) {
        this.setData({
          sleepTarget: {
            hours: target.targetHours,
            bedtime: target.bedtime,
            wakeTime: target.wakeTime
          }
        })
      } else {
        // 使用本地存储的备份数据
        const localTarget = wx.getStorageSync('sleepTarget')
        if (localTarget) {
          this.setData({ sleepTarget: localTarget })
        }
      }
      
      // 加载其他设置
      const smartRecommend = wx.getStorageSync('smartRecommend') !== false
      const reminders = wx.getStorageSync('sleepReminders') || this.data.reminders
      
      this.setData({ 
        smartRecommend, 
        reminders,
        loading: false 
      })
    } catch (error) {
      console.error('加载设置失败:', error)
      this.setData({ loading: false })
    }
  },

  decreaseHours() {
    if (this.data.sleepTarget.hours > 1) {
      this.setData({
        'sleepTarget.hours': this.data.sleepTarget.hours - 1
      });
    }
  },

  increaseHours() {
    if (this.data.sleepTarget.hours < 12) {
      this.setData({
        'sleepTarget.hours': this.data.sleepTarget.hours + 1
      });
    }
  },

  showBedtimePicker() {
    this.setData({
      showTimePicker: true,
      timePickerType: 'bedtime',
      timePickerValue: this.data.sleepTarget.bedtime
    });
  },

  showWakeTimePicker() {
    this.setData({
      showTimePicker: true,
      timePickerType: 'wakeTime',
      timePickerValue: this.data.sleepTarget.wakeTime
    });
  },

  onTimePickerChange(e: any) {
    this.setData({
      timePickerValue: e.detail.value
    });
  },

  confirmTimePicker() {
    const { timePickerType, timePickerValue } = this.data
    
    if (timePickerType === 'bedtime') {
      this.setData({
        'sleepTarget.bedtime': timePickerValue,
        showTimePicker: false
      });
    } else {
      this.setData({
        'sleepTarget.wakeTime': timePickerValue,
        showTimePicker: false
      });
    }
  },

  cancelTimePicker() {
    this.setData({
      showTimePicker: false
    });
  },

  toggleSmartRecommend(e: any) {
    this.setData({ smartRecommend: e.detail.value });
  },

  toggleBedtimeReminder(e: any) {
    this.setData({
      'reminders.bedtime': e.detail.value
    });
  },

  toggleWakeupReminder(e: any) {
    this.setData({
      'reminders.wakeup': e.detail.value
    });
  },

  async saveSettings() {
    this.setData({ loading: true })
    
    try {
      // 保存睡眠目标到云开发
      await sleepTargetService.saveTarget({
        targetHours: this.data.sleepTarget.hours,
        bedtime: this.data.sleepTarget.bedtime,
        wakeTime: this.data.sleepTarget.wakeTime,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // 默认每天生效
      })
      
      // 保存其他设置到本地存储
      wx.setStorageSync('sleepTarget', this.data.sleepTarget)
      wx.setStorageSync('smartRecommend', this.data.smartRecommend)
      wx.setStorageSync('sleepReminders', this.data.reminders)
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('保存设置失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 重置为推荐设置
  resetToRecommended() {
    const recommendedTarget = {
      hours: 8,
      bedtime: '22:30',
      wakeTime: '06:30'
    }
    
    wx.showModal({
      title: '重置设置',
      content: '确定要重置为推荐设置吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            sleepTarget: recommendedTarget,
            smartRecommend: true,
            reminders: {
              bedtime: true,
              wakeup: true
            }
          })
          
          wx.showToast({
            title: '已重置',
            icon: 'success'
          })
        }
      }
    })
  }
});
