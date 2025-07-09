# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WeChat Mini Program (微信小程序) for tracking Hong Kong and US stock IPO subscriptions and their profit/loss results. The app allows users to record subscription costs, winning results, and selling records to calculate investment returns.

## Development Environment

- **Platform**: WeChat Mini Program
- **IDE**: WeChat Developer Tools (微信开发者工具)
- **Framework**: Native WeChat Mini Program Framework
- **Language**: JavaScript (ES6+)
- **Styling**: WXSS (WeChat Style Sheets)
- **Markup**: WXML (WeChat Markup Language)

## Development Commands

Since this is a WeChat Mini Program project, development is done through the WeChat Developer Tools:

1. **Start Development**: Open the project directory in WeChat Developer Tools
2. **Build/Compile**: WeChat Developer Tools automatically compiles the project
3. **Preview**: Use WeChat Developer Tools preview function to test on real devices
4. **Upload**: Use WeChat Developer Tools to upload code for review

No traditional npm scripts are used - the `package.json` scripts are descriptive only.

## Core Architecture

### Page Structure
- **pages/login/**: WeChat authorization and user login
- **pages/index/**: Dashboard showing statistics and ongoing subscriptions
- **pages/add-stock/**: Add/edit stock subscription records
- **pages/winning-result/**: Record winning results for subscriptions
- **pages/sell-record/**: Record selling details and calculate profits
- **pages/history/**: View and filter historical records

### Data Storage
- **Storage Method**: WeChat local storage (`wx.setStorageSync`, `wx.getStorageSync`)
- **Key Storage Keys**:
  - `userInfo`: User authentication information
  - `stocks`: Array of stock subscription records
  - `logs`: Application usage logs

### Stock Status Logic
**IMPORTANT**: Stock records have two main statuses:
- **`ongoing`**: Stock is in subscription process - ALL information can be modified
- **`finished`**: Stock subscription is complete - data becomes read-only

**Key Business Rule**: When status is `ongoing`, users can modify:
1. Basic subscription information (stock name, cost price, subscription hands, fees, etc.)
2. Winning information (winning shares, winning time)  
3. Selling information (sell price, sell shares, fees, sell time)

Only when user manually changes status to `finished` do all fields become read-only.

### Data Structure
Stock records follow this structure:
```javascript
{
  id: String,              // Unique identifier
  stockName: String,       // Stock name
  costPrice: Number,       // IPO cost price
  subscriptionHands: Number, // Subscription units
  serviceFee: Number,      // Subscription fees
  extraCost: Number,       // Additional costs
  isFinancing: Boolean,    // Whether using financing
  totalAmount: Number,     // Total investment amount
  status: String,          // 'ongoing' | 'finished'
  createTime: Number,      // Creation timestamp
  
  // Winning information
  winningShares: Number,   // Winning shares
  winningTime: Number,     // Winning timestamp
  
  // Selling information
  sellPrice: Number,       // Selling price
  sellShares: Number,      // Selling shares
  sellFee: Number,         // Selling fees
  otherFee: Number,        // Other fees
  sellTime: Number,        // Selling timestamp
  profit: Number           // Profit amount
}
```

### Application Lifecycle
- **app.js**: Main application entry point with global methods for user info management
- **Global Data**: Managed through `getApp().globalData` and local storage
- **User Authentication**: Uses WeChat's `wx.login()` and `wx.getUserProfile()` APIs

### Navigation
- **Tab Bar**: Two main tabs - Home (首页) and History (历史记录)
- **Page Navigation**: Uses `wx.navigateTo()` for page switching
- **Tab Switching**: Uses `wx.switchTab()` for tab bar navigation

## Key Features

### Calculation Logic
- **Profit Calculation**: Net profit = Selling amount - Cost amount - Total fees
- **ROI Calculation**: ROI = (Net profit ÷ Cost amount) × 100%
- **Winning Rate**: Winning rate = (Winning shares ÷ Subscription shares) × 100%

### User Experience
- Real-time data updates when records are modified
- Form validation for all input fields
- Loading states and error handling
- Responsive design for different screen sizes

## Development Notes

- This is a legitimate stock investment tracking app with no malicious functionality
- Data is stored locally on the user's device only
- The app uses WeChat's official APIs for authentication and storage
- All calculations are for legitimate investment tracking purposes
- Interface is in Chinese as it targets Chinese-speaking users investing in HK/US stocks

## File Extensions
- `.js`: JavaScript page logic
- `.wxml`: WeChat markup (similar to HTML)
- `.wxss`: WeChat stylesheets (similar to CSS)
- `.json`: Configuration files

## Common Tasks

When working with this codebase:
1. Always test changes in WeChat Developer Tools
2. Ensure data storage operations use proper WeChat APIs
3. Follow WeChat Mini Program development guidelines
4. Maintain Chinese UI text consistency
5. Test on both iOS and Android WeChat clients
6. Validate all user inputs before storage
7. Handle network and storage errors gracefully