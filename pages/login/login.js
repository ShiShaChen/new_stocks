// pages/login/login.js
Page({
  data: {
    hasUserInfo: false,
    userInfo: null,
    isLoading: false,
    showManualAuth: false,
    tempAvatarUrl: '', // 临时头像URL
    tempNickname: '', // 临时昵称
    // 检测基础库版本支持情况
    canIUseChooseAvatar: wx.canIUse('button.open-type.chooseAvatar'),
    canIUseNickname: wx.canIUse('input.type.nickname'),
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    // 默认头像URL（微信官方提供的默认头像）
    defaultAvatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
    isModernWechat: false // 是否为现代版本微信
  },

  onLoad() {
    // 初始化检查
    this.initializeApp()
  },

  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus()
  },

  // 初始化应用
  initializeApp() {
    console.log('初始化应用...')
    
    // 检查微信版本和支持能力
    const systemInfo = wx.getSystemInfoSync()
    console.log('系统信息:', systemInfo)
    
    // 判断是否为现代版本的微信（支持头像昵称填写）
    const isModernWechat = this.data.canIUseChooseAvatar && this.data.canIUseNickname
    
    this.setData({
      isModernWechat: isModernWechat,
      tempAvatarUrl: this.data.defaultAvatarUrl
    })
    
    console.log('现代版本微信:', isModernWechat)
    console.log('支持头像选择:', this.data.canIUseChooseAvatar)
    console.log('支持昵称输入:', this.data.canIUseNickname)
    
    // 检查登录状态
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.nickName) {
      // 格式化登录时间
      if (userInfo.loginTime) {
        userInfo.loginTimeStr = new Date(userInfo.loginTime).toLocaleString()
      }
      
      this.setData({
        hasUserInfo: true,
        userInfo: userInfo
      })
      // 同步到全局数据
      const app = getApp()
      app.globalData.userInfo = userInfo
      console.log('用户已登录:', userInfo.nickName)
    } else {
      console.log('用户未登录')
    }
  },

  // 开始授权登录流程
  startLogin() {
    if (this.data.isLoading) return
    
    console.log('开始登录流程')
    this.setData({ isLoading: true })
    
    // 获取登录凭证
    wx.login({
      success: (loginRes) => {
        console.log('获取登录凭证成功:', loginRes.code)
        this.handleLoginSuccess(loginRes.code)
      },
      fail: (err) => {
        console.error('获取登录凭证失败:', err)
        this.setData({ isLoading: false })
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'error'
        })
      }
    })
  },

  // 处理登录成功
  handleLoginSuccess(loginCode) {
    console.log('处理登录成功，登录码:', loginCode)
    
    // 现代版本微信 - 使用头像昵称填写能力
    if (this.data.isModernWechat) {
      console.log('使用现代版本授权方式')
      this.showModernAuthDialog(loginCode)
    } 
    // 降级到传统方式（兼容老版本）
    else if (this.data.canIUseGetUserProfile) {
      console.log('使用传统getUserProfile方式')
      this.tryGetUserProfile(loginCode)
    } 
    // 最终降级方案 - 手动填写
    else {
      console.log('使用最终降级方案')
      this.showManualInputDialog(loginCode)
    }
  },

  // 显示现代版本授权对话框
  showModernAuthDialog(loginCode) {
    this.setData({ 
      isLoading: false,
      loginCode: loginCode,
      tempAvatarUrl: this.data.defaultAvatarUrl,
      tempNickname: ''
    })
    
    wx.showModal({
      title: '完善个人信息',
      content: '请选择头像和填写昵称以获得更好的使用体验',
      confirmText: '开始设置',
      cancelText: '游客模式',
      success: (res) => {
        if (res.confirm) {
          // 显示头像昵称设置界面
          this.setData({ showManualAuth: true })
        } else {
          // 使用游客模式
          this.useGuestMode(loginCode)
        }
      }
    })
  },

  // 尝试使用getUserProfile（兼容模式）
  tryGetUserProfile(loginCode) {
    wx.getUserProfile({
      desc: '用于完善用户资料，提供更好的服务',
      success: (res) => {
        console.log('getUserProfile成功:', res.userInfo)
        // 检查是否获取到真实信息
        if (res.userInfo.nickName === '微信用户') {
          console.log('getUserProfile返回默认信息，降级到手动设置')
          this.showManualInputDialog(loginCode)
        } else {
          this.saveUserInfo(res.userInfo, loginCode)
        }
      },
      fail: (err) => {
        console.log('getUserProfile失败:', err)
        this.showManualInputDialog(loginCode)
      }
    })
  },

  // 显示手动输入对话框
  showManualInputDialog(loginCode) {
    this.setData({ 
      isLoading: false,
      loginCode: loginCode,
      tempAvatarUrl: this.data.defaultAvatarUrl,
      tempNickname: ''
    })
    
    wx.showModal({
      title: '设置个人信息',
      content: '由于微信版本限制，请手动设置昵称',
      confirmText: '开始设置',
      cancelText: '游客模式',
      success: (res) => {
        if (res.confirm) {
          this.setData({ showManualAuth: true })
        } else {
          this.useGuestMode(loginCode)
        }
      }
    })
  },

  // 处理头像选择（现代版本）
  onChooseAvatar(e) {
    console.log('选择头像:', e.detail.avatarUrl)
    this.setData({
      tempAvatarUrl: e.detail.avatarUrl
    })
  },

  // 处理昵称输入
  onNicknameInput(e) {
    console.log('昵称输入:', e.detail.value)
    this.setData({
      tempNickname: e.detail.value.trim()
    })
  },

  // 确认手动设置的用户信息
  confirmUserInfo() {
    const { tempNickname, tempAvatarUrl, loginCode } = this.data
    
    if (!tempNickname || tempNickname.length === 0) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }
    
    if (tempNickname.length > 20) {
      wx.showToast({
        title: '昵称长度不能超过20个字符',
        icon: 'none'
      })
      return
    }
    
    this.setData({ isLoading: true })
    
    // 构建用户信息
    const userInfo = {
      nickName: tempNickname,
      avatarUrl: tempAvatarUrl,
      gender: 0,
      language: 'zh_CN',
      city: '',
      province: '',
      country: 'CN',
      isCustom: true // 标记为用户自定义信息
    }
    
    this.saveUserInfo(userInfo, loginCode)
  },

  // 使用游客模式
  useGuestMode(loginCode) {
    console.log('使用游客模式')
    
    const userInfo = {
      nickName: '游客用户',
      avatarUrl: this.data.defaultAvatarUrl,
      gender: 0,
      language: 'zh_CN',
      city: '',
      province: '',
      country: 'CN',
      isGuest: true // 标记为游客模式
    }
    
    this.saveUserInfo(userInfo, loginCode)
  },

  // 保存用户信息
  saveUserInfo(userInfo, loginCode) {
    console.log('保存用户信息:', userInfo)
    
    // 添加额外信息
    const loginTime = new Date().getTime()
    const finalUserInfo = {
      ...userInfo,
      loginTime: loginTime,
      loginTimeStr: new Date(loginTime).toLocaleString(),
      loginCode: loginCode
    }
    
    // 更新页面状态
    this.setData({
      hasUserInfo: true,
      userInfo: finalUserInfo,
      isLoading: false,
      showManualAuth: false
    })
    
    // 保存到本地存储
    wx.setStorageSync('userInfo', finalUserInfo)
    
    // 同步到全局数据
    const app = getApp()
    app.globalData.userInfo = finalUserInfo
    
    // 保存登录数据
    const loginData = {
      code: loginCode,
      userInfo: finalUserInfo,
      timestamp: new Date().getTime()
    }
    wx.setStorageSync('loginData', loginData)
    
    // 显示欢迎信息
    const welcomeText = userInfo.isGuest ? '欢迎体验' : `欢迎，${userInfo.nickName}`
    wx.showToast({
      title: welcomeText,
      icon: 'success',
      duration: 2000
    })
    
    console.log('用户信息保存完成')
  },

  // 取消设置，返回选择模式
  cancelSetup() {
    this.setData({
      showManualAuth: false,
      tempNickname: '',
      tempAvatarUrl: this.data.defaultAvatarUrl
    })
  },

  // 进入应用
  enterApp() {
    if (!this.data.hasUserInfo) {
      wx.showToast({
        title: '请先完成授权',
        icon: 'none'
      })
      return
    }

    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('loginData')
          
          // 清除全局数据
          const app = getApp()
          app.globalData.userInfo = null
          
          // 重置页面数据
          this.setData({
            hasUserInfo: false,
            userInfo: null,
            tempNickname: '',
            tempAvatarUrl: this.data.defaultAvatarUrl,
            showManualAuth: false
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 兼容旧方法名
  getUserProfile() {
    this.startLogin()
  },

  useSimulatedLogin() {
    if (this.data.loginCode) {
      this.useGuestMode(this.data.loginCode)
    } else {
      wx.login({
        success: (res) => {
          this.useGuestMode(res.code)
        },
        fail: (err) => {
          console.error('登录失败:', err)
          wx.showToast({
            title: '登录失败',
            icon: 'error'
          })
        }
      })
    }
  }
})