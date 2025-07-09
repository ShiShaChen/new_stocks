// pages/add-stock/add-stock.js
Page({
  data: {
    isEdit: false,
    readonly: false,
    stockId: null,
    formData: {
      stockName: '',
      costPrice: '',
      subscriptionHands: '',
      serviceFee: '0',
      extraCost: '0',
      isFinancing: false,
      totalAmount: '',
      status: 'ongoing',
      winningShares: 0,
      sellPrice: 0,
      profit: 0,
      createTime: null,
      winningTime: null,
      sellTime: null
    }
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: options.id ? '编辑打新记录' : '新增打新记录'
    })

    if (options.id) {
      this.setData({
        isEdit: true,
        stockId: options.id,
        readonly: options.readonly === 'true'
      })
      this.loadStockData(options.id)
    }
  },

  loadStockData(id) {
    const stocks = wx.getStorageSync('stocks') || []
    const stock = stocks.find(item => item.id === id)
    
    if (stock) {
      // 格式化时间显示
      const formData = { ...stock }
      if (formData.winningTime) {
        formData.winningTimeStr = this.formatDateTime(formData.winningTime)
      }
      if (formData.sellTime) {
        formData.sellTimeStr = this.formatDateTime(formData.sellTime)
      }
      
      this.setData({
        formData: formData
      })
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

  onSubmit(e) {
    const formData = e.detail.value
    
    // 验证必填字段
    if (!formData.stockName || !formData.costPrice || !formData.subscriptionHands || !formData.totalAmount) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none'
      })
      return
    }

    // 数据处理
    const stockData = {
      id: this.data.stockId || this.generateId(),
      stockName: formData.stockName.trim(),
      costPrice: parseFloat(formData.costPrice),
      subscriptionHands: parseInt(formData.subscriptionHands),
      serviceFee: parseFloat(formData.serviceFee) || 0,
      extraCost: parseFloat(formData.extraCost) || 0,
      isFinancing: formData.isFinancing,
      totalAmount: parseFloat(formData.totalAmount),
      status: formData.status || 'ongoing',
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

    // 重新计算盈亏
    if (stockData.sellPrice > 0 && stockData.winningShares > 0) {
      stockData.profit = this.calculateProfit(stockData)
    }

    this.saveStock(stockData)
  },

  calculateProfit(stockData) {
    const sellPrice = stockData.sellPrice
    const sellShares = stockData.sellShares || stockData.winningShares
    const costPrice = stockData.costPrice
    const serviceFee = stockData.serviceFee
    const extraCost = stockData.extraCost
    const sellFee = stockData.sellFee || 0
    const otherFee = stockData.otherFee || 0

    if (sellPrice > 0 && sellShares > 0) {
      // 卖出金额
      const sellAmount = sellPrice * sellShares
      // 成本金额
      const costAmount = costPrice * sellShares
      // 总手续费（按比例计算）
      const buyFeeRatio = sellShares / stockData.winningShares
      const totalFees = (serviceFee + extraCost) * buyFeeRatio + sellFee + otherFee
      // 净盈亏
      return parseFloat((sellAmount - costAmount - totalFees).toFixed(2))
    }
    return 0
  },

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  },

  saveStock(stockData) {
    console.log('保存股票数据:', stockData)
    console.log('是否编辑模式:', this.data.isEdit)
    console.log('当前stockId:', this.data.stockId)
    
    let stocks = wx.getStorageSync('stocks') || []
    console.log('保存前的stocks数据:', stocks)
    
    if (this.data.isEdit) {
      // 更新现有记录
      const index = stocks.findIndex(item => item.id === this.data.stockId)
      console.log('找到的记录index:', index)
      
      if (index !== -1) {
        const oldStock = stocks[index]
        console.log('修改前的股票数据:', oldStock)
        
        stocks[index] = stockData
        
        console.log('修改后的股票数据:', stocks[index])
      } else {
        console.log('错误：未找到要更新的记录')
      }
    } else {
      // 新增记录
      console.log('新增股票记录')
      stocks.push(stockData)
    }

    wx.setStorageSync('stocks', stocks)
    console.log('数据已保存到本地存储')
    
    // 验证保存
    const savedStocks = wx.getStorageSync('stocks') || []
    if (this.data.isEdit) {
      const savedStock = savedStocks.find(item => item.id === this.data.stockId)
      console.log('验证保存结果:', savedStock)
    } else {
      console.log('验证保存结果 - 总记录数:', savedStocks.length)
    }
    
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
