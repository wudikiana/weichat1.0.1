// bluetooth.ts
interface IAppOption {
  globalData: { openid: string; isLoggedIn: boolean };
}

const app = getApp<IAppOption>();

Page({
  data: {
    currentDevice: null as any,
    isConnected: false,
    powerLevel: 5,  // 当前挡位，1-10挡
    battery: 85,
    nearbyDevices: [] as any[],
    connectedDevices: [] as any[],
    historyDevices: [] as any[],
    isScanning: false,
    isLoading: false,
    powerLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],  // 10个挡位
    deviceServices: [] as any[],
    characteristics: [] as any[],
    writeCharacterId: '',
    notifyCharacterId: '',
    deviceStats: null as any
  },

  onLoad() {
    this.loadDevices();
  },

  onShow() {
    this.loadDevices();
  },

  onUnload() {
    // 页面卸载时停止扫描
    if (this.data.isScanning) {
      wx.stopBluetoothDevicesDiscovery();
    }
  },

  // 从云端加载设备列表
  async loadDevices() {
    const app = getApp<IAppOption>();
    
    if (!app.globalData.isLoggedIn || !app.globalData.openid) {
      this.loadLocalDevices();
      return;
    }

    try {
      const res: any = await wx.cloud.callFunction({
        name: 'bluetooth-control',
        data: { action: 'getDevices' }
      });

      if (res.result && res.result.success && res.result.devices) {
        const devices = res.result.devices;
        const connected = devices.filter((d: any) => d.connected);
        const history = devices.filter((d: any) => !d.connected);

        this.setData({
          connectedDevices: connected,
          historyDevices: history,
          currentDevice: connected.length > 0 ? connected[0] : null,
          isConnected: connected.length > 0,
          powerLevel: connected.length > 0 ? (connected[0].powerLevel || 5) : 5,
          deviceStats: {
            totalDevices: devices.length,
            connectedCount: connected.length
          }
        });
      } else {
        this.loadLocalDevices();
      }
    } catch (err) {
      console.error('加载云端设备失败:', err);
      this.loadLocalDevices();
    }
  },

  // 从本地加载设备
  loadLocalDevices() {
    const devices = wx.getStorageSync('bluetoothDevices') || [];
    const connected = devices.filter((d: any) => d.connected);
    const history = devices.filter((d: any) => !d.connected);

    this.setData({
      connectedDevices: connected,
      historyDevices: history,
      currentDevice: connected.length > 0 ? connected[0] : null,
      isConnected: connected.length > 0,
      powerLevel: connected.length > 0 ? (connected[0].powerLevel || 5) : 5
    });
  },

  // 初始化蓝牙模块
  initBluetooth() {
    wx.openBluetoothAdapter({
      success: () => {
        console.log('蓝牙模块已开启');
        this.startScan();
      },
      fail: (err) => {
        console.error('开启蓝牙失败:', err);
        if (err.errCode === 10001) {
          wx.showModal({
            title: '提示',
            content: '请开启手机蓝牙后再试',
            showCancel: false
          });
        } else {
          wx.showToast({
            title: '蓝牙初始化失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 开始扫描设备
  startScan() {
    this.setData({ isScanning: true, nearbyDevices: [] });

    // 开始搜寻附近的蓝牙外围设备
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: () => {
        wx.showLoading({ title: '扫描中...' });

        // 监听发现新设备的事件
        wx.onBluetoothDeviceFound((res) => {
          res.devices.forEach((device) => {
            // 过滤有效设备（有名称的设备）
            if (device.name && device.name.trim() !== '') {
              const nearbyDevices = this.data.nearbyDevices;
              const existingIndex = nearbyDevices.findIndex((d: any) => d.deviceId === device.deviceId);

              const deviceInfo = {
                deviceId: device.deviceId,
                name: device.name,
                RSSI: device.RSSI,
                signal: this.getSignalLevel(device.RSSI),
                localName: device.localName || ''
              };

              if (existingIndex >= 0) {
                nearbyDevices[existingIndex] = deviceInfo;
              } else {
                nearbyDevices.push(deviceInfo);
              }

              this.setData({ nearbyDevices });
            }
          });
        });

        // 6秒后停止扫描
        setTimeout(() => {
          this.stopScan();
        }, 6000);
      },
      fail: (err) => {
        console.error('扫描失败:', err);
        wx.hideLoading();
        this.setData({ isScanning: false });
        wx.showToast({
          title: '扫描失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 停止扫描
  stopScan() {
    wx.stopBluetoothDevicesDiscovery();
    this.setData({ isScanning: false });
    wx.hideLoading();
    
    if (this.data.nearbyDevices.length === 0) {
      wx.showToast({
        title: '未发现附近设备',
        icon: 'none'
      });
    } else {
      wx.showToast({
        title: `发现${this.data.nearbyDevices.length}个设备`,
        icon: 'success'
      });
    }
  },

  // 获取信号强度等级
  getSignalLevel(rssi: number): string {
    if (rssi >= -50) return '强';
    if (rssi >= -70) return '中';
    return '弱';
  },

  // 扫描设备
  scanDevices() {
    if (this.data.isScanning) {
      wx.showToast({
        title: '正在扫描中...',
        icon: 'none'
      });
      return;
    }

    // 检查蓝牙是否可用
    wx.getBluetoothAdapterState({
      success: () => {
        this.initBluetooth();
      },
      fail: () => {
        this.initBluetooth();
      }
    });
  },

  // 连接设备
  connectDevice(e: any) {
    const device = e.currentTarget.dataset.device;
    const deviceId = device.deviceId || device.id;

    if (!deviceId) {
      wx.showToast({ title: '设备ID无效', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '连接中...' });

    // 先停止扫描
    if (this.data.isScanning) {
      wx.stopBluetoothDevicesDiscovery();
    }

    // 连接蓝牙设备
    wx.createBLEConnection({
      deviceId,
      timeout: 10000,
      success: () => {
        console.log('连接成功');
        // 获取设备服务
        this.getDeviceServices(deviceId, device);
      },
      fail: (err) => {
        console.error('连接失败:', err);
        wx.hideLoading();
        
        let message = '连接失败';
        if (err.errCode === 10001) {
          message = '蓝牙已断开，请重试';
        } else if (err.errCode === 10012) {
          message = '连接超时';
        }
        
        wx.showToast({
          title: message,
          icon: 'none'
        });
      }
    });
  },

  // 获取设备服务
  getDeviceServices(deviceId: string, deviceInfo: any) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        console.log('设备服务:', res.services);
        const services = res.services.filter((s: any) => s.isPrimary);

        if (services.length > 0) {
          // 获取第一个主服务的特征值
          this.getDeviceCharacteristics(deviceId, services[0].uuid, deviceInfo);
        } else {
          // 没有主服务，使用模拟连接
          this.onConnected(deviceId, deviceInfo, '', '');
        }
      },
      fail: (err) => {
        console.error('获取服务失败:', err);
        this.onConnected(deviceId, deviceInfo, '', '');
      }
    });
  },

  // 获取设备特征值
  getDeviceCharacteristics(deviceId: string, serviceId: string, deviceInfo: any) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('设备特征值:', res.characteristics);

        const characteristics = res.characteristics;
        let writeCharacterId = '';
        let notifyCharacterId = '';

        // 查找可写和可通知的特征值
        characteristics.forEach((char: any) => {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacterId = char.uuid;
          }
          if (char.properties.notify || char.properties.indicate) {
            notifyCharacterId = char.uuid;
          }
        });

        this.setData({
          deviceServices: res.services,
          characteristics,
          writeCharacterId,
          notifyCharacterId
        });

        // 启用通知
        if (notifyCharacterId) {
          wx.notifyBLECharacteristicValueChange({
            deviceId,
            serviceId,
            characteristicId: notifyCharacterId,
            state: true
          });

          // 监听特征值变化
          wx.onBLECharacteristicValueChange((characteristic) => {
            if (characteristic.characteristicId === notifyCharacterId) {
              this.onCharacteristicValueChange(characteristic);
            }
          });
        }

        // 连接成功，保存设备信息
        this.onConnected(deviceId, deviceInfo, writeCharacterId, notifyCharacterId);
      },
      fail: (err) => {
        console.error('获取特征值失败:', err);
        this.onConnected(deviceId, deviceInfo, '', '');
      }
    });
  },

  // 特征值变化回调
  onCharacteristicValueChange(characteristic: any) {
    console.log('收到设备数据:', characteristic);
    // 可以在这里解析设备返回的数据
  },

  // 连接成功处理
  async onConnected(deviceId: string, deviceInfo: any, writeCharacterId: string, notifyCharacterId: string) {
    wx.hideLoading();

    const device = {
      id: deviceId,
      name: deviceInfo.name,
      connected: true,
      connectTime: new Date(),
      powerLevel: this.data.powerLevel,
      battery: this.data.battery,
      writeCharacterId,
      notifyCharacterId,
      RSSI: deviceInfo.RSSI || deviceInfo.rssi
    };

    // 更新本地存储
    this.saveDeviceLocal(device);

    // 如果用户已登录，同步到云端
    const app = getApp<IAppOption>();
    if (app.globalData.isLoggedIn && app.globalData.openid) {
      await this.saveDeviceToCloud(device);
    }

    this.setData({
      currentDevice: device,
      isConnected: true,
      connectedDevices: [device],
      nearbyDevices: this.data.nearbyDevices.filter((d: any) => d.deviceId !== deviceId)
    });

    wx.showToast({ title: '连接成功', icon: 'success' });

    // 获取设备电量等信息
    this.getDeviceBattery(deviceId);
  },

  // 获取设备电量（通过读取特征值）
  getDeviceBattery(deviceId: string) {
    // 注意：实际项目中需要根据设备的具体协议来读取电量
    // 这里模拟读取电量
    const battery = Math.floor(Math.random() * 30) + 70; // 70-100%
    this.setData({ 'currentDevice.battery': battery });
  },

  // 保存设备到本地
  saveDeviceLocal(device: any) {
    let devices = wx.getStorageSync('bluetoothDevices') || [];
    const existingIndex = devices.findIndex((d: any) => d.id === device.id);

    if (existingIndex >= 0) {
      devices[existingIndex] = device;
    } else {
      devices.unshift(device);
    }

    // 如果有其他设备已连接，先断开
    devices = devices.map((d: any) => {
      if (d.id !== device.id) {
        d.connected = false;
      }
      return d;
    });

    wx.setStorageSync('bluetoothDevices', devices);
  },

  // 保存设备到云端
  async saveDeviceToCloud(device: any) {
    try {
      await wx.cloud.callFunction({
        name: 'bluetooth-control',
        data: {
          action: 'saveDevice',
          deviceId: device.id,
          data: {
            name: device.name,
            powerLevel: device.powerLevel,
            battery: device.battery,
            isConnected: device.connected
          }
        }
      });
    } catch (err) {
      console.error('保存设备到云端失败:', err);
    }
  },

  // 断开连接
  async disconnectDevice() {
    if (!this.data.currentDevice) return;

    const device = this.data.currentDevice;

    wx.showModal({
      title: '确认断开',
      content: `确定要断开与 ${device.name} 的连接吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '断开中...' });

          // 关闭蓝牙连接
          wx.closeBLEConnection({
            deviceId: device.id,
            success: () => {
              console.log('蓝牙连接已关闭');
            },
            fail: () => {
              console.log('关闭连接失败（或连接已断开）');
            }
          });

          // 更新本地存储
          let devices = wx.getStorageSync('bluetoothDevices') || [];
          devices = devices.map((d: any) => {
            if (d.id === device.id) {
              d.connected = false;
            }
            return d;
          });
          wx.setStorageSync('bluetoothDevices', devices);

          // 更新云端状态
          const app = getApp<IAppOption>();
          if (app.globalData.isLoggedIn) {
            try {
              await wx.cloud.callFunction({
                name: 'bluetooth-control',
                data: {
                  action: 'disconnect',
                  deviceId: device.id
                }
              });
            } catch (err) {
              console.error('更新云端状态失败:', err);
            }
          }

          wx.hideLoading();

          this.setData({
            isConnected: false,
            currentDevice: null,
            connectedDevices: [],
            powerLevel: 5
          });

          wx.showToast({ title: '已断开连接', icon: 'success' });
        }
      }
    });
  },

  // 设置挡位（核心功能）
  async setPowerLevel(e: any) {
    if (!this.data.isConnected || !this.data.currentDevice) {
      wx.showToast({ title: '请先连接设备', icon: 'none' });
      return;
    }

    const level = parseInt(e.currentTarget.dataset.level);
    
    if (level < 1 || level > 10) {
      wx.showToast({ title: '挡位应在1-10之间', icon: 'none' });
      return;
    }

    // 发送蓝牙指令
    this.sendPowerLevelCommand(level);

    // 更新本地状态
    this.setData({ powerLevel: level });

    // 更新当前设备
    const device = { ...this.data.currentDevice, powerLevel: level };
    this.setData({ currentDevice: device });
    this.saveDeviceLocal(device);

    // 同步到云端
    const app = getApp<IAppOption>();
    if (app.globalData.isLoggedIn) {
      try {
        await wx.cloud.callFunction({
          name: 'bluetooth-control',
          data: {
            action: 'setPowerLevel',
            deviceId: device.id,
            data: { level, deviceId: device.id }
          }
        });
        console.log('挡位已同步到云端');
      } catch (err) {
        console.error('同步挡位失败:', err);
      }
    }

    wx.showToast({ title: `已切换到${level}挡`, icon: 'success' });
  },

  // 发送挡位指令到蓝牙设备
  sendPowerLevelCommand(level: number) {
    const device = this.data.currentDevice;
    if (!device) return;

    // 构造指令数据：挡位指令格式为 [0xAA, 0x05, level, checksum]
    // 根据实际设备协议调整
    const command = [0xAA, 0x05, level, (0xAA + 0x05 + level) & 0xFF];
    const buffer = new ArrayBuffer(command.length);
    const dataView = new DataView(buffer);

    command.forEach((byte, index) => {
      dataView.setUint8(index, byte);
    });

    // 如果有写入特征值，发送蓝牙指令
    if (device.writeCharacterId && this.data.deviceServices.length > 0) {
      wx.writeBLECharacteristicValue({
        deviceId: device.id,
        serviceId: this.data.deviceServices[0]?.uuid,
        characteristicId: device.writeCharacterId,
        value: buffer,
        success: () => {
          console.log('挡位指令发送成功:', level);
        },
        fail: (err) => {
          console.error('发送挡位指令失败:', err);
        }
      });
    } else {
      console.log('模拟发送挡位指令:', level);
    }
  },

  // 调节挡位（步进）
  adjustPowerLevel(delta: number) {
    if (!this.data.isConnected) {
      wx.showToast({ title: '请先连接设备', icon: 'none' });
      return;
    }

    let newLevel = this.data.powerLevel + delta;
    if (newLevel < 1) newLevel = 1;
    if (newLevel > 10) newLevel = 10;

    this.setPowerLevel({ currentTarget: { dataset: { level: newLevel } } });
  },

  // 快速设置挡位
  quickSetPowerLevel(e: any) {
    const level = parseInt(e.currentTarget.dataset.level);
    this.setPowerLevel({ currentTarget: { dataset: { level } } });
  },

  // 查看设备详情
  viewDeviceDetail(e: any) {
    const device = e.currentTarget.dataset.device || this.data.currentDevice;
    if (!device) return;

    const content = `设备名称: ${device.name}\n` +
      `设备ID: ${device.id || device.deviceId}\n` +
      `信号强度: ${device.RSSI ? `RSSI ${device.RSSI}` : '未知'}\n` +
      `电池电量: ${device.battery || this.data.battery}%\n` +
      `当前挡位: ${device.powerLevel || this.data.powerLevel}挡\n` +
      `连接状态: ${device.connected ? '已连接' : '已断开'}`;

    wx.showModal({
      title: device.name,
      content: content,
      showCancel: false,
      confirmText: '关闭'
    });
  },

  // 连接历史设备
  connectHistoryDevice(e: any) {
    const device = e.currentTarget.dataset.device;
    this.connectDevice({ currentTarget: { dataset: { device } } });
  },

  // 删除历史设备
  async deleteHistoryDevice(e: any) {
    const device = e.currentTarget.dataset.device;
    const index = e.currentTarget.dataset.index;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除设备 ${device.name} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          // 从本地删除
          let devices = wx.getStorageSync('bluetoothDevices') || [];
          devices = devices.filter((d: any) => d.id !== device.id);
          wx.setStorageSync('bluetoothDevices', devices);

          // 从云端删除
          const app = getApp<IAppOption>();
          if (app.globalData.isLoggedIn) {
            try {
              await wx.cloud.callFunction({
                name: 'bluetooth-control',
                data: {
                  action: 'deleteDevice',
                  deviceId: device.id
                }
              });
            } catch (err) {
              console.error('删除云端设备失败:', err);
            }
          }

          // 更新页面
          const historyDevices = [...this.data.historyDevices];
          historyDevices.splice(index, 1);
          this.setData({ historyDevices });

          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  // 获取设备电量显示
  getBatteryLevel(battery: number): string {
    if (battery >= 80) return '充足';
    if (battery >= 50) return '良好';
    if (battery >= 20) return '一般';
    return '偏低';
  },

  // 获取挡位对应的音量描述
  getPowerLevelDescription(level: number): string {
    if (level <= 3) return '低音量';
    if (level <= 6) return '中等音量';
    if (level <= 8) return '较大音量';
    return '最大音量';
  }
});
