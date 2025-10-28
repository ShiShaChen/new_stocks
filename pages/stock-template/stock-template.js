// pages/stock-template/stock-template.js
const { templateManager } = require('../../utils/templateManager.js')

Page({
  data: {
    activeTab: 'inProgress', // 'inProgress' 或 'completed'
    inProgressTemplates: [],
    completedTemplates: [],
    showAddModal: false,
    showEditModal: false,
    editingTemplate: null,
    formData: {
      stockName: '',
      stockCode: '',
      issuePrice: ''
    },
    selectedTemplates: [], // 多选的模板ID列表
    isSelectionMode: false // 是否处于多选模式
  },

  onLoad() {
    this.loadTemplates()
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadTemplates()
  },

  // 格式化时间为年月日时分秒
  formatDateTime(timestamp) {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  },

  // 加载模板列表
  loadTemplates() {
    const inProgressTemplates = templateManager.getInProgressTemplates()
    const completedTemplates = templateManager.getCompletedTemplates()
    
    // 为每个模板添加统计信息和格式化时间
    const inProgressWithStats = inProgressTemplates.map(t => ({
      ...t,
      createTime: this.formatDateTime(t.createTime),
      stats: templateManager.getTemplateStats(t.id)
    }))
    
    const completedWithStats = completedTemplates.map(t => ({
      ...t,
      createTime: this.formatDateTime(t.createTime),
      stats: templateManager.getTemplateStats(t.id)
    }))
    
    this.setData({
      inProgressTemplates: inProgressWithStats,
      completedTemplates: completedWithStats
    })
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      isSelectionMode: false,
      selectedTemplates: []
    })
  },

  // 显示添加模板弹窗
  showAddTemplate() {
    this.setData({
      showAddModal: true,
      formData: {
        stockName: '',
        stockCode: '',
        issuePrice: ''
      }
    })
  },

  // 关闭添加模板弹窗
  closeAddModal() {
    this.setData({
      showAddModal: false
    })
  },

  // 表单输入处理
  onStockNameInput(e) {
    this.setData({
      'formData.stockName': e.detail.value
    })
  },

  onStockCodeInput(e) {
    this.setData({
      'formData.stockCode': e.detail.value
    })
  },

  onIssuePriceInput(e) {
    this.setData({
      'formData.issuePrice': e.detail.value
    })
  },

  // 保存新模板
  saveTemplate() {
    const { stockName, stockCode, issuePrice } = this.data.formData
    
    // 验证输入
    if (!stockName || !stockName.trim()) {
      wx.showToast({
        title: '请输入股票名称',
        icon: 'none'
      })
      return
    }
    
    if (!stockCode || !stockCode.trim()) {
      wx.showToast({
        title: '请输入股票代码',
        icon: 'none'
      })
      return
    }
    
    if (!issuePrice || isNaN(parseFloat(issuePrice)) || parseFloat(issuePrice) <= 0) {
      wx.showToast({
        title: '请输入有效的发行价格',
        icon: 'none'
      })
      return
    }
    
    // 检查重复
    if (templateManager.isDuplicateTemplateName(stockName.trim())) {
      wx.showToast({
        title: '该股票模板已存在',
        icon: 'none'
      })
      return
    }
    
    // 创建模板
    const result = templateManager.createTemplate({
      stockName: stockName.trim(),
      stockCode: stockCode.trim(),
      issuePrice: issuePrice
    })
    
    if (result.success) {
      wx.showToast({
        title: '模板创建成功',
        icon: 'success'
      })
      
      this.setData({
        showAddModal: false
      })
      
      this.loadTemplates()
    } else {
      wx.showToast({
        title: '创建失败：' + result.error,
        icon: 'none'
      })
    }
  },

  // 编辑模板
  editTemplate(e) {
    const { template } = e.currentTarget.dataset
    
    this.setData({
      showEditModal: true,
      editingTemplate: template,
      formData: {
        stockName: template.stockName,
        stockCode: template.stockCode,
        issuePrice: template.issuePrice.toString()
      }
    })
  },

  // 关闭编辑弹窗
  closeEditModal() {
    this.setData({
      showEditModal: false,
      editingTemplate: null
    })
  },

  // 保存编辑
  saveEdit() {
    const { stockName, stockCode, issuePrice } = this.data.formData
    const { editingTemplate } = this.data
    
    // 验证输入
    if (!stockName || !stockName.trim()) {
      wx.showToast({
        title: '请输入股票名称',
        icon: 'none'
      })
      return
    }
    
    if (!stockCode || !stockCode.trim()) {
      wx.showToast({
        title: '请输入股票代码',
        icon: 'none'
      })
      return
    }
    
    if (!issuePrice || isNaN(parseFloat(issuePrice)) || parseFloat(issuePrice) <= 0) {
      wx.showToast({
        title: '请输入有效的发行价格',
        icon: 'none'
      })
      return
    }
    
    // 检查重复（排除当前模板）
    if (templateManager.isDuplicateTemplateName(stockName.trim(), editingTemplate.id)) {
      wx.showToast({
        title: '该股票名称已存在',
        icon: 'none'
      })
      return
    }
    
    // 更新模板
    const result = templateManager.updateTemplate(editingTemplate.id, {
      stockName: stockName.trim(),
      stockCode: stockCode.trim(),
      issuePrice: parseFloat(issuePrice)
    })
    
    if (result.success) {
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      })
      
      this.setData({
        showEditModal: false,
        editingTemplate: null
      })
      
      this.loadTemplates()
    } else {
      wx.showToast({
        title: '更新失败：' + result.error,
        icon: 'none'
      })
    }
  },

  // 删除模板
  deleteTemplate(e) {
    const { template } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除模板"${template.stockName}"吗？\n\n注意：删除模板不会影响已录入的股票记录。`,
      success: (res) => {
        if (res.confirm) {
          const result = templateManager.deleteTemplate(template.id)
          
          if (result.success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            
            this.loadTemplates()
          } else {
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 标记为已完成
  markAsCompleted(e) {
    const { template } = e.currentTarget.dataset
    
    wx.showModal({
      title: '标记为已完成',
      content: `确定将"${template.stockName}"标记为已完成吗？\n\n已完成的模板将在7天后自动清理。`,
      success: (res) => {
        if (res.confirm) {
          const result = templateManager.markTemplateCompleted(template.id)
          
          if (result.success) {
            wx.showToast({
              title: '已标记为完成',
              icon: 'success'
            })
            
            this.loadTemplates()
          }
        }
      }
    })
  },

  // 重新激活模板
  reactivateTemplate(e) {
    const { template } = e.currentTarget.dataset
    
    const result = templateManager.reactivateTemplate(template.id)
    
    if (result.success) {
      wx.showToast({
        title: '已重新激活',
        icon: 'success'
      })
      
      this.loadTemplates()
    }
  },

  // 进入多选模式
  enterSelectionMode() {
    this.setData({
      isSelectionMode: true,
      selectedTemplates: []
    })
  },

  // 退出多选模式
  exitSelectionMode() {
    this.setData({
      isSelectionMode: false,
      selectedTemplates: []
    })
  },

  // 切换模板选中状态
  toggleTemplateSelection(e) {
    const { id } = e.currentTarget.dataset
    const { selectedTemplates } = this.data
    
    const index = selectedTemplates.indexOf(id)
    if (index > -1) {
      selectedTemplates.splice(index, 1)
    } else {
      selectedTemplates.push(id)
    }
    
    this.setData({
      selectedTemplates: [...selectedTemplates]
    })
  },

  // 批量删除
  batchDelete() {
    const { selectedTemplates } = this.data
    
    if (selectedTemplates.length === 0) {
      wx.showToast({
        title: '请选择要删除的模板',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedTemplates.length} 个模板吗？`,
      success: (res) => {
        if (res.confirm) {
          const result = templateManager.batchDeleteTemplates(selectedTemplates)
          
          if (result.success) {
            wx.showToast({
              title: `已删除 ${result.count} 个模板`,
              icon: 'success'
            })
            
            this.setData({
              isSelectionMode: false,
              selectedTemplates: []
            })
            
            this.loadTemplates()
          }
        }
      }
    })
  },

  // 清理所有已完成的模板
  cleanCompletedTemplates() {
    wx.showModal({
      title: '清理已完成模板',
      content: '确定要清理所有已完成的模板吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          const result = templateManager.cleanCompletedTemplates()
          
          if (result.success) {
            wx.showToast({
              title: `已清理 ${result.count} 个模板`,
              icon: 'success'
            })
            
            this.loadTemplates()
          }
        }
      }
    })
  },

  // 使用模板（跳转到新增打新页面）
  useTemplate(e) {
    const { template } = e.currentTarget.dataset
    
    // 跳转到新增打新页面，传递模板ID
    wx.navigateTo({
      url: `/pages/add-stock/add-stock?templateId=${template.id}`
    })
  },

  // 批量录入（一键为所有账户录入）
  batchInputAll(e) {
    const { template } = e.currentTarget.dataset
    
    // 获取未使用该模板的账户
    const unusedAccounts = templateManager.getUnusedAccounts(template.id)
    
    if (unusedAccounts.length === 0) {
      wx.showToast({
        title: '所有账户已录入',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量录入',
      content: `将为 ${unusedAccounts.length} 个账户批量录入"${template.stockName}"`,
      success: (res) => {
        if (res.confirm) {
          // 跳转到批量录入页面
          wx.navigateTo({
            url: `/pages/batch-input/batch-input?templateId=${template.id}`
          })
        }
      }
    })
  }
})
