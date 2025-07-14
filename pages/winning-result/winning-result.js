// pages/winning-result/winning-result.js
const { FundManager } = require('../../utils/fundManager.js')

Page({
  data: {
    stockId: '',
    stockInfo: {},
    maxWinningShares: 0,
    formData: {
      winningShares: '',
      winningDate: ''
    },
    calculatedAmount: '0.00',
    winningRate: '0.00',
    feeDetails: {
      brokerageCommission: '0.00', // 经纪佣金
      tradingFee: '0.00',       // 香港联交所交易费
      tradingLevy: '0.00',      // 证监会交易会费
      afrcLevy: '0.00',         // 会财局交易会费
      packageFee: '0.00',       // 打新套餐费用
      totalFee: '0.00'          // 总费用
    },
    fundManager: null
  },

  onLoad(options) {
    // 初始化资金管理器
    this.setData({
      fundManager: new FundManager()
    })
    console.log('winning-result页面加载，参数:', options)
    
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
      'formData.winningDate': currentDate
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
      console.log('=======' + stock.winningShares)
      if (stock.winningShares > 0) {
        const winningTime = new Date(stock.winningTime)
        this.setData({
          'formData.winningShares': stock.winningShares.toString(),
          'formData.winningDate': this.formatDate(winningTime)
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
    console.log('中签股数输入变化:', e.detail.value)
    const value = parseInt(e.detail.value) || 0
    const maxShares = this.data.maxWinningShares
    
    if (value > maxShares) {
      wx.showToast({
        title: `中签股数不能超过${maxShares}股`,
        icon: 'none'
      })
      // 不return，允许用户继续输入，只是给出提示
    }

    this.setData({
      'formData.winningShares': e.detail.value // 保持原始输入值
    })
    
    // 实时计算结果
    this.calculateResult()
  },

  // 输入框获取焦点时的处理
  onInputFocus(e) {
    console.log('输入框获取焦点')
    // 在真机上，有时需要延迟处理来确保焦点正确设置
    setTimeout(() => {
      // 这里可以添加一些额外的处理逻辑
      console.log('输入框焦点设置完成')
    }, 100)
  },

  // 输入框失去焦点时的处理
  onInputBlur(e) {
    console.log('输入框失去焦点')
    // 验证输入值
    const value = parseInt(e.detail.value) || 0
    const maxShares = this.data.maxWinningShares
    
    if (value > maxShares) {
      wx.showModal({
        title: '输入错误',
        content: `中签股数不能超过申购股数${maxShares}股，请重新输入`,
        showCancel: false,
        success: () => {
          // 清空输入或设置为最大值
          this.setData({
            'formData.winningShares': ''
          })
        }
      })
    }
  },

  onDateChange(e) {
    this.setData({
      'formData.winningDate': e.detail.value
    })
  },

  calculateResult() {
    const winningShares = parseInt(this.data.formData.winningShares) || 0
    const issuePrice = this.data.stockInfo.issuePrice || 0
    const subscriptionHands = this.data.stockInfo.subscriptionHands || 0
    const packageFee = this.data.stockInfo.packageFee || 0
    
    if (winningShares > 0 && issuePrice > 0) {
      // 计算中签金额
      const calculatedAmount = (winningShares * issuePrice).toFixed(2)
      
      // 计算中签率
      const isHKStock = this.isHKStock(this.data.stockInfo.stockName)
      const totalShares = isHKStock ? subscriptionHands * 100 : subscriptionHands
      const winningRate = totalShares > 0 ? ((winningShares / totalShares) * 100).toFixed(2) : '0.00'
      
      // 计算各项费用
      const feeDetails = this.calculateFees(winningShares, issuePrice, packageFee)
      
      this.setData({
        calculatedAmount: calculatedAmount,
        winningRate: winningRate,
        feeDetails: feeDetails
      })
      
      console.log('费用计算结果:', {
        winningShares: winningShares,
        issuePrice: issuePrice,
        calculatedAmount: calculatedAmount,
        feeDetails: feeDetails
      })
    } else {
      // 重置费用明细
      this.setData({
        calculatedAmount: '0.00',
        winningRate: '0.00',
        feeDetails: {
          brokerageCommission: '0.00',
          tradingFee: '0.00',
          tradingLevy: '0.00',
          afrcLevy: '0.00',
          packageFee: '0.00',
          totalFee: '0.00'
        }
      })
    }
  },

  // 计算各项费用
  calculateFees(winningShares, issuePrice, packageFee) {
    // 中签金额作为费用计算基数
    const baseAmount = winningShares * issuePrice
    
    // 各项费用计算（使用精确计算避免浮点数问题）
    const brokerageCommission = Math.round(baseAmount * 0.01 * 100) / 100  // 经纪佣金 1%
    const tradingFee = Math.round(baseAmount * 0.0000565 * 100) / 100  // 香港联交所交易费 0.00565%
    const tradingLevy = Math.round(baseAmount * 0.000027 * 100) / 100  // 证监会交易会费 0.0027%
    const afrcLevy = Math.round(baseAmount * 0.0000015 * 100) / 100  // 会财局交易会费 0.00015%
    
    // 总费用（移除印花税）
    const totalFee = Math.round((brokerageCommission + tradingFee + tradingLevy + afrcLevy + packageFee) * 100) / 100
    
    return {
      brokerageCommission: brokerageCommission.toFixed(2),
      tradingFee: tradingFee.toFixed(2),
      tradingLevy: tradingLevy.toFixed(2),
      afrcLevy: afrcLevy.toFixed(2),
      packageFee: packageFee.toFixed(2),
      totalFee: totalFee.toFixed(2)
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

    // 使用中签日期+固定时间 10:00（中签在卖出之前）
    const winningDateTime = new Date(`${this.data.formData.winningDate} 10:00`)
    
    this.saveWinningResult({
      winningShares: winningShares,
      winningTime: winningDateTime.getTime(),
      winningFeeDetails: this.data.feeDetails
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
      
      // 计算中签金额和费用
      const winningAmount = Math.round(winningData.winningShares * oldStock.issuePrice * 100) / 100
      const totalFees = parseFloat(winningData.winningFeeDetails.totalFee)
      const totalCost = Math.round((winningAmount + totalFees) * 100) / 100
      
      // 检查是否为修改操作（之前已有中签记录）
      const isModification = oldStock.winningShares > 0
      
      // 处理资金流水和账户余额
      if (this.data.fundManager && oldStock.accountId) {
        try {
          if (isModification) {
            // 修改操作：先回滚之前的费用，再扣除新费用
            const oldWinningAmount = Math.round(oldStock.winningShares * oldStock.issuePrice * 100) / 100
            const oldTotalFees = oldStock.winningFeeDetails ? parseFloat(oldStock.winningFeeDetails.totalFee) : 0
            
            // 回滚之前的申购金额
            this.data.fundManager.addBusinessTransaction({
              accountId: oldStock.accountId,
              type: 'allot_refund',
              stockId: this.data.stockId,
              stockName: oldStock.stockName,
              amount: oldWinningAmount,
              fees: 0,
              description: `修改中签结果-回滚申购金额 ${oldStock.stockName}`,
              datetime: new Date().toISOString()
            })
            
            // 回滚之前的手续费
            if (oldTotalFees > 0) {
              this.data.fundManager.addBusinessTransaction({
                accountId: oldStock.accountId,
                type: 'fee_refund',
                stockId: this.data.stockId,
                stockName: oldStock.stockName,
                amount: oldTotalFees,
                fees: 0,
                description: `修改中签结果-回滚手续费 ${oldStock.stockName}`,
                datetime: new Date().toISOString()
              })
            }
            
            // 扣除新的申购金额（使用当前时间戳，但保存业务日期用于显示）
            this.data.fundManager.addBusinessTransaction({
              accountId: oldStock.accountId,
              type: 'allot',
              stockId: this.data.stockId,
              stockName: oldStock.stockName,
              amount: winningAmount,
              fees: 0,
              description: `中签申购金额 ${oldStock.stockName} ${winningData.winningShares}股`,
              datetime: new Date().toISOString(), // 使用当前时间戳
              businessDate: new Date(winningData.winningTime).toISOString() // 保存业务日期用于显示
            })
            
            // 扣除新的手续费（时间稍微延后100ms，确保显示顺序）
            if (totalFees > 0) {
              this.data.fundManager.addBusinessTransaction({
                accountId: oldStock.accountId,
                type: 'fee_deduction',
                stockId: this.data.stockId,
                stockName: oldStock.stockName,
                amount: totalFees,
                fees: 0,
                description: `中签手续费 ${oldStock.stockName} ${winningData.winningShares}股`,
                datetime: new Date(Date.now() + 100).toISOString(), // 当前时间+100ms
                businessDate: new Date(winningData.winningTime).toISOString() // 保存业务日期用于显示
              })
            }
          } else {
            // 新增操作：分别记录申购金额和手续费（使用当前时间戳）
            this.data.fundManager.addBusinessTransaction({
              accountId: oldStock.accountId,
              type: 'allot',
              stockId: this.data.stockId,
              stockName: oldStock.stockName,
              amount: winningAmount,
              fees: 0,
              description: `中签申购金额 ${oldStock.stockName} ${winningData.winningShares}股`,
              datetime: new Date().toISOString(), // 使用当前时间戳
              businessDate: new Date(winningData.winningTime).toISOString() // 保存业务日期用于显示
            })
            
            if (totalFees > 0) {
              this.data.fundManager.addBusinessTransaction({
                accountId: oldStock.accountId,
                type: 'fee_deduction',
                stockId: this.data.stockId,
                stockName: oldStock.stockName,
                amount: totalFees,
                fees: 0,
                description: `中签手续费 ${oldStock.stockName} ${winningData.winningShares}股`,
                datetime: new Date(Date.now() + 100).toISOString(), // 当前时间+100ms
                businessDate: new Date(winningData.winningTime).toISOString() // 保存业务日期用于显示
              })
            }
          }
        } catch (error) {
          console.error('处理资金流水失败:', error)
          wx.showModal({
            title: '警告',
            content: '中签结果已保存，但资金流水处理失败，请检查账户余额',
            showCancel: false
          })
        }
      }
      
      stocks[stockIndex] = {
        ...stocks[stockIndex],
        winningShares: winningData.winningShares,
        winningTime: winningData.winningTime,
        winningFeeDetails: winningData.winningFeeDetails
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
