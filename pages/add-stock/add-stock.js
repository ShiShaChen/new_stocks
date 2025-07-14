// pages/add-stock/add-stock.js
Page({
  data: {
    isEdit: false,
    readonly: false,
    stockId: null,
    selectedAccount: { id: 'default', name: '默认账户' },
    accountList: [],
    showAccountModal: false,
    showAddAccountModal: false,
    newAccountName: '',
    formData: {
      stockName: '',
      issuePrice: '',
      packageFee: '',
      subscriptionHands: '',
      serviceFee: '0',
      subscriptionMethod: 'cash',
      status: 'ongoing',
      winningShares: 0,
      sellPrice: 0,
      profit: 0,
      accountId: '',
      createTime: null,
      winningTime: null,
      sellTime: null
    }
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: options.id ? '编辑打新记录' : '新增打新记录'
    })

    // 初始化账户
    this.initializeAccounts()

    if (options.id) {
      this.setData({
        isEdit: true,
        stockId: options.id,
        readonly: options.readonly === 'true'
      })
      this.loadStockData(options.id)
    }
  },

  onShow() {
    // 检查是否有账户变更
    if (wx.getStorageSync('accountChanged')) {
      wx.removeStorageSync('accountChanged')
      this.initializeAccounts()
    }
  },

  // 初始化账户
  initializeAccounts() {
    const accounts = wx.getStorageSync('accounts') || []
    
    // 如果没有账户，创建默认账户
    if (accounts.length === 0) {
      const defaultAccount = {
        id: 'default',
        name: '默认账户',
        isDefault: true,
        createTime: new Date().getTime()
      }
      accounts.push(defaultAccount)
      wx.setStorageSync('accounts', accounts)
    }

    this.setData({
      accountList: accounts
    })

    // 设置当前选中的账户
    if (!this.data.isEdit) {
      const currentAccountId = wx.getStorageSync('currentAccountId') || 'default'
      const currentAccount = accounts.find(acc => acc.id === currentAccountId) || accounts[0]
      this.setData({
        selectedAccount: currentAccount,
        'formData.accountId': currentAccount.id
      })
    }
  },

  // 选择账户
  onSelectAccount() {
    if (this.data.readonly) return
    
    // 检查是否有账户
    if (this.data.accountList.length === 0) {
      wx.showModal({
        title: '提示',
        content: '还没有创建任何账户，是否现在创建？',
        success: (res) => {
          if (res.confirm) {
            this.onAddAccount()
          }
        }
      })
      return
    }

    this.setData({
      showAccountModal: true
    })
  },

  // 关闭账户选择弹窗
  onCloseAccountModal() {
    this.setData({
      showAccountModal: false
    })
  },

  // 选择账户
  onChooseAccount(e) {
    const account = e.currentTarget.dataset.account
    this.setData({
      selectedAccount: account,
      'formData.accountId': account.id,
      showAccountModal: false
    })
    
    console.log('选择账户:', {
      accountId: account.id,
      accountName: account.name,
      formDataAccountId: this.data.formData.accountId
    })
  },

  // 新增账户
  onAddAccount() {
    this.setData({
      showAccountModal: false,
      showAddAccountModal: true,
      newAccountName: ''
    })
  },

  // 关闭新增账户弹窗
  onCloseAddAccountModal() {
    this.setData({
      showAddAccountModal: false,
      newAccountName: ''
    })
  },

  // 新账户名称输入
  onNewAccountNameChange(e) {
    this.setData({
      newAccountName: e.detail.value
    })
  },

  // 创建账户
  onCreateAccount() {
    const accountName = this.data.newAccountName.trim()
    
    if (!accountName) {
      wx.showToast({
        title: '请输入账户名称',
        icon: 'none'
      })
      return
    }

    const accounts = [...this.data.accountList]
    
    // 检查账户名称是否重复
    if (accounts.find(acc => acc.name === accountName)) {
      wx.showToast({
        title: '账户名称已存在',
        icon: 'none'
      })
      return
    }

    // 创建新账户
    const newAccount = {
      id: 'account_' + new Date().getTime(),
      name: accountName,
      isDefault: false,
      createTime: new Date().getTime()
    }

    accounts.push(newAccount)
    wx.setStorageSync('accounts', accounts)

    this.setData({
      accountList: accounts,
      selectedAccount: newAccount,
      'formData.accountId': newAccount.id,
      showAddAccountModal: false,
      newAccountName: ''
    })

    wx.showToast({
      title: '账户创建成功',
      icon: 'success'
    })
  },

  loadStockData(id) {
    const stocks = wx.getStorageSync('stocks') || []
    const stock = stocks.find(item => item.id === id)
    
    if (stock) {
      // 格式化时间显示
      const formData = { ...stock }
      if (formData.winningTime) {
        formData.winningDateStr = this.formatDate(formData.winningTime)
      }
      if (formData.sellTime) {
        formData.sellDateStr = this.formatDate(formData.sellTime)
      }

      // 设置对应的账户信息
      const accountId = formData.accountId || 'default'
      const account = this.data.accountList.find(acc => acc.id === accountId) || { id: 'default', name: '默认账户' }
      
      this.setData({
        formData: formData,
        selectedAccount: account
      })

      console.log('加载股票数据:', {
        stockId: id,
        accountId: accountId,
        selectedAccount: account,
        formData: formData
      })
    } else {
      wx.showToast({
        title: '记录不存在',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  formatDateTime(timestamp) {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  formatDate(timestamp) {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  onStatusChange(e) {
    const newStatus = e.detail.value
    this.setData({
      'formData.status': newStatus
    })
    
    // 如果状态改为"打新结束"，提示用户
    if (newStatus === 'finished') {
      wx.showModal({
        title: '状态变更提醒',
        content: '变更为"打新结束"后，所有信息将不可修改，确定要变更吗？',
        success: (res) => {
          if (!res.confirm) {
            // 用户取消，恢复为原状态
            this.setData({
              'formData.status': 'ongoing'
            })
          }
        }
      })
    }
  },

  onSubscriptionMethodChange(e) {
    this.setData({
      'formData.subscriptionMethod': e.detail.value
    })
  },

  onSubmit(e) {
    const formData = e.detail.value
    
    // 验证必填字段
    if (!formData.stockName || !formData.issuePrice || !formData.packageFee || !formData.subscriptionHands || !formData.subscriptionMethod) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none'
      })
      return
    }

    // 确保账户ID正确
    const accountId = this.data.selectedAccount ? this.data.selectedAccount.id : (this.data.formData.accountId || 'default')

    // 数据处理
    const stockData = {
      id: this.data.stockId || this.generateId(),
      stockName: formData.stockName.trim(),
      issuePrice: parseFloat(formData.issuePrice),
      packageFee: parseFloat(formData.packageFee),
      subscriptionHands: parseInt(formData.subscriptionHands),
      serviceFee: parseFloat(formData.serviceFee) || 0,
      subscriptionMethod: formData.subscriptionMethod,
      status: formData.status || 'ongoing',
      accountId: accountId, // 确保使用最新选择的账户ID
      createTime: this.data.formData.createTime || Date.now(),
      winningShares: this.data.formData.winningShares || 0,
      winningTime: this.data.formData.winningTime || null,
      sellPrice: this.data.formData.sellPrice || 0,
      sellShares: this.data.formData.sellShares || 0,
      sellFee: this.data.formData.sellFee || 0,
      otherFee: this.data.formData.otherFee || 0,
      sellTime: this.data.formData.sellTime || null,
      profit: 0 // 重新计算
    }

    // 重新计算盈亏（只有在没有详细费用明细时才重新计算）
    if (stockData.sellPrice > 0 && stockData.winningShares > 0) {
      // 如果是编辑模式且已有详细的费用明细，不重新计算盈亏
      if (this.data.isEdit) {
        const oldStock = wx.getStorageSync('stocks').find(item => item.id === this.data.stockId)
        if (oldStock && (oldStock.winningFeeDetails || oldStock.sellFeeDetails)) {
          console.log('保留原有的精确盈亏计算，不重新计算')
          // 不修改profit，保留原有计算
        } else {
          stockData.profit = this.calculateProfit(stockData)
        }
      } else {
        stockData.profit = this.calculateProfit(stockData)
      }
    }

    this.saveStock(stockData)
  },

  calculateProfit(stockData) {
    const sellPrice = stockData.sellPrice
    const sellShares = stockData.sellShares || stockData.winningShares
    const issuePrice = stockData.issuePrice
    const packageFee = stockData.packageFee
    const serviceFee = stockData.serviceFee
    const sellFee = stockData.sellFee || 0
    const otherFee = stockData.otherFee || 0

    if (sellPrice > 0 && sellShares > 0 && issuePrice > 0) {
      // 卖出金额
      const sellAmount = sellPrice * sellShares
      // 成本金额（发行价 * 股数）
      const costAmount = issuePrice * sellShares
      // 总手续费（按比例计算）
      const buyFeeRatio = sellShares / stockData.winningShares
      const totalFees = (packageFee + serviceFee) * buyFeeRatio + sellFee + otherFee
      // 净盈亏（卖出金额 - 成本金额 - 手续费）
      return parseFloat((sellAmount - costAmount - totalFees).toFixed(2))
    }
    return 0
  },

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  },

  saveStock(stockData) {
    console.log('=== 开始保存股票数据 ===')
    console.log('保存的股票数据:', stockData)
    console.log('是否编辑模式:', this.data.isEdit)
    console.log('当前stockId:', this.data.stockId)
    console.log('选中的账户:', this.data.selectedAccount)
    
    let stocks = wx.getStorageSync('stocks') || []
    console.log('保存前的stocks数据长度:', stocks.length)
    
    if (this.data.isEdit) {
      // 更新现有记录 - 保留重要的费用明细字段
      const index = stocks.findIndex(item => item.id === this.data.stockId)
      console.log('找到的记录index:', index)
      
      if (index !== -1) {
        const oldStock = stocks[index]
        console.log('修改前的股票数据:', {
          id: oldStock.id,
          stockName: oldStock.stockName,
          accountId: oldStock.accountId,
          hasWinningFeeDetails: !!oldStock.winningFeeDetails,
          hasSellFeeDetails: !!oldStock.sellFeeDetails
        })
        
        // 合并数据，保留费用明细
        stocks[index] = {
          ...stockData,
          // 保留重要的费用明细字段
          winningFeeDetails: oldStock.winningFeeDetails,
          sellFeeDetails: oldStock.sellFeeDetails,
          // 保留其他可能的资金相关字段
          profit: oldStock.profit, // 保留原有的盈亏计算结果
          pureProfit: oldStock.pureProfit
        }
        
        console.log('修改后的股票数据:', {
          id: stocks[index].id,
          stockName: stocks[index].stockName,
          accountId: stocks[index].accountId,
          hasWinningFeeDetails: !!stocks[index].winningFeeDetails,
          hasSellFeeDetails: !!stocks[index].sellFeeDetails
        })
      } else {
        console.error('错误：未找到要更新的记录，stockId:', this.data.stockId)
        wx.showToast({
          title: '保存失败：记录不存在',
          icon: 'error'
        })
        return
      }
    } else {
      // 新增记录
      console.log('新增股票记录，accountId:', stockData.accountId)
      stocks.push(stockData)
    }

    wx.setStorageSync('stocks', stocks)
    console.log('数据已保存到本地存储')
    
    // 验证保存
    const savedStocks = wx.getStorageSync('stocks') || []
    if (this.data.isEdit) {
      const savedStock = savedStocks.find(item => item.id === this.data.stockId)
      console.log('验证保存结果:', savedStock ? {
        id: savedStock.id,
        stockName: savedStock.stockName,
        accountId: savedStock.accountId
      } : '未找到保存的记录')
    } else {
      console.log('验证保存结果 - 总记录数:', savedStocks.length)
    }
    console.log('=== 保存股票数据完成 ===')
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })

    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  onCancel() {
    wx.navigateBack()
  },

  editRecord() {
    this.setData({
      readonly: false
    })
    wx.setNavigationBarTitle({
      title: '编辑打新记录'
    })
  },

  addWinning() {
    wx.navigateTo({
      url: `/pages/winning-result/winning-result?stockId=${this.data.stockId}`
    })
  },

  addSell() {
    wx.navigateTo({
      url: `/pages/sell-record/sell-record?stockId=${this.data.stockId}`
    })
  }
})
