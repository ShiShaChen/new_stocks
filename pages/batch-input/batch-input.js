// pages/batch-input/batch-input.js
const { templateManager } = require('../../utils/templateManager.js')
const { FundManager } = require('../../utils/fundManager.js')

Page({
  data: {
    template: null,
    accounts: [],
    selectedAccounts: [],
    selectedAccountsData: [], // 选中账户的完整信息
    inputData: {}, // 每个账户的录入数据
    currentStep: 1, // 当前步骤：1-选择账户，2-录入信息，3-确认提交
    fundManager: null
  },

  onLoad(options) {
    const { templateId } = options
    
    // 初始化资金管理器
    this.setData({
      fundManager: new FundManager()
    })
    
    if (!templateId) {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    
    this.loadTemplate(templateId)
    this.loadAccounts(templateId)
  },

  // 加载模板信息
  loadTemplate(templateId) {
    const template = templateManager.getTemplateById(templateId)
    
    if (!template) {
      wx.showToast({
        title: '模板不存在',
        icon: 'error'
      })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    
    this.setData({
      template: template
    })
  },

  // 加载未使用该模板的账户
  loadAccounts(templateId) {
    const unusedAccounts = templateManager.getUnusedAccounts(templateId)
    
    if (unusedAccounts.length === 0) {
      wx.showModal({
        title: '提示',
        content: '所有账户已录入该股票',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }
    
    // 默认选中所有账户
    const selectedAccounts = unusedAccounts.map(acc => acc.id)
    
    this.setData({
      accounts: unusedAccounts,
      selectedAccounts: selectedAccounts
    })
    
    // 初始化输入数据
    this.initInputData(selectedAccounts)
  },

  // 初始化输入数据
  initInputData(accountIds) {
    const { accounts } = this.data
    const inputData = {}
    const selectedAccountsData = []
    const now = new Date()
    const defaultDate = this.formatDate(now)
    
    accountIds.forEach(accountId => {
      inputData[accountId] = {
        subscriptionDate: defaultDate,
        subscriptionHands: '',
        packageFee: '0'
      }
      
      // 找到对应的账户信息
      const account = accounts.find(acc => acc.id === accountId)
      if (account) {
        selectedAccountsData.push(account)
      }
    })
    
    this.setData({
      inputData: inputData,
      selectedAccountsData: selectedAccountsData
    })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 切换账户选择
  toggleAccount(e) {
    const accountId = e.currentTarget.dataset.id
    let { selectedAccounts } = this.data
    
    console.log('=== toggleAccount ===')
    console.log('点击的账户ID:', accountId)
    console.log('账户ID类型:', typeof accountId)
    console.log('切换前selectedAccounts:', selectedAccounts)
    console.log('selectedAccounts类型:', typeof selectedAccounts, Array.isArray(selectedAccounts))
    
    // 创建新数组
    let newSelectedAccounts = [...selectedAccounts]
    
    const index = newSelectedAccounts.indexOf(accountId)
    console.log('indexOf结果:', index)
    
    if (index > -1) {
      // 已选中，取消选择
      newSelectedAccounts.splice(index, 1)
      console.log('操作: 取消选择')
    } else {
      // 未选中，添加选择
      newSelectedAccounts.push(accountId)
      console.log('操作: 添加选择')
    }
    
    console.log('切换后newSelectedAccounts:', newSelectedAccounts)
    
    // 强制更新视图
    this.setData({
      selectedAccounts: newSelectedAccounts
    }, () => {
      console.log('setData完成，当前selectedAccounts:', this.data.selectedAccounts)
      // 在回调中更新输入数据
      this.initInputData(newSelectedAccounts)
    })
  },

  // 全选/取消全选
  toggleSelectAll() {
    const { accounts, selectedAccounts } = this.data
    
    if (selectedAccounts.length === accounts.length) {
      // 取消全选
      this.setData({
        selectedAccounts: []
      })
      this.initInputData([])
    } else {
      // 全选
      const allAccountIds = accounts.map(acc => acc.id)
      this.setData({
        selectedAccounts: allAccountIds
      })
      this.initInputData(allAccountIds)
    }
  },

  // 下一步
  nextStep() {
    const { selectedAccounts, currentStep } = this.data
    
    if (currentStep === 1) {
      // 选择账户步骤
      if (selectedAccounts.length === 0) {
        wx.showToast({
          title: '请至少选择一个账户',
          icon: 'none'
        })
        return
      }
      
      this.setData({
        currentStep: 2
      })
    } else if (currentStep === 2) {
      // 录入信息步骤，验证输入
      if (!this.validateInputData()) {
        return
      }
      
      this.setData({
        currentStep: 3
      })
    }
  },

  // 上一步
  prevStep() {
    const { currentStep } = this.data
    
    if (currentStep > 1) {
      this.setData({
        currentStep: currentStep - 1
      })
    }
  },

  // 验证输入数据
  validateInputData() {
    const { inputData, selectedAccounts } = this.data
    
    for (let accountId of selectedAccounts) {
      const data = inputData[accountId]
      
      if (!data.subscriptionHands || parseInt(data.subscriptionHands) <= 0) {
        wx.showToast({
          title: '请输入有效的申购数量',
          icon: 'none'
        })
        return false
      }
    }
    
    return true
  },

  // 输入处理
  onInputChange(e) {
    const { accountId, field } = e.currentTarget.dataset
    const value = e.detail.value
    
    this.setData({
      [`inputData.${accountId}.${field}`]: value
    })
  },

  // 日期选择
  onDateChange(e) {
    const { accountId } = e.currentTarget.dataset
    const value = e.detail.value
    
    this.setData({
      [`inputData.${accountId}.subscriptionDate`]: value
    })
  },

  // 批量应用到所有账户
  applyToAll(e) {
    const { field, accountId } = e.currentTarget.dataset
    const { inputData, selectedAccounts } = this.data
    const value = inputData[accountId][field]
    
    const newInputData = { ...inputData }
    selectedAccounts.forEach(accId => {
      newInputData[accId] = {
        ...newInputData[accId],
        [field]: value
      }
    })
    
    this.setData({
      inputData: newInputData
    })
    
    wx.showToast({
      title: '已应用到所有账户',
      icon: 'success',
      duration: 1500
    })
  },

  // 提交批量录入
  submitBatchInput() {
    wx.showModal({
      title: '确认提交',
      content: `将为 ${this.data.selectedAccounts.length} 个账户批量录入打新记录`,
      success: (res) => {
        if (res.confirm) {
          this.processBatchInput()
        }
      }
    })
  },

  // 处理批量录入
  processBatchInput() {
    const { template, selectedAccounts, inputData } = this.data
    
    wx.showLoading({
      title: '正在录入...',
      mask: true
    })
    
    try {
      // 获取所有股票记录
      let stocks = wx.getStorageSync('stocks') || []
      let successCount = 0
      let failCount = 0
      
      selectedAccounts.forEach(accountId => {
        try {
          const data = inputData[accountId]
          const subscriptionTime = new Date(`${data.subscriptionDate} 10:00`)
          const subscriptionHands = parseInt(data.subscriptionHands)
          const subscriptionShares = subscriptionHands * 100
          
          // 创建新的股票记录
          const newStock = {
            id: 'stock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            stockName: template.stockName,
            stockCode: template.stockCode,
            issuePrice: template.issuePrice,
            subscriptionDate: data.subscriptionDate,
            subscriptionHands: subscriptionHands,
            subscriptionShares: subscriptionShares,
            subscriptionMethod: 'margin90', // 默认90孖展
            subscriptionTime: subscriptionTime.getTime(),
            packageFee: parseFloat(data.packageFee || 0),
            accountId: accountId,
            status: 'ongoing', // 打新中
            winningShares: 0,
            sellPrice: 0,
            profit: 0,
            createTime: Date.now()
          }
          
          stocks.push(newStock)
          
          // 处理资金扣除
          if (this.data.fundManager) {
            const subscriptionAmount = newStock.subscriptionShares * newStock.issuePrice
            const totalFees = newStock.packageFee
            
            this.data.fundManager.addBusinessTransaction({
              accountId: accountId,
              type: 'subscription',
              stockId: newStock.id,
              stockName: newStock.stockName,
              amount: subscriptionAmount + totalFees,
              fees: totalFees,
              profitLoss: 0,
              description: `认购 ${newStock.stockName} ${newStock.subscriptionShares}股`,
              datetime: new Date().toISOString(),
              businessDate: subscriptionTime.toISOString()
            })
          }
          
          successCount++
        } catch (error) {
          console.error('录入失败:', accountId, error)
          failCount++
        }
      })
      
      // 保存股票记录
      wx.setStorageSync('stocks', stocks)
      
      // 标记模板已被这些账户使用
      templateManager.batchMarkTemplateUsed(template.id, selectedAccounts)
      
      wx.hideLoading()
      
      // 显示结果
      wx.showModal({
        title: '批量录入完成',
        content: `成功录入 ${successCount} 个账户\n${failCount > 0 ? `失败 ${failCount} 个账户` : ''}`,
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('批量录入失败:', error)
      wx.showToast({
        title: '批量录入失败',
        icon: 'error'
      })
    }
  }
})
