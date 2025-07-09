// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 初始化用户信息
    this.initUserInfo()

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        console.log('App启动登录成功', res.code)
      }
    })
  },

  initUserInfo() {
    // 从本地存储中获取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.nickName) {
      this.globalData.userInfo = userInfo
      console.log('用户信息已加载:', userInfo.nickName)
    }
  },

  // 获取用户信息的全局方法
  getUserInfo() {
    return this.globalData.userInfo || wx.getStorageSync('userInfo')
  },

  // 设置用户信息的全局方法
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  // 清除用户信息的全局方法
  clearUserInfo() {
    this.globalData.userInfo = null
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('loginData')
  },

  globalData: {
    userInfo: null,
    version: '1.0.0'
  }
})
