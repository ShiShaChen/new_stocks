// pages/sell-record/sell-record.js
Page({
  data: {
    stockId: '',
    stockInfo: {},
    winningAmount: '0.00',
    formData: {
      sellPrice: '',
      sellShares: '',
      sellFee: '0',
      otherFee: '0',
      sellDate: '',
      sellTime: ''
    },
    sellAmount: '0.00',
    costAmount: '0.00',
    totalFees: '0.00',
    profit: 0,
    profitRate: 0
  },

  onLoad(options) {
    if (options.stockId) {
      this.setData({
        stockId: options.stockId
      })
      this.loadStockInfo(options.stockId)
    }

    // 设置默认时间为当前时间
    const now = new Date()
    const currentDate = this.formatDate(now)
    const currentTime = this.formatTime(now)
    
    this.setData({
      'formData.sellDate': currentDate,
      'formData.sellTime': currentTime
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
    const stocks = wx.getStorageSync('stocks') || []
    const stock = stocks.find(item => item.id === stockId)
    
    if (stock) {
      const winningAmount = (stock.winningShares * stock.costPrice).toFixed(2)
      
      this.setData({
        stockInfo: stock,
        winningAmount: winningAmount,
        'formData.sellShares': stock.winningShares.toString()
      })

      // 如果已有卖出记录，回显数据
      if (stock.sellPrice > 0) {
        const sellTime = new Date(stock.sellTime)
        this.setData({
          'formData.sellPrice': stock.sellPrice.toString(),
          'formData.sellShares': (stock.sellShares || stock.winningShares).toString(),
          'formData.sellFee': (stock.sellFee || 0).toString(),
          'formData.otherFee': (stock.otherFee || 0).toString(),
          'formData.sellDate': this.formatDate(sellTime),
          'formData.sellTime': this.formatTime(sellTime)
        })
        
        // 设置页面标题为修改模式
        wx.setNavigationBarTitle({
          title: '修改卖出记录'
        })
      }

      this.calculateProfit()
    }
  },

  onSellPriceChange(e) {
    this.setData({
      'formData.sellPrice': e.detail.value
    })
    this.calculateProfit()
  },

  onSellSharesChange(e) {
    const value = parseInt(e.detail.value) || 0
    const maxShares = this.data.stockInfo.winningShares
    
    if (value > maxShares) {
      wx.showToast({
        title: `卖出股数不能超过${maxShares}股`,
        icon: 'none'
      })
      return
    }

    this.setData({
      'formData.sellShares': value.toString()
    })
    this.calculateProfit()
  },

  onSellFeeChange(e) {
    this.setData({
      'formData.sellFee': e.detail.value
    })
    this.calculateProfit()
  },

  onOtherFeeChange(e) {
    this.setData({
      'formData.otherFee': e.detail.value
    })
    this.calculateProfit()
  },

  onDateChange(e) {
    this.setData({
      'formData.sellDate': e.detail.value
    })
  },

  onTimeChange(e) {
    this.setData({
      'formData.sellTime': e.detail.value
    })
  },

  calculateProfit() {
    const sellPrice = parseFloat(this.data.formData.sellPrice) || 0
    const sellShares = parseInt(this.data.formData.sellShares) || 0
    const sellFee = parseFloat(this.data.formData.sellFee) || 0
    const otherFee = parseFloat(this.data.formData.otherFee) || 0
    const costPrice = this.data.stockInfo.costPrice || 0
    const serviceFee = this.data.stockInfo.serviceFee || 0
    const extraCost = this.data.stockInfo.extraCost || 0

    if (sellPrice > 0 && sellShares > 0) {
      // 卖出金额
      const sellAmount = sellPrice * sellShares
      
      // 成本金额（按比例计算）
      const costAmount = costPrice * sellShares
      
      // 总手续费（包含买入和卖出的费用，按比例计算）
      const buyFeeRatio = sellShares / this.data.stockInfo.winningShares
      const totalFees = (serviceFee + extraCost) * buyFeeRatio + sellFee + otherFee
      
      // 净盈亏
      const profit = sellAmount - costAmount - totalFees
      
      // 收益率
      const profitRate = costAmount > 0 ? ((profit / costAmount) * 100).toFixed(2) : 0

      this.setData({
        sellAmount: sellAmount.toFixed(2),
        costAmount: costAmount.toFixed(2),
        totalFees: totalFees.toFixed(2),
        profit: profit.toFixed(2),
        profitRate: profitRate
      })
    } else {
      this.setData({
        sellAmount: '0.00',
        costAmount: '0.00',
        totalFees: '0.00',
        profit: 0,
        profitRate: 0
      })
    }
  },

  onSubmit(e) {
    const formData = e.detail.value
    const sellPrice = parseFloat(formData.sellPrice)
    const sellShares = parseInt(formData.sellShares) || this.data.stockInfo.winningShares
    
    if (!sellPrice || sellPrice <= 0) {
      wx.showToast({
        title: '请输入有效的卖出价格',
        icon: 'none'
      })
      return
    }

    if (sellShares > this.data.stockInfo.winningShares) {
      wx.showToast({
        title: '卖出股数超出中签股数',
        icon: 'none'
      })
      return
    }

    // 组合完整的卖出时间
    const sellDateTime = new Date(`${this.data.formData.sellDate} ${this.data.formData.sellTime}`)
    
    this.saveSellRecord({
      sellPrice: sellPrice,
      sellShares: sellShares,
      sellFee: parseFloat(formData.sellFee) || 0,
      otherFee: parseFloat(formData.otherFee) || 0,
      sellTime: sellDateTime.getTime(),
      profit: parseFloat(this.data.profit)
    })
  },

  saveSellRecord(sellData) {
    console.log('保存卖出记录:', sellData)
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
        sellPrice: sellData.sellPrice,
        sellShares: sellData.sellShares,
        sellFee: sellData.sellFee,
        otherFee: sellData.otherFee,
        sellTime: sellData.sellTime,
        profit: sellData.profit
      }
      
      console.log('修改后的股票数据:', stocks[stockIndex])
      
      wx.setStorageSync('stocks', stocks)
      console.log('数据已保存到本地存储')
      
      // 验证保存
      const savedStocks = wx.getStorageSync('stocks') || []
      const savedStock = savedStocks.find(item => item.id === this.data.stockId)
      console.log('验证保存结果:', savedStock)
      
      wx.showToast({
        title: '卖出记录保存成功',
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

  finishStock() {
    wx.showModal({
      title: '确认操作',
      content: '确定要结束这只股票的打新吗？结束后状态将变为"打新结束"',
      success: (res) => {
        if (res.confirm) {
          this.updateStockStatus('finished')
        }
      }
    })
  },

  updateStockStatus(status) {
    console.log('更新股票状态:', status)
    console.log('当前stockId:', this.data.stockId)
    
    let stocks = wx.getStorageSync('stocks') || []
    console.log('更新前的stocks数据:', stocks)
    
    const stockIndex = stocks.findIndex(item => item.id === this.data.stockId)
    console.log('找到的stockIndex:', stockIndex)
    
    if (stockIndex !== -1) {
      const oldStock = stocks[stockIndex]
      console.log('修改前的股票数据:', oldStock)
      
      stocks[stockIndex].status = status
      
      console.log('修改后的股票数据:', stocks[stockIndex])
      
      wx.setStorageSync('stocks', stocks)
      console.log('状态已保存到本地存储')
      
      // 验证保存
      const savedStocks = wx.getStorageSync('stocks') || []
      const savedStock = savedStocks.find(item => item.id === this.data.stockId)
      console.log('验证保存结果:', savedStock)
      
      wx.showToast({
        title: '状态更新成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      console.log('错误：未找到对应的股票记录')
      wx.showToast({
        title: '状态更新失败：未找到记录',
        icon: 'error'
      })
    }
  },

  onCancel() {
    wx.navigateBack()
  }
})
