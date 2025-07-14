// utils/fundManager.js - 资金管理工具类
class FundManager {
  constructor() {
    this.storageKeys = {
      fundRecords: 'fundRecords',
      accountFunds: 'accountFunds',
      businessTransactions: 'businessTransactions'
    }
  }

  // 获取所有资金记录
  getAllFundRecords() {
    return wx.getStorageSync(this.storageKeys.fundRecords) || []
  }

  // 获取指定账户的资金记录
  getAccountFundRecords(accountId) {
    const allRecords = this.getAllFundRecords()
    return allRecords.filter(record => record.accountId === accountId)
  }

  // 添加资金记录
  addFundRecord(record) {
    const records = this.getAllFundRecords()
    const newRecord = {
      id: this.generateRecordId(),
      ...record,
      createTime: Date.now(),
      timestamp: new Date(record.datetime).getTime()
    }
    
    records.push(newRecord)
    wx.setStorageSync(this.storageKeys.fundRecords, records)
    
    // 更新账户资金状态
    this.updateAccountFunds(record.accountId)
    
    return newRecord
  }

  // 删除资金记录
  deleteFundRecord(recordId) {
    const records = this.getAllFundRecords()
    const recordIndex = records.findIndex(r => r.id === recordId)
    
    if (recordIndex === -1) {
      throw new Error('记录不存在')
    }
    
    const record = records[recordIndex]
    records.splice(recordIndex, 1)
    wx.setStorageSync(this.storageKeys.fundRecords, records)
    
    // 更新账户资金状态
    this.updateAccountFunds(record.accountId)
    
    return true
  }

  // 更新资金记录
  updateFundRecord(recordId, updates) {
    const records = this.getAllFundRecords()
    const recordIndex = records.findIndex(r => r.id === recordId)
    
    if (recordIndex === -1) {
      throw new Error('记录不存在')
    }
    
    records[recordIndex] = {
      ...records[recordIndex],
      ...updates,
      updateTime: Date.now()
    }
    
    wx.setStorageSync(this.storageKeys.fundRecords, records)
    
    // 更新账户资金状态
    this.updateAccountFunds(records[recordIndex].accountId)
    
    return records[recordIndex]
  }

  // 获取账户资金状态
  getAccountFunds(accountId) {
    const allFunds = wx.getStorageSync(this.storageKeys.accountFunds) || {}
    return allFunds[accountId] || {
      accountId: accountId,
      balances: { HKD: 0 },
      totalDeposit: { HKD: 0 },
      totalWithdraw: { HKD: 0 },
      lastUpdateTime: Date.now()
    }
  }

  // 更新账户资金状态
  updateAccountFunds(accountId) {
    const records = this.getAccountFundRecords(accountId)
    const funds = {
      accountId: accountId,
      balances: { HKD: 0 },
      totalDeposit: { HKD: 0 },
      totalWithdraw: { HKD: 0 },
      lastUpdateTime: Date.now()
    }

    // 计算存取款总额（只处理已完成的记录）
    records.forEach(record => {
      if (record.status === 'completed') {
        if (record.type === 'deposit') {
          funds.totalDeposit.HKD += record.amount
          funds.balances.HKD += record.amount
        } else if (record.type === 'withdraw') {
          funds.totalWithdraw.HKD += record.amount
          funds.balances.HKD -= record.amount
        }
      }
    })

    // 处理业务交易影响（只处理港币）
    const businessTransactions = this.getAccountBusinessTransactions(accountId)
    businessTransactions.forEach(transaction => {
      if (transaction.type === 'subscribe') {
        // 打新申购直接扣除资金（不再使用冻结）
        funds.balances.HKD -= transaction.amount
        funds.balances.HKD -= (transaction.fees || 0)
      } else if (transaction.type === 'allot') {
        // 中签扣款（只扣港币）
        funds.balances.HKD -= transaction.amount
        funds.balances.HKD -= (transaction.fees || 0)
      } else if (transaction.type === 'sell') {
        // 卖出增加资金（含盈亏，只处理港币）
        funds.balances.HKD += transaction.amount
        funds.balances.HKD += (transaction.profitLoss || 0)
        funds.balances.HKD -= (transaction.fees || 0)
      }
    })

    // 保存更新后的资金状态
    const allFunds = wx.getStorageSync(this.storageKeys.accountFunds) || {}
    allFunds[accountId] = funds
    wx.setStorageSync(this.storageKeys.accountFunds, allFunds)

    return funds
  }

  // 获取账户业务交易记录
  getAccountBusinessTransactions(accountId) {
    const allTransactions = wx.getStorageSync(this.storageKeys.businessTransactions) || []
    return allTransactions.filter(trans => trans.accountId === accountId)
  }

  // 添加业务交易记录
  addBusinessTransaction(transaction) {
    const transactions = wx.getStorageSync(this.storageKeys.businessTransactions) || []
    const newTransaction = {
      id: this.generateTransactionId(),
      ...transaction,
      createTime: Date.now(),
      timestamp: new Date(transaction.datetime).getTime()
    }
    
    transactions.push(newTransaction)
    wx.setStorageSync(this.storageKeys.businessTransactions, transactions)
    
    // 更新账户资金状态
    this.updateAccountFunds(transaction.accountId)
    
    return newTransaction
  }

  // 获取所有账户资金汇总
  getAllAccountsFundsSummary() {
    const accounts = wx.getStorageSync('accounts') || []
    const summary = {
      totalBalances: { HKD: 0 },
      totalDeposit: { HKD: 0 },
      totalWithdraw: { HKD: 0 },
      accountDetails: []
    }

    accounts.forEach(account => {
      const funds = this.getAccountFunds(account.id)
      
      // 累计总额（只处理港币）
      summary.totalBalances.HKD += funds.balances.HKD
      summary.totalDeposit.HKD += funds.totalDeposit.HKD
      summary.totalWithdraw.HKD += funds.totalWithdraw.HKD

      // 账户详情
      summary.accountDetails.push({
        account: account,
        funds: funds
      })
    })

    return summary
  }

  // 生成记录ID
  generateRecordId() {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.getTime().toString().slice(-4)
    return `fund_${dateStr}_${timeStr}`
  }

  // 生成交易ID
  generateTransactionId() {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.getTime().toString().slice(-4)
    return `trans_${dateStr}_${timeStr}`
  }

  // 格式化金额
  formatAmount(amount, currency = 'HKD') {
    const symbols = { HKD: 'HK$', CNY: '¥' }
    return `${symbols[currency]}${amount.toLocaleString()}`
  }

  // 格式化日期时间
  formatDateTime(datetime) {
    return new Date(datetime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 验证资金操作
  validateFundOperation(accountId, amount, currency, type) {
    if (type === 'withdraw') {
      const funds = this.getAccountFunds(accountId)
      const availableAmount = funds.balances[currency] - funds.frozenAmount[currency]
      
      if (amount > availableAmount) {
        throw new Error(`可用余额不足，当前可用：${this.formatAmount(availableAmount, currency)}`)
      }
    }
    
    if (amount <= 0) {
      throw new Error('金额必须大于0')
    }
    
    return true
  }
}

// 创建全局实例
const fundManager = new FundManager()

module.exports = {
  FundManager,
  fundManager
}
