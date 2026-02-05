// alarm-test.ts
import { triggerTestAlarm } from '../../utils/alarmTriggerService'
import { audioManager } from '../../utils/wakeAlgorithms'

// 微信小程序类型声明
declare const Page: any
declare const wx: any

Page({
  data: {
    soundTypes: [
      // 基础铃声
      { value: 'default', label: '默认铃声' },
      { value: 'birds', label: '鸟鸣声' },
      { value: 'waves', label: '海浪声' },
      { value: 'piano', label: '钢琴曲' },
      { value: 'chimes', label: '风铃声' },
      // 自然唤醒算法专用铃声
      { value: 'birds_gentle', label: '轻柔鸟鸣' },
      { value: 'birds_morning', label: '清晨鸟鸣' },
      { value: 'birds_chorus', label: '鸟鸣合唱' },
      { value: 'birds_full', label: '完整鸟鸣' },
      { value: 'waves_distant', label: '远处海浪' },
      { value: 'waves_gentle', label: '轻柔海浪' },
      { value: 'waves_medium', label: '中等海浪' },
      { value: 'waves_full', label: '完整海浪' },
      { value: 'nature_morning', label: '清晨自然声音' }
    ],
    wakeMethods: [
      { value: 'classic', label: '经典唤醒' },
      { value: 'gentle', label: '轻柔唤醒' },
      { value: 'natural', label: '自然唤醒' },
      { value: 'smart', label: '智能唤醒' }
    ],
    selectedSound: 'default',
    selectedMethod: 'classic',
    selectedSoundIndex: 0,
    selectedMethodIndex: 0,
    volume: 80,
    testStatus: '',
    isTesting: false,
    testLogs: [] as string[]
  },

  onLoad() {
    console.log('闹钟测试页面加载')
    this.addLog('页面加载完成')
    this.updateSelectedIndexes()
  },

  // 添加日志
  addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString()
    const log = `[${timestamp}] ${message}`
    console.log(log)
    
    const logs = [log, ...this.data.testLogs].slice(0, 20) // 最多保留20条日志
    this.setData({ testLogs: logs })
  },

  // 更新选中索引
  updateSelectedIndexes() {
    const soundIndex = this.data.soundTypes.findIndex((s: any) => s.value === this.data.selectedSound)
    const methodIndex = this.data.wakeMethods.findIndex((m: any) => m.value === this.data.selectedMethod)
    this.setData({
      selectedSoundIndex: soundIndex,
      selectedMethodIndex: methodIndex
    })
  },

  // 选择铃声
  onSoundChange(e: any) {
    const index = e.detail.value
    const sound = this.data.soundTypes[index].value
    this.setData({ 
      selectedSound: sound,
      selectedSoundIndex: index
    })
    this.addLog(`选择铃声: ${this.getSoundLabel(sound)}`)
  },

  // 选择唤醒方法
  onMethodChange(e: any) {
    const index = e.detail.value
    const method = this.data.wakeMethods[index].value
    this.setData({ 
      selectedMethod: method,
      selectedMethodIndex: index
    })
    this.addLog(`选择唤醒方法: ${this.getMethodLabel(method)}`)
  },

  // 音量变化
  onVolumeChange(e: any) {
    const volume = e.detail.value
    this.setData({ volume })
    this.addLog(`设置音量: ${volume}%`)
  },

  // 获取铃声标签
  getSoundLabel(value: string): string {
    const sound = this.data.soundTypes.find((s: any) => s.value === value)
    return sound ? sound.label : value
  },

  // 获取唤醒方法标签
  getMethodLabel(value: string): string {
    const method = this.data.wakeMethods.find((m: any) => m.value === value)
    return method ? method.label : value
  },

  // 测试单个铃声
  async testSingleSound() {
    if (this.data.isTesting) {
      wx.showToast({
        title: '正在测试中',
        icon: 'none'
      })
      return
    }

    this.setData({ isTesting: true, testStatus: '测试中...' })
    this.addLog(`开始测试铃声: ${this.getSoundLabel(this.data.selectedSound)}`)

    try {
      // 直接使用音频管理器播放声音
      await audioManager.playSound(this.data.selectedSound, this.data.volume)
      
      this.addLog('铃声播放成功')
      this.setData({ testStatus: '播放成功' })
      
      wx.showToast({
        title: '播放成功',
        icon: 'success'
      })
    } catch (error: any) {
      console.error('测试失败:', error)
      this.addLog(`播放失败: ${error.message || '未知错误'}`)
      this.setData({ testStatus: '播放失败' })
      
      wx.showToast({
        title: '播放失败',
        icon: 'error'
      })
    } finally {
      this.setData({ isTesting: false })
    }
  },

  // 测试完整闹钟
  async testFullAlarm() {
    if (this.data.isTesting) {
      wx.showToast({
        title: '正在测试中',
        icon: 'none'
      })
      return
    }

    this.setData({ isTesting: true, testStatus: '测试中...' })
    this.addLog(`开始测试完整闹钟: ${this.getSoundLabel(this.data.selectedSound)} + ${this.getMethodLabel(this.data.selectedMethod)}`)

    try {
      // 使用triggerTestAlarm函数测试
      const success = await triggerTestAlarm(
        this.data.selectedMethod,
        this.data.selectedSound,
        0.1 // 0.1分钟后触发（6秒后）
      )

      if (success) {
        this.addLog('闹钟测试已启动，6秒后触发')
        this.setData({ testStatus: '测试已启动' })
        
        wx.showToast({
          title: '测试已启动',
          icon: 'success'
        })
      } else {
        this.addLog('闹钟测试启动失败')
        this.setData({ testStatus: '启动失败' })
        
        wx.showToast({
          title: '启动失败',
          icon: 'error'
        })
      }
    } catch (error: any) {
      console.error('测试失败:', error)
      this.addLog(`测试失败: ${error.message || '未知错误'}`)
      this.setData({ testStatus: '测试失败' })
      
      wx.showToast({
        title: '测试失败',
        icon: 'error'
      })
    } finally {
      this.setData({ isTesting: false })
    }
  },

  // 停止所有声音
  stopAllSounds() {
    try {
      audioManager.stopAll()
      this.addLog('已停止所有声音')
      this.setData({ testStatus: '已停止' })
      
      wx.showToast({
        title: '已停止',
        icon: 'success'
      })
    } catch (error: any) {
      console.error('停止失败:', error)
      this.addLog(`停止失败: ${error.message || '未知错误'}`)
      
      wx.showToast({
        title: '停止失败',
        icon: 'error'
      })
    }
  },

  // 清除日志
  clearLogs() {
    this.setData({ testLogs: [] })
    this.addLog('日志已清除')
  },

  // 复制日志
  copyLogs() {
    const logsText = this.data.testLogs.join('\n')
    wx.setClipboardData({
      data: logsText,
      success: () => {
        wx.showToast({
          title: '日志已复制',
          icon: 'success'
        })
      }
    })
  }
})