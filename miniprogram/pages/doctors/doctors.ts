// doctors.ts
const app = getApp<IAppOption>()

Page({
  data: {
    envId: 'cloudbase-9ghm3xfo6fefd1bb',
    categories: [
      { id: 'all', name: '全部' },
      { id: 'ent', name: '耳鼻喉科' },
      { id: 'ear', name: '耳科' },
      { id: 'hearing', name: '听力科' }
    ],
    selectedCategory: 'all',
    doctors: [
      {
        id: '1',
        name: '张医生',
        hospital: '市第一医院',
        department: '耳鼻喉科',
        title: '主任医师',
        experience: 20,
        rating: 4.9,
        reviewCount: 128,
        description: '擅长耳部疾病诊断与治疗，听力障碍评估，助听器适配等。对耳部炎症、听力下降等疾病有丰富的诊疗经验。',
        bookable: true,
        online: true
      },
      {
        id: '2',
        name: '李医生',
        hospital: '市人民医院',
        department: '耳科',
        title: '副主任医师',
        experience: 15,
        rating: 4.8,
        reviewCount: 95,
        description: '专注于听力障碍和助听器适配，对儿童听力问题有深入研究。擅长各种耳部疾病的微创治疗。',
        bookable: true,
        online: true
      },
      {
        id: '3',
        name: '王医生',
        hospital: '市中医院',
        department: '耳鼻喉科',
        title: '主治医师',
        experience: 10,
        rating: 4.7,
        reviewCount: 76,
        description: '擅长中西医结合治疗耳部疾病，对耳鸣、耳聋等疾病有独特见解。注重患者体验，服务态度好。',
        bookable: true,
        online: false
      }
    ],
    yuqueDocUrl: 'https://cqbszyy.hityun.cn/portal-web/#/pages/home/index'
  },

  onLoad(options: any) {
    // 初始化云开发
    if (!app.globalData.cloudInit) {
      wx.cloud.init({
        env: this.data.envId
      })
      app.globalData.cloudInit = true
      app.globalData.envId = this.data.envId
    }

    if (options.id) {
      // 查看特定医生详情
      this.selectCategory({ currentTarget: { dataset: { id: options.id } } } as any)
    }
    this.loadDoctors()
  },

  loadDoctors() {
    // 从服务器加载医生列表（如果需要）
    console.log('加载医生列表')
  },

  selectCategory(e: any) {
    const categoryId = e.currentTarget.dataset.id
    this.setData({ selectedCategory: categoryId })
    // 根据分类筛选医生（实际项目中可以从服务器加载）
    console.log('选择的分类:', categoryId)
  },

  consultDoctor(e: any) {
    // 直接跳转到语雀文档进行在线咨询
    wx.setClipboardData({
      data: this.data.yuqueDocUrl,
      success: () => {
        wx.showToast({
          title: '链接已复制，请在浏览器打开',
          icon: 'none',
          duration: 3000
        })
      }
    })
  },

  async bookDoctor(e: any) {
    const doctor = e.currentTarget.dataset.item

    // 检查是否可以预约
    if (!doctor.bookable) {
      wx.showToast({
        title: '该医生暂不可预约',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '预约挂号',
      content: `确定预约 ${doctor.name} 医生的门诊吗？`,
      confirmText: '确认预约',
      success: (res) => {
        if (res.confirm) {
          // 实际项目中跳转到预约页面或提交预约信息
          wx.showToast({
            title: '预约成功',
            icon: 'success'
          })
        }
      }
    })
  },

  // 查看医生详情
  viewDoctorDetail(e: any) {
    const doctor = e.currentTarget.dataset.item
    // 跳转到医生详情页面（如果有的话）
    console.log('查看医生详情:', doctor.id)
  }
})
