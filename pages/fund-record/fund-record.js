// pages/fund-record/fund-record.js
const { fundManager } = require('../../utils/fundManager')

Page({
  data: {
    // 页面状态
    isEdit: false,
    recordId: null,
    type: 'deposit', // deposit/withdraw
    
    // 表单数据
    formData: {
      amount: '',
      currency: 'HKD', // 固定为港币
      date: '', // 分离的日期
      time: '', // 分离的时间
      datetime: '', // 完整日期时间
      description: '',
      status: 'completed' // 固定为已完成
    },
    
    // 当前账户
    currentAccount: null,
    
    // 验证状态
    errors: {}
  },

  onLoad(options) {
    // 获取页面参数
    const { type, id } = options
    
    this.loadCurrentAccount()
    
    if (id) {
      // 编辑模式
      this.setData({
        isEdit: true,
        recordId: id
      })
      this.loadRecord(id)
    } else if (type) {
      // 新增模式，设置类型
      this.setData({
        type: type,
        'formData.status': 'completed', // 固定为已完成
        'formData.currency': 'HKD' // 固定为港币
      })
      // 只在新增模式下初始化为当前时间
      this.initDateTime()
    }
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

  // 初始化日期时间
  initDateTime() {
    const now = new Date()
    const datetime = this.formatDateTime(now)
    const { date, time } = this.parseDateTime(datetime)
    
    this.setData({
      'formData.datetime': datetime,
      'formData.date': date,
      'formData.time': time
    })
  },

  // 加载记录（编辑模式）
  loadRecord(recordId) {
    try {
      const allRecords = fundManager.getAllFundRecords()
      const record = allRecords.find(r => r.id === recordId)
      
      if (!record) {
        wx.showToast({
          title: '记录不存在',
          icon: 'error'
        })
        wx.navigateBack()
        return
      }
      
      // 设置表单数据
      const formattedDateTime = this.formatDateTime(new Date(record.timestamp))
      const { date, time } = this.parseDateTime(formattedDateTime)
      
      this.setData({
        type: record.type,
        formData: {
          amount: record.amount.toString(),
          currency: record.currency,
          datetime: formattedDateTime,
          date: date,
          time: time,
          description: record.description || '',
          status: record.status
        }
      })
      
      // 设置选择器索引
      const currencyIndex = this.data.currencyList.findIndex(item => item.value === record.currency)
      const statusIndex = this.data.statusList.findIndex(item => item.value === record.status)
      
      this.setData({
        currencyIndex: currencyIndex >= 0 ? currencyIndex : 0,
        statusIndex: statusIndex >= 0 ? statusIndex : 1
      })
      
    } catch (error) {
      console.error('加载记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
      wx.navigateBack()
    }
  },

  // 金额输入
  onAmountInput(e) {
    const value = e.detail.value
    // 只允许输入数字和小数点
    const cleanValue = value.replace(/[^0-9.]/g, '')
    
    this.setData({
      'formData.amount': cleanValue
    })
    
    this.validateField('amount', cleanValue)
  },

  // 描述输入
  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  // 显示日期时间选择器
  showDateTimePicker() {
    this.setData({
      showDateTimePicker: true,
      tempDateTime: this.data.formData.datetime
    })
  },

  // 日期改变
  onDateChange(e) {
    const dateValue = e.detail.value
    const currentTime = this.data.formData.time || '09:00'
    const datetime = `${dateValue} ${currentTime}`
    
    this.setData({
      'formData.date': dateValue,
      'formData.datetime': datetime
    })
  },

  // 时间改变
  onTimeChange(e) {
    const timeValue = e.detail.value
    const currentDate = this.data.formData.date || this.getCurrentDate()
    const datetime = `${currentDate} ${timeValue}`
    
    this.setData({
      'formData.time': timeValue,
      'formData.datetime': datetime
    })
  },

  // 获取当前日期（YYYY-MM-DD格式）
  getCurrentDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 设置当前时间
  setCurrentDateTime() {
    const now = new Date()
    const datetime = this.formatDateTime(now)
    const { date, time } = this.parseDateTime(datetime)
    
    this.setData({
      'formData.datetime': datetime,
      'formData.date': date,
      'formData.time': time
    })
    
    wx.showToast({
      title: '已设置为当前时间',
      icon: 'success',
      duration: 1000
    })
  },

  // 设置上午9点
  setMorningDateTime() {
    const currentDate = this.data.formData.date || this.getCurrentDate()
    const time = '09:00'
    const datetime = `${currentDate} ${time}`
    
    this.setData({
      'formData.time': time,
      'formData.datetime': datetime
    })
    
    wx.showToast({
      title: '已设置为上午9点',
      icon: 'success',
      duration: 1000
    })
  },

  // 设置下午3点
  setAfternoonDateTime() {
    const currentDate = this.data.formData.date || this.getCurrentDate()
    const time = '15:00'
    const datetime = `${currentDate} ${time}`
    
    this.setData({
      'formData.time': time,
      'formData.datetime': datetime
    })
    
    wx.showToast({
      title: '已设置为下午3点',
      icon: 'success',
      duration: 1000
    })
  },

  // 解析日期时间
  parseDateTime(dateTimeStr) {
    if (!dateTimeStr) {
      const now = new Date()
      const year = now.getFullYear()
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const hour = now.getHours().toString().padStart(2, '0')
      const minute = now.getMinutes().toString().padStart(2, '0')
      
      return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minute}`
      }
    }
    
    const [datePart, timePart] = dateTimeStr.split(' ')
    const [year, month, day] = datePart.split('-')
    const [hour, minute] = (timePart || '00:00').split(':')
    
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`
    }
  },

  // 字段验证
  validateField(field, value) {
    const errors = { ...this.data.errors }
    
    switch (field) {
      case 'amount':
        if (!value || parseFloat(value) <= 0) {
          errors.amount = '请输入有效金额'
        } else {
          delete errors.amount
        }
        break
    }
    
    this.setData({ errors })
    return !errors[field]
  },

  // 表单验证
  validateForm() {
    const { formData } = this.data
    let isValid = true
    
    // 验证金额
    if (!this.validateField('amount', formData.amount)) {
      isValid = false
    }
    
    // 验证提现时的余额
    if (this.data.type === 'withdraw' && !this.data.isEdit) {
      try {
        fundManager.validateFundOperation(
          this.data.currentAccount.id,
          parseFloat(formData.amount),
          formData.currency,
          'withdraw'
        )
      } catch (error) {
        wx.showToast({
          title: error.message,
          icon: 'none',
          duration: 3000
        })
        isValid = false
      }
    }
    
    return isValid
  },

  // 保存记录
  onSave() {
    if (!this.validateForm()) {
      return
    }
    
    const { formData } = this.data
    
    try {
      const recordData = {
        type: this.data.type,
        accountId: this.data.currentAccount.id,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        datetime: formData.datetime,
        description: formData.description.trim(),
        status: formData.status
      }
      
      if (this.data.isEdit) {
        // 更新记录
        fundManager.updateFundRecord(this.data.recordId, recordData)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      } else {
        // 新增记录
        fundManager.addFundRecord(recordData)
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
      }
      
      // 标记资金数据已改变
      wx.setStorageSync('fundsChanged', true)
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      
    } catch (error) {
      console.error('保存记录失败:', error)
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'error'
      })
    }
  },

  // 取消操作
  onCancel() {
    wx.navigateBack()
  },

  // 格式化日期时间
  formatDateTime(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 获取标题
  getTitle() {
    if (this.data.isEdit) {
      return '编辑记录'
    }
    return this.data.type === 'deposit' ? '资金转入' : '资金转出'
  }
})
