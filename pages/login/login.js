// pages/login/login.js - 基于基础库3.8.10的现代化登录页面
Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    isLoading: false,
    showAuthModal: false,
    tempAvatarUrl: '',
    tempNickname: '',
    loginCode: '',
    // 使用微信官方默认头像
    defaultAvatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
  },

  onLoad() {
    console.log('登录页面加载 - 基础库3.8.10')
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const app = getApp()
    const isLoggedIn = app.checkLoginStatus()
    const userInfo = app.getUserInfo()
    
    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: userInfo
    })
    
    if (isLoggedIn && userInfo) {
      console.log('用户已登录:', userInfo.nickName)
    } else {
      console.log('用户未登录，显示登录界面')
    }
  },

  // 开始微信授权登录 - 优化版本
  async startWXLogin() {
    if (this.data.isLoading) return
    
    console.log('开始微信授权登录流程')
    this.setData({ isLoading: true })
    
    try {
      // 1. 获取微信登录凭证
      const app = getApp()
      const loginCode = await app.getWXLoginCode()
      
      // 2. 尝试使用快速登录模式
      this.tryQuickLogin(loginCode)
      
    } catch (error) {
      console.error('微信登录失败:', error)
      this.setData({ isLoading: false })
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'error'
      })
    }
  },

  // 尝试快速登录（使用默认信息）
  tryQuickLogin(loginCode) {
    wx.showModal({
      title: '快速登录',
      content: '是否使用默认头像和随机昵称快速登录？\n\n您也可以选择自定义头像和昵称',
      confirmText: '快速登录',
      cancelText: '自定义',
      success: (res) => {
        if (res.confirm) {
          // 用户选择快速登录
          this.doQuickLogin(loginCode)
        } else {
          // 用户选择自定义
          this.showUserInfoModal(loginCode)
        }
      },
      fail: () => {
        // 默认使用自定义方式
        this.showUserInfoModal(loginCode)
      }
    })
  },

  // 执行快速登录
  async doQuickLogin(loginCode) {
    try {
      // 生成随机昵称
      const randomNames = ['新用户', '打新达人', '投资者', '理财高手', '股民', '基金经理']
      const randomNickname = randomNames[Math.floor(Math.random() * randomNames.length)] + Math.floor(Math.random() * 1000)
      
      const userInfo = {
        nickName: randomNickname,
        avatarUrl: this.data.defaultAvatarUrl,
        loginTime: Date.now(),
        loginTimeStr: new Date().toLocaleString(),
        isQuickLogin: true // 标记为快速登录
      }
      
      // 保存用户会话
      const app = getApp()
      app.saveUserSession(userInfo, loginCode)
      
      // 更新页面状态
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo,
        isLoading: false
      })
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      console.log('快速登录成功:', userInfo.nickName)
      
      // 跳转到首页
      setTimeout(() => {
        this.navigateToHome()
      }, 1500)
      
    } catch (error) {
      console.error('快速登录失败:', error)
      this.setData({ isLoading: false })
      // 降级到自定义方式
      this.showUserInfoModal(loginCode)
    }
  },

  // 显示用户信息授权弹窗
  showUserInfoModal(loginCode) {
    this.setData({
      showAuthModal: true,
      tempAvatarUrl: this.data.defaultAvatarUrl,
      tempNickname: '',
      loginCode: loginCode,
      isLoading: false
    })
    
    console.log('显示用户信息授权弹窗')
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

  // 确认授权
  async confirmAuth() {
    const { tempAvatarUrl, tempNickname, loginCode } = this.data
    
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
    
    this.setData({ isLoading: true })
    
    try {
      // 构建用户信息
      const userInfo = {
        nickName: tempNickname,
        avatarUrl: tempAvatarUrl,
        loginTime: Date.now(),
        loginTimeStr: new Date().toLocaleString()
      }
      
      // 保存用户会话
      const app = getApp()
      app.saveUserSession(userInfo, loginCode)
      
      // 更新页面状态
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo,
        showAuthModal: false,
        isLoading: false
      })
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      console.log('用户授权登录成功:', userInfo.nickName)
      
      // 跳转到首页
      setTimeout(() => {
        this.navigateToHome()
      }, 1500)
      
    } catch (error) {
      console.error('保存用户信息失败:', error)
      this.setData({ isLoading: false })
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'error'
      })
    }
  },

  // 取消授权
  cancelAuth() {
    this.setData({
      showAuthModal: false,
      tempAvatarUrl: this.data.defaultAvatarUrl,
      tempNickname: '',
      isLoading: false
    })
    
    console.log('用户取消授权')
  },

  // 跳转到首页
  navigateToHome() {
    wx.switchTab({
      url: '/pages/index/index',
      success: () => {
        console.log('跳转首页成功')
      },
      fail: (err) => {
        console.error('跳转首页失败:', err)
        wx.showToast({
          title: '跳转失败',
          icon: 'error'
        })
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.clearUserSession()
          
          this.setData({
            isLoggedIn: false,
            userInfo: null
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
          
          console.log('用户退出登录')
        }
      }
    })
  }
})
