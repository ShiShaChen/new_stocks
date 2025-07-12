// pages/profile/profile.js
Page({
  data: {
    userInfo: null,
    currentAccount: { id: 'default', name: '默认账户', isDefault: true },
    accountList: [],
    showAccountModal: false,
    showAddAccountModal: false,
    editingAccount: {}
  },

  onLoad() {
    this.getUserInfo()
    this.initializeAccounts()
  },

  onShow() {
    // 每次显示页面时重新获取用户信息和账户信息
    this.getUserInfo()
    this.loadAccounts()
  },

  // 初始化账户系统
  initializeAccounts() {
    const accounts = wx.getStorageSync('accounts') || []
    
    // 如果没有账户，创建默认账户
    if (accounts.length === 0) {
      const defaultAccount = {
        id: 'default',
        name: '默认账户',
        isDefault: true,
        createTime: new Date().getTime()
      }
      accounts.push(defaultAccount)
      wx.setStorageSync('accounts', accounts)
    }
    
    this.setData({
      accountList: accounts
    })
    
    // 加载当前选中的账户
    this.loadCurrentAccount()
  },

  // 加载账户列表
  loadAccounts() {
    const accounts = wx.getStorageSync('accounts') || []
    this.setData({
      accountList: accounts
    })
  },

  // 加载当前账户
  loadCurrentAccount() {
    const currentAccountId = wx.getStorageSync('currentAccountId') || 'default'
    const accounts = this.data.accountList
    const currentAccount = accounts.find(acc => acc.id === currentAccountId) || accounts[0]
    
    this.setData({
      currentAccount: currentAccount
    })
    
    // 设置全局当前账户
    const app = getApp()
    app.globalData.currentAccount = currentAccount
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
    }
  },

  // 切换账户
  onSwitchAccount() {
    this.setData({
      showAccountModal: true
    })
  },

  // 关闭账户切换弹窗
  onCloseAccountModal() {
    this.setData({
      showAccountModal: false
    })
  },

  // 选择账户
  onSelectAccount(e) {
    const account = e.currentTarget.dataset.account
    
    // 保存当前选中的账户
    wx.setStorageSync('currentAccountId', account.id)
    
    this.setData({
      currentAccount: account,
      showAccountModal: false
    })
    
    // 更新全局当前账户
    const app = getApp()
    app.globalData.currentAccount = account
    
    wx.showToast({
      title: `已切换到${account.name}`,
      icon: 'success'
    })
    
    // 通知其他页面刷新数据
    wx.setStorageSync('accountChanged', true)
  },

  // 管理账户
  onManageAccounts() {
    this.setData({
      showAccountModal: true
    })
  },

  // 新增账户
  onAddAccount() {
    this.setData({
      showAccountModal: false,
      showAddAccountModal: true,
      editingAccount: {
        name: '',
        setAsDefault: false
      }
    })
  },

  // 关闭新增账户弹窗
  onCloseAddAccountModal() {
    this.setData({
      showAddAccountModal: false,
      editingAccount: {}
    })
  },

  // 账户名称输入
  onAccountNameChange(e) {
    this.setData({
      'editingAccount.name': e.detail.value
    })
  },

  // 设为默认账户选择
  onSetDefaultChange(e) {
    this.setData({
      'editingAccount.setAsDefault': e.detail.value.length > 0
    })
  },

  // 保存账户
  onSaveAccount() {
    const editingAccount = this.data.editingAccount
    
    if (!editingAccount.name || editingAccount.name.trim() === '') {
      wx.showToast({
        title: '请输入账户名称',
        icon: 'none'
      })
      return
    }
    
    const accounts = [...this.data.accountList]
    
    // 检查账户名称是否重复
    const existingAccount = accounts.find(acc => 
      acc.name === editingAccount.name.trim() && acc.id !== editingAccount.id
    )
    
    if (existingAccount) {
      wx.showToast({
        title: '账户名称已存在',
        icon: 'none'
      })
      return
    }
    
    if (editingAccount.id) {
      // 编辑现有账户
      const index = accounts.findIndex(acc => acc.id === editingAccount.id)
      if (index !== -1) {
        accounts[index] = {
          ...accounts[index],
          name: editingAccount.name.trim()
        }
      }
    } else {
      // 新增账户
      const newAccount = {
        id: 'account_' + new Date().getTime(),
        name: editingAccount.name.trim(),
        isDefault: false,
        createTime: new Date().getTime()
      }
      
      // 如果设为默认账户，更新其他账户的默认状态
      if (editingAccount.setAsDefault) {
        accounts.forEach(acc => acc.isDefault = false)
        newAccount.isDefault = true
      }
      
      accounts.push(newAccount)
    }
    
    // 保存账户列表
    wx.setStorageSync('accounts', accounts)
    
    this.setData({
      accountList: accounts,
      showAddAccountModal: false,
      editingAccount: {}
    })
    
    wx.showToast({
      title: editingAccount.id ? '账户更新成功' : '账户创建成功',
      icon: 'success'
    })
  },

  // 登录
  onLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后您的数据将被保留，下次登录时可以继续使用',
      success: (res) => {
        if (res.confirm) {
          this.performLogout()
        }
      }
    })
  },

  // 执行退出操作
  performLogout() {
    try {
      // 只清除用户信息，保留其他数据
      wx.removeStorageSync('userInfo')
      
      // 更新页面状态
      this.setData({
        userInfo: null
      })

      // 显示退出成功提示
      wx.showToast({
        title: '退出成功',
        icon: 'success',
        duration: 1500
      })

      // 延迟跳转到登录页面
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }, 1500)

    } catch (error) {
      console.error('退出登录失败:', error)
      wx.showToast({
        title: '退出失败，请重试',
        icon: 'error'
      })
    }
  },

  // 关于应用
  onAbout() {
    wx.showModal({
      title: '关于应用',
      content: '打新记录 v1.0\n\n帮助投资者记录和管理新股申购情况，追踪投资收益。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 意见反馈
  onFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请联系开发者。感谢您的使用！',
      showCancel: false,
      confirmText: '好的'
    })
  }
})
