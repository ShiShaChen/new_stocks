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
    filterStatus: 'all', // all, pending, completed
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
    console.log('资金详情页面显示，开始刷新数据')
    
    // 检查资金数据是否更新
    const fundsChanged = wx.getStorageSync('fundsChanged')
    if (fundsChanged) {
      wx.removeStorageSync('fundsChanged')
      console.log('检测到资金变更，强制刷新所有数据')
    }
    
    // 重置分页状态并刷新数据
    this.setData({
      currentPage: 1,
      hasMore: true
    })
    
    // 始终刷新数据以确保最新
    this.loadAccountFunds()
    this.loadRecords()
    
    // 延迟再次刷新，确保数据同步
    setTimeout(() => {
      this.loadRecords()
    }, 300)
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
      console.log('资金详情-加载资金记录:', fundRecords.length, '条记录')
      
      // 获取业务交易记录
      const businessTransactions = fundManager.getAccountBusinessTransactions(this.data.accountId)
      console.log('资金详情-加载业务交易记录:', businessTransactions.length, '条记录')
      
      // 调试输出：检查业务交易记录的时间戳
      businessTransactions.forEach((transaction, index) => {
        console.log(`业务交易${index}:`, {
          type: transaction.type,
          datetime: transaction.datetime,
          timestamp: transaction.timestamp,
          createTime: transaction.createTime,
          description: transaction.description
        })
      })
      
      // 合并所有记录
      let allRecords = []
      
      // 处理资金记录
      if (this.shouldIncludeType('deposit') || this.shouldIncludeType('withdraw')) {
        const filteredFundRecords = fundRecords
          .filter(record => this.shouldIncludeType(record.type))
          .map(record => ({
            ...record,
            recordType: 'fund',
            sortTime: record.timestamp || record.createTime || 0, // 确保有有效的时间戳
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
              sortTime: record.timestamp || record.createTime || 0, // 确保有有效的时间戳
              // 保留原始type用于逻辑判断，添加displayType用于显示
              originalType: record.type,
              displayType: this.getBusinessTypeLabel(record.type),
              amount: Math.abs(record.amount),
              status: 'completed'
            }
            return {
              ...businessRecord,
              // 添加显示用的属性
              icon: this.getRecordIcon(businessRecord),
              typeText: this.getRecordTypeText(businessRecord.displayType),
              amountColorClass: this.getAmountColorClass(businessRecord),
              displayDescription: this.getDisplayDescription(businessRecord),
              formattedDateTime: this.formatDetailDateTime(businessRecord.timestamp),
              // 如果有业务日期，优先显示业务日期，否则显示实际时间戳
              businessDateTime: record.businessDate ? this.formatBusinessDateTime(record.businessDate) : null
            }
          })
        allRecords = allRecords.concat(filteredBusinessRecords)
      }
      
      // 应用筛选条件
      allRecords = this.applyFilters(allRecords)
      
      // 调试输出：检查排序前的记录
      console.log('排序前的记录数量:', allRecords.length)
      allRecords.forEach((record, index) => {
        console.log(`记录${index}:`, {
          type: record.type || record.originalType,
          sortTime: record.sortTime,
          createTime: record.createTime,
          id: record.id,
          description: record.description || record.displayDescription,
          formattedTime: new Date(record.sortTime).toLocaleString()
        })
      })
      
      // 按时间倒序排列（最新的在前面）
      // 增强排序逻辑：时间戳→业务类型优先级→创建时间→记录ID→描述内容，确保即使快速录入也能保持稳定排序
      allRecords.sort((a, b) => {
        // 确保sortTime是数字类型
        const timeA = typeof a.sortTime === 'number' ? a.sortTime : parseInt(a.sortTime) || 0
        const timeB = typeof b.sortTime === 'number' ? b.sortTime : parseInt(b.sortTime) || 0
        
        // 首先按业务时间倒序
        if (timeB !== timeA) {
          return timeB - timeA
        }
        
        // 时间相同时，按业务类型优先级排序
        const typeA = a.type || a.originalType || ''
        const typeB = b.type || b.originalType || ''
        
        // 定义业务类型优先级：主交易 > 费用 > 回滚操作
        const getTypePriority = (type) => {
          if (['sell', 'allot'].includes(type)) return 1 // 主交易最优先
          if (['fee_deduction'].includes(type)) return 2 // 费用次之
          if (['allot_refund', 'fee_refund', 'sell_refund'].includes(type)) return 3 // 回滚操作最后
          return 4 // 其他类型
        }
        
        const priorityA = getTypePriority(typeA)
        const priorityB = getTypePriority(typeB)
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB // 优先级高的在前
        }
        
        // 优先级相同时，按创建时间倒序
        const createTimeA = typeof a.createTime === 'number' ? a.createTime : parseInt(a.createTime) || 0
        const createTimeB = typeof b.createTime === 'number' ? b.createTime : parseInt(b.createTime) || 0
        
        if (createTimeB !== createTimeA) {
          return createTimeB - createTimeA
        }
        
        // 创建时间也相同时，按ID倒序（字符串比较）
        const idA = a.id || ''
        const idB = b.id || ''
        const idCompare = idB.localeCompare(idA)
        
        if (idCompare !== 0) {
          return idCompare
        }
        
        // 最后按描述内容进行字典序排序，确保完全稳定的排序
        const descA = a.description || a.displayDescription || ''
        const descB = b.description || b.displayDescription || ''
        
        return descB.localeCompare(descA)
      })
      
      // 调试输出：检查排序后的记录
      console.log('排序后的记录:')
      allRecords.forEach((record, index) => {
        console.log(`排序后${index}:`, {
          type: record.type || record.originalType,
          sortTime: record.sortTime,
          formattedTime: new Date(record.sortTime).toLocaleString(),
          description: record.description || record.displayDescription
        })
      })
      
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
      'allot_refund': '中签退款',
      'fee_deduction': '手续费扣除',
      'fee_refund': '手续费退款',
      'sell': '卖出收入',
      'sell_refund': '卖出退款'
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
      // 根据具体的业务类型返回不同图标，使用originalType而不是displayType
      const typeToCheck = item.originalType || item.type
      const iconMap = {
        'subscribe': '📊',     // 打新申购
        'allot': '✅',         // 中签扣款
        'allot_refund': '↩️',  // 中签退款
        'fee_deduction': '💸', // 手续费扣除
        'fee_refund': '💰',    // 手续费退款
        'sell': '💹',          // 卖出收入
        'sell_refund': '📉'    // 卖出退款
      }
      return iconMap[typeToCheck] || '🏢'
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
      // 根据业务类型判断金额颜色，使用originalType而不是displayType
      const typeToCheck = item.originalType || item.type
      const positiveTypes = ['allot_refund', 'fee_refund', 'sell']
      const negativeTypes = ['subscribe', 'allot', 'fee_deduction', 'sell_refund']
      
      if (positiveTypes.includes(typeToCheck)) {
        return 'positive' // 绿色（增加资金）
      } else if (negativeTypes.includes(typeToCheck)) {
        return 'negative' // 红色（减少资金）
      }
      return 'business' // 默认业务颜色
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

  // 格式化业务日期时间显示（显示业务发生的日期，而非实际操作时间）
  formatBusinessDateTime(businessDate) {
    if (!businessDate) return ''
    
    const date = new Date(businessDate)
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