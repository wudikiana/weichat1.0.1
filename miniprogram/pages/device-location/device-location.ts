// device-location.ts - 设备定位功能
Page({
  data: {
    // 当前状态
    currentStep: 1, // 1: 佩戴前上传, 2: 标记位置, 3: 佩戴后上传, 4: 查看结果
    isLoading: false,
    
    // 图片相关
    preWearImage: '',
    postWearImage: '',
    referenceImage: '',
    markingPoints: [], // 标记点数组 [{x, y}, ...]
    isMarking: false,
    
    // Canvas相关
    canvas: null as any,
    ctx: null as any,
    canvasReady: false,
    useCanvas2D: false,
    useLegacyCanvas: false,
    canvasWidth: 0,
    canvasHeight: 0,
    imageInfo: null as any,
    canvasError: '', // Canvas错误信息
    
    // 记录信息
    currentRecordId: '',
    locationHistory: [],
    
    // 分析结果
    analysisResult: null as any,
    score: 0,
    
    // 统计信息
    stats: {
      successRate: 0,
      successCount: 0,
      failCount: 0,
      totalTests: 0
    }
  },

  onLoad() {
    this.loadReferenceImage();
    this.loadLocationHistory();
  },

  onShow() {
    this.loadLocationHistory();
    this.monitorCanvasState();
    
    // 每次显示页面时检查Canvas状态
    if (this.data.currentStep === 2) {
      console.log('页面显示，检查Canvas状态...');
      this.monitorCanvasState();
      
      // 如果已有图片但Canvas未就绪，重新初始化
      if (this.data.preWearImage && !this.data.canvasReady) {
        console.log('有图片但Canvas未就绪，重新初始化...');
        setTimeout(() => {
          this.initCanvas();
        }, 300);
      }
    }
  },

  onReady() {
    // 在页面渲染完成后初始化Canvas
    console.log('onReady: 开始初始化Canvas上下文...');
    // 延迟初始化，确保Canvas元素已经渲染完成
    setTimeout(() => {
      this.initCanvas();
    }, 300);
  },

  // 初始化canvas（修复版本，确保Canvas正确初始化）
  initCanvas(retryCount = 0) {
    const maxRetries = 3;
    
    console.log(`开始初始化Canvas（第${retryCount + 1}次尝试）...`);
    
    // 使用wx.createSelectorQuery获取Canvas节点，设置正确的尺寸
    const query = wx.createSelectorQuery();
    query.select('#marking-canvas')
      .fields({
        node: true,
        size: true,
        rect: true
      })
      .exec((res) => {
        console.log('Canvas查询结果:', res);
        
        if (res && res[0]) {
          const canvasInfo = res[0];
          console.log('Canvas节点信息:', canvasInfo);
          
          // 获取Canvas的实际显示尺寸
          const displayWidth = canvasInfo.width || 600;
          const displayHeight = canvasInfo.height || 600;
          
          console.log('Canvas显示尺寸:', displayWidth, 'x', displayHeight);
          
          // 创建Canvas上下文
          let ctx = null;
          try {
            // 尝试使用Canvas 2D API
            if (canvasInfo.node && typeof canvasInfo.node.getContext === 'function') {
              ctx = canvasInfo.node.getContext('2d');
              console.log('使用Canvas 2D API成功');
              this.setData({
                useCanvas2D: true,
                useLegacyCanvas: false
              });
            } else if (typeof wx.createCanvasContext === 'function') {
              // 回退到旧版Canvas API
              ctx = wx.createCanvasContext('marking-canvas');
              console.log('使用旧版Canvas API成功');
              this.setData({
                useCanvas2D: false,
                useLegacyCanvas: true
              });
            }
            
            if (ctx) {
              // 设置Canvas的像素尺寸（与显示尺寸一致）
              if (canvasInfo.node) {
                canvasInfo.node.width = displayWidth;
                canvasInfo.node.height = displayHeight;
                console.log('设置Canvas像素尺寸:', displayWidth, 'x', displayHeight);
              }
              
              this.setData({
                canvas: { 
                  width: displayWidth, 
                  height: displayHeight,
                  node: canvasInfo.node 
                },
                ctx: ctx,
                canvasReady: true,
                canvasWidth: displayWidth,
                canvasHeight: displayHeight,
                canvasError: ''
              });
              
              console.log('Canvas初始化成功，尺寸:', displayWidth, 'x', displayHeight);
              
              // 如果已有图片，绘制图片
              if (this.data.preWearImage) {
                console.log('已有图片，开始绘制...');
                setTimeout(() => {
                  this.drawImageOnCanvas(this.data.preWearImage);
                }, 100);
              }
            } else {
              throw new Error('无法创建Canvas上下文');
            }
          } catch (error: any) {
            console.error('Canvas初始化失败:', error);
            this.setData({
              canvasReady: false,
              canvasError: error?.message || error?.errMsg || 'Canvas初始化失败'
            });
            
            wx.showToast({
              title: 'Canvas初始化失败',
              icon: 'error',
              duration: 3000
            });
          }
        } else {
          console.warn(`无法获取Canvas节点信息（第${retryCount + 1}次尝试），res:`, res);
          console.warn('Canvas可能还未渲染完成...');
          
          if (retryCount < maxRetries) {
            // 重试
            const delay = 300 * (retryCount + 1); // 递增延迟：300ms, 600ms, 900ms
            console.log(`等待${delay}ms后重试...`);
            setTimeout(() => {
              this.initCanvas(retryCount + 1);
            }, delay);
          } else {
            console.error('Canvas初始化多次尝试失败，使用备用方案');
            // 使用备用方案
            this.initCanvasFallback();
          }
        }
      });
  },
  
  // Canvas初始化备用方案（改进版本）
  initCanvasFallback() {
    console.log('使用Canvas初始化备用方案（改进版本）...');
    
    try {
      // 尝试获取Canvas的实际显示尺寸
      const query = wx.createSelectorQuery();
      query.select('#marking-canvas')
        .boundingClientRect()
        .exec((res) => {
          let width = 600;
          let height = 600;
          
          if (res && res[0]) {
            width = res[0].width || 600;
            height = res[0].height || 600;
            console.log('备用方案获取到Canvas尺寸:', width, 'x', height);
          } else {
            console.log('备用方案无法获取Canvas尺寸，使用默认值600x600');
          }
          
          const ctx = wx.createCanvasContext('marking-canvas');
          
          this.setData({
            canvas: { width: width, height: height },
            ctx: ctx,
            canvasReady: true,
            useLegacyCanvas: true,
            canvasWidth: width,
            canvasHeight: height,
            canvasError: ''
          });
          
          console.log('Canvas备用方案初始化成功，尺寸:', width, 'x', height);
          
          // 如果已有图片，绘制图片
          if (this.data.preWearImage) {
            console.log('已有图片，开始绘制...');
            setTimeout(() => {
              this.drawImageOnCanvas(this.data.preWearImage);
            }, 100);
          }
        });
    } catch (error: any) {
      console.error('Canvas备用方案也失败:', error);
      this.setData({
        canvasReady: false,
        canvasError: 'Canvas初始化完全失败'
      });
    }
  },
  
  // 监控Canvas状态变化
  monitorCanvasState() {
    if (this.data.currentStep === 2 && !this.data.canvasReady) {
      console.log('步骤2中Canvas未就绪，尝试初始化...');
      this.initCanvas();
    }
  },

  // 确保Canvas已准备好（改进版本，等待实际初始化）
  ensureCanvasReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.data.canvasReady && this.data.ctx) {
        console.log('Canvas已就绪，上下文存在');
        resolve();
        return;
      }
      
      console.log('Canvas未就绪，等待初始化...');
      
      // 尝试重新初始化Canvas
      this.initCanvas();
      
      // 设置超时检查
      let checkCount = 0;
      const maxChecks = 10; // 最多检查10次
      const checkInterval = setInterval(() => {
        checkCount++;
        
        if (this.data.canvasReady && this.data.ctx) {
          clearInterval(checkInterval);
          console.log(`Canvas在第${checkCount}次检查后准备就绪`);
          resolve();
        } else if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          console.error('Canvas初始化超时');
          reject(new Error('Canvas初始化超时'));
        } else {
          console.log(`等待Canvas初始化... (${checkCount}/${maxChecks})`);
        }
      }, 100); // 每100ms检查一次
    });
  },
  
  // 改进的Canvas就绪检查方法（带超时和备用方案）
  ensureCanvasReadyImproved(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 如果Canvas已经就绪，立即返回
      if (this.data.canvasReady && this.data.ctx) {
        console.log('Canvas已就绪，上下文存在');
        resolve();
        return;
      }
      
      console.log('Canvas未就绪，开始改进的等待流程...');
      
      // 设置超时（3秒）
      const timeoutId = setTimeout(() => {
        console.error('Canvas初始化超时（改进版本）');
        reject(new Error('Canvas初始化超时'));
      }, 3000);
      
      // 尝试初始化Canvas
      this.initCanvas();
      
      // 使用更频繁的检查
      let checkCount = 0;
      const maxChecks = 30; // 最多检查30次（3秒）
      const checkInterval = setInterval(() => {
        checkCount++;
        
        if (this.data.canvasReady && this.data.ctx) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          console.log(`Canvas在第${checkCount}次检查后准备就绪（改进版本）`);
          resolve();
        } else if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          console.error('Canvas初始化多次检查失败（改进版本）');
          reject(new Error('Canvas初始化多次检查失败'));
        } else {
          // 每100次检查尝试重新初始化一次
          if (checkCount % 10 === 0) {
            console.log(`第${checkCount}次检查，尝试重新初始化Canvas...`);
            this.initCanvas();
          }
        }
      }, 100); // 每100ms检查一次
    });
  },

  // 加载参考图片
  async loadReferenceImage() {
    console.log('开始加载参考图片...');
    try {
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'getReferenceImage'
        }
      });
      
      console.log('参考图片云函数返回完整数据:', JSON.stringify(result, null, 2));
      
      if (result.result && result.result.code === 200) {
        console.log('参考图片加载成功，数据详情:', {
          foundPath: result.result.data?.foundPath,
          imageUrl: result.result.data?.imageUrl,
          fileID: result.result.data?.fileID,
          fileName: result.result.data?.fileName
        });
        
        // 检查是否有有效的图片URL
        if (result.result.data?.imageUrl) {
          this.setData({
            referenceImage: result.result.data.imageUrl,
            referenceImageError: null
          });
          console.log('参考图片URL已设置:', result.result.data.imageUrl);
        } else {
          console.warn('参考图片URL为空，使用备用方案');
          this.setData({
            referenceImage: '',
            referenceImageError: '参考图片URL为空'
          });
          
          // 显示错误提示
          wx.showToast({
            title: '参考图片URL为空',
            icon: 'none',
            duration: 3000
          });
        }
      } else {
        console.warn('参考图片加载失败:', result.result?.message || '未知错误');
        console.warn('建议路径:', result.result?.data?.suggestedPaths);
        // 使用备用图片或显示提示
        this.setData({
          referenceImage: '', // 清空图片，显示占位符
          referenceImageError: result.result?.message || '加载失败',
          referenceImageSuggestions: result.result?.data?.suggestedPaths || []
        });
        
        // 显示错误提示
        wx.showToast({
          title: result.result?.message || '参考图片加载失败',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error: any) {
      console.error('加载参考图片失败:', error);
      // 使用备用图片或显示提示
      this.setData({
        referenceImage: '',
        referenceImageError: error.errMsg || '网络错误，请检查连接'
      });
      
      wx.showToast({
        title: '加载失败: ' + (error.errMsg || '未知错误'),
        icon: 'none',
        duration: 3000
      });
    }
  },

  // 加载定位历史
  async loadLocationHistory() {
    this.setData({ isLoading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'getLocationHistory'
        }
      });
      
      if (result.result.code === 200) {
        this.setData({
          locationHistory: result.result.data.history
        });
        this.updateStats();
      }
    } catch (error) {
      console.error('加载定位历史失败:', error);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 更新统计信息
  updateStats() {
    const history = this.data.locationHistory;
    const totalTests = history.length;
    const successCount = history.filter(item => item.score >= 80).length;
    const failCount = totalTests - successCount;
    const successRate = totalTests > 0 ? Math.round((successCount / totalTests) * 100) : 0;
    
    this.setData({
      stats: {
        successRate,
        successCount,
        failCount,
        totalTests
      }
    });
  },

  // 步骤1: 选择佩戴前图片
  choosePreWearImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadPreWearImage(res.tempFilePaths[0]);
      }
    });
  },

  // 上传佩戴前图片
  async uploadPreWearImage(imagePath: string) {
    wx.showLoading({ 
      title: '上传中...',
      mask: true
    });
    
    try {
      // 1. 上传图片到云存储
      const cloudPath = `device-location/temp_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: imagePath
      });
      
      // 2. 调用云函数保存记录
      const fileName = imagePath.substring(imagePath.lastIndexOf('/') + 1);
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'uploadPreWearImage',
          fileID: uploadResult.fileID,
          fileName: fileName,
          markingPoints: this.data.markingPoints
        }
      });
      
      if (result.result.code === 200) {
        this.setData({
          preWearImage: result.result.data.imageUrl,
          currentRecordId: result.result.data.recordId,
          currentStep: 2 // 进入标记步骤
        });
        
        // 确保Canvas已初始化，然后显示图片用于标记
        this.ensureCanvasReady().then(() => {
          this.drawImageOnCanvas(result.result.data.imageUrl);
        }).catch((error) => {
          console.error('Canvas准备失败:', error);
          wx.showToast({
            title: 'Canvas初始化失败，请刷新页面重试',
            icon: 'error'
          });
        });
      } else {
        wx.showToast({
          title: result.result.message || '上传失败',
          icon: 'error'
        });
      }
    } catch (error: any) {
      console.error('上传佩戴前图片失败:', error);
      wx.showToast({
        title: error.errMsg || '上传失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 在canvas上绘制图片（只使用旧版Canvas API）
  drawImageOnCanvas(imageUrl: string) {
    const { ctx, canvasReady } = this.data;
    
    // 检查Canvas是否已就绪
    if (!canvasReady) {
      console.error('Canvas未就绪，无法绘制图片');
      wx.showToast({
        title: 'Canvas未就绪，请稍后重试',
        icon: 'error',
        duration: 2000
      });
      
      // 尝试重新初始化Canvas，然后重试绘制
      this.initCanvas();
      setTimeout(() => {
        if (this.data.canvasReady) {
          console.log('Canvas重新初始化成功，重试绘制图片');
          this.drawImageOnCanvas(imageUrl);
        }
      }, 500);
      return;
    }
    
    if (!ctx) {
      console.error('Canvas上下文不存在，无法绘制图片');
      wx.showToast({
        title: 'Canvas上下文不存在',
        icon: 'error',
        duration: 2000
      });
      return;
    }
    
    console.log('开始绘制图片到Canvas（使用旧版API）:', imageUrl);
    
    // 验证图片URL并确保Canvas完全就绪
    this.ensureCanvasReady().then(() => {
      console.log('Canvas确认就绪，开始绘制图片');
      this.drawImageOnCanvasLegacy(imageUrl);
    }).catch((error: any) => {
      console.error('Canvas准备失败:', error);
      wx.showToast({
        title: 'Canvas准备失败，使用简化绘制',
        icon: 'none',
        duration: 2000
      });
      // 使用简化绘制作为备用方案
      this.drawImageSimple(imageUrl);
    });
  },

  // 使用Canvas 2D绘制图片
  drawImageOnCanvas2D(imageUrl: string) {
    const { canvas, ctx } = this.data;
    
    console.log('开始使用Canvas 2D绘制图片:', imageUrl);
    console.log('Canvas状态:', { 
      canvasExists: !!canvas, 
      ctxExists: !!ctx,
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height
    });
    
    // 创建Image对象
    const img = canvas.createImage();
    console.log('Image对象创建成功:', !!img);
    
    img.onload = () => {
      console.log('图片加载完成，尺寸:', img.width, 'x', img.height);
      
      // 清除canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.log('Canvas已清除');
      
      // 计算缩放比例（保持宽高比）
      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
      );
      const width = img.width * scale;
      const height = img.height * scale;
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;
      
      console.log('Canvas绘制参数:', { 
        x: Math.round(x), 
        y: Math.round(y), 
        width: Math.round(width), 
        height: Math.round(height), 
        canvasWidth: canvas.width, 
        canvasHeight: canvas.height,
        scale: scale
      });
      
      // 绘制图片
      try {
        ctx.drawImage(img, x, y, width, height);
        console.log('图片绘制成功');
        
        // 保存图片信息用于坐标转换
        this.setData({
          imageInfo: {
            x, y, width, height,
            originalWidth: img.width,
            originalHeight: img.height,
            scale: scale
          }
        });
        
        console.log('图片信息已保存:', this.data.imageInfo);
        
        // 绘制已有的标记点
        this.drawMarkingPoints();
      } catch (drawError) {
        console.error('绘制图片失败:', drawError);
      }
    };
    
    img.onerror = (error) => {
      console.error('图片加载失败:', error);
      console.error('图片URL:', imageUrl);
      
      // 尝试使用备用方法
      this.drawImageOnCanvasFallback(imageUrl);
    };
    
    // 设置图片源（这会触发加载）
    img.src = imageUrl;
    console.log('图片源已设置，开始加载...');
  },

  // 使用旧版canvas绘制图片（修复版本，使用图片加载事件）
  drawImageOnCanvasLegacy(imageUrl: string) {
    console.log('🔍 使用旧版canvas绘制图片（修复版本）:', imageUrl);
    console.log('📊 Canvas状态:', {
      ctxExists: !!this.data.ctx,
      canvasReady: this.data.canvasReady,
      canvasWidth: this.data.canvasWidth,
      canvasHeight: this.data.canvasHeight,
      useLegacyCanvas: this.data.useLegacyCanvas,
      useCanvas2D: this.data.useCanvas2D
    });
    
    const { ctx } = this.data;
    if (!ctx) {
      console.error('❌ Canvas上下文不存在');
      wx.showToast({
        title: 'Canvas上下文不存在',
        icon: 'error'
      });
      return;
    }
    
    // 验证图片URL是否有效
    console.log('🔗 验证图片URL:', imageUrl);
    
    // 检查图片URL是否为空或无效
    if (!imageUrl || imageUrl.trim() === '') {
      console.error('❌ 图片URL为空或无效');
      wx.showToast({
        title: '图片URL无效',
        icon: 'error'
      });
      return;
    }
    
    // 检查图片URL是否以http或https开头
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      console.warn('⚠️ 图片URL不是有效的网络地址:', imageUrl);
      // 尝试添加云存储前缀
      if (imageUrl.startsWith('cloud://')) {
        console.log('☁️ 云存储URL，应该可以正常访问');
      } else {
        console.error('❌ 图片URL格式不正确');
        wx.showToast({
          title: '图片URL格式不正确',
          icon: 'error'
        });
        return;
      }
    }
    
    // 先绘制一个简单的测试图形，确认Canvas能工作
    console.log('🎯 先绘制测试图形确认Canvas能工作...');
    ctx.setFillStyle('#0000ff');
    ctx.fillRect(10, 10, 50, 50);
    ctx.setFillStyle('#ffffff');
    ctx.setFontSize(12);
    ctx.fillText('测试', 15, 35);
    
    // 立即提交测试图形，确认Canvas能工作
    try {
      ctx.draw(true);
      console.log('✅ 测试图形绘制成功，Canvas能正常工作');
    } catch (testError) {
      console.error('❌ 测试图形绘制失败:', testError);
      return;
    }
    
    // 使用wx.getImageInfo获取图片信息（旧版Canvas API的正确方式）
    wx.getImageInfo({
      src: imageUrl,
      success: (res: any) => {
        console.log('✅ 图片信息获取成功，开始绘制');
        console.log('📏 图片尺寸:', res.width, 'x', res.height);
        
        // 清除之前的测试图形
        ctx.clearRect(0, 0, this.data.canvasWidth || 600, this.data.canvasHeight || 600);
        
        // 计算自适应Canvas尺寸
        // 使用新的API获取窗口信息，避免弃用警告
        let windowWidth = 375; // 默认值
        let windowHeight = 667; // 默认值
        
        try {
          if (typeof wx.getWindowInfo === 'function') {
            const windowInfo = wx.getWindowInfo();
            windowWidth = windowInfo.windowWidth;
            windowHeight = windowInfo.windowHeight;
            console.log('📱 使用wx.getWindowInfo获取窗口尺寸:', windowWidth, 'x', windowHeight);
          } else if (typeof wx.getSystemInfoSync === 'function') {
            // 兼容旧版本
            const systemInfo = wx.getSystemInfoSync();
            windowWidth = systemInfo.windowWidth;
            windowHeight = systemInfo.windowHeight;
            console.log('📱 使用wx.getSystemInfoSync获取窗口尺寸:', windowWidth, 'x', windowHeight);
          }
        } catch (error) {
          console.warn('获取窗口信息失败，使用默认值:', error);
        }
        
        // 最大Canvas尺寸：屏幕宽度的80%，最大600px
        const maxCanvasWidth = Math.min(windowWidth * 0.8, 600);
        const maxCanvasHeight = Math.min(windowHeight * 0.6, 600);
        
        console.log('📏 计算参数:', {
          图片尺寸: `${res.width}x${res.height}`,
          窗口尺寸: `${windowWidth}x${windowHeight}`,
          最大Canvas尺寸: `${Math.round(maxCanvasWidth)}x${Math.round(maxCanvasHeight)}`
        });
        
        // 计算缩放比例（保持宽高比，确保图片完全显示）
        const scale = Math.min(
          maxCanvasWidth / res.width,
          maxCanvasHeight / res.height
        );
        
        // 计算Canvas实际尺寸（确保图片完全显示）
        const canvasWidth = Math.min(res.width * scale, maxCanvasWidth);
        const canvasHeight = Math.min(res.height * scale, maxCanvasHeight);
        
        console.log('📐 自适应Canvas尺寸:', {
          scale: scale.toFixed(4),
          canvasWidth: Math.round(canvasWidth),
          canvasHeight: Math.round(canvasHeight),
          计算依据: `min(${maxCanvasWidth}/${res.width}=${(maxCanvasWidth/res.width).toFixed(4)}, ${maxCanvasHeight}/${res.height}=${(maxCanvasHeight/res.height).toFixed(4)})`
        });
        
        // 更新Canvas尺寸
        this.setData({
          canvasWidth: canvasWidth,
          canvasHeight: canvasHeight
        });
        
        // 清除canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        console.log('🧹 Canvas已清除，尺寸:', Math.round(canvasWidth), 'x', Math.round(canvasHeight));
        
        // 计算图片绘制尺寸（保持宽高比）
        const drawWidth = res.width * scale;
        const drawHeight = res.height * scale;
        
        // 计算居中位置，确保图片完全显示在Canvas内
        const x = Math.max(0, (canvasWidth - drawWidth) / 2);
        const y = Math.max(0, (canvasHeight - drawHeight) / 2);
        
        // 边界检查：确保绘制不会超出Canvas
        const safeX = Math.max(0, Math.min(x, canvasWidth - drawWidth));
        const safeY = Math.max(0, Math.min(y, canvasHeight - drawHeight));
        const safeWidth = Math.min(drawWidth, canvasWidth);
        const safeHeight = Math.min(drawHeight, canvasHeight);
        
        console.log('🎨 Canvas绘制参数:', { 
          图片位置: `(${Math.round(safeX)}, ${Math.round(safeY)})`,
          图片尺寸: `${Math.round(safeWidth)}x${Math.round(safeHeight)}`,
          缩放比例: scale.toFixed(4),
          Canvas尺寸: `${Math.round(canvasWidth)}x${Math.round(canvasHeight)}`,
          宽高比: {
            图片: (res.width / res.height).toFixed(3),
            Canvas: (canvasWidth / canvasHeight).toFixed(3),
            绘制: (safeWidth / safeHeight).toFixed(3)
          }
        });
        
        // 验证绘制参数
        if (safeWidth <= 0 || safeHeight <= 0) {
          console.error('❌ 绘制尺寸无效:', { safeWidth, safeHeight });
          wx.showToast({
            title: '图片尺寸计算错误',
            icon: 'error'
          });
          return;
        }
        
        // 使用wx.getImageInfo确保图片已加载，然后直接绘制
        console.log('🔄 确保图片已加载...');
        
        // 设置超时处理
        const timeoutId = setTimeout(() => {
          console.error('❌ 图片加载超时');
          wx.showToast({
            title: '图片加载超时',
            icon: 'error',
            duration: 3000
          });
          this.showPlaceholderImage();
        }, 10000); // 10秒超时
        
        // 再次使用wx.getImageInfo确保图片已完全加载
        wx.getImageInfo({
          src: imageUrl,
          success: (imgRes: any) => {
            clearTimeout(timeoutId);
            console.log('✅ 图片数据已完全加载，尺寸:', imgRes.width, 'x', imgRes.height);
            
            // 清除canvas
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            
            // 绘制图片（此时图片数据已完全加载）
            try {
              ctx.drawImage(imageUrl, safeX, safeY, safeWidth, safeHeight);
              console.log('✅ 图片绘制成功，立即调用ctx.draw()提交绘制...');
              
              // 立即提交绘制（图片数据已加载）
              ctx.draw(true);
              console.log('✅ ctx.draw()已调用，绘制已提交');
              
              // 保存图片信息用于坐标转换
              this.setData({
                imageInfo: {
                  x: safeX, 
                  y: safeY, 
                  width: safeWidth, 
                  height: safeHeight,
                  originalWidth: res.width,
                  originalHeight: res.height,
                  scale: scale
                }
              });
              
              console.log('💾 图片信息已保存:', this.data.imageInfo);
              
              // 绘制已有的标记点
              this.drawMarkingPoints();
              
            } catch (drawError) {
              console.error('❌ 绘制图片失败:', drawError);
              this.showPlaceholderImage();
            }
          },
          fail: (imgErr: any) => {
            clearTimeout(timeoutId);
            console.error('❌ 图片加载失败:', imgErr);
            console.error('🔗 图片URL:', imageUrl);
            
            wx.showToast({
              title: '图片加载失败',
              icon: 'error',
              duration: 3000
            });
            
            this.showPlaceholderImage();
          }
        });
      },
      fail: (err) => {
        console.error('❌ 图片加载失败', err);
        console.error('🔗 图片URL:', imageUrl);
        console.error('📱 错误详情:', JSON.stringify(err, null, 2));
        
        // 检查是否为403权限错误
        const errorMsg = JSON.stringify(err);
        if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
          console.error('⚠️ 检测到403权限错误，云存储图片可能没有正确配置权限');
          
          // 显示更具体的错误提示
          wx.showToast({
            title: '图片权限错误，请联系管理员',
            icon: 'error',
            duration: 3000
          });
          
          // 尝试使用临时解决方案：显示本地占位图片
          this.showPlaceholderImage();
        } else {
          // 显示通用错误提示
          wx.showToast({
            title: '图片加载失败，请检查网络',
            icon: 'error',
            duration: 3000
          });
        }
        
        // 使用备用方法
        this.drawImageOnCanvasFallback(imageUrl);
      }
    });
  },

  // 显示占位图片（当云存储图片403时使用）
  showPlaceholderImage() {
    console.log('显示占位图片');
    const { ctx, canvasWidth, canvasHeight } = this.data;
    if (!ctx) {
      console.error('Canvas上下文不存在，无法绘制占位图片');
      return;
    }
    
    // 清除canvas（使用动态尺寸）
    const width = canvasWidth || 600;
    const height = canvasHeight || 600;
    ctx.clearRect(0, 0, width, height);
    
    // 绘制一个简单的占位图形
    ctx.setFillStyle('#f0f0f0');
    ctx.fillRect(0, 0, width, height);
    
    ctx.setFillStyle('#cccccc');
    ctx.setFontSize(30);
    ctx.setTextAlign('center');
    ctx.fillText('图片加载失败', width / 2, height / 2 - 30);
    ctx.fillText('请检查云存储权限', width / 2, height / 2 + 30);
    
    // 绘制一个简单的相机图标
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 - 100, 50, 0, Math.PI * 2);
    ctx.setStrokeStyle('#999999');
    ctx.setLineWidth(5);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 - 100, 20, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.rect(width / 2 - 40, height / 2 - 150, 80, 40);
    ctx.stroke();
    
    // 提交绘制
    ctx.draw(true);
    
    // 设置默认图片信息
    this.setData({
      imageInfo: {
        x: 0, y: 0, width: width, height: height,
        originalWidth: width, originalHeight: height,
        scale: 1
      }
    });
    
    console.log('占位图片已绘制，尺寸:', width, 'x', height);
  },

  // 备用canvas图片绘制方法
  drawImageOnCanvasFallback(imageUrl: string) {
    // 对于备用canvas，我们只显示图片预览，不进行实际绘制
    console.log('使用备用canvas图片绘制方法');
    
    // 设置图片信息（使用默认值）
    this.setData({
      imageInfo: {
        x: 0, y: 0, width: 300, height: 300,
        originalWidth: 600, originalHeight: 600
      }
    });
    
    // 绘制已有的标记点
    this.drawMarkingPoints();
  },

  // 开始标记
  startMarking() {
    this.setData({ isMarking: true });
    wx.showToast({
      title: '请在图片上绘制佩戴位置弧线',
      icon: 'none',
      duration: 2000
    });
  },

  // 结束标记
  endMarking() {
    this.setData({ isMarking: false });
    
    // 保存标记点
    if (this.data.markingPoints.length > 0) {
      this.saveMarkingPoints();
    }
  },

  // 清除标记
  clearMarking() {
    this.setData({ markingPoints: [] });
    const { ctx } = this.data;
    if (ctx) {
      ctx.clearRect(0, 0, this.data.canvas.width, this.data.canvas.height);
      this.drawImageOnCanvas(this.data.preWearImage);
    }
  },

  // canvas触摸事件
  onCanvasTouchStart(e: any) {
    console.log('Canvas触摸开始:', e);
    
    if (!this.data.isMarking) {
      console.log('未在标记模式，忽略触摸');
      return;
    }
    
    const touch = e.touches[0];
    console.log('触摸点坐标:', { x: touch.x, y: touch.y });
    
    const point = this.convertCanvasPoint(touch.x, touch.y);
    console.log('转换后的图片坐标:', point);
    
    if (point) {
      console.log('开始新标记，第一个点:', point);
      this.setData({
        markingPoints: [point]
      });
      this.drawPoint(point);
    } else {
      console.warn('坐标转换失败或点在图片范围外');
    }
  },

  onCanvasTouchMove(e: any) {
    if (!this.data.isMarking || !this.data.markingPoints.length) {
      console.log('未在标记模式或没有标记点，忽略触摸移动');
      return;
    }
    
    const touch = e.touches[0];
    const point = this.convertCanvasPoint(touch.x, touch.y);
    
    if (point) {
      const newPoints = [...this.data.markingPoints, point];
      console.log('添加新标记点，总数:', newPoints.length, '新点:', point);
      this.setData({ markingPoints: newPoints });
      this.drawLine(this.data.markingPoints[this.data.markingPoints.length - 1], point);
    }
  },

  onCanvasTouchEnd() {
    console.log('Canvas触摸结束');
    
    if (this.data.isMarking && this.data.markingPoints.length > 1) {
      console.log('标记完成，总点数:', this.data.markingPoints.length);
      this.endMarking();
    } else if (this.data.isMarking) {
      console.log('标记点数不足，需要至少2个点');
      wx.showToast({
        title: '请绘制至少2个点',
        icon: 'none'
      });
    }
  },

  // 转换canvas坐标到图片坐标
  convertCanvasPoint(canvasX: number, canvasY: number) {
    const { imageInfo } = this.data;
    if (!imageInfo) return null;
    
    // 计算相对于图片的坐标
    const x = (canvasX - imageInfo.x) / imageInfo.width * imageInfo.originalWidth;
    const y = (canvasY - imageInfo.y) / imageInfo.height * imageInfo.originalHeight;
    
    // 确保坐标在图片范围内
    if (x >= 0 && x <= imageInfo.originalWidth && y >= 0 && y <= imageInfo.originalHeight) {
      return { x: Math.round(x), y: Math.round(y) };
    }
    
    return null;
  },

  // 绘制点
  drawPoint(point: { x: number, y: number }) {
    const { ctx, imageInfo } = this.data;
    if (!ctx || !imageInfo) return;
    
    // 转换回canvas坐标
    const canvasX = point.x / imageInfo.originalWidth * imageInfo.width + imageInfo.x;
    const canvasY = point.y / imageInfo.originalHeight * imageInfo.height + imageInfo.y;
    
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
    ctx.setFillStyle('#ff0000');
    ctx.fill();
    ctx.setStrokeStyle('#ffffff');
    ctx.setLineWidth(2);
    ctx.stroke();
    
    // 立即提交绘制
    try {
      ctx.draw(true);
      console.log('绘制点完成，已调用ctx.draw()');
    } catch (error) {
      console.error('绘制点提交失败:', error);
    }
  },

  // 绘制线
  drawLine(point1: { x: number, y: number }, point2: { x: number, y: number }) {
    const { ctx, imageInfo } = this.data;
    if (!ctx || !imageInfo) return;
    
    // 转换回canvas坐标
    const canvasX1 = point1.x / imageInfo.originalWidth * imageInfo.width + imageInfo.x;
    const canvasY1 = point1.y / imageInfo.originalHeight * imageInfo.height + imageInfo.y;
    const canvasX2 = point2.x / imageInfo.originalWidth * imageInfo.width + imageInfo.x;
    const canvasY2 = point2.y / imageInfo.originalHeight * imageInfo.height + imageInfo.y;
    
    ctx.beginPath();
    ctx.moveTo(canvasX1, canvasY1);
    ctx.lineTo(canvasX2, canvasY2);
    ctx.setStrokeStyle('#ff0000');
    ctx.setLineWidth(3);
    ctx.stroke();
    
    // 立即提交绘制
    try {
      ctx.draw(true);
      console.log('绘制线完成，已调用ctx.draw()');
    } catch (error) {
      console.error('绘制线提交失败:', error);
    }
  },

  // 绘制所有标记点
  drawMarkingPoints() {
    const { markingPoints, preWearImage } = this.data;
    if (markingPoints.length === 0) return;
    
    console.log('绘制标记点，数量:', markingPoints.length);
    
    // 如果还没有绘制图片，先绘制图片
    if (preWearImage && !this.data.imageInfo) {
      console.log('先绘制图片再绘制标记点');
      this.drawImageOnCanvas(preWearImage);
      return;
    }
    
    // 绘制所有点和线
    for (let i = 0; i < markingPoints.length; i++) {
      this.drawPoint(markingPoints[i]);
      if (i > 0) {
        this.drawLine(markingPoints[i - 1], markingPoints[i]);
      }
    }
  },

  // 保存标记点
  async saveMarkingPoints() {
    if (!this.data.currentRecordId || this.data.markingPoints.length === 0) return;
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'saveMarkingPoints',
          recordId: this.data.currentRecordId,
          markingPoints: this.data.markingPoints
        }
      });
      
      if (result.result.code === 200) {
        wx.showToast({
          title: '标记已保存',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('保存标记点失败:', error);
    }
  },

  // 步骤3: 选择佩戴后图片
  choosePostWearImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadPostWearImage(res.tempFilePaths[0]);
      }
    });
  },

  // 上传佩戴后图片
  async uploadPostWearImage(imagePath: string) {
    if (!this.data.currentRecordId) {
      wx.showToast({
        title: '请先上传佩戴前图片',
        icon: 'error'
      });
      return;
    }
    
    wx.showLoading({ 
      title: '上传中...',
      mask: true
    });
    
    try {
      // 1. 上传图片到云存储
      const cloudPath = `device-location/temp_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: imagePath
      });
      
      // 2. 调用云函数保存记录
      const fileName = imagePath.substring(imagePath.lastIndexOf('/') + 1);
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'uploadPostWearImage',
          recordId: this.data.currentRecordId,
          fileID: uploadResult.fileID,
          fileName: fileName
        }
      });
      
      if (result.result.code === 200) {
        this.setData({
          postWearImage: result.result.data.imageUrl,
          currentStep: 4 // 进入分析步骤
        });
        
        // 自动开始分析
        this.analyzeWearPosition();
      } else {
        wx.showToast({
          title: result.result.message || '上传失败',
          icon: 'error'
        });
      }
    } catch (error: any) {
      console.error('上传佩戴后图片失败:', error);
      wx.showToast({
        title: error.errMsg || '上传失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 分析佩戴位置
  async analyzeWearPosition() {
    if (!this.data.currentRecordId) {
      console.error('分析失败：没有记录ID');
      wx.showToast({
        title: '请先上传图片',
        icon: 'error'
      });
      return;
    }
    
    console.log('开始分析佩戴位置，记录ID:', this.data.currentRecordId);
    
    wx.showLoading({ 
      title: '分析中...',
      mask: true
    });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'analyzeWearPosition',
          recordId: this.data.currentRecordId,
          useOpenCV: false // 先使用简单算法确保稳定
        }
      });
      
      console.log('分析云函数返回完整数据:', JSON.stringify(result, null, 2));
      
      if (result.result && result.result.code === 200) {
        console.log('分析成功，数据详情:', {
          analysisResult: result.result.data.analysisResult,
          score: result.result.data.score,
          analysisMethod: result.result.data.analysisMethod
        });
        
        // 确保分析结果包含必要的字段
        const analysisResult = result.result.data.analysisResult || {};
        const score = result.result.data.score || 0;
        const analysisMethod = result.result.data.analysisMethod || analysisResult.analysisMethod || 'unknown';
        
        // 确保details字段存在
        if (!analysisResult.details) {
          analysisResult.details = {
            positionDeviation: '未知',
            angleDeviation: '未知',
            fitLevel: '未知',
            suggestions: ['请确保设备正确佩戴']
          };
        }
        
        // 确保数值字段存在
        analysisResult.positionMatch = analysisResult.positionMatch || 75;
        analysisResult.angleMatch = analysisResult.angleMatch || 75;
        analysisResult.fitMatch = analysisResult.fitMatch || 75;
        analysisResult.totalScore = analysisResult.totalScore || score;
        analysisResult.analysisMethod = analysisMethod; // 确保analysisMethod在analysisResult中
        
        // 确保跳转到步骤4并设置分析结果
        this.setData({
          currentStep: 4, // 确保在步骤4
          analysisResult: analysisResult,
          score: score
        });
        
        console.log('分析结果已设置，当前步骤:', 4);
        console.log('分析结果数据结构:', this.data.analysisResult);
        
        // 重新加载历史记录
        this.loadLocationHistory();
        
        wx.showToast({
          title: '分析完成',
          icon: 'success',
          duration: 2000
        });
      } else {
        console.error('分析失败:', result.result?.message || '未知错误');
        wx.showToast({
          title: result.result?.message || '分析失败',
          icon: 'error',
          duration: 3000
        });
      }
    } catch (error: any) {
      console.error('分析佩戴位置失败:', error);
      wx.showToast({
        title: '分析失败: ' + (error.errMsg || '未知错误'),
        icon: 'error',
        duration: 3000
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 重新开始
  restartProcess() {
    this.setData({
      currentStep: 1,
      preWearImage: '',
      postWearImage: '',
      markingPoints: [],
      currentRecordId: '',
      analysisResult: null,
      score: 0,
      isMarking: false
    });
    
    // 清除canvas
    const { ctx } = this.data;
    if (ctx) {
      ctx.clearRect(0, 0, this.data.canvas.width, this.data.canvas.height);
    }
  },

  // 查看历史记录详情
  viewHistoryDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '历史记录',
      content: `记录ID: ${id}\n点击确定查看详情`,
      showCancel: true,
      success: (res) => {
        if (res.confirm) {
          // 这里可以跳转到详情页面
          wx.showToast({
            title: '详情功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 分享结果
  shareResult() {
    if (!this.data.analysisResult) return;
    
    wx.showShareMenu({
      withShareTicket: true
    });
    
    wx.showToast({
      title: '点击右上角分享',
      icon: 'none'
    });
  },

  // 显示详细分析结果
  showAnalysisDetail() {
    const result = this.data.analysisResult;
    if (!result) return;

    let content = `📊 详细分析报告\n\n`;
    content += `🏆 总分: ${result.totalScore || 0}分\n`;
    content += `📍 位置匹配度: ${result.positionMatch || 0}分\n`;
    content += `📐 角度匹配度: ${result.angleMatch || 0}分\n`;
    content += `🔧 贴合度: ${result.fitMatch || 0}分\n\n`;

    if (result.details) {
      content += `📈 详细指标:\n`;
      content += `• 位置偏差: ${result.details.positionDeviation || '未知'}\n`;
      content += `• 角度偏差: ${result.details.angleDeviation || '未知'}\n`;
      content += `• 贴合等级: ${result.details.fitLevel || '未知'}\n\n`;

      if (result.details.suggestions && result.details.suggestions.length > 0) {
        content += '💡 改进建议:\n';
        result.details.suggestions.forEach((suggestion: string, index: number) => {
          content += `${index + 1}. ${suggestion}\n`;
        });
      }
    }

    if (result.analysisMethod) {
      content += `\n🔬 分析方法: ${result.analysisMethod}`;
    }

    if (result.visualization) {
      content += `\n\n📊 可视化数据: 已生成`;
    }

    wx.showModal({
      title: '详细分析结果',
      content: content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 使用OpenCV高级分析
  async useOpenCVAnalysis() {
    if (!this.data.currentRecordId) return;
    
    wx.showLoading({ 
      title: '使用OpenCV分析中...',
      mask: true
    });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'analyzeWearPosition',
          recordId: this.data.currentRecordId,
          useOpenCV: true
        }
      });
      
      if (result.result.code === 200) {
        this.setData({
          analysisResult: result.result.data.analysisResult,
          score: result.result.data.score
        });
        
        wx.showToast({
          title: 'OpenCV分析完成',
          icon: 'success'
        });
        
        // 显示详细结果
        setTimeout(() => {
          this.showAnalysisDetail();
        }, 500);
      } else {
        wx.showToast({
          title: result.result.message || '分析失败',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('OpenCV分析失败:', error);
      wx.showToast({
        title: 'OpenCV分析失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 查看可视化分析
  viewVisualization() {
    const result = this.data.analysisResult;
    if (!result || !result.visualization) {
      wx.showToast({
        title: '暂无可视化数据',
        icon: 'none'
      });
      return;
    }

    const visualization = result.visualization;
    let content = '可视化分析数据:\n\n';

    if (visualization.earContour) {
      content += '耳朵轮廓检测: ✓\n';
      content += `- 位置: (${Math.round(visualization.earContour.center?.x || 0)}, ${Math.round(visualization.earContour.center?.y || 0)})\n`;
      content += `- 面积: ${Math.round(visualization.earContour.area || 0)}像素\n`;
    } else {
      content += '耳朵轮廓检测: ✗\n';
    }

    if (visualization.deviceContour) {
      content += '\n设备轮廓检测: ✓\n';
      content += `- 位置: (${Math.round(visualization.deviceContour.center?.x || 0)}, ${Math.round(visualization.deviceContour.center?.y || 0)})\n`;
      content += `- 面积: ${Math.round(visualization.deviceContour.area || 0)}像素\n`;
    } else {
      content += '\n设备轮廓检测: ✗\n';
    }

    if (visualization.markingPoints && visualization.markingPoints.length > 0) {
      content += `\n标记点数量: ${visualization.markingPoints.length}\n`;
    }

    wx.showModal({
      title: '可视化分析',
      content: content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 步骤导航方法
  goToStep1() {
    this.setData({ currentStep: 1 });
  },

  goToStep2() {
    console.log('切换到步骤2，优化Canvas初始化流程...');
    
    // 先重置Canvas状态
    this.setData({ 
      currentStep: 2,
      canvasReady: false,
      canvasError: '',
      imageInfo: null,
      useImagePreview: false // 重置图片预览标志
    }, () => {
      console.log('Canvas状态已重置，等待DOM更新...');
      
      // 使用wx.nextTick确保DOM更新完成
      wx.nextTick(() => {
        console.log('DOM更新完成，开始初始化Canvas...');
        
        // 设置超时，如果Canvas初始化失败，快速切换到图片预览
        const canvasTimeout = setTimeout(() => {
          console.log('Canvas初始化超时，切换到图片预览模式');
          if (this.data.preWearImage) {
            this.showImagePreview(this.data.preWearImage);
          }
        }, 2000); // 2秒超时
        
        // 初始化Canvas
        this.initCanvas();
        
        // 如果已有图片，使用更可靠的绘制流程
        if (this.data.preWearImage) {
          console.log('已有图片，将在Canvas就绪后绘制...');
          
          // 使用改进的ensureCanvasReady方法
          this.ensureCanvasReadyImproved().then(() => {
            clearTimeout(canvasTimeout);
            console.log('Canvas就绪，开始绘制图片...');
            this.drawImageOnCanvas(this.data.preWearImage);
          }).catch((error: any) => {
            clearTimeout(canvasTimeout);
            console.error('等待Canvas就绪失败:', error);
            // Canvas失败，立即切换到图片预览
            this.showImagePreview(this.data.preWearImage);
          });
        } else {
          // 没有图片，清除超时
          clearTimeout(canvasTimeout);
        }
      });
    });
  },

  goToStep3() {
    this.setData({ currentStep: 3 });
  },

  // 测试Canvas绘制 - 绘制一个简单的测试图形
  testCanvasDrawing() {
    const { ctx } = this.data;
    if (!ctx) {
      console.error('Canvas上下文不存在，无法测试绘制');
      return;
    }
    
    console.log('开始测试Canvas绘制...');
    
    // 清除canvas
    ctx.clearRect(0, 0, 300, 300);
    
    // 绘制一个明显的测试图形 - 覆盖整个Canvas
    ctx.setFillStyle('#ff0000');
    ctx.fillRect(0, 0, 300, 300);
    
    ctx.setFillStyle('#ffffff');
    ctx.setFontSize(30);
    ctx.setTextAlign('center');
    ctx.fillText('测试绘制成功', 150, 150);
    
    // 绘制一个圆形
    ctx.beginPath();
    ctx.arc(150, 150, 80, 0, Math.PI * 2);
    ctx.setStrokeStyle('#00ff00');
    ctx.setLineWidth(10);
    ctx.stroke();
    
    // 绘制一个十字标记
    ctx.beginPath();
    ctx.moveTo(150, 50);
    ctx.lineTo(150, 250);
    ctx.moveTo(50, 150);
    ctx.lineTo(250, 150);
    ctx.setStrokeStyle('#0000ff');
    ctx.setLineWidth(3);
    ctx.stroke();
    
    // 提交绘制
    ctx.draw(true);
    
    console.log('测试绘制完成，应该看到红色背景、白色文字、绿色圆形和蓝色十字');
    
    wx.showToast({
      title: '测试绘制完成，请查看Canvas',
      icon: 'none',
      duration: 3000
    });
  },

  // 显示Canvas调试信息
  showCanvasDebugInfo() {
    const { canvas, ctx, canvasReady, useCanvas2D, useLegacyCanvas, imageInfo, markingPoints, isMarking } = this.data;
    
    let debugInfo = 'Canvas调试信息:\n\n';
    debugInfo += `Canvas状态: ${canvasReady ? '已就绪' : '未就绪'}\n`;
    debugInfo += `Canvas API: ${useCanvas2D ? 'Canvas 2D' : useLegacyCanvas ? '旧版Canvas' : '未知'}\n`;
    debugInfo += `Canvas对象: ${canvas ? '存在' : '不存在'}\n`;
    debugInfo += `上下文对象: ${ctx ? '存在' : '不存在'}\n`;
    
    if (canvas) {
      debugInfo += `Canvas尺寸: ${canvas.width} x ${canvas.height}\n`;
    }
    
    debugInfo += `标记模式: ${isMarking ? '开启' : '关闭'}\n`;
    debugInfo += `标记点数: ${markingPoints.length}\n`;
    
    if (imageInfo) {
      debugInfo += `\n图片信息:\n`;
      debugInfo += `- 位置: (${Math.round(imageInfo.x)}, ${Math.round(imageInfo.y)})\n`;
      debugInfo += `- 尺寸: ${Math.round(imageInfo.width)} x ${Math.round(imageInfo.height)}\n`;
      debugInfo += `- 原图尺寸: ${imageInfo.originalWidth} x ${imageInfo.originalHeight}\n`;
      debugInfo += `- 缩放比例: ${imageInfo.scale ? imageInfo.scale.toFixed(3) : '未知'}\n`;
    } else {
      debugInfo += `\n图片信息: 未加载\n`;
    }
    
    debugInfo += `\n当前步骤: ${this.data.currentStep}\n`;
    debugInfo += `佩戴前图片: ${this.data.preWearImage ? '已上传' : '未上传'}\n`;
    debugInfo += `记录ID: ${this.data.currentRecordId || '无'}\n`;
    
    wx.showModal({
      title: 'Canvas调试信息',
      content: debugInfo,
      showCancel: true,
      confirmText: '测试绘制',
      cancelText: '确定',
      success: (res) => {
        if (res.confirm) {
          // 用户点击了"测试绘制"
          this.testCanvasDrawing();
        }
      }
    });
  },
  
  // 检查Canvas状态
  checkCanvasStatus() {
    const query = wx.createSelectorQuery();
    query.select('#marking-canvas')
      .fields({
        node: true,
        size: true,
        rect: true
      })
      .exec((res: any) => {
        console.log('Canvas状态检查:', res);
        
        if (res[0]) {
          const canvasInfo = res[0];
          console.log('Canvas信息:', {
            节点: canvasInfo.node ? '存在' : '不存在',
            尺寸: `${canvasInfo.width} x ${canvasInfo.height}`,
            位置: canvasInfo.rect ? `(${canvasInfo.rect.left}, ${canvasInfo.rect.top})` : '未知'
          });
        }
      });
  },
  
  // 重新初始化所有Canvas相关
  reinitializeCanvas() {
    console.log('重新初始化Canvas...');
    
    // 清除现有Canvas状态
    this.setData({
      canvas: null,
      ctx: null,
      canvasReady: false,
      imageInfo: null
    });
    
    // 重新初始化
    setTimeout(() => {
      this.initCanvas();
      
      // 如果已有图片，重新绘制
      if (this.data.preWearImage) {
        setTimeout(() => {
          this.drawImageOnCanvas(this.data.preWearImage);
        }, 500);
      }
    }, 300);
  },
  
  // 验证图片URL
  validateImageUrl(url: string): Promise<string> {
    return new Promise((resolve) => {
      if (!url) {
        resolve('');
        return;
      }
      
      // 如果是云存储URL，转换为临时URL
      if (url.startsWith('cloud://')) {
        wx.cloud.getTempFileURL({
          fileList: [url]
        }).then((res: any) => {
          if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
            console.log('云存储URL转换成功:', res.fileList[0].tempFileURL);
            resolve(res.fileList[0].tempFileURL);
          } else {
            console.warn('云存储URL转换失败，使用原URL');
            resolve(url);
          }
        }).catch(() => {
          console.warn('云存储URL转换异常，使用原URL');
          resolve(url);
        });
      } else {
        resolve(url);
      }
    });
  },
  
  // 简化版本的图片绘制方法
  drawImageSimple(imageUrl: string) {
    const { ctx, canvasWidth, canvasHeight } = this.data;
    
    if (!ctx) {
      console.error('Canvas上下文不存在');
      this.initCanvas(); // 尝试重新初始化
      return;
    }
    
    // 先清除Canvas
    ctx.clearRect(0, 0, canvasWidth || 600, canvasHeight || 600);
    
    // 绘制一个占位背景
    ctx.setFillStyle('#f0f0f0');
    ctx.fillRect(0, 0, canvasWidth || 600, canvasHeight || 600);
    
    // 尝试加载并绘制图片
    wx.getImageInfo({
      src: imageUrl,
      success: (res: any) => {
        console.log('✅ 图片加载成功，开始绘制...');
        
        // 计算缩放以适应Canvas
        const scale = Math.min(
          (canvasWidth || 600) / res.width,
          (canvasHeight || 600) / res.height
        );
        
        const width = res.width * scale;
        const height = res.height * scale;
        const x = ((canvasWidth || 600) - width) / 2;
        const y = ((canvasHeight || 600) - height) / 2;
        
        // 清除背景
        ctx.clearRect(0, 0, canvasWidth || 600, canvasHeight || 600);
        
        // 绘制图片
        ctx.drawImage(imageUrl, x, y, width, height);
        
        // 保存图片信息
        this.setData({
          imageInfo: {
            x, y, width, height,
            originalWidth: res.width,
            originalHeight: res.height,
            scale: scale
          }
        });
        
        // 提交绘制
        ctx.draw(true);
        
        console.log('✅ 图片绘制完成');
        
        // 绘制已有标记点
        this.drawMarkingPoints();
      },
      fail: (err: any) => {
        console.error('❌ 图片加载失败:', err);
        
        // 绘制错误提示
        ctx.setFillStyle('#ff0000');
        ctx.setFontSize(20);
        ctx.setTextAlign('center');
        ctx.fillText('图片加载失败', (canvasWidth || 600) / 2, (canvasHeight || 600) / 2 - 20);
        ctx.fillText('请检查网络或权限', (canvasWidth || 600) / 2, (canvasHeight || 600) / 2 + 20);
        
        ctx.draw(true);
      }
    });
  },
  
  // 备用图片预览方法 - 当Canvas完全失败时使用
  showImagePreview(imageUrl: string) {
    console.log('使用备用图片预览方法:', imageUrl);
    
    // 设置一个标志，表示使用备用预览
    this.setData({
      useImagePreview: true,
      imagePreviewUrl: imageUrl,
      canvasReady: false // 标记Canvas未就绪
    });
    
    // 显示提示信息
    wx.showToast({
      title: '使用图片预览模式',
      icon: 'none',
      duration: 2000
    });
    
    console.log('已切换到图片预览模式');
  },
  
  // 检查并切换到备用预览模式
  checkAndSwitchToPreview(imageUrl: string) {
    console.log('检查是否需要切换到备用预览模式...');
    
    // 设置超时检查
    setTimeout(() => {
      if (!this.data.canvasReady || !this.data.imageInfo) {
        console.log('Canvas未就绪，切换到备用预览模式');
        this.showImagePreview(imageUrl);
      } else {
        console.log('Canvas已就绪，继续使用Canvas模式');
      }
    }, 3000); // 3秒后检查
  },
  
  // 测试Canvas和图片
  testCanvasAndImage() {
    console.log('=== 开始测试 ===');
    this.checkCanvasStatus();
    
    if (this.data.preWearImage) {
      console.log('测试图片URL:', this.data.preWearImage);
      
      // 尝试直接显示图片
      wx.previewImage({
        urls: [this.data.preWearImage],
        success: () => console.log('图片可以预览'),
        fail: (err: any) => console.error('图片预览失败:', err)
      });
    }
  }
});
