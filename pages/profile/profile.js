// pages/profile/profile.js
const { fundManager } = require('../../utils/fundManager')

Page({
  data: {
    userInfo: null,
    currentAccount: { id: 'default', name: '默认账户', isDefault: true },
    accountList: [],
    showAccountModal: false,
    showAddAccountModal: false,
    editingAccount: {},
    // 新增：用户信息编辑相关
    showUserInfoModal: false,
    tempAvatarUrl: '',
    tempNickname: '',
    defaultAvatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
    // 新增：资金管理相关
    fundsSummary: null,
    currentAccountFunds: null
  },

  onLoad() {
    // 检查登录状态
    if (!this.checkLogin()) {
      return
    }
    
    this.getUserInfo()
    this.initializeAccounts()
    this.loadFundsSummary()
  },

  onShow() {
    console.log('Profile页面显示，开始刷新数据')
    
    // 检查登录状态
    if (!this.checkLogin()) {
      return
    }
    
    // 每次显示页面时重新获取用户信息和账户信息
    this.getUserInfo()
    
    // 检查是否有资金变更标记
    const fundsChanged = wx.getStorageSync('fundsChanged')
    if (fundsChanged) {
      wx.removeStorageSync('fundsChanged')
      console.log('检测到资金变更，强制刷新所有数据')
    }
    
    // 重新加载所有数据，确保数据最新
    this.refreshAllData()
  },

  // 检查登录状态
  checkLogin() {
    const app = getApp()
    const userInfo = app.getUserInfo()
    
    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return false
    }
    
    return true
  },

  // 刷新所有数据的方法
  refreshAllData() {
    this.loadAccounts()
    
    // 延迟加载当前账户，确保账户列表已更新
    setTimeout(() => {
      this.loadCurrentAccount()
    }, 50)
    
    // 延迟加载资金信息，确保账户信息已更新
    setTimeout(() => {
      this.loadFundsSummary()
      this.loadCurrentAccountFunds()
    }, 100)
    
    // 再次确认加载，防止数据不同步
    setTimeout(() => {
      this.loadCurrentAccountFunds()
      this.loadFundsSummary()
    }, 300)
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('用户下拉刷新')
    this.refreshAllData()
    
    // 延迟停止下拉刷新动画
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 500)
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
    
    // 加载当前账户资金信息
    this.loadCurrentAccountFunds()
  },

  // 加载资金汇总信息
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

  // 加载当前账户资金信息
  loadCurrentAccountFunds() {
    if (this.data.currentAccount && this.data.currentAccount.id) {
      try {
        const funds = fundManager.getAccountFunds(this.data.currentAccount.id)
        console.log('加载账户资金:', this.data.currentAccount.id, funds)
        this.setData({
          currentAccountFunds: funds
        })
      } catch (error) {
        console.error('加载当前账户资金失败:', error)
      }
    } else {
      console.warn('当前账户信息无效，无法加载资金信息')
    }
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

  // 修改用户信息
  editUserInfo() {
    const { userInfo } = this.data
    this.setData({
      showUserInfoModal: true,
      tempAvatarUrl: userInfo?.avatarUrl || this.data.defaultAvatarUrl,
      tempNickname: userInfo?.nickName || ''
    })
    
    // 防止页面滚动
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 0
    })
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('用户选择头像:', avatarUrl)
    
    this.setData({
      tempAvatarUrl: avatarUrl
    })
  },

  // 输入昵称
  onNicknameInput(e) {
    const nickname = e.detail.value.trim()
    console.log('用户输入昵称:', nickname)
    
    this.setData({
      tempNickname: nickname
    })
  },

  // 确认修改用户信息
  confirmUserInfo() {
    const { tempAvatarUrl, tempNickname, userInfo } = this.data
    
    // 验证输入
    if (!tempNickname || tempNickname.length < 1) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'error'
      })
      return
    }
    
    if (tempNickname.length > 20) {
      wx.showToast({
        title: '昵称不能超过20个字符',
        icon: 'error'
      })
      return
    }
    
    try {
      // 更新用户信息
      const updatedUserInfo = {
        ...userInfo,
        nickName: tempNickname,
        avatarUrl: tempAvatarUrl,
        lastUpdateTime: Date.now(),
        lastUpdateTimeStr: new Date().toLocaleString(),
        isQuickLogin: false // 标记为已自定义
      }
      
      // 保存到本地和全局
      wx.setStorageSync('userInfo', updatedUserInfo)
      const app = getApp()
      app.setUserInfo(updatedUserInfo)
      
      // 更新页面状态
      this.setData({
        userInfo: updatedUserInfo,
        showUserInfoModal: false
      })
      
      wx.showToast({
        title: '修改成功',
        icon: 'success'
      })
      
      console.log('用户信息修改成功:', updatedUserInfo.nickName)
      
    } catch (error) {
      console.error('修改用户信息失败:', error)
      wx.showToast({
        title: '修改失败，请重试',
        icon: 'error'
      })
    }
  },

  // 取消修改用户信息
  cancelUserInfo() {
    this.setData({
      showUserInfoModal: false,
      tempAvatarUrl: '',
      tempNickname: ''
    })
    console.log('取消修改用户信息')
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
    
    // 重新加载资金信息
    this.loadCurrentAccountFunds()
    
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
      content: 'v0.3.3\n\n 增加游客预览，提高系统稳定性',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 显示用户信息编辑弹窗
  onEditUserInfo() {
    this.setData({
      showUserInfoModal: true,
      tempNickname: this.data.userInfo.nickname || '',
      tempAvatarUrl: this.data.userInfo.avatarUrl || this.data.defaultAvatarUrl
    })
  },

  // 关闭用户信息编辑弹窗
  onCloseUserInfoModal() {
    this.setData({
      showUserInfoModal: false
    })
  },

  // 显示相册选择器
  onChooseAvatar() {
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        // tempFilePath可以作为img标签的src属性显示图片
        const tempFilePath = res.tempFilePaths[0]
        
        that.setData({
          tempAvatarUrl: tempFilePath
        })
      }
    })
  },

  // 显示昵称输入框
  onNicknameInput(e) {
    this.setData({
      tempNickname: e.detail.value
    })
  },

  // 保存用户信息
  onSaveUserInfo() {
    const { tempNickname, tempAvatarUrl } = this.data
    
    if (!tempNickname || tempNickname.trim() === '') {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }
    
    // 更新用户信息
    const userInfo = {
      ...this.data.userInfo,
      nickname: tempNickname.trim(),
      avatarUrl: tempAvatarUrl
    }
    
    // 保存到本地
    wx.setStorageSync('userInfo', userInfo)
    
    this.setData({
      userInfo: userInfo,
      showUserInfoModal: false
    })
    
    wx.showToast({
      title: '用户信息更新成功',
      icon: 'success'
    })
  },

  // 资金管理相关方法
  // 进入资金管理页面
  onFundManagement() {
    wx.navigateTo({
      url: '/pages/fund-management/fund-management'
    })
  },

  // 进入资金记录页面
  onFundRecord(e) {
    const type = e.currentTarget.dataset.type || 'deposit'
    wx.navigateTo({
      url: `/pages/fund-record/fund-record?type=${type}`
    })
  },

  // 查看资金详情
  onFundDetail() {
    wx.navigateTo({
      url: `/pages/fund-detail/fund-detail?accountId=${this.data.currentAccount.id}`
    })
  },

  // 获取余额颜色样式
  getBalanceColor(amount) {
    if (amount > 0) return 'color: #07c160;'
    if (amount < 0) return 'color: #fa5151;'
    return 'color: #333;'
  }
})
