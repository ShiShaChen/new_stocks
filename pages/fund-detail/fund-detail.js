// pages/fund-detail/fund-detail.js
const { fundManager } = require('../../utils/fundManager')

Page({
  data: {
    // 页面参数
    accountId: '',
    currentAccount: null,
    
    // 资金数据
    accountFunds: null,
    fundRecords: [],
    businessTransactions: [],
    
    // 筛选条件
    filterType: 'all', // all, deposit, withdraw, business
    filterCurrency: 'all', // all, HKD
    filterStatus: 'all', // all, pending, completed, failed
    dateRange: 'all', // all, week, month, quarter, year
    
    // 筛选选项
    typeOptions: [
      { value: 'all', label: '全部类型' },
      { value: 'deposit', label: '资金转入' },
      { value: 'withdraw', label: '资金转出' },
      { value: 'business', label: '业务交易' }
    ],
    
    currencyOptions: [
      { value: 'all', label: '全部币种' },
      { value: 'HKD', label: '港币' }
    ],
    
    statusOptions: [
      { value: 'all', label: '全部状态' },
      { value: 'completed', label: '已完成' }
    ],
    
    dateOptions: [
      { value: 'all', label: '全部时间' },
      { value: 'week', label: '最近一周' },
      { value: 'month', label: '最近一月' },
      { value: 'quarter', label: '最近三月' },
      { value: 'year', label: '最近一年' }
    ],
    
    // UI状态
    showFilterModal: false,
    showDescriptionModal: false,
    currentDescription: '',
    isLoading: false,
    
    // 分页
    pageSize: 20,
    currentPage: 1,
    hasMore: true
  },

  onLoad(options) {
    const { accountId } = options
    if (accountId) {
      this.setData({ accountId })
      this.loadAccountInfo()
      this.loadAccountFunds()
      this.loadRecords()
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      wx.navigateBack()
    }
  },

  onShow() {
    // 检查资金数据是否更新
    const fundsChanged = wx.getStorageSync('fundsChanged')
    if (fundsChanged) {
      wx.removeStorageSync('fundsChanged')
      this.loadAccountFunds()
      this.loadRecords()
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      currentPage: 1,
      hasMore: true
    })
    this.loadAccountFunds()
    this.loadRecords()
    wx.stopPullDownRefresh()
  },

  // 加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.setData({
        currentPage: this.data.currentPage + 1
      })
      this.loadRecords(true)
    }
  },

  // 加载账户信息
  loadAccountInfo() {
    const accounts = wx.getStorageSync('accounts') || []
    const account = accounts.find(acc => acc.id === this.data.accountId)
    
    if (account) {
      this.setData({
        currentAccount: account
      })
      wx.setNavigationBarTitle({
        title: `${account.name} - 资金详情`
      })
    }
  },

  // 加载账户资金
  loadAccountFunds() {
    try {
      const funds = fundManager.getAccountFunds(this.data.accountId)
      this.setData({
        accountFunds: funds
      })
    } catch (error) {
      console.error('加载账户资金失败:', error)
    }
  },

  // 加载记录
  loadRecords(append = false) {
    this.setData({ isLoading: true })
    
    try {
      // 获取资金记录
      const fundRecords = fundManager.getAccountFundRecords(this.data.accountId)
      
      // 获取业务交易记录
      const businessTransactions = fundManager.getAccountBusinessTransactions(this.data.accountId)
      
      // 合并所有记录
      let allRecords = []
      
      // 处理资金记录
      if (this.shouldIncludeType('deposit') || this.shouldIncludeType('withdraw')) {
        const filteredFundRecords = fundRecords
          .filter(record => this.shouldIncludeType(record.type))
          .map(record => ({
            ...record,
            recordType: 'fund',
            sortTime: record.timestamp,
            // 添加显示用的属性
            icon: this.getRecordIcon({...record, recordType: 'fund'}),
            typeText: this.getRecordTypeText(record.type),
            amountColorClass: this.getAmountColorClass({...record, recordType: 'fund'}),
            displayDescription: this.getDisplayDescription({...record, recordType: 'fund'}),
            formattedDateTime: this.formatDetailDateTime(record.timestamp)
          }))
        allRecords = allRecords.concat(filteredFundRecords)
      }
      
      // 处理业务交易记录
      if (this.shouldIncludeType('business')) {
        const filteredBusinessRecords = businessTransactions
          .map(record => {
            const businessRecord = {
              ...record,
              recordType: 'business',
              sortTime: record.timestamp,
              // 统一格式
              type: this.getBusinessTypeLabel(record.type),
              amount: Math.abs(record.amount),
              status: 'completed'
            }
            return {
              ...businessRecord,
              // 添加显示用的属性
              icon: this.getRecordIcon(businessRecord),
              typeText: this.getRecordTypeText(businessRecord.type),
              amountColorClass: this.getAmountColorClass(businessRecord),
              displayDescription: this.getDisplayDescription(businessRecord),
              formattedDateTime: this.formatDetailDateTime(businessRecord.timestamp)
            }
          })
        allRecords = allRecords.concat(filteredBusinessRecords)
      }
      
      // 应用筛选条件
      allRecords = this.applyFilters(allRecords)
      
      // 按时间倒序排列
      allRecords.sort((a, b) => b.sortTime - a.sortTime)
      
      // 分页处理
      const startIndex = append ? (this.data.currentPage - 1) * this.data.pageSize : 0
      const endIndex = this.data.currentPage * this.data.pageSize
      const pageRecords = allRecords.slice(startIndex, endIndex)
      
      const hasMore = endIndex < allRecords.length
      
      if (append) {
        this.setData({
          fundRecords: [...this.data.fundRecords, ...pageRecords],
          hasMore: hasMore
        })
      } else {
        this.setData({
          fundRecords: pageRecords,
          hasMore: hasMore,
          currentPage: 1
        })
      }
      
    } catch (error) {
      console.error('加载记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 应用筛选条件
  applyFilters(records) {
    return records.filter(record => {
      // 币种筛选
      if (this.data.filterCurrency !== 'all' && record.currency !== this.data.filterCurrency) {
        return false
      }
      
      // 状态筛选
      if (this.data.filterStatus !== 'all' && record.status !== this.data.filterStatus) {
        return false
      }
      
      // 时间筛选
      if (!this.isInDateRange(record.sortTime)) {
        return false
      }
      
      return true
    })
  },

  // 检查类型是否应该包含
  shouldIncludeType(type) {
    if (this.data.filterType === 'all') return true
    if (this.data.filterType === 'business') return type !== 'deposit' && type !== 'withdraw'
    return this.data.filterType === type
  },

  // 检查时间是否在范围内
  isInDateRange(timestamp) {
    if (this.data.dateRange === 'all') return true
    
    const now = Date.now()
    const recordTime = new Date(timestamp).getTime()
    
    switch (this.data.dateRange) {
      case 'week':
        return now - recordTime <= 7 * 24 * 60 * 60 * 1000
      case 'month':
        return now - recordTime <= 30 * 24 * 60 * 60 * 1000
      case 'quarter':
        return now - recordTime <= 90 * 24 * 60 * 60 * 1000
      case 'year':
        return now - recordTime <= 365 * 24 * 60 * 60 * 1000
      default:
        return true
    }
  },

  // 获取业务类型标签
  getBusinessTypeLabel(type) {
    const typeMap = {
      'subscribe': '打新申购',
      'allot': '中签扣款',
      'sell': '卖出收入'
    }
    return typeMap[type] || type
  },

  // 显示筛选弹窗
  showFilterModal() {
    this.setData({
      showFilterModal: true
    })
  },

  // 关闭筛选弹窗
  closeFilterModal() {
    this.setData({
      showFilterModal: false
    })
  },

  // 筛选条件改变
  onFilterChange(e) {
    const { field, value } = e.currentTarget.dataset
    
    this.setData({
      [field]: value
    })
  },

  // 应用筛选
  applyFilter() {
    this.setData({
      showFilterModal: false,
      currentPage: 1,
      hasMore: true
    })
    this.loadRecords()
  },

  // 重置筛选
  resetFilter() {
    this.setData({
      filterType: 'all',
      filterCurrency: 'all',
      filterStatus: 'all',
      dateRange: 'all',
      showFilterModal: false,
      currentPage: 1,
      hasMore: true
    })
    this.loadRecords()
  },

  // 编辑记录
  onEditRecord(e) {
    const record = e.currentTarget.dataset.record
    if (record.recordType === 'fund') {
      wx.navigateTo({
        url: `/pages/fund-record/fund-record?id=${record.id}`
      })
    }
  },

  // 删除记录
  onDeleteRecord(e) {
    const record = e.currentTarget.dataset.record
    
    if (record.recordType !== 'fund') {
      wx.showToast({
        title: '业务记录不可删除',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条${this.getRecordTypeText(record.type)}记录吗？`,
      success: (res) => {
        if (res.confirm) {
          try {
            fundManager.deleteFundRecord(record.id)
            this.loadAccountFunds()
            this.loadRecords()
            
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

  // 获取记录图标
  getRecordIcon(item) {
    if (item.recordType === 'business') {
      return '🏢'
    }
    return item.type === 'deposit' ? '💰' : '💸'
  },

  // 获取记录类型文本
  getRecordTypeText(type) {
    const typeMap = {
      'deposit': '资金转入',
      'withdraw': '资金转出'
    }
    return typeMap[type] || '未知类型'
  },

  // 获取金额颜色样式类
  getAmountColorClass(item) {
    if (item.recordType === 'business') {
      return 'business'
    }
    return item.type === 'deposit' ? 'positive' : 'negative'
  },

  // 格式化详情页面的日期时间显示
  formatDetailDateTime(timestamp) {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    
    // 判断是否为今天
    if (recordDate.getTime() === today.getTime()) {
      return `今天 ${hour}:${minute}`
    }
    
    // 判断是否为昨天
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (recordDate.getTime() === yesterday.getTime()) {
      return `昨天 ${hour}:${minute}`
    }
    
    // 判断是否为今年
    if (date.getFullYear() === now.getFullYear()) {
      return `${month}月${day}日 ${hour}:${minute}`
    }
    
    // 其他情况显示完整日期
    return `${year}年${month}月${day}日 ${hour}:${minute}`
  },

  // 获取显示描述（空备注时根据类型显示默认文本）
  getDisplayDescription(item) {
    if (item.description) {
      return this.getShortDescription(item.description)
    }
    
    // 空备注时根据类型显示默认文本
    if (item.recordType === 'fund') {
      return item.type === 'deposit' ? '入金' : '出金'
    }
    
    return ''
  },

  // 获取简短描述（超过20个字符则截断）
  getShortDescription(description) {
    if (!description) return ''
    if (description.length <= 20) return description
    return description.substring(0, 20)
  },

  // 显示备注详情弹框
  showDescriptionModal(e) {
    const description = e.currentTarget.dataset.description
    this.setData({
      showDescriptionModal: true,
      currentDescription: description || ''
    })
  },

  // 隐藏备注详情弹框
  hideDescriptionModal() {
    this.setData({
      showDescriptionModal: false,
      currentDescription: ''
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击弹框内容时关闭弹框
  },

  // 智能时间格式化函数
  formatSmartDate(timestamp) {
    if (!timestamp) return ''
    
    const now = Date.now()
    const diff = now - new Date(timestamp).getTime()
    
    // 小于1分钟
    if (diff < 1 * 60 * 1000) {
      return '刚刚'
    }
    // 小于1小时
    else if (diff < 1 * 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return `${minutes}分钟前`
    }
    // 小于1天
    else if (diff < 1 * 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours}小时前`
    }
    // 大于等于1天，显示日期
    else {
      const date = new Date(timestamp)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
})