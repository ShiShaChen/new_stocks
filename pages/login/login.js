// pages/login/login.js
Page({
  data: {
    hasUserInfo: false,
    userInfo: null,
    isLoading: false
  },

  onLoad() {
    // 检查是否已经授权
    this.checkLoginStatus()
  },

  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.nickName) {
      this.setData({
        hasUserInfo: true,
        userInfo: userInfo
      })
      // 同步到全局数据
      const app = getApp()
      app.globalData.userInfo = userInfo
    }
  },

  getUserProfile() {
    if (this.data.isLoading) return
    
    this.setData({ isLoading: true })
    
    // 检查是否支持getUserProfile API
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于完善用户资料，提供更好的服务',
        success: (res) => {
          console.log('getUserProfile成功', res.userInfo)
          this.handleUserInfoSuccess(res.userInfo)
        },
        fail: (err) => {
          console.log('getUserProfile失败', err)
          this.handleUserInfoFail(err)
        }
      })
    } else {
      // 兼容旧版本或模拟器环境，直接模拟用户信息
      console.log('getUserProfile不支持，使用模拟数据')
      
      // 在模拟器环境下，直接创建一个模拟的用户信息
      const mockUserInfo = {
        nickName: '测试用户',
        avatarUrl: '../../images/logo.png',
        gender: 0,
        language: 'zh_CN',
        city: '',
        province: '',
        country: 'CN'
      }
      
      this.handleUserInfoSuccess(mockUserInfo)
    }
  },

  handleUserInfoSuccess(userInfo) {
    console.log('处理用户信息成功', userInfo)
    
    // 验证获取到的用户信息
    if (!userInfo || !userInfo.nickName) {
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'error'
      })
      this.setData({ isLoading: false })
      return
    }
    
    const finalUserInfo = {
      ...userInfo,
      loginTime: new Date().getTime() // 添加登录时间
    }
    
    this.setData({
      hasUserInfo: true,
      userInfo: finalUserInfo,
      isLoading: false
    })
    
    // 保存用户信息到本地存储
    wx.setStorageSync('userInfo', finalUserInfo)
    
    // 同步到全局数据
    const app = getApp()
    app.globalData.userInfo = finalUserInfo
    
    // 获取登录凭证
    this.getLoginCode(finalUserInfo)
    
    // 显示欢迎信息
    wx.showToast({
      title: `欢迎，${finalUserInfo.nickName}`,
      icon: 'success',
      duration: 2000
    })
  },

  handleUserInfoFail(err) {
    console.log('获取用户信息失败', err)
    this.setData({ isLoading: false })
    
    // 如果用户拒绝授权，提供模拟登录选项
    wx.showModal({
      title: '授权提醒',
      content: '需要获取您的微信信息来提供个性化服务。如果无法授权，可以使用模拟登录继续体验',
      confirmText: '重试授权',
      cancelText: '模拟登录',
      success: (res) => {
        if (res.confirm) {
          // 重试授权
          this.getUserProfile()
        } else {
          // 使用模拟登录
          this.useSimulatedLogin()
        }
      }
    })
  },

  useSimulatedLogin() {
    console.log('使用模拟登录')
    
    const simulatedUserInfo = {
      nickName: '游客用户',
      avatarUrl: '../../images/logo.png',
      gender: 0,
      language: 'zh_CN',
      city: '',
      province: '',
      country: 'CN',
      isSimulated: true
    }
    
    this.handleUserInfoSuccess(simulatedUserInfo)
  },

  getLoginCode(userInfo) {
    wx.login({
      success: loginRes => {
        console.log('登录凭证获取成功:', loginRes.code)
        
        // 保存登录凭证（可用于后续服务器验证）
        const loginData = {
          code: loginRes.code,
          userInfo: userInfo,
          timestamp: new Date().getTime()
        }
        wx.setStorageSync('loginData', loginData)
        
        // 这里可以发送到后端服务器进行用户身份验证
        // this.sendToServer(loginData)
      },
      fail: (err) => {
        console.log('获取登录凭证失败:', err)
      }
    })
  },

  // 发送登录数据到服务器（可选）
  sendToServer(loginData) {
    // 这里可以实现发送用户信息到后端服务器的逻辑
    // wx.request({
    //   url: 'https://your-server.com/api/login',
    //   method: 'POST',
    //   data: loginData,
    //   success: (res) => {
    //     console.log('服务器登录成功', res)
    //   },
    //   fail: (err) => {
    //     console.log('服务器登录失败', err)
    //   }
    // })
  },

  enterApp() {
    // 确保用户信息存在
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
            userInfo: null
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  }
})