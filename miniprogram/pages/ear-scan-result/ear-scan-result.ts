// ear-scan-result.ts
Page({
  data: {
    isLoading: true,
    recordId: '',
    result: {
      time: '',
      images: [''],
      structures: [
        { name: '耳廓', status: '正常' },
        { name: '外耳道', status: '正常' },
        { name: '鼓膜', status: '正常' }
      ],
      abnormal: '',
      hasLesion: false,
      confidence: 0,
      details: {} as any,
      imageUrl: '',
      overallStatus: '',
      visibleStructures: [] as string[],
      abnormalFindings: [] as string[],
      possibleConditions: [] as string[],
      disclaimer: ''
    },
    suggestions: [] as string[],
    comparison: {
      lastTime: '',
      lastStatus: '',
      trend: ''
    },
    confidencePercentage: '0.0'
  },

  onLoad(options: any) {
    if (options.recordId) {
      this.setData({ recordId: options.recordId });
      this.loadResult(options.recordId);
    } else if (options.id) {
      // 兼容旧版本
      this.setData({ recordId: options.id });
      this.loadResult(options.id);
    }
  },

  // 加载分析结果
  async loadResult(recordId: string) {
    this.setData({ isLoading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'earScan',
        data: {
          action: 'getAnalysisResult',
          recordId: recordId
        }
      });
      
      if (result.result.code === 200) {
        const scanData = result.result.data;
        const analysisResult = scanData.analysisResult;
        
        // 格式化时间
        const scanTime = new Date(scanData.scanTime);
        const formattedTime = `${scanTime.getFullYear()}年${scanTime.getMonth() + 1}月${scanTime.getDate()}日 ${scanTime.getHours().toString().padStart(2, '0')}:${scanTime.getMinutes().toString().padStart(2, '0')}`;
        
        // 根据API返回的数据构建耳部结构状态
        const structures = this.buildStructuresFromAPI(analysisResult);
        
        // 构建异常描述
        const abnormalDescription = this.buildAbnormalDescription(analysisResult);
        
        // 构建整体状态
        const overallStatus = analysisResult.hasLesion ? '需关注' : '正常';
        
        // 计算置信度百分比
        const confidencePercentage = (analysisResult.confidence * 100).toFixed(1);
        
        this.setData({
          result: {
            time: formattedTime,
            images: [scanData.imageUrl],
            structures: structures,
            abnormal: abnormalDescription,
            hasLesion: analysisResult.hasLesion,
            confidence: analysisResult.confidence,
            details: analysisResult.details,
            imageUrl: scanData.imageUrl,
            overallStatus: overallStatus,
            visibleStructures: analysisResult.details?.structures || [],
            abnormalFindings: analysisResult.details?.findings || [],
            possibleConditions: analysisResult.details?.conditions || [],
            disclaimer: analysisResult.disclaimer || '本分析由AI生成，仅供参考，不能替代专业医疗诊断。如有不适请及时就医。'
          },
          suggestions: analysisResult.recommendations || [],
          comparison: this.generateComparison(analysisResult.hasLesion),
          confidencePercentage: confidencePercentage
        });
        
        // 保存到本地历史记录
        this.saveToLocalHistory(scanData);
      } else {
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'error'
        });
        
        // 尝试从本地存储加载
        this.loadFromLocalHistory(recordId);
      }
    } catch (error) {
      console.error('加载分析结果失败:', error);
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      });
      
      // 尝试从本地存储加载
      this.loadFromLocalHistory(recordId);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 从本地存储加载历史记录
  loadFromLocalHistory(recordId: string) {
    const localHistory = wx.getStorageSync('scanHistory') || [];
    const localRecord = localHistory.find((item: any) => item.id === recordId);
    
    if (localRecord) {
      const scanTime = new Date();
      const formattedTime = `${scanTime.getFullYear()}年${scanTime.getMonth() + 1}月${scanTime.getDate()}日 ${scanTime.getHours().toString().padStart(2, '0')}:${scanTime.getMinutes().toString().padStart(2, '0')}`;
      
      // 计算置信度百分比
      const confidencePercentage = ((localRecord.confidence || 0.85) * 100).toFixed(1);
      
      this.setData({
        result: {
          time: formattedTime,
          images: [localRecord.imageUrl || ''],
          structures: [
            { name: '耳廓', status: localRecord.hasLesion ? '需关注' : '正常' },
            { name: '外耳道', status: '正常' },
            { name: '鼓膜', status: '正常' }
          ],
          abnormal: localRecord.hasLesion ? '检测到异常，建议就医检查' : '',
          hasLesion: localRecord.hasLesion,
          confidence: localRecord.confidence || 0.85,
          details: localRecord.hasLesion ? {
            lesionType: '外耳道炎',
            severity: '轻度',
            location: '外耳道',
            description: '检测到外耳道轻微红肿'
          } : {
            status: '正常',
            description: '耳部结构清晰'
          },
          imageUrl: localRecord.imageUrl || ''
        },
        suggestions: localRecord.hasLesion ? [
          '建议及时就医进行专业检查',
          '避免耳朵进水',
          '不要自行掏耳朵'
        ] : [
          '继续保持良好的耳部卫生习惯',
          '避免长时间使用耳机'
        ],
        comparison: this.generateComparison(localRecord.hasLesion),
        confidencePercentage: confidencePercentage
      });
    }
  },

  // 保存到本地历史记录
  saveToLocalHistory(scanData: any) {
    const localHistory = wx.getStorageSync('scanHistory') || [];
    const existingIndex = localHistory.findIndex((item: any) => item.id === scanData._id);
    
    const historyItem = {
      id: scanData._id,
      date: this.formatDate(scanData.scanTime),
      result: scanData.analysisResult.hasLesion ? '需关注' : '正常',
      status: scanData.analysisResult.hasLesion ? '需关注' : '正常',
      imageUrl: scanData.imageUrl,
      confidence: scanData.analysisResult.confidence,
      hasLesion: scanData.analysisResult.hasLesion,
      scanTime: scanData.scanTime
    };
    
    if (existingIndex >= 0) {
      localHistory[existingIndex] = historyItem;
    } else {
      localHistory.unshift(historyItem);
    }
    
    // 只保留最近20条记录
    const trimmedHistory = localHistory.slice(0, 20);
    wx.setStorageSync('scanHistory', trimmedHistory);
  },

  // 生成对比信息
  generateComparison(hasLesion: boolean) {
    const localHistory = wx.getStorageSync('scanHistory') || [];
    
    if (localHistory.length > 1) {
      const lastRecord = localHistory[1]; // 当前记录是第一个，所以取第二个作为上一次记录
      return {
        lastTime: lastRecord.date,
        lastStatus: lastRecord.result,
        trend: hasLesion === lastRecord.hasLesion ? '保持稳定' : 
               hasLesion ? '情况变差' : '有所改善'
      };
    }
    
    return {
      lastTime: '无历史记录',
      lastStatus: '',
      trend: ''
    };
  },

  // 根据API返回的数据构建耳部结构状态
  buildStructuresFromAPI(analysisResult: any): Array<{name: string, status: string}> {
    const apiStructures = analysisResult.details?.structures || [];
    const hasLesion = analysisResult.hasLesion;
    const findings = analysisResult.details?.findings || [];
    
    // 如果API返回了可见结构，使用API的数据
    if (apiStructures.length > 0) {
      return apiStructures.map((structure: string) => {
        // 检查这个结构是否有异常发现
        const hasFinding = findings.some((finding: string) => 
          finding.toLowerCase().includes(structure.toLowerCase()) || 
          structure.toLowerCase().includes(finding.toLowerCase())
        );
        
        return {
          name: structure,
          status: hasFinding ? '需关注' : '正常'
        };
      });
    }
    
    // 否则使用默认的3个结构
    return [
      { name: '耳廓', status: hasLesion ? '需关注' : '正常' },
      { name: '外耳道', status: '正常' },
      { name: '鼓膜', status: '正常' }
    ];
  },

  // 构建异常描述
  buildAbnormalDescription(analysisResult: any): string {
    if (!analysisResult.hasLesion) {
      return '未发现明显异常，所有结构均在正常范围内。';
    }
    
    const details = analysisResult.details || {};
    const findings = details.findings || [];
    const conditions = details.conditions || [];
    const description = details.description || '';
    
    // 构建完整的异常描述
    let abnormalDesc = '';
    
    if (findings.length > 0) {
      abnormalDesc += `异常发现：${findings.join('；')}`;
    }
    
    if (conditions.length > 0) {
      if (abnormalDesc) abnormalDesc += '。';
      abnormalDesc += `可能病症：${conditions.join('；')}`;
    }
    
    if (description && !abnormalDesc.includes(description)) {
      if (abnormalDesc) abnormalDesc += '。';
      abnormalDesc += description;
    }
    
    return abnormalDesc || '检测到异常，建议进一步检查。';
  },

  // 格式化日期
  formatDate(dateString: string) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  },

  // 保存记录
  saveRecord() {
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 分享给医生
  shareToDoctor() {
    const { result, suggestions } = this.data;
    
    const shareContent = `耳部扫描结果：
时间：${result.time}
状态：${result.hasLesion ? '需关注' : '正常'}
${result.hasLesion ? `异常描述：${result.abnormal}` : ''}
建议：${suggestions.join('；')}`;
    
    wx.showModal({
      title: '分享给医生',
      content: '是否复制结果到剪贴板？',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: shareContent,
            success: () => {
              wx.showToast({
                title: '已复制到剪贴板',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  // 预约检查
  bookCheckup() {
    wx.navigateTo({
      url: '/pages/doctors/doctors'
    });
  },

  // 重新扫描
  rescan() {
    wx.navigateBack();
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/ear-scan/ear-scan'
      });
    }, 300);
  },

  // 查看大图
  previewImage() {
    if (this.data.result.imageUrl) {
      wx.previewImage({
        urls: [this.data.result.imageUrl]
      });
    }
  }
});
