# WXS语法错误修复说明

## 问题描述
在使用WXS模块时出现语法错误：
```
./utils/formatter.wxs:30:32:Unexpected token `/`
```

## 根本原因
**WXS不支持正则表达式**。原代码中使用了正则表达式来添加千位分隔符：
```javascript
parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
```

微信小程序的WXS是JavaScript的简化版本，不支持：
- 正则表达式（RegExp）
- 复杂的ES6语法
- 内嵌函数定义（在某些版本中）

## 解决方案
### 1. 手动实现千位分隔符
用循环替代正则表达式：
```javascript
// 添加千位分隔符
var result = ''
var len = intPart.length

for (var i = 0; i < len; i++) {
  // 每三位添加逗号
  if (i > 0) {
    var remaining = len - i
    if (remaining % 3 === 0) {
      result = result + ','
    }
  }
  result = result + intPart.charAt(i)
}
```

### 2. 简化语法结构
- 移除三元运算符的复杂嵌套
- 使用明确的if-else结构
- 避免函数内部定义函数
- 使用字符串拼接而非模板字符串

### 3. 保守的变量处理
```javascript
// 原来的写法（可能有兼容性问题）
var symbol = currency === 'CNY' ? '¥' : 'HK$'

// 修改后的写法（更兼容）
var symbol = 'HK$'
if (currency === 'CNY') {
  symbol = '¥'
}
```

## 修复后的功能
### formatAmount(amount, currency, showSign)
- ✅ 金额格式化
- ✅ 千位分隔符（手动实现）
- ✅ 货币符号显示
- ✅ 正负号处理
- ✅ 小数位控制（固定2位）

### formatDate(timestamp)
- ✅ 日期时间格式化
- ✅ 零补位处理
- ✅ 简短格式显示（MM/DD HH:mm）

### calculateAvailable(balance, frozen)
- ✅ 可用资金计算
- ✅ 空值安全处理
- ✅ 数字类型转换

## 兼容性考虑
### WXS限制
1. **不支持正则表达式**
2. **不支持复杂的ES6语法**
3. **变量作用域有限制**
4. **函数定义需要在顶层**

### 最佳实践
1. **使用简单的语法结构**
2. **避免复杂的嵌套表达式**
3. **明确的类型转换**
4. **详细的错误处理**

## 测试验证
- ✅ 语法检查通过
- ✅ WXML文件无编译错误
- ✅ 金额格式化效果正确
- ✅ 千位分隔符正常显示

## 使用示例
```xml
<!-- WXML中的使用 -->
{{formatter.formatAmount(1234.56, 'HKD')}}
<!-- 输出：HK$1,234.56 -->

{{formatter.formatAmount(1234.56, 'CNY')}}
<!-- 输出：¥1,234.56 -->

{{formatter.calculateAvailable(1000, 200)}}
<!-- 输出：800 -->
```

修复完成时间：2025年7月13日
修复状态：✅ 完成
