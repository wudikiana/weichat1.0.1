// 闹钟触发服务
import { sleepAlarmService } from './sleepCloud'
import { SleepAlarm } from './sleepCloud'
import { WakeAlgorithmManager, getAlgorithmDescription } from './wakeAlgorithms'
// 导入音频管理器（从wakeAlgorithms.ts中导出）
import { audioManager } from './wakeAlgorithms'

// 闹钟触发状态
export interface AlarmTriggerStatus {
  alarmId: string
  isTriggered: boolean
  triggerTime: Date | null
  algorithm: string
  progress: number
  error?: string
}

// 闹钟触发服务
export class AlarmTriggerService {
  private static instance: AlarmTriggerService
  private alarmManager: WakeAlgorithmManager
  private activeTriggers: Map<string, AlarmTriggerStatus>
  private checkInterval: any = null
  
  private constructor() {
    this.alarmManager = new WakeAlgorithmManager()
    this.activeTriggers = new Map()
  }
  
  // 获取单例实例
  static getInstance(): AlarmTriggerService {
    if (!AlarmTriggerService.instance) {
      AlarmTriggerService.instance = new AlarmTriggerService()
    }
    return AlarmTriggerService.instance
  }
  
  // 启动服务
  start(): void {
    console.log('[闹钟触发服务] 启动服务')
    
    // 停止现有的检查间隔
    this.stop()
    
    // 开始检查闹钟
    this.checkInterval = setInterval(() => {
      this.checkAlarms()
    }, 60 * 1000) // 每分钟检查一次
    
    // 立即检查一次
    this.checkAlarms()
  }
  
  // 停止服务
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      console.log('[闹钟触发服务] 停止服务')
    }
  }
  
  // 检查并触发闹钟
  private async checkAlarms(): Promise<void> {
    try {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
      const currentDay = now.getDay() // 0-6，0表示周日
      
      console.log(`[闹钟触发服务] 检查闹钟，当前时间: ${currentTimeStr}`)
      
      // 获取所有活跃闹钟
      const alarms = await sleepAlarmService.getUserAlarms()
      const activeAlarms = alarms.filter(alarm => alarm.isActive)
      
      for (const alarm of activeAlarms) {
        // 检查是否已经触发过
        if (this.activeTriggers.has(alarm._id!)) {
          continue
        }
        
        // 检查时间是否匹配
        if (alarm.time === currentTimeStr) {
          // 检查星期是否匹配
          if (alarm.daysOfWeek.includes(currentDay)) {
            console.log(`[闹钟触发服务] 触发闹钟: ${alarm.label} (${alarm.time})`)
            await this.triggerAlarm(alarm)
          }
        }
      }
    } catch (error) {
      console.error('[闹钟触发服务] 检查闹钟失败:', error)
    }
  }
  
  // 触发闹钟
  async triggerAlarm(alarm: SleepAlarm): Promise<void> {
    const alarmId = alarm._id!
    
    // 创建触发状态
    const triggerStatus: AlarmTriggerStatus = {
      alarmId,
      isTriggered: true,
      triggerTime: new Date(),
      algorithm: alarm.wakeMethod || 'classic',
      progress: 0
    }
    
    this.activeTriggers.set(alarmId, triggerStatus)
    
    try {
      // 获取用户ID
      const userId = alarm.userId
      
      // 解析时间
      const [hours, minutes] = alarm.time.split(':').map(Number)
      const alarmTime = new Date()
      alarmTime.setHours(hours, minutes, 0, 0)
      
      // 执行唤醒算法
      console.log(`[闹钟触发服务] 执行 ${alarm.wakeMethod} 算法`)
      
      await this.alarmManager.executeWakeAlgorithm(
        alarm.wakeMethod || 'classic',
        alarmTime,
        alarm.sound,
        userId
      )
      
      // 更新状态为完成
      triggerStatus.progress = 100
      this.activeTriggers.set(alarmId, triggerStatus)
      
      console.log(`[闹钟触发服务] 闹钟 ${alarm.label} 触发完成`)
      
    } catch (error) {
      console.error(`[闹钟触发服务] 触发闹钟失败:`, error)
      triggerStatus.error = error instanceof Error ? error.message : '未知错误'
      this.activeTriggers.set(alarmId, triggerStatus)
    }
  }
  
  // 手动触发闹钟（用于测试）
  async triggerAlarmById(alarmId: string): Promise<boolean> {
    try {
      const alarms = await sleepAlarmService.getUserAlarms()
      const alarm = alarms.find(a => a._id === alarmId)
      
      if (!alarm) {
        console.error(`[闹钟触发服务] 未找到闹钟: ${alarmId}`)
        return false
      }
      
      await this.triggerAlarm(alarm)
      return true
    } catch (error) {
      console.error(`[闹钟触发服务] 手动触发失败:`, error)
      return false
    }
  }
  
  // 停止闹钟
  stopAlarm(alarmId: string): boolean {
    if (this.activeTriggers.has(alarmId)) {
      this.alarmManager.stopCurrentAlgorithm()
      // 停止所有音频播放
      audioManager.stopAll()
      this.activeTriggers.delete(alarmId)
      console.log(`[闹钟触发服务] 停止闹钟: ${alarmId}`)
      return true
    }
    return false
  }
  
  // 获取所有活跃触发状态
  getActiveTriggers(): AlarmTriggerStatus[] {
    return Array.from(this.activeTriggers.values())
  }
  
  // 获取特定闹钟的触发状态
  getAlarmTriggerStatus(alarmId: string): AlarmTriggerStatus | null {
    return this.activeTriggers.get(alarmId) || null
  }
  
  // 清除所有触发状态
  clearAllTriggers(): void {
    this.activeTriggers.clear()
    this.alarmManager.stopCurrentAlgorithm()
    // 停止所有音频播放
    audioManager.stopAll()
    console.log('[闹钟触发服务] 清除所有触发状态')
  }
  
  // 获取算法描述
  getAlgorithmDescription(method: string): string {
    return getAlgorithmDescription(method)
  }
  
  // 测试算法（用于开发）
  async testAlgorithm(
    method: string,
    soundType: string,
    minutesFromNow: number = 1
  ): Promise<boolean> {
    try {
      const now = new Date()
      const testTime = new Date(now.getTime() + minutesFromNow * 60 * 1000)
      const userId = 'test_user'
      
      console.log(`[闹钟触发服务] 测试算法: ${method}, 时间: ${testTime.toLocaleTimeString()}`)
      
      await this.alarmManager.executeWakeAlgorithm(
        method,
        testTime,
        soundType,
        userId
      )
      
      return true
    } catch (error) {
      console.error(`[闹钟触发服务] 测试算法失败:`, error)
      return false
    }
  }
}

// 导出单例实例
export const alarmTriggerService = AlarmTriggerService.getInstance()

// 导出常用函数
export function startAlarmTriggerService(): void {
  alarmTriggerService.start()
}

export function stopAlarmTriggerService(): void {
  alarmTriggerService.stop()
}

export function triggerTestAlarm(
  method: string = 'gentle',
  soundType: string = 'default',
  minutesFromNow: number = 1
): Promise<boolean> {
  return alarmTriggerService.testAlgorithm(method, soundType, minutesFromNow)
}

// 默认导出
export default {
  AlarmTriggerService,
  alarmTriggerService,
  startAlarmTriggerService,
  stopAlarmTriggerService,
  triggerTestAlarm
}
