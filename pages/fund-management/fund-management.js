// pages/fund-management/fund-management.js
const { fundManager } = require('../../utils/fundManager')

Page({
  data: {
    currentAccount: null,
    accountFunds: null,
    fundsSummary: null,
    recentRecords: [],
    accountList: [],
    showAccountSelect: false
  },

  onLoad() {
    this.loadCurrentAccount()
    this.loadAccountList()
    this.loadAccountFunds()
    this.loadFundsSummary()
    this.loadRecentRecords()
  },

  onShow() {
    console.log('资金管理页面显示，开始刷新数据')
    
    // 检查是否有账户切换
    const accountChanged = wx.getStorageSync('accountChanged')
    if (accountChanged) {
      wx.removeStorageSync('accountChanged')
      console.log('检测到账户切换，刷新账户相关数据')
      this.loadCurrentAccount()
      this.loadAccountFunds()
      this.loadRecentRecords()
    }
    
    // 检查是否有资金记录更新
    const fundsChanged = wx.getStorageSync('fundsChanged')
    if (fundsChanged) {
      wx.removeStorageSync('fundsChanged')
      console.log('检测到资金变更，刷新所有数据')
    }
    
    // 始终刷新数据以确保最新
    this.loadAccountFunds()
    this.loadFundsSummary()
    this.loadRecentRecords()
    
    // 延迟再次刷新，确保数据同步
    setTimeout(() => {
      this.loadRecentRecords()
    }, 300)
  },

  // 加载当前账户
  loadCurrentAccount() {
    const currentAccountId = wx.getStorageSync('currentAccountId') || 'default'
    const accounts = wx.getStorageSync('accounts') || []
    const currentAccount = accounts.find(acc => acc.id === currentAccountId) || accounts[0]
    
    this.setData({
      currentAccount: currentAccount
    })
  },

  // 加载账户列表
  loadAccountList() {
    const accounts = wx.getStorageSync('accounts') || []
    this.setData({
      accountList: accounts
    })
  },

  // 加载账户资金
  loadAccountFunds() {
    if (this.data.currentAccount) {
      try {
        const funds = fundManager.getAccountFunds(this.data.currentAccount.id)
        this.setData({
          accountFunds: funds
        })
      } catch (error) {
        console.error('加载账户资金失败:', error)
        wx.showToast({
          title: '加载资金信息失败',
          icon: 'error'
        })
      }
    }
  },

  // 加载资金汇总
  loadFundsSummary() {
    try {
      const summary = fundManager.getAllAccountsFundsSummary()
      this.setData({
        fundsSummary: summary
      })
    } catch (error) {
      console.error('加载资金汇总失败:', error)
    }
  },

  // 加载最近记录
  loadRecentRecords() {
    if (this.data.currentAccount) {
      try {
        const allRecords = fundManager.getAccountFundRecords(this.data.currentAccount.id)
        console.log('资金管理-加载资金记录:', allRecords.length, '条记录')
        
        // 按时间倒序排列（最新的在前面），取最近5条
        // 如果时间相同，则按创建时间倒序，再按ID倒序确保稳定排序
        const recentRecords = allRecords
          .sort((a, b) => {
            // 首先按业务时间倒序
            if (b.timestamp !== a.timestamp) {
              return b.timestamp - a.timestamp
            }
            // 时间相同时，按创建时间倒序
            if (b.createTime !== a.createTime) {
              return b.createTime - a.createTime
            }
            // 创建时间也相同时，按ID倒序
            return b.id > a.id ? 1 : -1
          })
          .slice(0, 5)
        
        console.log('资金管理-显示最近记录:', recentRecords.length, '条')
        
        this.setData({
          recentRecords: recentRecords
        })
      } catch (error) {
        console.error('加载最近记录失败:', error)
      }
    }
  },

  // 切换账户
  onSwitchAccount() {
    this.setData({
      showAccountSelect: true
    })
  },

  // 关闭账户选择
  onCloseAccountSelect() {
    this.setData({
      showAccountSelect: false
    })
  },

  // 选择账户
  onSelectAccount(e) {
    const account = e.currentTarget.dataset.account
    
    // 保存当前选中的账户
    wx.setStorageSync('currentAccountId', account.id)
    
    this.setData({
      currentAccount: account,
      showAccountSelect: false
    })
    
    // 重新加载数据
    this.loadAccountFunds()
    this.loadRecentRecords()
    
    wx.showToast({
      title: `已切换到${account.name}`,
      icon: 'success'
    })
  },

  // 资金转入
  onDeposit() {
    wx.navigateTo({
      url: '/pages/fund-record/fund-record?type=deposit'
    })
  },

  // 资金转出
  onWithdraw() {
    wx.navigateTo({
      url: '/pages/fund-record/fund-record?type=withdraw'
    })
  },

  // 查看详细记录
  onViewRecords() {
    wx.navigateTo({
      url: `/pages/fund-detail/fund-detail?accountId=${this.data.currentAccount.id}`
    })
  },

  // 编辑记录
  onEditRecord(e) {
    const record = e.currentTarget.dataset.record
    wx.navigateTo({
      url: `/pages/fund-record/fund-record?id=${record.id}`
    })
  },

  // 删除记录
  onDeleteRecord(e) {
    const record = e.currentTarget.dataset.record
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条${record.type === 'deposit' ? '转入' : '转出'}记录吗？`,
      success: (res) => {
        if (res.confirm) {
          try {
            fundManager.deleteFundRecord(record.id)
            this.loadAccountFunds()
            this.loadFundsSummary()
            this.loadRecentRecords()
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } catch (error) {
            console.error('删除记录失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 获取记录类型文本
  getRecordTypeText(type) {
    const typeMap = {
      'deposit': '资金转入',
      'withdraw': '资金转出'
    }
    return typeMap[type] || type
  },

  // 获取记录状态文本
  getRecordStatusText(status) {
    const statusMap = {
      'pending': '处理中',
      'completed': '已完成',
      'failed': '失败'
    }
    return statusMap[status] || status
  }
})
