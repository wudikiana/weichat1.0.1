// profile-edit.ts
Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      age: 28,
      gender: '男',
      height: 170,
      weight: 65,
      phone: '',
      bmi: 0
    },
    genders: [
      { value: '男', label: '男' },
      { value: '女', label: '女' }
    ],
    ageRange: Array.from({ length: 100 }, (_, i) => ({ value: i + 1, label: i + 1 + '岁' })),
    heightRange: Array.from({ length: 60 }, (_, i) => ({ value: i + 140, label: i + 140 + 'cm' })),
    weightRange: Array.from({ length: 100 }, (_, i) => ({ value: (i + 30) / 10, label: (i + 30) / 10 + 'kg' })),
    isSaving: false
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  // 从云数据库加载用户信息
  async loadUserInfoFromCloud() {
    try {
      const app = getApp<IAppOption>();
      const cloudUserInfo = await app.getUserFromCloud();

      if (cloudUserInfo) {
        let bmi = 0;
        if (cloudUserInfo.height && cloudUserInfo.weight) {
          const heightInMeters = cloudUserInfo.height / 100;
          bmi = parseFloat((cloudUserInfo.weight / (heightInMeters * heightInMeters)).toFixed(1));
        }

        const userInfo = {
          avatarUrl: cloudUserInfo.avatarUrl || '',
          nickName: cloudUserInfo.nickName || '',
          age: cloudUserInfo.age || 28,
          gender: cloudUserInfo.gender || '男',
          height: cloudUserInfo.height || 170,
          weight: cloudUserInfo.weight || 65,
          phone: cloudUserInfo.phone || '',
          bmi: bmi
        };

        this.setData({ userInfo });

        // 同时更新全局和本地存储
        app.globalData.userInfo = { ...app.globalData.userInfo, ...userInfo };
        wx.setStorageSync('userInfo', { ...wx.getStorageSync('userInfo'), ...userInfo });

        return true;
      }
    } catch (error) {
      console.error('从云加载用户信息失败:', error);
    }
    return false;
  },

  loadUserInfo() {
    const app = getApp<IAppOption>();

    if (app.globalData.userInfo) {
      const userInfo = app.globalData.userInfo;
      // 计算BMI
      let bmi = 0;
      if (userInfo.height && userInfo.weight) {
        const heightInMeters = userInfo.height / 100;
        bmi = parseFloat((userInfo.weight / (heightInMeters * heightInMeters)).toFixed(1));
      }

      this.setData({
        userInfo: {
          avatarUrl: userInfo.avatarUrl || '',
          nickName: userInfo.nickName || '',
          age: userInfo.age || 28,
          gender: userInfo.gender || '男',
          height: userInfo.height || 170,
          weight: userInfo.weight || 65,
          phone: userInfo.phone || '',
          bmi: bmi
        }
      });
      return;
    }

    const localUserInfo = wx.getStorageSync('userInfo');
    if (localUserInfo) {
      let bmi = 0;
      if (localUserInfo.height && localUserInfo.weight) {
        const heightInMeters = localUserInfo.height / 100;
        bmi = parseFloat((localUserInfo.weight / (heightInMeters * heightInMeters)).toFixed(1));
      }

      this.setData({
        userInfo: {
          ...localUserInfo,
          bmi: bmi
        }
      });
    } else {
      // 如果本地没有数据，尝试从云数据库加载
      this.loadUserInfoFromCloud();
    }
  },

  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        
        wx.showLoading({ title: '上传中...' });
        
        // 上传头像到云存储
        wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}-${Math.random() * 1000000}.png`,
          filePath: tempFilePath,
          success: (uploadRes) => {
            wx.hideLoading();
            this.setData({
              'userInfo.avatarUrl': uploadRes.fileID
            });
            wx.showToast({ title: '头像已更新', icon: 'success' });
          },
          fail: (err) => {
            console.error('上传失败:', err);
            wx.hideLoading();
            // 降级使用本地路径
            this.setData({
              'userInfo.avatarUrl': tempFilePath
            });
            wx.showToast({ title: '头像已更新', icon: 'success' });
          }
        });
      }
    });
  },

  onNickNameChange(e: any) {
    this.setData({
      'userInfo.nickName': e.detail.value
    });
  },

  onAgeChange(e: any) {
    const age = parseInt(e.detail.value) || 28;
    this.setData({
      'userInfo.age': age
    });
  },

  onHeightChange(e: any) {
    const height = parseFloat(e.detail.value) || 170;
    this.calculateBMI(height, this.data.userInfo.weight);
    this.setData({
      'userInfo.height': height
    });
  },

  onWeightChange(e: any) {
    const weight = parseFloat(e.detail.value) || 65;
    this.calculateBMI(this.data.userInfo.height, weight);
    this.setData({
      'userInfo.weight': weight
    });
  },

  onGenderChange(e: any) {
    this.setData({
      'userInfo.gender': e.detail.value
    });
  },

  onPhoneChange(e: any) {
    this.setData({
      'userInfo.phone': e.detail.value
    });
  },

  // 计算BMI
  calculateBMI(height: number, weight: number) {
    if (height > 0 && weight > 0) {
      const heightInMeters = height / 100;
      const bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
      this.setData({
        'userInfo.bmi': bmi
      });
    }
  },

  // 获取BMI状态
  getBMIStatus(bmi: number): string {
    if (bmi < 18.5) return '偏瘦';
    if (bmi < 24) return '正常';
    if (bmi < 28) return '偏胖';
    return '肥胖';
  },

  saveUserInfo() {
    const { userInfo } = this.data;

    // 验证必填项
    if (!userInfo.nickName.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    if (userInfo.nickName.length > 20) {
      wx.showToast({
        title: '昵称不能超过20个字符',
        icon: 'none'
      });
      return;
    }

    if (userInfo.age < 1 || userInfo.age > 120) {
      wx.showToast({
        title: '请输入有效年龄（1-120）',
        icon: 'none'
      });
      return;
    }

    if (userInfo.height < 140 || userInfo.height > 220) {
      wx.showToast({
        title: '请输入有效身高（140-220cm）',
        icon: 'none'
      });
      return;
    }

    if (userInfo.weight < 30 || userInfo.weight > 200) {
      wx.showToast({
        title: '请输入有效体重（30-200kg）',
        icon: 'none'
      });
      return;
    }

    // 验证手机号格式
    if (userInfo.phone && !/^1[3-9]\d{9}$/.test(userInfo.phone)) {
      wx.showToast({
        title: '请输入有效手机号',
        icon: 'none'
      });
      return;
    }

    this.setData({ isSaving: true });

    // 计算BMI
    const heightInMeters = userInfo.height / 100;
    const bmi = parseFloat((userInfo.weight / (heightInMeters * heightInMeters)).toFixed(1));
    userInfo.bmi = bmi;

    // 保存到全局和本地
    const app = getApp<IAppOption>();
    app.globalData.userInfo = { ...app.globalData.userInfo, ...userInfo };
    wx.setStorageSync('userInfo', userInfo);

    // 保存到云端 (用户健康档案)
    app.saveHealthProfile('userInfo', userInfo)
      .then(() => {
        this.setData({ isSaving: false });
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch((err) => {
        this.setData({ isSaving: false });
        console.error('保存失败:', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      });
  }
});
