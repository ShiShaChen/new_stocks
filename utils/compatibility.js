// utils/compatibility.js - 兼容性检查工具

/**
 * 兼容性检查工具类
 */
class CompatibilityChecker {
  constructor() {
    this.systemInfo = null
    this.apiSupport = {}
    this.init()
  }

  init() {
    try {
      this.systemInfo = wx.getSystemInfoSync()
      this.checkAPISupport()
    } catch (error) {
      console.error('兼容性检查初始化失败:', error)
    }
  }

  /**
   * 检查API支持情况
   */
  checkAPISupport() {
    const apis = [
      'button.open-type.chooseAvatar',
      'input.type.nickname', 
      'getUserProfile',
      'getStorageSync',
      'setStorageSync',
      'removeStorageSync',
      'login',
      'showToast',
      'showModal',
      'navigateTo',
      'switchTab',
      'redirectTo',
      'getSystemInfoSync'
    ]

    apis.forEach(api => {
      this.apiSupport[api] = wx.canIUse(api)
    })
  }

  /**
   * 版本号比较
   * @param {string} v1 版本号1
   * @param {string} v2 版本号2
   * @returns {number} 1: v1>v2, 0: v1=v2, -1: v1<v2
   */
  compareVersion(v1, v2) {
    const arr1 = v1.split('.')
    const arr2 = v2.split('.')
    const minLength = Math.min(arr1.length, arr2.length)
    
    for (let i = 0; i < minLength; i++) {
      const num1 = parseInt(arr1[i])
      const num2 = parseInt(arr2[i])
      
      if (num1 > num2) return 1
      if (num1 < num2) return -1
    }
    
    return arr1.length - arr2.length
  }

  /**
   * 检查是否为基础库3.0+版本
   */
  isSDK3Plus() {
    if (!this.systemInfo || !this.systemInfo.SDKVersion) {
      return false
    }
    return this.compareVersion(this.systemInfo.SDKVersion, '3.0.0') >= 0
  }

  /**
   * 检查是否支持现代用户信息获取方式
   */
  supportModernUserInfo() {
    return this.apiSupport['button.open-type.chooseAvatar'] && 
           this.apiSupport['input.type.nickname']
  }

  /**
   * 获取用户信息获取策略
   */
  getUserInfoStrategy() {
    if (this.supportModernUserInfo()) {
      return 'modern' // 使用头像昵称填写
    } else if (this.apiSupport['getUserProfile']) {
      return 'profile' // 使用getUserProfile
    } else {
      return 'manual' // 手动输入
    }
  }

  /**
   * 生成兼容性报告
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      systemInfo: this.systemInfo,
      apiSupport: this.apiSupport,
      isSDK3Plus: this.isSDK3Plus(),
      supportModernUserInfo: this.supportModernUserInfo(),
      userInfoStrategy: this.getUserInfoStrategy(),
      recommendations: this.getRecommendations()
    }

    console.log('=== 兼容性检查报告 ===')
    console.log('基础库版本:', this.systemInfo?.SDKVersion)
    console.log('微信版本:', this.systemInfo?.version)
    console.log('系统:', this.systemInfo?.system)
    console.log('平台:', this.systemInfo?.platform)
    console.log('是否基础库3.0+:', this.isSDK3Plus())
    console.log('支持现代用户信息获取:', this.supportModernUserInfo())
    console.log('用户信息获取策略:', this.getUserInfoStrategy())
    console.log('API支持情况:', this.apiSupport)
    console.log('======================')

    return report
  }

  /**
   * 获取兼容性建议
   */
  getRecommendations() {
    const recommendations = []

    if (!this.isSDK3Plus()) {
      recommendations.push('建议升级基础库到3.0+以获得更好的兼容性')
    }

    if (!this.supportModernUserInfo()) {
      recommendations.push('当前环境不支持现代用户信息获取方式，将使用降级方案')
    }

    if (!this.apiSupport['getUserProfile']) {
      recommendations.push('getUserProfile不可用，将使用手动输入方式')
    }

    return recommendations
  }

  /**
   * 安全调用API
   * @param {string} apiName API名称
   * @param {function} apiCall API调用函数
   * @param {function} fallback 降级处理函数
   */
  safeAPICall(apiName, apiCall, fallback) {
    if (this.apiSupport[apiName]) {
      try {
        return apiCall()
      } catch (error) {
        console.error(`API ${apiName} 调用失败:`, error)
        if (fallback) {
          return fallback()
        }
      }
    } else {
      console.warn(`API ${apiName} 不支持，使用降级方案`)
      if (fallback) {
        return fallback()
      }
    }
  }
}

// 创建全局实例
const compatibilityChecker = new CompatibilityChecker()

module.exports = {
  CompatibilityChecker,
  compatibilityChecker
}
