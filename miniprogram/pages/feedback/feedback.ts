// feedback.ts
interface IAppOption {
  globalData: { openid: string; isLoggedIn: boolean };
}

const app = getApp<IAppOption>();

Page({
  data: {
    categories: [
      { id: 'suggestion', name: '功能建议', icon: 'tips', color: '#0052D9' },
      { id: 'problem', name: '使用问题', icon: 'info-circle', color: '#FA8C16' },
      { id: 'content', name: '内容反馈', icon: 'chat', color: '#00A870' },
      { id: 'other', name: '其他', icon: 'more', color: '#999999' }
    ],
    selectedCategory: '',
    description: '',
    images: [] as any[],
    contact: '',
    myFeedbacks: [] as any[],
    isSubmitting: false,
    stats: null as any,
    isLoading: false
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.loadMyFeedbacks();
    this.loadStats();
  },

  // 检查登录状态
  checkLoginStatus() {
    const app = getApp<IAppOption>();
    if (!app.globalData.isLoggedIn || !app.globalData.openid) {
      wx.showModal({
        title: '提示',
        content: '登录后可使用云端反馈功能，是否先登录？',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/profile/profile' });
          }
        }
      });
    }
  },

  // 加载我的反馈（使用云函数）
  async loadMyFeedbacks() {
    this.setData({ isLoading: true });
    
    try {
      const res: any = await wx.cloud.callFunction({
        name: 'feedback',
        data: { action: 'getList', data: { limit: 20 } }
      });

      if (res.result && res.result.success && res.result.list) {
        this.setData({ myFeedbacks: res.result.list });
      } else {
        this.loadLocalFeedbacks();
      }
    } catch (err) {
      console.error('加载反馈失败:', err);
      this.loadLocalFeedbacks();
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 从本地加载反馈
  loadLocalFeedbacks() {
    const feedbacks = wx.getStorageSync('myFeedbacks') || [];
    this.setData({ myFeedbacks: feedbacks });
  },

  // 加载统计数据
  async loadStats() {
    const app = getApp<IAppOption>();
    if (!app.globalData.isLoggedIn || !app.globalData.openid) {
      return;
    }

    try {
      const res: any = await wx.cloud.callFunction({
        name: 'feedback',
        data: { action: 'getStats' }
      });

      if (res.result && res.result.success) {
        this.setData({ stats: res.result.stats });
      }
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  },

  // 选择分类
  selectCategory(e: any) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({ selectedCategory: categoryId });
  },

  // 描述输入
  onDescriptionChange(e: any) {
    this.setData({ description: e.detail.value });
  },

  // 联系方式输入
  onContactChange(e: any) {
    this.setData({ contact: e.detail.value });
  },

  // 选择图片
  chooseImage() {
    if (this.data.images.length >= 3) {
      wx.showToast({
        title: '最多上传3张图片',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: 3 - this.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        const newImages = [...this.data.images, ...tempFilePaths];
        this.setData({ images: newImages });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 删除图片
  deleteImage(e: any) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images: images });
  },

  // 提交反馈（使用云函数）
  async submitFeedback() {
    const { selectedCategory, description, images, contact } = this.data;
    const app = getApp<IAppOption>();

    // 验证
    if (!selectedCategory) {
      wx.showToast({
        title: '请选择问题分类',
        icon: 'none'
      });
      return;
    }

    if (!description.trim()) {
      wx.showToast({
        title: '请输入问题描述',
        icon: 'none'
      });
      return;
    }

    if (description.trim().length < 10) {
      wx.showToast({
        title: '请至少输入10个字符',
        icon: 'none'
      });
      return;
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      // 获取分类名称
      let categoryName = '';
      for (let i = 0; i < this.data.categories.length; i++) {
        if (this.data.categories[i].id === selectedCategory) {
          categoryName = this.data.categories[i].name;
          break;
        }
      }

      // 如果用户已登录，使用云函数提交
      if (app.globalData.isLoggedIn && app.globalData.openid) {
        // 上传图片到云存储
        const uploadedImages = [];
        for (let i = 0; i < images.length; i++) {
          const imagePath = images[i];
          if (imagePath.startsWith('cloud://')) {
            uploadedImages.push(imagePath);
          } else {
            try {
              const uploadRes = await wx.cloud.uploadFile({
                cloudPath: 'feedbacks/' + Date.now() + '-' + Math.random() * 1000000 + '.png',
                filePath: imagePath,
              });
              uploadedImages.push(uploadRes.fileID);
            } catch (uploadErr) {
              console.error('图片上传失败:', uploadErr);
            }
          }
        }

        // 调用云函数提交反馈
        const submitRes = await wx.cloud.callFunction({
          name: 'feedback',
          data: {
            action: 'submit',
            data: {
              category: selectedCategory,
              categoryName: categoryName,
              description: description.trim(),
              images: uploadedImages,
              contact: contact
            }
          }
        });

        if (!submitRes.result || !submitRes.result.success) {
          throw new Error(submitRes.result && submitRes.result.message ? submitRes.result.message : '提交失败');
        }
      } else {
        // 未登录用户，保存到本地
        const localFeedback = {
          id: Date.now().toString(),
          category: selectedCategory,
          categoryName: categoryName,
          description: description.trim(),
          images: images,
          contact: contact,
          status: '待处理',
          date: this.formatDate(new Date())
        };

        const localFeedbacks = wx.getStorageSync('myFeedbacks') || [];
        localFeedbacks.unshift(localFeedback);
        wx.setStorageSync('myFeedbacks', localFeedbacks.slice(0, 20));
      }

      wx.hideLoading();
      this.setData({
        isSubmitting: false,
        selectedCategory: '',
        description: '',
        images: [],
        contact: ''
      });

      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });

      // 刷新列表和统计
      this.loadMyFeedbacks();
      this.loadStats();

    } catch (error) {
      wx.hideLoading();
      this.setData({ isSubmitting: false });
      
      console.error('提交反馈失败:', error);
      
      const errorMessage = error && error.message ? error.message : '请检查网络连接后重试';
      
      wx.showModal({
        title: '提交失败',
        content: errorMessage,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 查看反馈详情
  viewFeedbackDetail(e: any) {
    const feedback = e.currentTarget.dataset.feedback;
    let content = '分类: ' + feedback.categoryName + '\n\n';
    content += '描述: ' + feedback.description + '\n\n';
    content += '状态: ' + feedback.status + '\n';
    content += '提交时间: ' + (feedback.date ? feedback.date : this.formatDate(feedback.createTime));

    if (feedback.contact) {
      content += '\n\n联系方式: ' + feedback.contact;
    }

    if (feedback.images && feedback.images.length > 0) {
      content += '\n\n图片: 已上传' + feedback.images.length + '张';
    }

    wx.showModal({
      title: '反馈详情',
      content: content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return '';
    if (typeof date === 'string') return date;
    const d = new Date(date);
    return d.getFullYear() + '-' + 
      String(d.getMonth() + 1).padStart(2, '0') + '-' + 
      String(d.getDate()).padStart(2, '0');
  },

  // 删除反馈
  async deleteFeedback(e: any) {
    const feedbackId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条反馈吗？',
      success: async (res) => {
        if (res.confirm) {
          const app = getApp<IAppOption>();
          
          // 从本地删除
          const feedbacks = [...this.data.myFeedbacks];
          feedbacks.splice(index, 1);
          this.setData({ myFeedbacks: feedbacks });
          wx.setStorageSync('myFeedbacks', feedbacks);

          // 从云端删除
          if (app.globalData.isLoggedIn && feedbackId) {
            try {
              await wx.cloud.callFunction({
                name: 'feedback',
                data: {
                  action: 'delete',
                  data: { feedbackId: feedbackId }
                }
              });
            } catch (err) {
              console.error('删除云端反馈失败:', err);
            }
          }

          // 刷新统计
          this.loadStats();
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 获取分类颜色
  getCategoryColor(categoryId) {
    for (let i = 0; i < this.data.categories.length; i++) {
      if (this.data.categories[i].id === categoryId) {
        return this.data.categories[i].color;
      }
    }
    return '#0052D9';
  }
});
