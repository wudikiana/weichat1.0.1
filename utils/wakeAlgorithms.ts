// 唤醒算法工具类
import { SleepRecord } from './sleepCloud'

// 微信小程序类型声明
declare const wx: any

// 音频管理器 - 统一管理音频播放
class AudioManager {
  private audioContexts: Map<string, any> = new Map()
  private audioUrls: Map<string, string> = new Map() // 缓存临时链接
  private currentVolume: number = 100
  
  // 获取音频上下文
  private async getAudioContext(soundType: string): Promise<any> {
    if (!this.audioContexts.has(soundType)) {
      const audioContext = wx.createInnerAudioContext()
      audioContext.autoplay = false
      audioContext.loop = false
      
      // 获取音频源URL
      const audioUrl = await this.getAudioUrl(soundType)
      audioContext.src = audioUrl
      
      this.audioContexts.set(soundType, audioContext)
    } else {
      // 如果音频上下文已存在，检查是否需要更新URL
      const audioContext = this.audioContexts.get(soundType)!
      const currentUrl = await this.getAudioUrl(soundType)
      
      // 只有在URL不同时才更新
      if (audioContext.src !== currentUrl) {
        console.log(`[音频管理器] 更新音频源URL: ${soundType}`)
        audioContext.src = currentUrl
      }
    }
    
    return this.audioContexts.get(soundType)!
  }
  
  // 获取音频文件ID
  private getAudioFileId(soundType: string): string {
    // 从云存储的/musics文件夹获取音频文件
    // 支持系统预设铃声和用户自定义音乐
    
    // 系统预设铃声映射
    const systemSounds: Record<string, string> = {
      'default': 'alarm-default.mp3',
      'birds': 'birds.mp3',
      'waves': 'waves.mp3',
      'piano': 'piano.mp3',
      'chimes': 'chimes.mp3',
      'birds_gentle': 'birds-gentle.mp3',
      'birds_morning': 'birds-morning.mp3',
      'birds_chorus': 'birds-chorus.mp3',
      'birds_full': 'birds-full.mp3',
      'waves_distant': 'waves-distant.mp3',
      'waves_gentle': 'waves-gentle.mp3',
      'waves_medium': 'waves-medium.mp3',
      'waves_full': 'waves-full.mp3',
      'nature_morning': 'nature-morning.mp3'
    }
    
    // 检查是否是系统预设铃声
    if (systemSounds[soundType]) {
      // 返回云存储文件ID - 使用正确的环境ID格式
      // 根据云存储音乐信息参考文件，正确的格式是：cloud://cloudbase-9ghm3xfo6fefd1bb.636c-cloudbase-9ghm3xfo6fefd1bb-1397969973/musics/文件名.mp3
      return `cloud://cloudbase-9ghm3xfo6fefd1bb.636c-cloudbase-9ghm3xfo6fefd1bb-1397969973/musics/${systemSounds[soundType]}`
    }
    
    // 检查是否是用户自定义音乐（格式为 custom_文件名）
    if (soundType.startsWith('custom_')) {
      const fileName = soundType.replace('custom_', '')
      return `cloud://cloudbase-9ghm3xfo6fefd1bb.636c-cloudbase-9ghm3xfo6fefd1bb-1397969973/musics/user_uploads/${fileName}`
    }
    
    // 默认铃声
    return `cloud://cloudbase-9ghm3xfo6fefd1bb.636c-cloudbase-9ghm3xfo6fefd1bb-1397969973/musics/alarm-default.mp3`
  }
  
  // 检查云存储文件是否存在
  private async checkFileExists(fileId: string): Promise<boolean> {
    try {
      console.log(`[音频管理器] 检查文件是否存在: ${fileId}`)
      
      // 尝试获取文件信息
      const { fileList } = await wx.cloud.getTempFileURL({
        fileList: [fileId]
      })
      
      if (fileList && fileList[0]) {
        const exists = !!fileList[0].tempFileURL
        console.log(`[音频管理器] 文件存在: ${exists}`)
        return exists
      }
      
      return false
    } catch (error) {
      console.error(`[音频管理器] 检查文件存在性失败:`, error)
      return false
    }
  }
  
  // 获取音频URL（临时链接）
  private async getAudioUrl(soundType: string): Promise<string> {
    // 如果已经缓存了URL，直接返回
    if (this.audioUrls.has(soundType)) {
      return this.audioUrls.get(soundType)!
    }
    
    const fileId = this.getAudioFileId(soundType)
    console.log(`[音频管理器] 获取音频URL: ${soundType}, 文件ID: ${fileId}`)
    
    // 策略1：首先尝试云存储
    try {
      // 检查云存储文件是否存在
      const fileExists = await this.checkFileExists(fileId)
      if (!fileExists) {
        console.warn(`[音频管理器] 云存储文件不存在，切换到本地文件: ${soundType}`)
        return this.getLocalAudioUrl(soundType)
      }
      
      // 文件存在，尝试获取临时链接，最多重试2次
      const maxRetries = 2
      let lastError: any = null
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[音频管理器] 尝试获取云存储临时链接 (尝试 ${attempt}/${maxRetries}): ${soundType}`)
          
          // 获取临时文件链接
          const { fileList } = await wx.cloud.getTempFileURL({
            fileList: [fileId]
          })
          
          if (fileList && fileList[0] && fileList[0].tempFileURL) {
            const tempUrl = fileList[0].tempFileURL
            console.log(`[音频管理器] 获取云存储临时链接成功: ${soundType} -> ${tempUrl.substring(0, 50)}...`)
            
            // 验证URL是否有效（不是cloud://格式）
            if (tempUrl.startsWith('cloud://')) {
              console.error(`[音频管理器] 获取的链接仍然是cloud://格式，可能配置有问题: ${tempUrl}`)
              throw new Error('临时链接获取失败，返回了cloud://格式')
            }
            
            // 增强URL验证
            if (!tempUrl || tempUrl.trim() === '') {
              console.error(`[音频管理器] 获取的URL为空: ${soundType}`)
              throw new Error('获取的URL为空')
            }
            
            // 验证URL格式
            if (!tempUrl.startsWith('http://') && !tempUrl.startsWith('https://')) {
              console.error(`[音频管理器] URL格式不正确: ${tempUrl}`)
              throw new Error('URL格式不正确')
            }
            
            // 验证URL包含音频文件扩展名
            if (!tempUrl.match(/\.(mp3|wav|aac|ogg|m4a)$/i)) {
              console.warn(`[音频管理器] URL可能不是音频文件: ${tempUrl}`)
            }
            
            // 缓存URL
            this.audioUrls.set(soundType, tempUrl)
            return tempUrl
          } else {
            console.error(`[音频管理器] 获取云存储临时链接失败，文件列表为空:`, fileList)
            lastError = new Error('获取云存储临时链接失败，文件列表为空')
          }
        } catch (error) {
          console.error(`[音频管理器] 获取云存储音频URL失败 (尝试 ${attempt}/${maxRetries}):`, error)
          lastError = error
          
          // 如果不是最后一次尝试，等待一段时间后重试
          if (attempt < maxRetries) {
            await this.sleep(500 * attempt) // 递增等待时间
          }
        }
      }
      
      // 云存储重试失败，切换到本地文件
      console.warn(`[音频管理器] 云存储获取失败，切换到本地文件: ${soundType}`)
      return this.getLocalAudioUrl(soundType)
      
    } catch (cloudError) {
      console.error(`[音频管理器] 云存储处理异常，切换到本地文件:`, cloudError)
      return this.getLocalAudioUrl(soundType)
    }
  }
  
  // 获取本地音频URL
  private getLocalAudioUrl(soundType: string): string {
    console.log(`[音频管理器] 获取本地音频URL: ${soundType}`)
    
    // 获取本地文件路径
    const localPath = this.getLocalFallbackAudioUrl(soundType)
    
    // 检查本地文件是否存在（在小程序中，我们只能尝试加载）
    console.log(`[音频管理器] 使用本地文件路径: ${localPath}`)
    
    // 缓存本地路径
    this.audioUrls.set(soundType, localPath)
    return localPath
  }
  
  // 获取本地备用音频URL
  private getLocalFallbackAudioUrl(soundType: string): string {
    // 本地音频文件映射 - 使用项目根目录的musics文件夹中的文件
    const localSounds: Record<string, string> = {
      'default': 'musics/alarm-default.mp3',
      'birds': 'musics/birds.mp3',
      'waves': 'musics/waves.mp3',
      'piano': 'musics/piano.mp3',
      'chimes': 'musics/chimes.mp3',
      'birds_gentle': 'musics/birds-gentle.mp3',
      'birds_morning': 'musics/birds-morning.mp3',
      'birds_chorus': 'musics/birds-chorus.mp3',
      'birds_full': 'musics/birds-full.mp3',
      'waves_distant': 'musics/waves-distant.mp3',
      'waves_gentle': 'musics/waves-gentle.mp3',
      'waves_medium': 'musics/waves-medium.mp3',
      'waves_full': 'musics/waves-full.mp3',
      'nature_morning': 'musics/nature-morning.mp3'
    }
    
    // 返回本地文件路径
    return localSounds[soundType] || localSounds['default']
  }
  
  // 播放声音
  async playSound(soundType: string, volume: number): Promise<void> {
    try {
      const audioContext = await this.getAudioContext(soundType)
      this.currentVolume = volume
      
      // 设置音量（0-100转换为0-1）
      audioContext.volume = volume / 100
      
      // 只有在音频正在播放时才停止
      // 使用 paused 属性检查播放状态
      if (audioContext.paused === false) {
        try {
          audioContext.stop()
        } catch (stopError) {
          console.warn(`[音频管理器] 停止音频时出错，继续播放:`, stopError)
        }
      }
      
      // 重新开始播放
      audioContext.seek(0)
      audioContext.play()
      
      console.log(`[音频管理器] 播放 ${soundType}，音量: ${volume}%`)
      
      // 等待播放开始
      await new Promise<void>((resolve) => {
        audioContext.onPlay(() => {
          console.log(`[音频管理器] ${soundType} 开始播放`)
          resolve()
        })
        
        audioContext.onError((err: any) => {
          console.error(`[音频管理器] 播放错误:`, err)
          resolve() // 即使出错也继续
        })
        
        // 设置超时
        setTimeout(() => resolve(), 1000)
      })
      
    } catch (error) {
      console.error(`[音频管理器] 播放 ${soundType} 失败:`, error)
    }
  }
  
  // 停止所有声音
  stopAll(): void {
    this.audioContexts.forEach((audioContext, soundType) => {
      try {
        audioContext.stop()
        console.log(`[音频管理器] 停止 ${soundType}`)
      } catch (error) {
        console.error(`[音频管理器] 停止 ${soundType} 失败:`, error)
      }
    })
  }
  
  // 设置音量
  setVolume(volume: number): void {
    this.currentVolume = volume
    this.audioContexts.forEach((audioContext) => {
      audioContext.volume = volume / 100
    })
  }
  
  // 获取当前音量
  getCurrentVolume(): number {
    return this.currentVolume
  }
  
  // 睡眠函数（用于重试等待）
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 创建全局音频管理器实例
export const audioManager = new AudioManager()

// 睡眠周期阶段
export enum SleepStage {
  DEEP = 'deep',      // 深睡眠
  LIGHT = 'light',    // 浅睡眠
  REM = 'rem',        // REM睡眠
  AWAKE = 'awake'     // 清醒
}

// 睡眠周期
export interface SleepCycle {
  stage: SleepStage
  startTime: Date
  duration: number // 分钟
}

// 唤醒算法接口
export interface WakeAlgorithm {
  name: string
  description: string
  execute: (options: WakeAlgorithmOptions) => Promise<void>
}

// 唤醒算法选项
export interface WakeAlgorithmOptions {
  alarmTime: Date           // 闹钟设定时间
  soundType: string         // 铃声类型
  userId: string           // 用户ID
  onProgress?: (progress: number) => void // 进度回调
  onComplete?: () => void   // 完成回调
}

// 轻柔唤醒算法
export class GentleWakeAlgorithm implements WakeAlgorithm {
  name = 'gentle'
  description = '渐进式音量唤醒，适合浅睡眠阶段'

  async execute(options: WakeAlgorithmOptions): Promise<void> {
    const { alarmTime, soundType, onProgress, onComplete } = options
    
    console.log(`[轻柔唤醒] 开始执行，时间: ${alarmTime.toLocaleTimeString()}`)
    
    // 1. 检测当前是否在浅睡眠阶段（简化版）
    const isLightSleep = await this.detectLightSleepStage(alarmTime)
    
    if (!isLightSleep) {
      console.log('[轻柔唤醒] 当前不在浅睡眠阶段，转为标准唤醒')
      // 转为标准唤醒
      const classicAlgo = new ClassicWakeAlgorithm()
      return classicAlgo.execute(options)
    }
    
    // 2. 渐进式音量控制
    await this.gradualVolumeControl(soundType, onProgress)
    
    // 3. 完成
    onComplete?.()
  }
  
  // 检测浅睡眠阶段（简化版）
  private async detectLightSleepStage(targetTime: Date): Promise<boolean> {
    // 在实际应用中，这里应该分析用户的睡眠数据
    // 这里使用简化逻辑：假设在目标时间前后15分钟内是浅睡眠阶段
    const now = new Date()
    const timeDiff = Math.abs(targetTime.getTime() - now.getTime())
    const diffMinutes = timeDiff / (1000 * 60)
    
    // 如果当前时间在目标时间前后15分钟内，认为是浅睡眠阶段
    return diffMinutes <= 15
  }
  
  // 渐进式音量控制
  private async gradualVolumeControl(soundType: string, onProgress?: (progress: number) => void): Promise<void> {
    const totalDuration = 45 // 总时长45秒
    const incrementInterval = 2000 // 每2秒增加一次
    const incrementAmount = 5 // 每次增加5%
    
    let currentVolume = 10 // 从10%开始
    let elapsedTime = 0
    
    console.log(`[轻柔唤醒] 开始渐进式音量控制，铃声: ${soundType}`)
    
    while (elapsedTime < totalDuration * 1000 && currentVolume < 100) {
      // 更新音量
      console.log(`[轻柔唤醒] 音量: ${currentVolume}%`)
      onProgress?.(currentVolume)
      
      // 播放对应铃声
      await this.playSound(soundType, currentVolume)
      
      // 等待
      await this.sleep(incrementInterval)
      
      // 更新状态
      elapsedTime += incrementInterval
      currentVolume += incrementAmount
    }
    
    // 达到最大音量
    console.log('[轻柔唤醒] 达到最大音量')
    onProgress?.(100)
  }
  
  private async playSound(soundType: string, volume: number): Promise<void> {
    // 使用音频管理器播放声音
    await audioManager.playSound(soundType, volume)
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 自然唤醒算法
export class NaturalWakeAlgorithm implements WakeAlgorithm {
  name = 'natural'
  description = '模拟自然环境唤醒，配合光线渐变'

  async execute(options: WakeAlgorithmOptions): Promise<void> {
    const { alarmTime, soundType, onProgress, onComplete } = options
    
    console.log(`[自然唤醒] 开始执行，时间: ${alarmTime.toLocaleTimeString()}`)
    
    // 1. 根据季节调整唤醒时间
    const adjustedTime = this.adjustTimeBySeason(alarmTime)
    console.log(`[自然唤醒] 季节调整后时间: ${adjustedTime.toLocaleTimeString()}`)
    
    // 2. 播放自然环境声音序列
    await this.playNaturalSoundSequence(soundType, onProgress)
    
    // 3. 30分钟后自动停止
    setTimeout(() => {
      console.log('[自然唤醒] 30分钟自动停止')
      onComplete?.()
    }, 30 * 60 * 1000)
  }
  
  // 根据季节调整时间
  private adjustTimeBySeason(time: Date): Date {
    const month = time.getMonth() + 1
    const adjustedTime = new Date(time)
    
    // 简化逻辑：冬季晚30分钟，夏季早30分钟
    if (month >= 11 || month <= 2) {
      // 冬季
      adjustedTime.setMinutes(adjustedTime.getMinutes() + 30)
    } else if (month >= 5 && month <= 8) {
      // 夏季
      adjustedTime.setMinutes(adjustedTime.getMinutes() - 30)
    }
    
    return adjustedTime
  }
  
  // 播放自然环境声音序列
  private async playNaturalSoundSequence(soundType: string, onProgress?: (progress: number) => void): Promise<void> {
    const sequences = this.getNaturalSoundSequence(soundType)
    const totalSteps = sequences.length
    
    console.log(`[自然唤醒] 开始自然环境声音序列，共${totalSteps}个阶段`)
    
    for (let i = 0; i < sequences.length; i++) {
      const step = sequences[i]
      const progress = Math.floor((i / totalSteps) * 100)
      
      console.log(`[自然唤醒] 阶段 ${i + 1}: ${step.description}`)
      onProgress?.(progress)
      
      // 播放声音
      await this.playSound(step.sound, step.volume)
      
      // 等待阶段时长
      await this.sleep(step.duration * 1000)
    }
    
    onProgress?.(100)
  }
  
  // 获取自然环境声音序列
  private getNaturalSoundSequence(soundType: string): Array<{
    sound: string
    volume: number
    duration: number
    description: string
  }> {
    // 根据铃声类型返回不同的声音序列
    const sequences: Record<string, Array<{
      sound: string
      volume: number
      duration: number
      description: string
    }>> = {
      birds: [
        { sound: 'birds_gentle', volume: 20, duration: 10, description: '远处鸟鸣' },
        { sound: 'birds_morning', volume: 40, duration: 15, description: '清晨鸟鸣' },
        { sound: 'birds_chorus', volume: 60, duration: 20, description: '鸟鸣合唱' },
        { sound: 'birds_full', volume: 80, duration: 15, description: '完整鸟鸣' }
      ],
      waves: [
        { sound: 'waves_distant', volume: 20, duration: 10, description: '远处海浪' },
        { sound: 'waves_gentle', volume: 40, duration: 15, description: '轻柔海浪' },
        { sound: 'waves_medium', volume: 60, duration: 20, description: '中等海浪' },
        { sound: 'waves_full', volume: 80, duration: 15, description: '完整海浪' }
      ],
      default: [
        { sound: 'nature_morning', volume: 30, duration: 60, description: '清晨自然声音' }
      ]
    }
    
    return sequences[soundType] || sequences.default
  }
  
  private async playSound(sound: string, volume: number): Promise<void> {
    // 使用音频管理器播放声音
    await audioManager.playSound(sound, volume)
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 智能唤醒算法
export class SmartWakeAlgorithm implements WakeAlgorithm {
  name = 'smart'
  description = '基于睡眠周期分析的最佳时机唤醒'

  async execute(options: WakeAlgorithmOptions): Promise<void> {
    const { alarmTime, soundType, userId, onProgress, onComplete } = options
    
    console.log(`[智能唤醒] 开始执行，目标时间: ${alarmTime.toLocaleTimeString()}`)
    
    // 1. 获取睡眠记录
    const sleepRecords = await this.getSleepRecords(userId, 7)
    
    // 2. 分析睡眠模式
    const sleepPattern = this.analyzeSleepPattern(sleepRecords)
    
    // 3. 预测最佳唤醒时间
    const optimalTime = this.findOptimalWakeTime(alarmTime, sleepPattern)
    console.log(`[智能唤醒] 最佳唤醒时间: ${optimalTime.toLocaleTimeString()}`)
    
    // 4. 等待到最佳时间
    const now = new Date()
    const waitTime = optimalTime.getTime() - now.getTime()
    
    if (waitTime > 0) {
      console.log(`[智能唤醒] 等待 ${Math.floor(waitTime / 1000)} 秒到最佳时间`)
      await this.sleep(waitTime)
    }
    
    // 5. 执行唤醒
    console.log('[智能唤醒] 执行唤醒')
    const classicAlgo = new ClassicWakeAlgorithm()
    await classicAlgo.execute({
      ...options,
      alarmTime: optimalTime
    })
    
    // 6. 记录用户响应（简化版）
    this.recordUserResponse(userId, optimalTime)
    
    onComplete?.()
  }
  
  // 获取睡眠记录（简化版）
  private async getSleepRecords(userId: string, days: number): Promise<SleepRecord[]> {
    console.log(`[智能唤醒] 获取用户 ${userId} 最近 ${days} 天睡眠记录`)
    // 在实际应用中，这里应该从数据库获取真实数据
    return []
  }
  
  // 分析睡眠模式
  private analyzeSleepPattern(records: SleepRecord[]): SleepCycle[] {
    console.log('[智能唤醒] 分析睡眠模式')
    
    if (records.length === 0) {
      // 如果没有记录，使用默认的90分钟周期
      return this.generateDefaultSleepCycles()
    }
    
    // 简化版：使用平均睡眠时长和就寝时间
    const avgSleepHours = records.reduce((sum, r) => sum + r.actualHours, 0) / records.length
    const cycles = this.generateSleepCycles(avgSleepHours)
    
    return cycles
  }
  
  // 生成默认睡眠周期
  private generateDefaultSleepCycles(): SleepCycle[] {
    const cycles: SleepCycle[] = []
    const now = new Date()
    
    // 假设睡眠从晚上11点开始
    const sleepStart = new Date(now)
    sleepStart.setHours(23, 0, 0, 0)
    
    // 生成5个90分钟的周期
    for (let i = 0; i < 5; i++) {
      const startTime = new Date(sleepStart.getTime() + i * 90 * 60 * 1000)
      const stage = i % 4 === 0 ? SleepStage.LIGHT : 
                    i % 4 === 1 ? SleepStage.DEEP : 
                    i % 4 === 2 ? SleepStage.REM : SleepStage.LIGHT
      
      cycles.push({
        stage,
        startTime,
        duration: 90
      })
    }
    
    return cycles
  }
  
  // 生成睡眠周期
  private generateSleepCycles(totalHours: number): SleepCycle[] {
    const cycles: SleepCycle[] = []
    const cycleCount = Math.floor((totalHours * 60) / 90)
    const now = new Date()
    
    // 假设睡眠从当前时间前推
    const sleepStart = new Date(now.getTime() - totalHours * 60 * 60 * 1000)
    
    for (let i = 0; i < cycleCount; i++) {
      const startTime = new Date(sleepStart.getTime() + i * 90 * 60 * 1000)
      const stage = i % 4 === 0 ? SleepStage.LIGHT : 
                    i % 4 === 1 ? SleepStage.DEEP : 
                    i % 4 === 2 ? SleepStage.REM : SleepStage.LIGHT
      
      cycles.push({
        stage,
        startTime,
        duration: 90
      })
    }
    
    return cycles
  }
  
  // 寻找最佳唤醒时间
  private findOptimalWakeTime(targetTime: Date, cycles: SleepCycle[]): Date {
    console.log('[智能唤醒] 寻找最佳唤醒时间')
    
    // 如果没有睡眠周期数据，返回原时间
    if (cycles.length === 0) {
      return targetTime
    }
    
    const searchWindow = 30 // 前后30分钟
    const searchStart = new Date(targetTime.getTime() - searchWindow * 60 * 1000)
    const searchEnd = new Date(targetTime.getTime() + searchWindow * 60 * 1000)
    
    // 寻找浅睡眠阶段
    const lightSleepCycles = cycles.filter(cycle => 
      cycle.stage === SleepStage.LIGHT &&
      cycle.startTime >= searchStart &&
      cycle.startTime <= searchEnd
    )
    
    if (lightSleepCycles.length > 0) {
      // 选择最接近目标时间的浅睡眠阶段
      const closestCycle = lightSleepCycles.reduce((closest, current) => {
        const closestDiff = Math.abs(closest.startTime.getTime() - targetTime.getTime())
        const currentDiff = Math.abs(current.startTime.getTime() - targetTime.getTime())
        return currentDiff < closestDiff ? current : closest
      })
      
      return closestCycle.startTime
    }
    
    // 如果没有浅睡眠阶段，寻找REM睡眠阶段
    const remSleepCycles = cycles.filter(cycle => 
      cycle.stage === SleepStage.REM &&
      cycle.startTime >= searchStart &&
      cycle.startTime <= searchEnd
    )
    
    if (remSleepCycles.length > 0) {
      const closestCycle = remSleepCycles.reduce((closest, current) => {
        const closestDiff = Math.abs(closest.startTime.getTime() - targetTime.getTime())
        const currentDiff = Math.abs(current.startTime.getTime() - targetTime.getTime())
        return currentDiff < closestDiff ? current : closest
      })
      
      return closestCycle.startTime
    }
    
    // 如果都没有，返回原时间
    return targetTime
  }
  
  // 记录用户响应
  private recordUserResponse(userId: string, wakeTime: Date): void {
    console.log(`[智能唤醒] 记录用户 ${userId} 在 ${wakeTime.toLocaleTimeString()} 唤醒`)
    // 在实际应用中，这里应该将数据保存到数据库用于优化模型
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 经典唤醒算法
export class ClassicWakeAlgorithm implements WakeAlgorithm {
  name = 'classic'
  description = '传统闹钟唤醒方式'

  async execute(options: WakeAlgorithmOptions): Promise<void> {
    const { alarmTime, soundType, onProgress, onComplete } = options
    
    console.log(`[经典唤醒] 开始执行，时间: ${alarmTime.toLocaleTimeString()}`)
    
    // 1. 准时触发
    const now = new Date()
    if (now < alarmTime) {
      const waitTime = alarmTime.getTime() - now.getTime()
      console.log(`[经典唤醒] 等待 ${Math.floor(waitTime / 1000)} 秒`)
      await this.sleep(waitTime)
    }
    
    // 2. 固定音量播放
    let elapsedMinutes = 0
    const maxDuration = 60 // 最长持续60分钟
    
    console.log(`[经典唤醒] 开始播放铃声: ${soundType}`)
    
    while (elapsedMinutes < maxDuration) {
      // 播放铃声
      console.log(`[经典唤醒] 播放铃声，已持续 ${elapsedMinutes} 分钟`)
      onProgress?.(Math.min(100, (elapsedMinutes / maxDuration) * 100))
      
      await this.playSound(soundType, 100)
      
      // 每5分钟重复一次
      await this.sleep(5 * 60 * 1000)
      elapsedMinutes += 5
    }
    
    console.log('[经典唤醒] 60分钟自动停止')
    onComplete?.()
  }
  
  private async playSound(soundType: string, volume: number): Promise<void> {
    // 使用音频管理器播放声音
    await audioManager.playSound(soundType, volume)
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 唤醒算法工厂
export class WakeAlgorithmFactory {
  static createAlgorithm(method: string): WakeAlgorithm {
    switch (method) {
      case 'gentle':
        return new GentleWakeAlgorithm()
      case 'natural':
        return new NaturalWakeAlgorithm()
      case 'smart':
        return new SmartWakeAlgorithm()
      case 'classic':
        return new ClassicWakeAlgorithm()
      default:
        return new ClassicWakeAlgorithm()
    }
  }
}

// 唤醒算法管理器
export class WakeAlgorithmManager {
  private currentAlgorithm: WakeAlgorithm | null = null
  
  // 执行唤醒算法
  async executeWakeAlgorithm(
    method: string,
    alarmTime: Date,
    soundType: string,
    userId: string
  ): Promise<void> {
    // 停止当前算法（如果有）
    this.stopCurrentAlgorithm()
    
    // 创建新算法
    this.currentAlgorithm = WakeAlgorithmFactory.createAlgorithm(method)
    
    console.log(`[唤醒管理器] 执行 ${method} 算法`)
    
    // 执行算法
    await this.currentAlgorithm.execute({
      alarmTime,
      soundType,
      userId,
      onProgress: (progress) => {
        console.log(`[唤醒管理器] 进度: ${progress}%`)
        // 在实际应用中，这里可以更新UI显示进度
      },
      onComplete: () => {
        console.log('[唤醒管理器] 唤醒完成')
        this.currentAlgorithm = null
      }
    })
  }
  
  // 停止当前算法
  stopCurrentAlgorithm(): void {
    if (this.currentAlgorithm) {
      console.log(`[唤醒管理器] 停止 ${this.currentAlgorithm.name} 算法`)
      this.currentAlgorithm = null
    }
  }
  
  // 获取当前算法信息
  getCurrentAlgorithmInfo(): { name: string; description: string } | null {
    if (!this.currentAlgorithm) {
      return null
    }
    
    return {
      name: this.currentAlgorithm.name,
      description: this.currentAlgorithm.description
    }
  }
}

// 导出常用函数
export function getAlgorithmDescription(method: string): string {
  const algorithm = WakeAlgorithmFactory.createAlgorithm(method)
  return algorithm.description
}

export function getAlgorithmName(method: string): string {
  const algorithm = WakeAlgorithmFactory.createAlgorithm(method)
  return algorithm.name
}

// 默认导出
export default {
  WakeAlgorithmFactory,
  WakeAlgorithmManager,
  getAlgorithmDescription,
  getAlgorithmName
}
