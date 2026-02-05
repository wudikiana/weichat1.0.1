// ear-scan.ts
Page({
  data: {
    scanHistory: [],
    isLoading: false
  },

  onLoad() {
    this.loadScanHistory();
  },

  onShow() {
    this.loadScanHistory();
  },

  // 加载扫描历史
  async loadScanHistory() {
    this.setData({ isLoading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'earScan',
        data: {
          action: 'listScanHistory'
        }
      });
      
      if (result.result.code === 200) {
        this.setData({
          scanHistory: result.result.data.history
        });
        
        // 保存到本地存储作为备份
        wx.setStorageSync('scanHistory', result.result.data.history);
      }
    } catch (error) {
      console.error('加载扫描历史失败:', error);
      // 如果云函数调用失败，使用本地存储的历史记录
      const localHistory = wx.getStorageSync('scanHistory') || [];
      this.setData({ scanHistory: localHistory });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 从相册选择
  chooseFromAlbum() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.uploadAndAnalyze(res.tempFilePaths[0]);
      }
    });
  },

  // 拍照
  takePhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        this.uploadAndAnalyze(res.tempFilePaths[0]);
      }
    });
  },

  // 上传并分析图片
  async uploadAndAnalyze(imagePath: string) {
    wx.showLoading({ 
      title: '上传中...',
      mask: true
    });
    
    try {
      // 获取文件扩展名
      const fileName = imagePath.substring(imagePath.lastIndexOf('/') + 1);
      const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
      
      // 验证文件扩展名
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.bmp'];
      if (!allowedExtensions.includes(fileExt)) {
        wx.showToast({
          title: `不支持的文件格式，仅支持: ${allowedExtensions.join(', ')}`,
          icon: 'error'
        });
        wx.hideLoading();
        return;
      }
      
      // 1. 上传图片到云存储
      const cloudPath = `ear-scans/temp_${Date.now()}_${Math.random().toString(36).substring(2)}${fileExt}`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: imagePath
      });
      
      wx.showLoading({ title: '分析中...' });
      
      // 2. 调用云函数进行分析
      const result = await wx.cloud.callFunction({
        name: 'earScan',
        data: {
          action: 'uploadAndAnalyze',
          fileID: uploadResult.fileID,
          fileName: fileName
        }
      });
      
      if (result.result.code === 200) {
        // 3. 跳转到结果页面
        wx.navigateTo({
          url: `/pages/ear-scan-result/ear-scan-result?recordId=${result.result.data.recordId}`
        });
      } else {
        wx.showToast({
          title: result.result.message || '分析失败',
          icon: 'error'
        });
      }
    } catch (error: any) {
      console.error('上传分析失败:', error);
      wx.showToast({
        title: error.errMsg || '上传失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 查看历史结果
  viewResult(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/ear-scan-result/ear-scan-result?recordId=${id}`
    });
  },

  // 刷新历史记录
  refreshHistory() {
    this.loadScanHistory();
  }
});