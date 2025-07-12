// pages/sell-record/sell-record.js
Page({
  data: {
    stockId: '',
    stockInfo: {},
    winningAmount: '0.00',
    formData: {
      sellPrice: '',
      sellShares: '',
      sellDate: ''
    },
    sellAmount: '0.00',
    costAmount: '0.00',
    totalFees: '0.00',
    profit: 0,
    profitRate: 0,
    feeDetails: {
      commission: '75.00',        // 佣金固定75元
      stampDuty: '0.00',          // 印花税
      tradingLevy: '0.00',        // 交易徵费
      tradingFee: '0.00',         // 交易费
      settlementFee: '0.00',      // 结算费
      totalFee: '0.00'            // 总费用
    }
  },

  onLoad(options) {
    console.log('sell-record页面加载，参数:', options)
    
    // 确保参数类型正确，真机可能传递的是字符串
    const stockId = options.stockId || options.id
    if (stockId) {
      this.setData({
        stockId: stockId
      })
      this.loadStockInfo(stockId)
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

    // 设置默认日期为当前日期
    const now = new Date()
    const currentDate = this.formatDate(now)
    
    this.setData({
      'formData.sellDate': currentDate
    })
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  loadStockInfo(stockId) {
    console.log('开始加载股票信息，stockId:', stockId)
    
    // 添加获取存储的错误处理
    let stocks = []
    try {
      stocks = wx.getStorageSync('stocks') || []
    } catch (error) {
      console.log('获取存储数据失败:', error)
      wx.showModal({
        title: '错误',
        content: '无法获取股票数据，请重试',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }
    
    console.log('所有股票数据:', stocks)
    const stock = stocks.find(item => item.id === stockId)
    console.log('找到的股票信息:', stock)
    
    if (stock) {
      const winningAmount = (stock.winningShares * stock.issuePrice).toFixed(2)
      
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
          'formData.sellDate': this.formatDate(sellTime)
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
    console.log('卖出股数输入变化:', e.detail.value)
    const value = parseInt(e.detail.value) || 0
    const maxShares = this.data.stockInfo.winningShares
    
    if (value > maxShares) {
      wx.showToast({
        title: `卖出股数不能超过${maxShares}股`,
        icon: 'none'
      })
      // 不return，允许用户继续输入，只是给出提示
    }

    this.setData({
      'formData.sellShares': e.detail.value // 保持原始输入值
    })
    this.calculateProfit()
  },

  onDateChange(e) {
    this.setData({
      'formData.sellDate': e.detail.value
    })
  },

  calculateProfit() {
    const sellPrice = parseFloat(this.data.formData.sellPrice) || 0
    const sellShares = parseInt(this.data.formData.sellShares) || 0
    const issuePrice = this.data.stockInfo.issuePrice || 0
    const serviceFee = this.data.stockInfo.serviceFee || 0
    const packageFee = this.data.stockInfo.packageFee || 0

    if (sellPrice > 0 && sellShares > 0) {
      // 卖出金额
      const sellAmount = sellPrice * sellShares
      
      // 成本金额（按比例计算）
      const costAmount = issuePrice * sellShares
      
      // 计算卖出费用
      const feeDetails = this.calculateSellFees(sellShares, sellPrice)
      
      // 买入费用使用中签页面的总费用，按比例计算
      let buyFees = 0
      if (this.data.stockInfo.winningFeeDetails && this.data.stockInfo.winningFeeDetails.totalFee) {
        const buyFeeRatio = sellShares / this.data.stockInfo.winningShares
        buyFees = parseFloat(this.data.stockInfo.winningFeeDetails.totalFee) * buyFeeRatio
      } else {
        // 兼容旧数据：如果没有中签费用明细，使用原来的计算方式
        const buyFeeRatio = sellShares / this.data.stockInfo.winningShares
        buyFees = (serviceFee + packageFee) * buyFeeRatio
      }
      
      // 总手续费就是卖出费用明细里的总费用
      const totalFees = buyFees + parseFloat(feeDetails.totalFee)
      console.log('中签总费用 = ' + (this.data.stockInfo.winningFeeDetails ? this.data.stockInfo.winningFeeDetails.totalFee : '未保存') + '    buyFees = ' + buyFees + '    sellFees = ' + feeDetails.totalFee)
      
      // 净盈亏 = 卖出金额 - 成本金额 - 买入费用 - 卖出费用
      const profit = sellAmount - costAmount - buyFees - totalFees
      
      // 收益率
      const profitRate = costAmount > 0 ? ((profit / costAmount) * 100).toFixed(2) : 0

      this.setData({
        sellAmount: sellAmount.toFixed(2),
        costAmount: costAmount.toFixed(2),
        buyFees: buyFees.toFixed(2),
        totalFees: totalFees.toFixed(2),
        profit: profit.toFixed(2),
        profitRate: profitRate,
        feeDetails: feeDetails
      })
      
      console.log('=== 卖出计算调试信息 ===')
      console.log('输入参数:', { sellPrice, sellShares, issuePrice, serviceFee, packageFee })
      console.log('中签费用明细:', this.data.stockInfo.winningFeeDetails)
      console.log('卖出费用明细:', feeDetails)
      console.log('计算结果:', {
        sellAmount: sellAmount.toFixed(2),
        costAmount: costAmount.toFixed(2),
        buyFees: buyFees.toFixed(2),
        totalFees: totalFees.toFixed(2),
        profit: profit.toFixed(2),
        profitRate: profitRate,
        note: '买入费用来自中签页面的总费用'
      })
    } else {
      // 重置计算结果
      this.setData({
        sellAmount: '0.00',
        costAmount: '0.00',
        totalFees: '0.00',
        profit: 0,
        profitRate: 0,
        feeDetails: {
          commission: '75.00',
          stampDuty: '0.00',
          tradingLevy: '0.00',
          tradingFee: '0.00',
          settlementFee: '0.00',
          totalFee: '0.00'
        }
      })
    }
  },

  // 计算卖出费用
  calculateSellFees(sellShares, sellPrice) {
    // 卖出金额作为费用计算基数
    const baseAmount = sellShares * sellPrice
    
    // 各项费用计算（使用精确计算避免浮点数问题）
    const commission = 75.00  // 佣金固定75元
    const stampDuty = Math.round(baseAmount * 0.001 * 100) / 100  // 印花税 0.1%
    const tradingLevy = Math.round(baseAmount * 0.0000285 * 100) / 100  // 交易徵费 0.00285%
    const tradingFee = Math.round(baseAmount * 0.0000565 * 100) / 100  // 交易费 0.00565%
    
    // 结算费 0.002%，最低3元
    let settlementFee = Math.round(baseAmount * 0.00002 * 100) / 100  // 0.002%
    if (settlementFee < 3.00) {
      settlementFee = 3.00
    }
    
    // 总费用 = 印花税 + 交易徵费 + 交易费 + 结算费 + 佣金
    const totalFee = Math.round((stampDuty + tradingLevy + tradingFee + settlementFee + commission) * 100) / 100
    
    return {
      commission: commission.toFixed(2),
      stampDuty: stampDuty.toFixed(2),
      tradingLevy: tradingLevy.toFixed(2),
      tradingFee: tradingFee.toFixed(2),
      settlementFee: settlementFee.toFixed(2),
      totalFee: totalFee.toFixed(2)
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

    // 使用卖出日期+固定时间 12:00
    const sellDateTime = new Date(`${this.data.formData.sellDate} 12:00`)
    
    this.saveSellRecord({
      sellPrice: sellPrice,
      sellShares: sellShares,
      sellTime: sellDateTime.getTime(),
      profit: parseFloat(this.data.profit),
      feeDetails: this.data.feeDetails
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
        sellTime: sellData.sellTime,
        profit: sellData.profit,
        sellFeeDetails: sellData.feeDetails
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
