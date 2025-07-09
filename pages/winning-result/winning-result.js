// pages/winning-result/winning-result.js
Page({
  data: {
    stockId: '',
    stockInfo: {},
    maxWinningShares: 0,
    formData: {
      winningShares: '',
      winningDate: '',
      winningTime: ''
    },
    calculatedAmount: '0.00',
    winningRate: '0.00'
  },

  onLoad(options) {
    console.log('winning-result页面加载，参数:', options)
    
    if (options.stockId) {
      this.setData({
        stockId: options.stockId
      })
      this.loadStockInfo(options.stockId)
    } else {
      console.log('错误：没有接收到stockId参数')
      wx.showModal({
        title: '错误',
        content: '没有接收到股票ID，请重新操作',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }

    // 设置默认时间为当前时间
    const now = new Date()
    const currentDate = this.formatDate(now)
    const currentTime = this.formatTime(now)
    
    this.setData({
      'formData.winningDate': currentDate,
      'formData.winningTime': currentTime
    })
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  formatTime(date) {
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${hour}:${minute}`
  },

  loadStockInfo(stockId) {
    console.log('开始加载股票信息，stockId:', stockId)
    const stocks = wx.getStorageSync('stocks') || []
    console.log('所有股票数据:', stocks)
    
    const stock = stocks.find(item => item.id === stockId)
    console.log('找到的股票信息:', stock)
    
    if (stock) {
      // 港股以手为单位，每手通常为100股，美股以股为单位
      const isHKStock = this.isHKStock(stock.stockName)
      const maxShares = isHKStock ? stock.subscriptionHands * 100 : stock.subscriptionHands
      
      console.log('是否为港股:', isHKStock)
      console.log('最大中签股数:', maxShares)
      
      this.setData({
        stockInfo: stock,
        maxWinningShares: maxShares
      })

      // 如果已有中签记录，回显数据
      if (stock.winningShares > 0) {
        const winningTime = new Date(stock.winningTime)
        this.setData({
          'formData.winningShares': stock.winningShares.toString(),
          'formData.winningDate': this.formatDate(winningTime),
          'formData.winningTime': this.formatTime(winningTime)
        })
        this.calculateResult()
        
        // 设置页面标题为修改模式
        wx.setNavigationBarTitle({
          title: '修改中签结果'
        })
      }
    } else {
      console.log('错误：未找到对应的股票信息')
      wx.showModal({
        title: '错误',
        content: '未找到对应的股票信息',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    }
  },

  isHKStock(stockName) {
    // 简单判断是否为港股（可根据需要完善判断逻辑）
    return stockName.includes('HK') || stockName.includes('港股') || /\d{5}/.test(stockName)
  },

  onWinningSharesChange(e) {
    const value = parseInt(e.detail.value) || 0
    const maxShares = this.data.maxWinningShares
    
    if (value > maxShares) {
      wx.showToast({
        title: `中签股数不能超过${maxShares}股`,
        icon: 'none'
      })
      return
    }

    this.setData({
      'formData.winningShares': value.toString()
    })
    
    this.calculateResult()
  },

  onDateChange(e) {
    this.setData({
      'formData.winningDate': e.detail.value
    })
  },

  onTimeChange(e) {
    this.setData({
      'formData.winningTime': e.detail.value
    })
  },

  calculateResult() {
    const winningShares = parseInt(this.data.formData.winningShares) || 0
    const costPrice = this.data.stockInfo.costPrice || 0
    const subscriptionHands = this.data.stockInfo.subscriptionHands || 0
    
    if (winningShares > 0) {
      // 计算中签金额
      const calculatedAmount = (winningShares * costPrice).toFixed(2)
      
      // 计算中签率
      const isHKStock = this.isHKStock(this.data.stockInfo.stockName)
      const totalShares = isHKStock ? subscriptionHands * 100 : subscriptionHands
      const winningRate = totalShares > 0 ? ((winningShares / totalShares) * 100).toFixed(2) : '0.00'
      
      this.setData({
        calculatedAmount: calculatedAmount,
        winningRate: winningRate
      })
    }
  },

  onSubmit(e) {
    const formData = e.detail.value
    const winningShares = parseInt(formData.winningShares)
    
    if (!winningShares || winningShares <= 0) {
      wx.showToast({
        title: '请输入有效的中签股数',
        icon: 'none'
      })
      return
    }

    if (winningShares > this.data.maxWinningShares) {
      wx.showToast({
        title: '中签股数超出限制',
        icon: 'none'
      })
      return
    }

    // 组合完整的中签时间
    const winningDateTime = new Date(`${this.data.formData.winningDate} ${this.data.formData.winningTime}`)
    
    this.saveWinningResult({
      winningShares: winningShares,
      winningTime: winningDateTime.getTime()
    })
  },

  saveWinningResult(winningData) {
    console.log('保存中签结果:', winningData)
    console.log('当前stockId:', this.data.stockId)
    
    let stocks = wx.getStorageSync('stocks') || []
    console.log('保存前的stocks数据:', stocks)
    
    const stockIndex = stocks.findIndex(item => item.id === this.data.stockId)
    console.log('找到的stockIndex:', stockIndex)
    
    if (stockIndex !== -1) {
      const oldStock = stocks[stockIndex]
      console.log('修改前的股票数据:', oldStock)
      
      stocks[stockIndex] = {
        ...stocks[stockIndex],
        winningShares: winningData.winningShares,
        winningTime: winningData.winningTime
      }
      
      console.log('修改后的股票数据:', stocks[stockIndex])
      
      wx.setStorageSync('stocks', stocks)
      console.log('数据已保存到本地存储')
      
      // 验证保存
      const savedStocks = wx.getStorageSync('stocks') || []
      const savedStock = savedStocks.find(item => item.id === this.data.stockId)
      console.log('验证保存结果:', savedStock)
      
      wx.showToast({
        title: '中签结果保存成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      console.log('错误：未找到对应的股票记录')
      wx.showToast({
        title: '保存失败：未找到记录',
        icon: 'error'
      })
    }
  },

  onCancel() {
    wx.navigateBack()
  }
})
