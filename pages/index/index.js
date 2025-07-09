// pages/index/index.js
Page({
  data: {
    userInfo: null,
    ongoingStocks: [],
    recentFinished: [],
    stats: {
      ongoingCount: 0,
      finishedCount: 0,
      totalProfit: 0
    }
  },

  onLoad() {
    this.checkLogin()
  },

  onShow() {
    this.checkLogin() // 每次显示时都检查登录状态
    if (this.data.userInfo) {
      this.loadData()
    }
  },

  checkLogin() {
    // 从全局数据或本地存储获取用户信息
    const app = getApp()
    let userInfo = app.getUserInfo()
    
    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }
    
    // 更新页面数据
    this.setData({
      userInfo: userInfo
    })
    
    // 加载数据
    this.loadData()
  },

  loadData() {
    // 从本地存储加载数据
    const stocks = wx.getStorageSync('stocks') || []
    
    // 分类处理数据
    const ongoingStocks = []
    const finishedStocks = []
    let totalProfit = 0

    stocks.forEach(stock => {
      // 格式化时间
      stock.createTimeStr = this.formatDate(stock.createTime)
      
      // 确保数字字段存在
      stock.winningShares = stock.winningShares || 0
      stock.sellPrice = stock.sellPrice || 0
      
      if (stock.status === 'ongoing') {
        ongoingStocks.push(stock)
      } else {
        finishedStocks.push(stock)
        totalProfit += stock.profit || 0
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
