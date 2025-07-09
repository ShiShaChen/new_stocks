// pages/history/history.js
Page({
  data: {
    allStocks: [],
    filteredStocks: [],
    displayStocks: [],
    pageSize: 10,
    currentPage: 1,
    hasMore: false,
    
    // 筛选条件
    startDate: '',
    endDate: '',
    statusFilterIndex: 0,
    statusFilterOptions: ['全部', '打新中', '已结束'],
    
    // 统计信息
    filteredStats: {
      total: 0,
      totalProfit: 0,
      winningRate: 0
    }
  },

  onLoad() {
    this.loadAllData()
  },

  onShow() {
    this.loadAllData()
  },

  loadAllData() {
    const stocks = wx.getStorageSync('stocks') || []
    
    // 处理数据格式
    const processedStocks = stocks.map(stock => {
      const processedStock = { ...stock }
      
      // 格式化时间
      processedStock.createTimeStr = this.formatDate(stock.createTime)
      
      // 计算收益率
      if (stock.sellPrice > 0 && stock.costPrice > 0) {
        const costAmount = stock.costPrice * (stock.sellShares || stock.winningShares || 0)
        processedStock.profitRate = costAmount > 0 ? ((stock.profit / costAmount) * 100).toFixed(2) : 0
      } else {
        processedStock.profitRate = 0
      }
      
      return processedStock
    })

    // 按时间倒序排列
    processedStocks.sort((a, b) => b.createTime - a.createTime)

    this.setData({
      allStocks: processedStocks
    })

    this.filterAndDisplayData()
  },

  formatDate(timestamp) {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    })
    this.filterAndDisplayData()
  },

  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    })
    this.filterAndDisplayData()
  },

  onStatusFilterChange(e) {
    this.setData({
      statusFilterIndex: parseInt(e.detail.value)
    })
    this.filterAndDisplayData()
  },

  resetFilter() {
    this.setData({
      startDate: '',
      endDate: '',
      statusFilterIndex: 0,
      currentPage: 1
    })
    this.filterAndDisplayData()
  },

  filterAndDisplayData() {
    let filtered = [...this.data.allStocks]

    // 时间筛选
    if (this.data.startDate) {
      const startTime = new Date(this.data.startDate).getTime()
      filtered = filtered.filter(stock => stock.createTime >= startTime)
    }

    if (this.data.endDate) {
      const endTime = new Date(this.data.endDate + ' 23:59:59').getTime()
      filtered = filtered.filter(stock => stock.createTime <= endTime)
    }

    // 状态筛选
    const statusFilter = this.data.statusFilterOptions[this.data.statusFilterIndex]
    if (statusFilter !== '全部') {
      const statusValue = statusFilter === '打新中' ? 'ongoing' : 'finished'
      filtered = filtered.filter(stock => stock.status === statusValue)
    }

    // 计算统计信息
    const stats = this.calculateStats(filtered)

    // 分页显示
    const pageSize = this.data.pageSize
    const currentPage = this.data.currentPage
    const displayStocks = filtered.slice(0, pageSize * currentPage)
    const hasMore = filtered.length > pageSize * currentPage

    this.setData({
      filteredStocks: displayStocks, // 修改：直接显示分页后的数据
      hasMore: hasMore,
      filteredStats: stats
    })
  },

  calculateStats(stocks) {
    const total = stocks.length
    let totalProfit = 0
    let totalSubscription = 0
    let totalWinning = 0

    stocks.forEach(stock => {
      totalProfit += stock.profit || 0
      
      // 计算中签率统计
      const isHKStock = this.isHKStock(stock.stockName)
      const subscriptionShares = isHKStock ? stock.subscriptionHands * 100 : stock.subscriptionHands
      const winningShares = stock.winningShares || 0
      
      totalSubscription += subscriptionShares
      totalWinning += winningShares
    })

    const winningRate = totalSubscription > 0 ? ((totalWinning / totalSubscription) * 100).toFixed(2) : 0

    return {
      total: total,
      totalProfit: totalProfit.toFixed(2),
      winningRate: winningRate
    }
  },

  isHKStock(stockName) {
    return stockName.includes('HK') || stockName.includes('港股') || /\d{5}/.test(stockName)
  },

  loadMore() {
    if (!this.data.hasMore) return

    const nextPage = this.data.currentPage + 1
    this.setData({
      currentPage: nextPage
    })
    
    this.filterAndDisplayData()
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/add-stock/add-stock?id=${id}&readonly=true`
    })
  },

  addNewStock() {
    wx.navigateTo({
      url: '/pages/add-stock/add-stock'
    })
  }
})
