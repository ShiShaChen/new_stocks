// utils/templateManager.js
// 股票模板数据管理工具类

class TemplateManager {
  constructor() {
    this.STORAGE_KEY = 'stockTemplates'
    this.EXPIRY_DAYS = 7 // 模板有效期7天
  }

  /**
   * 获取所有模板
   */
  getAllTemplates() {
    try {
      const templates = wx.getStorageSync(this.STORAGE_KEY) || []
      // 自动清理过期模板
      return this.autoCleanExpiredTemplates(templates)
    } catch (error) {
      console.error('获取模板列表失败:', error)
      return []
    }
  }

  /**
   * 获取进行中的模板（未完成的）
   */
  getInProgressTemplates() {
    const templates = this.getAllTemplates()
    return templates.filter(t => !t.isCompleted)
  }

  /**
   * 获取已完成的模板
   */
  getCompletedTemplates() {
    const templates = this.getAllTemplates()
    return templates.filter(t => t.isCompleted)
  }

  /**
   * 根据ID获取模板
   */
  getTemplateById(id) {
    const templates = this.getAllTemplates()
    return templates.find(t => t.id === id)
  }

  /**
   * 创建新模板
   */
  createTemplate(templateData) {
    try {
      const templates = this.getAllTemplates()
      
      const newTemplate = {
        id: 'template_' + Date.now(),
        stockName: templateData.stockName,
        stockCode: templateData.stockCode,
        issuePrice: parseFloat(templateData.issuePrice),
        createTime: Date.now(),
        usedAccounts: [], // 已使用此模板的账户ID列表
        isCompleted: false, // 是否完成所有账户录入
        expiryTime: Date.now() + (this.EXPIRY_DAYS * 24 * 60 * 60 * 1000) // 7天后过期
      }
      
      templates.unshift(newTemplate) // 新模板放在最前面
      wx.setStorageSync(this.STORAGE_KEY, templates)
      
      return { success: true, template: newTemplate }
    } catch (error) {
      console.error('创建模板失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 更新模板
   */
  updateTemplate(id, updates) {
    try {
      const templates = this.getAllTemplates()
      const index = templates.findIndex(t => t.id === id)
      
      if (index === -1) {
        return { success: false, error: '模板不存在' }
      }
      
      templates[index] = {
        ...templates[index],
        ...updates,
        updateTime: Date.now()
      }
      
      wx.setStorageSync(this.STORAGE_KEY, templates)
      
      return { success: true, template: templates[index] }
    } catch (error) {
      console.error('更新模板失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 删除模板
   */
  deleteTemplate(id) {
    try {
      let templates = this.getAllTemplates()
      templates = templates.filter(t => t.id !== id)
      
      wx.setStorageSync(this.STORAGE_KEY, templates)
      
      return { success: true }
    } catch (error) {
      console.error('删除模板失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 批量删除模板
   */
  batchDeleteTemplates(ids) {
    try {
      let templates = this.getAllTemplates()
      templates = templates.filter(t => !ids.includes(t.id))
      
      wx.setStorageSync(this.STORAGE_KEY, templates)
      
      return { success: true, count: ids.length }
    } catch (error) {
      console.error('批量删除模板失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 标记模板被某账户使用
   */
  markTemplateUsed(templateId, accountId) {
    try {
      const templates = this.getAllTemplates()
      const template = templates.find(t => t.id === templateId)
      
      if (!template) {
        return { success: false, error: '模板不存在' }
      }
      
      // 添加账户ID到已使用列表（避免重复）
      if (!template.usedAccounts.includes(accountId)) {
        template.usedAccounts.push(accountId)
      }
      
      // 更新模板
      return this.updateTemplate(templateId, {
        usedAccounts: template.usedAccounts
      })
    } catch (error) {
      console.error('标记模板使用失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 标记模板为已完成
   */
  markTemplateCompleted(templateId) {
    return this.updateTemplate(templateId, {
      isCompleted: true,
      completedTime: Date.now()
    })
  }

  /**
   * 重新激活已完成的模板
   */
  reactivateTemplate(templateId) {
    return this.updateTemplate(templateId, {
      isCompleted: false,
      completedTime: null
    })
  }

  /**
   * 获取模板的使用统计
   */
  getTemplateStats(templateId) {
    const template = this.getTemplateById(templateId)
    if (!template) {
      return null
    }
    
    const totalAccounts = wx.getStorageSync('accounts')?.length || 0
    const usedAccounts = template.usedAccounts.length
    const remainingAccounts = totalAccounts - usedAccounts
    
    return {
      totalAccounts,
      usedAccounts,
      remainingAccounts,
      progress: totalAccounts > 0 ? Math.round((usedAccounts / totalAccounts) * 100) : 0,
      isCompleted: template.isCompleted
    }
  }

  /**
   * 自动清理过期的模板
   */
  autoCleanExpiredTemplates(templates) {
    const now = Date.now()
    const validTemplates = templates.filter(template => {
      // 保留未完成的模板，即使过期
      if (!template.isCompleted) {
        return true
      }
      // 已完成的模板，检查是否过期
      return template.expiryTime > now
    })
    
    // 如果有模板被清理，更新存储
    if (validTemplates.length < templates.length) {
      wx.setStorageSync(this.STORAGE_KEY, validTemplates)
      console.log(`自动清理了 ${templates.length - validTemplates.length} 个过期模板`)
    }
    
    return validTemplates
  }

  /**
   * 手动清理所有已完成的模板
   */
  cleanCompletedTemplates() {
    try {
      const templates = this.getAllTemplates()
      const activeTemplates = templates.filter(t => !t.isCompleted)
      const cleanedCount = templates.length - activeTemplates.length
      
      wx.setStorageSync(this.STORAGE_KEY, activeTemplates)
      
      return { success: true, count: cleanedCount }
    } catch (error) {
      console.error('清理已完成模板失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 检查模板名称是否重复（进行中的模板）
   */
  isDuplicateTemplateName(stockName, excludeId = null) {
    const templates = this.getInProgressTemplates()
    return templates.some(t => 
      t.stockName === stockName && t.id !== excludeId
    )
  }

  /**
   * 获取未使用模板的账户列表
   */
  getUnusedAccounts(templateId) {
    const template = this.getTemplateById(templateId)
    if (!template) {
      return []
    }
    
    const allAccounts = wx.getStorageSync('accounts') || []
    return allAccounts.filter(acc => !template.usedAccounts.includes(acc.id))
  }

  /**
   * 批量为多个账户标记模板使用
   */
  batchMarkTemplateUsed(templateId, accountIds) {
    try {
      const template = this.getTemplateById(templateId)
      if (!template) {
        return { success: false, error: '模板不存在' }
      }
      
      // 合并账户ID（去重）
      const newUsedAccounts = [...new Set([...template.usedAccounts, ...accountIds])]
      
      return this.updateTemplate(templateId, {
        usedAccounts: newUsedAccounts
      })
    } catch (error) {
      console.error('批量标记模板使用失败:', error)
      return { success: false, error: error.message }
    }
  }
}

// 导出单例
const templateManager = new TemplateManager()

module.exports = {
  templateManager,
  TemplateManager
}
