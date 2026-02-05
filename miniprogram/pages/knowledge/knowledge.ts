// knowledge.ts
Page({
  data: {
    categories: [
      { id: 'all', name: '全部' },
      { id: 'prevention', name: '疾病预防' },
      { id: 'health', name: '日常保健' },
      { id: 'faq', name: '常见问题' },
      { id: 'device', name: '设备使用' }
    ],
    selectedCategory: 'all',
    articles: [
      {
        id: '1',
        title: '如何正确清洁耳朵？这些误区要避免',
        description: '很多人习惯用棉签掏耳朵，但这样做可能会将耳垢推得更深，甚至损伤耳膜...',
        date: '2024-01-10',
        views: '1.2k'
      },
      {
        id: '2',
        title: '听力下降的早期信号，你注意到了吗？',
        description: '听力下降是一个渐进的过程，早期发现和干预非常重要。了解这些信号可以帮助您及时就医...',
        date: '2024-01-08',
        views: '856'
      },
      {
        id: '3',
        title: '助听器使用指南：如何正确佩戴和保养',
        description: '助听器是帮助听力障碍患者的重要设备，正确的使用和保养可以延长设备寿命，提高使用效果...',
        date: '2024-01-05',
        views: '2.1k'
      }
    ],
    faqs: [
      {
        id: '1',
        question: '耳朵进水了怎么办？',
        answer: '可以尝试单脚跳、用吹风机低档吹干，或使用专门的耳部清洁工具。如果症状持续，建议就医。'
      },
      {
        id: '2',
        question: '多久检查一次听力？',
        answer: '建议每年进行一次听力检查，特别是40岁以上人群或有听力问题家族史的人群。'
      },
      {
        id: '3',
        question: '如何预防耳部感染？',
        answer: '保持耳部清洁干燥，避免频繁掏耳朵，游泳时使用耳塞，及时治疗感冒等上呼吸道感染。'
      }
    ]
  },

  onLoad() {
    this.loadArticles();
  },

  loadArticles() {
    // 从服务器加载文章
  },

  selectCategory(e: any) {
    this.setData({ selectedCategory: e.currentTarget.dataset.id });
    // 根据分类筛选文章
  },

  viewArticle(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '查看文章详情',
      icon: 'none'
    });
  }
});

