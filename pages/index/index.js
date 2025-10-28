// pages/index/index.js
Page({
  data: {
    userInfo: null,
    currentAccount: { id: 'default', name: '默认账户' },
    ongoingStocks: [],
    recentFinished: [],
    stats: {
      ongoingCount: 0,
      finishedCount: 0,
      totalProfit: 0
    }
  },

  onLoad() {
    // 移除强制登录检查，允许游客访问
    this.loadUserInfo()
    this.loadData()
  },

  onShow() {
    // 检查是否有账户变更
    if (wx.getStorageSync('accountChanged')) {
      wx.removeStorageSync('accountChanged')
      this.loadCurrentAccount()
    }
    
    // 刷新用户信息和数据
    this.loadUserInfo()
    this.loadData()
  },

  // 加载用户信息（不强制登录）
  loadUserInfo() {
    const app = getApp()
    const userInfo = app.getUserInfo()
    
    this.setData({
      userInfo: userInfo
    })
    
    // 加载当前账户
    this.loadCurrentAccount()
  },

  checkLogin() {
    // 保留此方法，供其他需要登录的功能调用
    const app = getApp()
    let userInfo = app.getUserInfo()
    
    if (!userInfo) {
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return false
    }
    
    return true
  },

  // 加载当前账户
  loadCurrentAccount() {
    const currentAccountId = wx.getStorageSync('currentAccountId') || 'default'
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
    
    const currentAccount = accounts.find(acc => acc.id === currentAccountId) || accounts[0]
    
    this.setData({
      currentAccount: currentAccount
    })
    
    // 更新导航栏标题显示当前账户
    wx.setNavigationBarTitle({
      title: `打新记录 - ${currentAccount.name}`
    })
  },

  loadData() {
    // 从本地存储加载数据，按当前账户过滤
    const stocks = wx.getStorageSync('stocks') || []
    const currentAccountId = this.data.currentAccount.id
    
    // 过滤当前账户的数据
    const accountStocks = stocks.filter(stock => {
      const stockAccountId = stock.accountId || 'default'
      return stockAccountId === currentAccountId
    })
    
    // 分类处理数据
    const ongoingStocks = []
    const finishedStocks = []
    let totalProfit = 0

    accountStocks.forEach(stock => {
      // 格式化时间
      stock.createTimeStr = this.formatDate(stock.createTime)
      
      // 确保数字字段存在
      stock.winningShares = stock.winningShares || 0
      stock.sellPrice = stock.sellPrice || 0
      
      if (stock.status === 'ongoing') {
        ongoingStocks.push(stock)
      } else {
        finishedStocks.push(stock)
        
        // 计算实际盈亏
        let actualProfit = 0
        
        if (stock.profit !== undefined && stock.profit !== null) {
          // 如果已有profit字段，直接使用（这是中签时或卖出时计算的准确值）
          actualProfit = stock.profit
        } else if (stock.winningShares > 0 && stock.sellPrice > 0) {
          // 兼容旧数据：有中签有卖出，使用默认计算
          actualProfit = stock.profit || 0
        } else if (stock.winningShares === 0) {
          // 兼容旧数据：中签股数为0，只有费用支出，计算为负数
          const totalFees = stock.winningFeeDetails ? parseFloat(stock.winningFeeDetails.totalFee || 0) : 0
          actualProfit = -totalFees  // 费用作为负盈亏
        } else {
          // 其他情况使用原profit值
          actualProfit = stock.profit || 0
        }
        
        totalProfit += actualProfit
      }
    })

    // 按时间倒序排列
    ongoingStocks.sort((a, b) => b.createTime - a.createTime)
    finishedStocks.sort((a, b) => b.createTime - a.createTime)

    this.setData({
      ongoingStocks: ongoingStocks,
      recentFinished: finishedStocks.slice(0, 5), // 只显示最近5条
      stats: {
        ongoingCount: ongoingStocks.length,
        finishedCount: finishedStocks.length,
        totalProfit: totalProfit.toFixed(2)
      }
    })
  },

  formatDate(timestamp) {
    const date = new Date(timestamp)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  },

  addNewStock() {    
    wx.navigateTo({
      url: '/pages/add-stock/add-stock'
    })
  },

  goToTemplates() {
    wx.navigateTo({
      url: '/pages/stock-template/stock-template'
    })
  },

  editStock(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/add-stock/add-stock?id=${id}&readonly=true`
    })
  },

  addWinningResult(e) {
    const id = e.currentTarget.dataset.id
    console.log('点击录入中签按钮，股票ID:', id)
    
    // 阻止事件冒泡，防止触发父级的点击事件
    e.stopPropagation && e.stopPropagation()
    
    // 验证ID是否存在
    if (!id) {
      console.log('错误：股票ID不存在')
      wx.showToast({
        title: '股票ID不存在',
        icon: 'error'
      })
      return
    }
    
    console.log('准备跳转到录入中签页面')
    wx.navigateTo({
      url: `/pages/winning-result/winning-result?stockId=${id}`,
      success: () => {
        console.log('跳转成功')
      },
      fail: (err) => {
        console.log('跳转失败:', err)
        wx.showToast({
          title: '跳转失败',
          icon: 'error'
        })
      }
    })
  },

  sellStock(e) {
    const id = e.currentTarget.dataset.id
    console.log('点击修改卖出按钮，股票ID:', id)
    
    // 阻止事件冒泡，防止触发父级的点击事件
    e.stopPropagation && e.stopPropagation()
    
    // 验证ID是否存在
    if (!id) {
      console.log('错误：股票ID不存在')
      wx.showToast({
        title: '股票ID不存在',
        icon: 'error'
      })
      return
    }
    
    console.log('准备跳转到卖出记录页面')
    wx.navigateTo({
      url: `/pages/sell-record/sell-record?stockId=${id}`,
      success: () => {
        console.log('跳转到卖出记录页面成功')
      },
      fail: (err) => {
        console.log('跳转到卖出记录页面失败:', err)
        wx.showToast({
          title: '跳转失败',
          icon: 'error'
        })
      }
    })
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/add-stock/add-stock?id=${id}&readonly=true`
    })
  }
})
