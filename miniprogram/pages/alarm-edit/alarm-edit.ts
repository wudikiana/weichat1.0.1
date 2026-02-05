// alarm-edit.ts
import { sleepAlarmService, type SleepAlarm } from '../../utils/sleepCloud'

Page({
  data: {
    // 闹钟数据
    alarm: {
      _id: '',
      time: '07:00',
      label: '起床闹钟',
      daysOfWeek: [1, 2, 3, 4, 5],
      isActive: true,
      sound: 'default',
      wakeMethod: 'classic', // 新增：唤醒方法
      vibrate: true,
      note: ''
    } as Partial<SleepAlarm>,
    
    // 时间选择器
    timeValue: [7, 0], // 默认07:00
    timeColumns: [
      Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}时`),
      Array.from({ length: 60 }, (_, i) => `${i.toString().padStart(2, '0')}分`)
    ],
    
    // 铃声选项（纯声音）
    soundOptions: [
      { label: '默认铃声', value: 'default' },
      { label: '鸟鸣声', value: 'birds' },
      { label: '海浪声', value: 'waves' },
      { label: '钢琴曲', value: 'piano' },
      { label: '风铃声', value: 'chimes' }
    ],
    
    // 用户自定义音乐列表
    customMusicList: [] as Array<{
      fileName: string,
      fileID: string,
      tempFileURL: string,
      soundType: string,
      displayName: string
    }>,
    
    // 音乐上传相关
    uploading: false,
    uploadProgress: 0,
    showMusicManager: false,
    
    // 唤醒方法选项
    wakeMethodOptions: [
      { label: '轻柔唤醒', value: 'gentle' },
      { label: '自然唤醒', value: 'natural' },
      { label: '智能唤醒', value: 'smart' },
      { label: '经典唤醒', value: 'classic' }
    ],
    
    // 星期选项（不再需要checked属性，由t-checkbox-group的value属性管理）
    dayOptions: [
      { label: '周一', value: 1 },
      { label: '周二', value: 2 },
      { label: '周三', value: 3 },
      { label: '周四', value: 4 },
      { label: '周五', value: 5 },
      { label: '周六', value: 6 },
      { label: '周日', value: 0 }
    ],
    
    // 预设标签
    presetLabels: [
      '起床闹钟',
      '就寝提醒',
      '午休提醒',
      '会议提醒',
      '吃药提醒',
      '运动提醒'
    ],
    
    // 编辑模式
    isEditMode: false,
    loading: false
  },

  onLoad(options: any) {
    const alarmId = options.id
    this.setData({ isEditMode: !!alarmId })
    
    if (alarmId) {
      // 编辑模式：加载现有闹钟
      this.loadAlarm(alarmId)
    } else {
      // 新建模式：初始化默认闹钟
      this.initDefaultAlarm()
    }
  },

  // 加载闹钟
  async loadAlarm(alarmId: string) {
    this.setData({ loading: true })
    
    try {
      // 从云开发获取闹钟数据
      const alarms = await sleepAlarmService.getUserAlarms()
      const alarm = alarms.find(a => a._id === alarmId)
      
      if (alarm) {
        // 解析时间
        const [hours, minutes] = alarm.time.split(':').map(Number)
        const timeValue = [hours, minutes]
        
        // 处理旧数据兼容：如果没有wakeMethod字段，使用默认值
        const alarmWithWakeMethod = {
          ...alarm,
          wakeMethod: alarm.wakeMethod || 'classic'
        }
        
        this.setData({
          alarm: alarmWithWakeMethod,
          timeValue
        })
      } else {
        wx.showToast({
          title: '闹钟不存在',
          icon: 'error'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载闹钟失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 初始化默认闹钟
  initDefaultAlarm() {
    // 默认时间为当前时间+30分钟
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30)
    const hours = now.getHours()
    const minutes = now.getMinutes()
    
    this.setData({
      timeValue: [hours, minutes],
      alarm: {
        ...this.data.alarm,
        time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      }
    })
  },

  // 时间变化
  onTimeChange(e: any) {
    const value = e.detail.value
    const hours = value[0]
    const minutes = value[1]
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    
    this.setData({
      timeValue: value,
      alarm: {
        ...this.data.alarm,
        time
      }
    })
  },

  // 标签输入
  onLabelInput(e: any) {
    this.setData({
      alarm: {
        ...this.data.alarm,
        label: e.detail.value
      }
    })
  },

  // 选择预设标签
  selectPresetLabel(e: any) {
    const label = e.currentTarget.dataset.label
    this.setData({
      alarm: {
        ...this.data.alarm,
        label
      }
    })
  },

  // 星期选择变化
  onDaysChange(e: any) {
    const values = e.detail.value as string[]
    // 去除重复值并转换为数字
    const uniqueValues = [...new Set(values)]
    const daysOfWeek = uniqueValues.map((v: string) => parseInt(v, 10))
    
    this.setData({
      alarm: {
        ...this.data.alarm,
        daysOfWeek
      }
    })
  },

  // 铃声变化
  onSoundChange(e: any) {
    this.setData({
      alarm: {
        ...this.data.alarm,
        sound: e.detail.value
      }
    })
  },

  // 唤醒方法变化
  onWakeMethodChange(e: any) {
    this.setData({
      alarm: {
        ...this.data.alarm,
        wakeMethod: e.detail.value
      }
    })
  },

  // 震动变化
  onVibrateChange(e: any) {
    this.setData({
      alarm: {
        ...this.data.alarm,
        vibrate: e.detail.value
      }
    })
  },

  // 激活状态变化
  onActiveChange(e: any) {
    this.setData({
      alarm: {
        ...this.data.alarm,
        isActive: e.detail.value
      }
    })
  },

  // 备注输入
  onNoteInput(e: any) {
    this.setData({
      alarm: {
        ...this.data.alarm,
        note: e.detail.value
      }
    })
  },

  // 保存闹钟
  async saveAlarm() {
    const { alarm, isEditMode } = this.data
    
    // 验证
    if (!alarm.label || alarm.label.trim() === '') {
      wx.showToast({
        title: '请输入闹钟标签',
        icon: 'none'
      })
      return
    }
    
    if (!alarm.daysOfWeek || alarm.daysOfWeek.length === 0) {
      wx.showToast({
        title: '请选择重复日期',
        icon: 'none'
      })
      return
    }
    
    this.setData({ loading: true })
    
    try {
      if (isEditMode && alarm._id) {
        // 更新现有闹钟
        await sleepAlarmService.updateAlarm(alarm._id, alarm)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      } else {
        // 创建新闹钟
        await sleepAlarmService.createAlarm(alarm)
        wx.showToast({
          title: '创建成功',
          icon: 'success'
        })
      }
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      
    } catch (error) {
      console.error('保存闹钟失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 删除闹钟
  deleteAlarm() {
    const { alarm, isEditMode } = this.data
    
    if (!isEditMode || !alarm._id) {
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个闹钟吗？',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ loading: true })
          
          try {
            await sleepAlarmService.deleteAlarm(alarm._id!)
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (error) {
            console.error('删除闹钟失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          } finally {
            this.setData({ loading: false })
          }
        }
      }
    })
  },

  // 格式化重复日期摘要
  formatDaysSummary(daysOfWeek: number[]): string {
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

  // 获取唤醒方法标签
  getWakeMethodLabel(methodValue: string): string {
    const methodOption = this.data.wakeMethodOptions.find(option => option.value === methodValue)
    return methodOption ? methodOption.label : '未知方法'
  },

  // 取消编辑
  cancelEdit() {
    wx.navigateBack()
  },

  // ==================== 音乐管理相关方法 ====================

  // 打开音乐管理器
  openMusicManager() {
    this.setData({ showMusicManager: true })
    this.loadCustomMusic()
  },

  // 关闭音乐管理器
  closeMusicManager() {
    this.setData({ showMusicManager: false })
  },

  // 加载自定义音乐
  async loadCustomMusic() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'musicUpload',
        data: {
          action: 'list'
        }
      })

      if (res.result && res.result.code === 200) {
        this.setData({
          customMusicList: res.result.data.musicList
        })
      }
    } catch (error) {
      console.error('加载自定义音乐失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 选择音乐文件
  selectMusicFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['mp3', 'wav', 'm4a', 'aac'],
      success: (res) => {
        const file = res.tempFiles[0]
        this.uploadMusicFile(file)
      },
      fail: (err) => {
        console.error('选择文件失败:', err)
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        })
      }
    })
  },

  // 上传音乐文件
  async uploadMusicFile(file: any) {
    this.setData({
      uploading: true,
      uploadProgress: 0
    })

    try {
      // 上传到云存储临时目录
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `temp_music/${Date.now()}_${file.name}`,
        filePath: file.path
      })

      // 调用云函数处理上传
      const cloudRes = await wx.cloud.callFunction({
        name: 'musicUpload',
        data: {
          action: 'upload',
          fileID: uploadRes.fileID,
          fileName: file.name
        }
      })

      if (cloudRes.result && cloudRes.result.code === 200) {
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        })

        // 重新加载音乐列表
        await this.loadCustomMusic()

        // 自动选择新上传的音乐
        const musicData = cloudRes.result.data
        this.selectCustomMusic(musicData.fileName)
      } else {
        throw new Error(cloudRes.result?.message || '上传失败')
      }
    } catch (error) {
      console.error('上传音乐失败:', error)
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        uploading: false,
        uploadProgress: 100
      })
    }
  },

  // 选择自定义音乐
  selectCustomMusic(fileName: string) {
    const soundType = `custom_${fileName}`
    
    this.setData({
      alarm: {
        ...this.data.alarm,
        sound: soundType
      },
      showMusicManager: false
    })

    wx.showToast({
      title: '已选择自定义音乐',
      icon: 'success'
    })
  },

  // 删除自定义音乐
  deleteCustomMusic(e: any) {
    const fileName = e.currentTarget.dataset.fileName
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这首音乐吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const cloudRes = await wx.cloud.callFunction({
              name: 'musicUpload',
              data: {
                action: 'delete',
                fileName: fileName
              }
            })

            if (cloudRes.result && cloudRes.result.code === 200) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })

              // 重新加载音乐列表
              await this.loadCustomMusic()

              // 如果当前选择的音乐被删除，重置为默认铃声
              if (this.data.alarm.sound === `custom_${fileName}`) {
                this.setData({
                  alarm: {
                    ...this.data.alarm,
                    sound: 'default'
                  }
                })
              }
            } else {
              throw new Error(cloudRes.result?.message || '删除失败')
            }
          } catch (error) {
            console.error('删除音乐失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 预览音乐
  previewMusic(e: any) {
    const tempFileURL = e.currentTarget.dataset.url
    
    if (tempFileURL) {
      const audioContext = wx.createInnerAudioContext()
      audioContext.src = tempFileURL
      audioContext.play()
      
      // 5秒后自动停止预览
      setTimeout(() => {
        audioContext.stop()
        audioContext.destroy()
      }, 5000)
    }
  },

  // 获取完整的铃声选项（系统铃声 + 自定义音乐）
  getAllSoundOptions() {
    const systemOptions = this.data.soundOptions
    const customOptions = this.data.customMusicList.map(music => ({
      label: `🎵 ${music.displayName}`,
      value: music.soundType
    }))
    
    return [...systemOptions, ...customOptions]
  },

  // 获取铃声显示标签（支持自定义音乐）
  getSoundLabel(soundValue: string): string {
    // 检查是否是自定义音乐
    if (soundValue.startsWith('custom_')) {
      const fileName = soundValue.replace('custom_', '')
      const music = this.data.customMusicList.find(m => m.fileName === fileName)
      return music ? `🎵 ${music.displayName}` : '自定义音乐'
    }
    
    // 系统铃声
    const soundOption = this.data.soundOptions.find(option => option.value === soundValue)
    return soundOption ? soundOption.label : '未知铃声'
  }
})
