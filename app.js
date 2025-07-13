// app.js
App({
  onLaunch() {
    console.log('小程序启动 - 基础库3.8.10')
    
    // 初始化系统信息
    this.initSystemInfo()
    
    // 初始化用户会话
    this.initUserSession()
    
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },

  // 初始化系统信息
  initSystemInfo() {
    const systemInfo = wx.getSystemInfoSync()
    this.globalData.systemInfo = systemInfo
    
    console.log('系统信息:', {
      SDKVersion: systemInfo.SDKVersion,
      version: systemInfo.version,
      platform: systemInfo.platform,
      system: systemInfo.system
    })
  },

  // 初始化用户会话
  initUserSession() {
    // 获取本地用户信息
    const userInfo = wx.getStorageSync('userInfo')
    const loginSession = wx.getStorageSync('loginSession')
    
    if (userInfo && loginSession) {
      // 检查会话是否过期（24小时）
      const sessionTime = loginSession.timestamp || 0
      const now = Date.now()
      const isExpired = (now - sessionTime) > 24 * 60 * 60 * 1000
      
      if (!isExpired) {
        this.globalData.userInfo = userInfo
        this.globalData.isLoggedIn = true
        console.log('用户会话有效，自动登录:', userInfo.nickName)
      } else {
        console.log('用户会话已过期，需要重新登录')
        this.clearUserSession()
      }
    } else {
      console.log('用户未登录')
      this.globalData.isLoggedIn = false
    }
  },

  // 获取微信登录凭证
  async getWXLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: res => {
          if (res.code) {
            console.log('获取微信登录凭证成功:', res.code)
            resolve(res.code)
          } else {
            console.error('获取微信登录凭证失败:', res.errMsg)
            reject(new Error(res.errMsg))
          }
        },
        fail: err => {
          console.error('微信登录失败:', err)
          reject(err)
        }
      })
    })
  },

  // 保存用户信息和会话
  saveUserSession(userInfo, loginCode) {
    const sessionData = {
      timestamp: Date.now(),
      loginCode: loginCode,
      loginTime: new Date().toISOString()
    }
    
    // 保存用户信息
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true
    
    // 持久化存储
    wx.setStorageSync('userInfo', userInfo)
    wx.setStorageSync('loginSession', sessionData)
    
    console.log('用户会话保存成功:', userInfo.nickName)
  },

  // 清除用户会话
  clearUserSession() {
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('loginSession')
    
    console.log('用户会话已清除')
  },

  // 检查登录状态
  checkLoginStatus() {
    return this.globalData.isLoggedIn && this.globalData.userInfo
  },

  // 获取用户信息的全局方法
  getUserInfo() {
    return this.globalData.userInfo
  },

  // 设置用户信息的全局方法
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  // 清除用户信息的全局方法
  clearUserInfo() {
    this.clearUserSession()
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    systemInfo: null,
    version: '1.0.0'
  }
})
