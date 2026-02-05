// 本地音频管理器工具类
// 提供本地音频文件的播放和管理功能

// 微信小程序类型声明
declare const wx: any

// 本地音频文件映射
export const LOCAL_AUDIO_FILES: Record<string, string> = {
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

// 本地音频管理器类
export class LocalAudioManager {
  private audioContexts: Map<string, any> = new Map()
  private currentVolume: number = 100
  
  // 获取音频上下文
  private getAudioContext(soundType: string): any {
    if (!this.audioContexts.has(soundType)) {
      const audioContext = wx.createInnerAudioContext()
      audioContext.autoplay = false
      audioContext.loop = false
      
      // 获取本地音频文件路径
      const audioPath = this.getLocalAudioPath(soundType)
      audioContext.src = audioPath
      
      this.audioContexts.set(soundType, audioContext)
    } else {
      // 如果音频上下文已存在，检查是否需要更新URL
      const audioContext = this.audioContexts.get(soundType)!
      const currentPath = this.getLocalAudioPath(soundType)
      
      // 只有在路径不同时才更新
      if (audioContext.src !== currentPath) {
        console.log(`[本地音频管理器] 更新音频源路径: ${soundType}`)
        audioContext.src = currentPath
      }
    }
    
    return this.audioContexts.get(soundType)!
  }
  
  // 获取本地音频文件路径
  public getLocalAudioPath(soundType: string): string {
    return LOCAL_AUDIO_FILES[soundType] || LOCAL_AUDIO_FILES['default']
  }
  
  // 检查音频类型是否支持本地播放
  public isLocalAudioSupported(soundType: string): boolean {
    return soundType in LOCAL_AUDIO_FILES || soundType.startsWith('custom_')
  }
  
  // 播放本地音频
  public async playLocalAudio(soundType: string, volume: number = 100): Promise<boolean> {
    try {
      const audioContext = this.getAudioContext(soundType)
      this.currentVolume = volume
      
      // 设置音量（0-100转换为0-1）
      audioContext.volume = volume / 100
      
      // 只有在音频正在播放时才停止
      // 使用 paused 属性检查播放状态
      if (audioContext.paused === false) {
        try {
          audioContext.stop()
        } catch (stopError) {
          console.warn(`[本地音频管理器] 停止音频时出错，继续播放:`, stopError)
        }
      }
      
      // 重新开始播放
      audioContext.seek(0)
      audioContext.play()
      
      console.log(`[本地音频管理器] 播放 ${soundType}，音量: ${volume}%`)
      
      // 等待播放开始
      return await new Promise<boolean>((resolve) => {
        audioContext.onPlay(() => {
          console.log(`[本地音频管理器] ${soundType} 开始播放`)
          resolve(true)
        })
        
        audioContext.onError((err: any) => {
          console.error(`[本地音频管理器] 播放错误:`, err)
          resolve(false)
        })
        
        // 设置超时
        setTimeout(() => resolve(false), 1000)
      })
      
    } catch (error) {
      console.error(`[本地音频管理器] 播放 ${soundType} 失败:`, error)
      return false
    }
  }
  
  // 停止所有音频
  public stopAll(): void {
    this.audioContexts.forEach((audioContext, soundType) => {
      try {
        audioContext.stop()
        console.log(`[本地音频管理器] 停止 ${soundType}`)
      } catch (error) {
        console.error(`[本地音频管理器] 停止 ${soundType} 失败:`, error)
      }
    })
  }
  
  // 设置音量
  public setVolume(volume: number): void {
    this.currentVolume = volume
    this.audioContexts.forEach((audioContext) => {
      audioContext.volume = volume / 100
    })
  }
  
  // 获取当前音量
  public getCurrentVolume(): number {
    return this.currentVolume
  }
  
  // 获取所有支持的音频类型
  public getSupportedAudioTypes(): string[] {
    return Object.keys(LOCAL_AUDIO_FILES)
  }
  
  // 获取音频类型显示名称
  public getAudioDisplayName(soundType: string): string {
    const displayNames: Record<string, string> = {
      'default': '默认铃声',
      'birds': '鸟鸣声',
      'waves': '海浪声',
      'piano': '钢琴曲',
      'chimes': '风铃声',
      'birds_gentle': '轻柔鸟鸣',
      'birds_morning': '清晨鸟鸣',
      'birds_chorus': '鸟鸣合唱',
      'birds_full': '完整鸟鸣',
      'waves_distant': '远处海浪',
      'waves_gentle': '轻柔海浪',
      'waves_medium': '中等海浪',
      'waves_full': '完整海浪',
      'nature_morning': '清晨自然'
    }
    
    return displayNames[soundType] || soundType
  }
}

// 创建全局本地音频管理器实例
export const localAudioManager = new LocalAudioManager()

// 工具函数：检查是否应该使用本地音频
export function shouldUseLocalAudio(): boolean {
  // 在实际应用中，这里可以检查网络状态、云存储可用性等
  // 目前简化处理：总是返回true，表示优先使用本地音频
  return true
}

// 工具函数：获取最佳音频URL（优先本地，备用云存储）
export async function getBestAudioUrl(soundType: string): Promise<string> {
  // 首先检查是否支持本地音频
  if (localAudioManager.isLocalAudioSupported(soundType)) {
    console.log(`[音频工具] 使用本地音频: ${soundType}`)
    return localAudioManager.getLocalAudioPath(soundType)
  }
  
  // 如果不支持本地音频，尝试云存储
  console.log(`[音频工具] 音频类型 ${soundType} 不支持本地播放，尝试云存储`)
  
  // 这里可以添加云存储逻辑
  // 目前返回空字符串，调用者需要处理
  return ''
}

// 默认导出
export default {
  LocalAudioManager,
  localAudioManager,
  LOCAL_AUDIO_FILES,
  shouldUseLocalAudio,
  getBestAudioUrl
}