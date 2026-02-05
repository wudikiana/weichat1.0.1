// health-assessment.ts
import { IAppOption } from '../../typings'

const app = getApp<IAppOption>();

Page({
  data: {
    currentStep: 0,  // 0: 选择量表, 1: SAS测评, 2: SDS测评, 3: 结果展示
    selectedScale: '',
    // SAS量表问题（焦虑自评量表）
    sasQuestions: [
      { id: 1, text: '我觉得比平常容易紧张或着急', score: 0, selectedValue: 0 },
      { id: 2, text: '我无缘无故地感到害怕', score: 0, selectedValue: 0 },
      { id: 3, text: '我容易心里烦乱或觉得惊恐', score: 0, selectedValue: 0 },
      { id: 4, text: '我觉得我可能将要发疯', score: 0, selectedValue: 0 },
      { id: 5, text: '我觉得一切都很好', score: 0, selectedValue: 0 },
      { id: 6, text: '我手脚发抖打颤', score: 0, selectedValue: 0 },
      { id: 7, text: '我因头痛、颈痛和背痛而苦恼', score: 0, selectedValue: 0 },
      { id: 8, text: '我感到容易衰弱和疲乏', score: 0, selectedValue: 0 },
      { id: 9, text: '我觉得心平气和，并且容易安静坐着', score: 0, selectedValue: 0 },
      { id: 10, text: '我觉得心跳得很快', score: 0, selectedValue: 0 },
      { id: 11, text: '我因一阵阵头晕而苦恼', score: 0, selectedValue: 0 },
      { id: 12, text: '我有晕倒发作，或觉得要晕倒似的', score: 0, selectedValue: 0 },
      { id: 13, text: '我呼气吸气都感到很容易', score: 0, selectedValue: 0 },
      { id: 14, text: '我手脚麻木和刺痛', score: 0, selectedValue: 0 },
      { id: 15, text: '我因胃痛和消化不良而苦恼', score: 0, selectedValue: 0 },
      { id: 16, text: '我常常要小便', score: 0, selectedValue: 0 },
      { id: 17, text: '我的手常常是干燥温暖的', score: 0, selectedValue: 0 },
      { id: 18, text: '我脸红发热', score: 0, selectedValue: 0 },
      { id: 19, text: '我容易入睡并且一夜睡得很好', score: 0, selectedValue: 0 },
      { id: 20, text: '我做恶梦', score: 0, selectedValue: 0 }
    ],
    // SDS量表问题（抑郁自评量表）
    sdsQuestions: [
      { id: 1, text: '我感到情绪沮丧', score: 0, selectedValue: 0 },
      { id: 2, text: '我感到早晨心情最好', score: 0, selectedValue: 0 },
      { id: 3, text: '我要哭或想哭', score: 0, selectedValue: 0 },
      { id: 4, text: '我夜间睡眠不好', score: 0, selectedValue: 0 },
      { id: 5, text: '我吃饭像平常一样多', score: 0, selectedValue: 0 },
      { id: 6, text: '我的性功能正常', score: 0, selectedValue: 0 },
      { id: 7, text: '我感到体重减轻', score: 0, selectedValue: 0 },
      { id: 8, text: '我有便秘的苦恼', score: 0, selectedValue: 0 },
      { id: 9, text: '心跳比平常快', score: 0, selectedValue: 0 },
      { id: 10, text: '我无故感到疲劳', score: 0, selectedValue: 0 },
      { id: 11, text: '我的头脑像往常一样清楚', score: 0, selectedValue: 0 },
      { id: 12, text: '我做事情像平时一样不困难', score: 0, selectedValue: 0 },
      { id: 13, text: '我坐卧不安，难以保持平静', score: 0, selectedValue: 0 },
      { id: 14, text: '我对未来感到有希望', score: 0, selectedValue: 0 },
      { id: 15, text: '我比平时更容易激怒', score: 0, selectedValue: 0 },
      { id: 16, text: '我觉得决定什么事很容易', score: 0, selectedValue: 0 },
      { id: 17, text: '我感到自己是有用的和不可缺少的人', score: 0, selectedValue: 0 },
      { id: 18, text: '我的生活很有意义', score: 0, selectedValue: 0 },
      { id: 19, text: '假若我死了别人会过得更好', score: 0, selectedValue: 0 },
      { id: 20, text: '我仍旧喜爱自己平时喜爱的东西', score: 0, selectedValue: 0 }
    ],
    // SAS选项（反向计分题：5, 9, 13, 17, 19）
    sasOptions: [
      { value: 1, label: '没有或很少时间' },
      { value: 2, label: '小部分时间' },
      { value: 3, label: '相当多时间' },
      { value: 4, label: '绝大部分或全部时间' }
    ],
    // SDS选项（反向计分题：2, 5, 6, 11, 12, 14, 17, 18, 20）
    sdsOptions: [
      { value: 1, label: '没有或很少时间' },
      { value: 2, label: '小部分时间' },
      { value: 3, label: '相当多时间' },
      { value: 4, label: '绝大部分或全部时间' }
    ],
    sasReverseQuestions: [5, 9, 13, 17, 19],
    sdsReverseQuestions: [2, 5, 6, 11, 12, 14, 17, 18, 20],
    result: {
      sasScore: 0,
      sdsScore: 0,
      totalScore: 0,
      status: '',
      suggestion: '',
      date: ''
    },
    history: [] as any[],
    isLoading: false,
    scaleOptions: [
      { id: 'sas', name: '焦虑自评量表(SAS)', description: '评估焦虑水平，共20题', color: '#FF7D00' },
      { id: 'sds', name: '抑郁自评量表(SDS)', description: '评估抑郁水平，共20题', color: '#0052D9' }
    ],
    stats: null as any
  },

  onLoad() {
    this.loadHistory();
    this.loadStats();
  },

  onShow() {
    this.loadHistory();
    this.loadStats();
  },

  // 加载测评历史（使用云函数）
  async loadHistory() {
    try {
      const res: any = await wx.cloud.callFunction({
        name: 'health-assessment',
        data: { action: 'getHistory', data: { limit: 10 } }
      });

      if (res.result && res.result.success && res.result.history) {
        this.setData({ history: res.result.history });
      }
    } catch (err) {
      console.error('加载历史记录失败:', err);
      // 尝试从本地加载
      this.loadLocalHistory();
    }
  },

  // 从本地加载历史
  loadLocalHistory() {
    const history = wx.getStorageSync('assessmentHistory') || [];
    this.setData({ history });
  },

  // 加载统计数据
  async loadStats() {
    const app = getApp() as IAppOption;
    if (!app.globalData.isLoggedIn) {
      return;
    }

    try {
      const res: any = await wx.cloud.callFunction({
        name: 'health-assessment',
        data: { action: 'getStats' }
      });

      if (res.result && res.result.success) {
        this.setData({ stats: res.result.stats });
      }
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  },

  // 选择量表类型
  selectScale(e: any) {
    const scale = e.currentTarget.dataset.scale;
    this.setData({
      selectedScale: scale,
      currentStep: scale === 'sas' ? 1 : 2
    });
  },

  // 选择答案
  selectAnswer(e: any) {
    const { questionId, value } = e.currentTarget.dataset;
    const { selectedScale, sasQuestions, sdsQuestions, sasReverseQuestions, sdsReverseQuestions } = this.data;

    let questions: any[];
    let reverseQuestions: number[];

    if (selectedScale === 'sas') {
      questions = [...sasQuestions];
      reverseQuestions = sasReverseQuestions;
    } else {
      questions = [...sdsQuestions];
      reverseQuestions = sdsReverseQuestions;
    }

    const selectedValue = parseInt(value);
    let score = selectedValue;

    // 反向计分（仅计算用，不改变显示）
    if (reverseQuestions.includes(questionId)) {
      score = 5 - score;
    }

    const questionIndex = questions.findIndex((q: any) => q.id === questionId);
    if (questionIndex >= 0) {
      questions[questionIndex].selectedValue = selectedValue;
      questions[questionIndex].score = score;

      if (selectedScale === 'sas') {
        this.setData({ sasQuestions: questions });
      } else {
        this.setData({ sdsQuestions: questions });
      }
    }
  },

  // 提交单量表测评
  async submitAssessment() {
    const { selectedScale, sasQuestions, sdsQuestions } = this.data;
    let questions: any[];
    let scaleName: string;

    if (selectedScale === 'sas') {
      questions = sasQuestions;
      scaleName = 'SAS';
    } else {
      questions = sdsQuestions;
      scaleName = 'SDS';
    }

    const unanswered = questions.filter((q: any) => q.score === 0);

    if (unanswered.length > 0) {
      wx.showToast({
        title: '请完成所有题目',
        icon: 'none'
      });
      return;
    }

    // 计算分数（已包含反向计分）
    const totalScore = questions.reduce((sum: number, q: any) => sum + q.score, 0);

    wx.showLoading({ title: '保存中...' });

    try {
      // 计算状态和建议
      let status = '';
      let suggestion = '';

      if (selectedScale === 'sas') {
        if (totalScore < 50) {
          status = '无焦虑';
          suggestion = '您的焦虑情绪处于正常范围，保持良好的生活习惯和心态。建议继续保持规律的作息，适当运动，保持心情愉快。';
        } else if (totalScore < 60) {
          status = '轻度焦虑';
          suggestion = '您存在轻度焦虑，建议适当放松。可以尝试深呼吸、冥想、渐进性肌肉放松等方法。保持良好的作息习惯，避免过度劳累。';
        } else if (totalScore < 70) {
          status = '中度焦虑';
          suggestion = '您存在中度焦虑，建议咨询心理医生或专业人士进行评估和指导。同时可以尝试认知行为疗法等心理干预方法。';
        } else {
          status = '重度焦虑';
          suggestion = '您存在重度焦虑，建议尽快就医，接受专业心理治疗或医学干预。不要独自承受，及时寻求帮助。';
        }
      } else {
        if (totalScore < 53) {
          status = '无抑郁';
          suggestion = '您的情绪状态良好，继续保持积极乐观的心态。建议保持社交活动，培养兴趣爱好，保持良好的生活规律。';
        } else if (totalScore < 63) {
          status = '轻度抑郁';
          suggestion = '您存在轻度抑郁情绪，建议多与朋友交流，适当运动。培养积极的生活态度，设定小目标并逐步实现。';
        } else if (totalScore < 73) {
          status = '中度抑郁';
          suggestion = '您存在中度抑郁，建议咨询心理医生。心理治疗和适当的生活方式调整可能对您有帮助。';
        } else {
          status = '重度抑郁';
          suggestion = '您存在重度抑郁，建议尽快就医，接受专业治疗。您的健康和安全是最重要的，请及时寻求专业帮助。';
        }
      }

      // 调用云函数保存结果
      const app = getApp() as IAppOption;
      const date = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');

      let cloudSuccess = false;

      if (app.globalData.isLoggedIn && app.globalData.openid) {
        try {
          const saveRes: any = await wx.cloud.callFunction({
            name: 'health-assessment',
            data: {
              action: 'saveAssessment',
              data: {
                sasScore: selectedScale === 'sas' ? totalScore : 0,
                sdsScore: selectedScale === 'sds' ? totalScore : 0,
                status,
                suggestion,
                date
              }
            }
          });

          if (saveRes.result && saveRes.result.success) {
            cloudSuccess = true;
            console.log('云函数保存成功');
          } else {
            console.warn('云函数保存返回失败:', saveRes.result?.message);
          }
        } catch (cloudErr: any) {
          console.error('云函数保存失败:', cloudErr);
          
          // 如果云函数失败，尝试直接写数据库
          try {
            const db = wx.cloud.database();
            await db.collection('health_assessments').add({
              data: {
                openid: app.globalData.openid,
                sasScore: selectedScale === 'sas' ? totalScore : 0,
                sdsScore: selectedScale === 'sds' ? totalScore : 0,
                totalScore: selectedScale === 'sas' ? totalScore : 0,
                status,
                suggestion,
                date,
                createTime: new Date()
              }
            });
            cloudSuccess = true;
            console.log('数据库直接保存成功');
          } catch (dbErr: any) {
            console.error('数据库直接保存失败:', dbErr);
          }
        }
      }

      // 无论云端是否成功，都保存到本地
      const result = {
        sasScore: selectedScale === 'sas' ? totalScore : 0,
        sdsScore: selectedScale === 'sds' ? totalScore : 0,
        totalScore: selectedScale === 'sas' ? totalScore : 0,
        status,
        suggestion,
        date
      };

      const history = wx.getStorageSync('assessmentHistory') || [];
      history.unshift({
        ...result,
        id: Date.now().toString(),
        _cloudSaved: cloudSuccess
      });
      wx.setStorageSync('assessmentHistory', history.slice(0, 20));

      wx.hideLoading();
      this.setData({ result, currentStep: 3 });

      wx.showToast({ 
        title: cloudSuccess ? '保存成功' : '已本地保存', 
        icon: 'success' 
      });

      // 刷新统计数据
      this.loadStats();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
      console.error('保存测评结果失败:', error);
    }
  },

  // 同时保存SAS和SDS结果
  async saveBothResults(sasScore: number, sdsScore: number) {
    const app = getApp() as IAppOption;
    const date = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');

    const totalScore = sasScore + sdsScore;

    // 计算综合状态
    let status = '';
    let suggestion = '';

    if (sasScore < 50 && sdsScore < 53) {
      status = '心理健康';
      suggestion = '您的心理状态良好，焦虑和抑郁水平都在正常范围内。建议继续保持良好的生活习惯，保持积极乐观的心态，适当运动，保持社交活动。';
    } else if (sasScore < 60 && sdsScore < 63) {
      status = '轻度情绪困扰';
      suggestion = '您存在轻度的焦虑或抑郁情绪。建议适当放松，保持规律作息，可以尝试深呼吸、冥想等放松方法。多与朋友交流，适当运动。';
    } else if (sasScore < 70 && sdsScore < 73) {
      status = '中度情绪困扰';
      suggestion = '您存在中度的焦虑或抑郁情绪。建议咨询心理医生进行专业评估和指导。同时可以尝试认知行为疗法等心理干预方法。';
    } else {
      status = '重度情绪困扰';
      suggestion = '您存在较严重的焦虑或抑郁情绪，建议尽快就医，接受专业心理治疗或医学干预。不要独自承受，及时寻求帮助。';
    }

    const result = {
      sasScore,
      sdsScore,
      totalScore,
      status,
      suggestion,
      date
    };

    wx.showLoading({ title: '保存中...' });

    try {
      let cloudSuccess = false;

      // 调用云函数保存
      if (app.globalData.isLoggedIn && app.globalData.openid) {
        try {
          const saveRes: any = await wx.cloud.callFunction({
            name: 'health-assessment',
            data: {
              action: 'saveAssessment',
              data: {
                sasScore,
                sdsScore,
                status,
                suggestion,
                date
              }
            }
          });

          if (saveRes.result && saveRes.result.success) {
            cloudSuccess = true;
            console.log('云函数保存成功');
          } else {
            console.warn('云函数保存返回失败:', saveRes.result?.message);
          }
        } catch (cloudErr: any) {
          console.error('云函数保存失败:', cloudErr);
          
          // 如果云函数失败，尝试直接写数据库
          try {
            const db = wx.cloud.database();
            await db.collection('health_assessments').add({
              data: {
                openid: app.globalData.openid,
                sasScore,
                sdsScore,
                totalScore,
                status,
                suggestion,
                date,
                createTime: new Date()
              }
            });
            cloudSuccess = true;
            console.log('数据库直接保存成功');
          } catch (dbErr: any) {
            console.error('数据库直接保存失败:', dbErr);
          }
        }
      }

      // 保存到本地
      const history = wx.getStorageSync('assessmentHistory') || [];
      history.unshift({
        ...result,
        id: Date.now().toString(),
        _cloudSaved: cloudSuccess
      });
      wx.setStorageSync('assessmentHistory', history.slice(0, 20));

      wx.hideLoading();
      this.setData({ result, currentStep: 3 });
      
      wx.showToast({ 
        title: cloudSuccess ? '保存成功' : '已本地保存', 
        icon: 'success' 
      });

      // 刷新统计数据
      this.loadStats();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error('保存测评结果失败:', error);
    }
  },

  // 重新开始测评
  restartAssessment() {
    const sasQuestions = this.data.sasQuestions.map((q: any) => ({ ...q, score: 0, selectedValue: 0 }));
    const sdsQuestions = this.data.sdsQuestions.map((q: any) => ({ ...q, score: 0, selectedValue: 0 }));

    this.setData({
      currentStep: 0,
      selectedScale: '',
      sasQuestions,
      sdsQuestions,
      result: {
        sasScore: 0,
        sdsScore: 0,
        totalScore: 0,
        status: '',
        suggestion: '',
        date: ''
      }
    });
  },

  // 返回选择量表
  goBack() {
    this.setData({ currentStep: 0 });
  },

  // 查看历史详情
  viewHistoryDetail(e: any) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      result: item,
      currentStep: 3
    });
  },

  // 批量测评SAS和SDS
  startBothScales() {
    this.setData({
      selectedScale: 'sas',
      currentStep: 1
    });
  },

  // 完成SAS后继续SDS
  continueToSDS() {
    const { sasQuestions } = this.data;
    const unanswered = sasQuestions.filter((q: any) => q.score === 0);

    if (unanswered.length > 0) {
      wx.showToast({
        title: '请完成SAS所有题目',
        icon: 'none'
      });
      return;
    }

    const sasScore = sasQuestions.reduce((sum: number, q: any) => sum + q.score, 0);
    this.setData({
      'result.sasScore': sasScore,
      selectedScale: 'sds',
      currentStep: 2
    });
  },

  // 完成SDS测评
  submitBothScales() {
    const { sdsQuestions } = this.data;
    const unanswered = sdsQuestions.filter((q: any) => q.score === 0);

    if (unanswered.length > 0) {
      wx.showToast({
        title: '请完成SDS所有题目',
        icon: 'none'
      });
      return;
    }

    const sdsScore = sdsQuestions.reduce((sum: number, q: any) => sum + q.score, 0);
    this.saveBothResults(this.data.result.sasScore, sdsScore);
  },

  // 删除历史记录
  async deleteHistoryItem(e: any) {
    const { index } = e.currentTarget.dataset;
    const item = e.currentTarget.dataset.item;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条测评记录吗？',
      success: async (res) => {
        if (res.confirm) {
          // 从本地删除
          const history = [...this.data.history];
          history.splice(index, 1);
          this.setData({ history });
          wx.setStorageSync('assessmentHistory', history);

          // 从云端删除
          const app = getApp() as IAppOption;
          if (app.globalData.isLoggedIn && item._id) {
            try {
              await wx.cloud.callFunction({
                name: 'health-assessment',
                data: {
                  action: 'deleteAssessment',
                  data: { assessmentId: item._id }
                }
              });
            } catch (err) {
              console.error('删除云端记录失败:', err);
            }
          }

          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  // 获取SAS专项分析
  async analyzeSAS(e: any) {
    const item = e.currentTarget.dataset.item || this.data.history[0];
    
    wx.showLoading({ title: '分析中...' });

    try {
      const res: any = await wx.cloud.callFunction({
        name: 'health-assessment',
        data: {
          action: 'analyzeSAS',
          data: { assessmentId: item._id }
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        const analysis = res.result.analysis;
        wx.showModal({
          title: 'SAS分析报告',
          content: `测评日期: ${analysis.date}\n\n分数: ${analysis.score}分\n\n等级: ${analysis.level}\n\n${analysis.advice}`,
          showCancel: false,
          confirmText: '知道了'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('分析失败:', err);
      wx.showToast({ title: '分析失败', icon: 'none' });
    }
  },

  // 获取SDS专项分析
  async analyzeSDS(e: any) {
    const item = e.currentTarget.dataset.item || this.data.history[0];
    
    wx.showLoading({ title: '分析中...' });

    try {
      const res: any = await wx.cloud.callFunction({
        name: 'health-assessment',
        data: {
          action: 'analyzeSDS',
          data: { assessmentId: item._id }
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        const analysis = res.result.analysis;
        wx.showModal({
          title: 'SDS分析报告',
          content: `测评日期: ${analysis.date}\n\n分数: ${analysis.score}分\n\n等级: ${analysis.level}\n\n${analysis.advice}`,
          showCancel: false,
          confirmText: '知道了'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('分析失败:', err);
      wx.showToast({ title: '分析失败', icon: 'none' });
    }
  },

  // 获取心理健康趋势
  async viewTrend() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res: any = await wx.cloud.callFunction({
        name: 'health-assessment',
        data: {
          action: 'getTrend',
          data: { days: 30 }
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success && res.result.trend.length > 0) {
        const trend = res.result.trend;
        let content = '近30天心理健康趋势:\n\n';
        
        trend.forEach((item: any) => {
          content += `${item.date}: SAS平均${item.avgSasScore}分, SDS平均${item.avgSdsScore}分\n`;
        });

        wx.showModal({
          title: '心理健康趋势',
          content: content,
          showCancel: false,
          confirmText: '知道了'
        });
      } else {
        wx.showToast({ title: '暂无趋势数据', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('获取趋势失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  }
});
