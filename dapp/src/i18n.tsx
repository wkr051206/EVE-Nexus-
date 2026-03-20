import React from 'react';

export type Language = 'en' | 'zh';

type Dictionary = {
  nav: {
    dashboard: string;
    trade: string;
    admin: string;
    disconnect: string;
    connected: string;
    command: string;
    chinese: string;
  };
  landing: {
    badge: string;
    title: string;
    subtitle: string;
    trackedRegions: string;
    trackedRegionsDesc: string;
    pricingModel: string;
    pricingModelDesc: string;
    demoMode: string;
    demoModeDesc: string;
    proves: string;
    provesItems: string[];
    ships: string;
    shipsItems: string[];
  };
  wallet: {
    title: string;
    subtitle: string;
    installed: string;
    unavailable: string;
    noWallets: string;
    install: string;
    connectButton: string;
    noteTitle: string;
    noteBody: string;
  };
  dashboard: {
    badge: string;
    title: string;
    subtitle: string;
    loadingSubtitle: string;
    refresh: string;
    lastUpdated: string;
    signal: string;
    signalValue: string;
    attention: string;
    attentionValue: string;
    action: string;
    actionValue: string;
    activeRegions: string;
    totalVolume: string;
    totalRevenue: string;
    avgPriceChange: string;
    priceTrend: string;
    priceTrendDesc: string;
    resourceDistribution: string;
    resourceDistributionDesc: string;
    resourceFlow: string;
    resourceFlowDesc: string;
    systemStatus: string;
    systemStatusDesc: string;
    networkStatus: string;
    operational: string;
    networkCongestion: string;
    level: string;
    units: string;
  };
  trade: {
    badge: string;
    title: string;
    subtitle: string;
    tip1: string;
    tip2: string;
    tip3: string;
    createTrade: string;
    createTradeDesc: string;
    fromRegion: string;
    toRegion: string;
    amount: string;
    amountPlaceholder: string;
    priorityPass: string;
    execute: string;
    executing: string;
    estimate: string;
    estimateLoading: string;
    estimateEmpty: string;
    totalFee: string;
    estimatedTime: string;
    congestion: string;
    discountApplied: string;
    routeInfo: string;
    from: string;
    to: string;
    baseFee: string;
    perUnit: string;
    bestRoutes: string;
    bestRoutesDesc: string;
    low: string;
    medium: string;
    high: string;
    success: string;
    fail: string;
    selectRegion: string;
  };
  admin: {
    badge: string;
    title: string;
    subtitle: string;
    createRegion: string;
    createRegionTitle: string;
    close: string;
    cancel: string;
    creating: string;
    regionName: string;
    regionNamePlaceholder: string;
    resourceType: string;
    resourceTypePlaceholder: string;
    initialStock: string;
    maxCapacity: string;
    consumptionRate: string;
    productionRate: string;
    totalUsers: string;
    dailyVolume: string;
    activeRegions: string;
    systemHealth: string;
    overview: string;
    regions: string;
    pricing: string;
    treasury: string;
    recentActivity: string;
    systemAlerts: string;
    highCongestionWarning: string;
    highCongestionBody: string;
    lowBalanceAlert: string;
    lowBalanceBody: string;
    regionManagement: string;
    pricingConfig: string;
    treasuryManagement: string;
    name: string;
    stock: string;
    capacity: string;
    status: string;
    actions: string;
    currentPrice: string;
    basePrice: string;
    model: string;
    balance: string;
    minThreshold: string;
    maxThreshold: string;
    good: string;
    active: string;
    maintenance: string;
    activity1: string;
    activity2: string;
    activity3: string;
    activity4: string;
    minutesAgo2: string;
    minutesAgo5: string;
    minutesAgo12: string;
    hourAgo1: string;
  };
  notFound: {
    title: string;
    subtitle: string;
    helper: string;
    contact: string;
  };
  footer: {
    description: string;
    quickLinks: string;
    resources: string;
    community: string;
    copyright: string;
    motto: string;
  };
};

const dictionary: Record<Language, Dictionary> = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      trade: 'Trade',
      admin: 'Admin',
      disconnect: 'Disconnect',
      connected: 'Connected:',
      command: 'Economic Command',
      chinese: '中文',
    },
    landing: {
      badge: 'Dynamic Economic Regulator',
      title: 'Build a living economy for EVE Frontier',
      subtitle: 'A demo-ready command center for dynamic pricing, cross-region treasury balancing, and congestion-aware gate fees on Sui.',
      trackedRegions: 'Tracked Regions',
      trackedRegionsDesc: 'Resource stock and treasury state in sync',
      pricingModel: 'Pricing Model',
      pricingModelDesc: 'Supply-demand and congestion driven',
      demoMode: 'Demo Mode',
      demoModeDesc: 'Wallet UX and mock chain data are ready',
      proves: 'What this demo proves',
      provesItems: [
        'Real-time dashboard for regional supply, price, and congestion',
        'Trade planner with route fees and priority discount simulation',
        'Admin console for region, pricing, and treasury governance',
      ],
      ships: 'What ships today',
      shipsItems: [
        'Single front-end architecture with router-based pages',
        'Hackathon-safe data layer that can be swapped for live Sui reads',
        'Docs package with README, design notes, and pitch script',
      ],
    },
    wallet: {
      title: 'Connect Your Wallet',
      subtitle: 'Connect EVE Vault or any Sui wallet to access the dashboard, trading simulator, and admin console.',
      installed: 'Installed',
      unavailable: 'Unavailable',
      noWallets: 'No wallets detected. Install a Sui-compatible wallet to continue.',
      install: 'Install',
      connectButton: 'Connect Wallet',
      noteTitle: 'Testnet mode',
      noteBody: 'Connected to Sui testnet. Install EVE Vault for the full EVE Frontier experience, or use any Sui-compatible wallet.',
    },
    dashboard: {
      badge: 'Live Economy Monitor',
      title: 'Economic Dashboard',
      subtitle: 'A cinematic control layer for pricing pressure, regional liquidity, and gate traffic across EVE Frontier.',
      loadingSubtitle: 'Real-time economic data and analytics',
      refresh: 'Refresh Feed',
      lastUpdated: 'Last updated',
      signal: 'Signal',
      signalValue: 'Balanced but tightening',
      attention: 'Attention',
      attentionValue: 'Delta route volatility rising',
      action: 'Action',
      actionValue: 'Treasury rebalance recommended',
      activeRegions: 'Active Regions',
      totalVolume: 'Total Volume (SUI)',
      totalRevenue: 'Total Revenue (SUI)',
      avgPriceChange: 'Avg Price Change',
      priceTrend: 'Price Trend (24h)',
      priceTrendDesc: 'Elastic pricing is responding smoothly to regional demand shifts.',
      resourceDistribution: 'Resource Distribution',
      resourceDistributionDesc: 'Inventory saturation reveals which regions can export and which need support.',
      resourceFlow: 'Resource Flow',
      resourceFlowDesc: 'Trade corridors reveal where economic pressure is forming next.',
      systemStatus: 'System Status',
      systemStatusDesc: 'Operator alerts summarize whether the network is healthy, stressed, or drifting.',
      networkStatus: 'Network Status',
      operational: 'Operational',
      networkCongestion: 'Network Congestion',
      level: 'Level',
      units: 'units',
    },
    trade: {
      badge: 'Trade Planner',
      title: 'Resource Trading',
      subtitle: 'Simulate route economics before execution. Compare congestion, fee pressure, and priority-pass discounts in one place.',
      tip1: 'Priority routing can reduce fees by 20% on supported corridors.',
      tip2: 'Each route reflects local price pressure and congestion state.',
      tip3: 'Best routes are surfaced for operators who need fast action.',
      createTrade: 'Create Trade',
      createTradeDesc: 'Choose a corridor, model the fee, then execute the demo transaction.',
      fromRegion: 'From Region',
      toRegion: 'To Region',
      amount: 'Amount (units)',
      amountPlaceholder: 'Enter amount',
      priorityPass: 'Use Priority Pass (20% fee discount)',
      execute: 'Execute Trade',
      executing: 'Executing Trade...',
      estimate: 'Trade Estimate',
      estimateLoading: 'Calculating estimate...',
      estimateEmpty: 'Select regions to see trade estimate',
      totalFee: 'Total Fee',
      estimatedTime: 'Estimated Time',
      congestion: 'Congestion Level',
      discountApplied: 'Discount Applied',
      routeInfo: 'Route Information',
      from: 'From',
      to: 'To',
      baseFee: 'Base Fee',
      perUnit: 'per unit',
      bestRoutes: 'Best Routes',
      bestRoutesDesc: 'Fast picks for live operations when you need the cheapest reliable corridor.',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      success: 'Trade executed successfully!',
      fail: 'Trade execution failed. Please try again.',
      selectRegion: 'Select a region',
    },
    admin: {
      badge: 'Operator Console',
      title: 'Admin Panel',
      subtitle: 'Manage regions, tune pricing policy, and watch treasury thresholds before local imbalances become system-wide failures.',
      createRegion: 'Create Region',
      createRegionTitle: 'Create New Region',
      close: 'Close',
      cancel: 'Cancel',
      creating: 'Creating...',
      regionName: 'Region Name',
      regionNamePlaceholder: 'Enter region name',
      resourceType: 'Resource Type',
      resourceTypePlaceholder: 'Enter resource type',
      initialStock: 'Initial Stock',
      maxCapacity: 'Max Capacity',
      consumptionRate: 'Consumption Rate',
      productionRate: 'Production Rate',
      totalUsers: 'Total Users',
      dailyVolume: 'Daily Volume (SUI)',
      activeRegions: 'Active Regions',
      systemHealth: 'System Health',
      overview: 'Overview',
      regions: 'Regions',
      pricing: 'Pricing',
      treasury: 'Treasury',
      recentActivity: 'Recent Activity',
      systemAlerts: 'System Alerts',
      highCongestionWarning: 'High Congestion Warning',
      highCongestionBody: 'Region 3 is experiencing elevated traffic.',
      lowBalanceAlert: 'Low Balance Alert',
      lowBalanceBody: 'Region 2 treasury is below the preferred threshold.',
      regionManagement: 'Region Management',
      pricingConfig: 'Pricing Configuration',
      treasuryManagement: 'Treasury Management',
      name: 'Name',
      stock: 'Stock',
      capacity: 'Capacity',
      status: 'Status',
      actions: 'Actions',
      currentPrice: 'Current Price',
      basePrice: 'Base Price',
      model: 'Model',
      balance: 'Balance (SUI)',
      minThreshold: 'Min Threshold',
      maxThreshold: 'Max Threshold',
      good: 'Good',
      active: 'Active',
      maintenance: 'Maintenance',
      activity1: 'Region Alpha: Price updated',
      activity2: 'New user registered',
      activity3: 'Treasury rebalanced',
      activity4: 'High congestion detected',
      minutesAgo2: '2 min ago',
      minutesAgo5: '5 min ago',
      minutesAgo12: '12 min ago',
      hourAgo1: '1 hour ago',
    },
    notFound: {
      title: '404 - Page Not Found',
      subtitle: "The page you're looking for doesn't exist or has been moved.",
      helper: 'You can go back to the dashboard or check out these pages:',
      contact: 'If you believe this is an error, please contact the administrator.',
    },
    footer: {
      description: 'Dynamic Economic Regulator for EVE Frontier',
      quickLinks: 'Quick Links',
      resources: 'Resources',
      community: 'Community',
      copyright: '© 2026 Dynamic Economic Regulator. Built for the EVE Frontier Hackathon.',
      motto: 'In code we rebuild civilization.',
    },
  },
  zh: {
    nav: {
      dashboard: '总览',
      trade: '交易',
      admin: '管理',
      disconnect: '断开连接',
      connected: '已连接：',
      command: '经济控制台',
      chinese: '中文',
    },
    landing: {
      badge: '动态经济调节器',
      title: '为 EVE Frontier 构建一个会呼吸的经济系统',
      subtitle: '一个面向动态定价、跨区域金库调节与拥堵感知星门费用的演示级指挥中枢。',
      trackedRegions: '监控区域',
      trackedRegionsDesc: '资源库存与金库状态保持同步',
      pricingModel: '定价模型',
      pricingModelDesc: '由供需与拥堵共同驱动',
      demoMode: '演示模式',
      demoModeDesc: '钱包交互与模拟链上数据都已就绪',
      proves: '这个 Demo 证明了什么',
      provesItems: [
        '实时展示区域供需、价格与拥堵状态的经济总览',
        '可模拟交易路径、费用和优先通行折扣的交易规划器',
        '可管理区域、定价与金库策略的运营控制台',
      ],
      ships: '当前已经交付',
      shipsItems: [
        '统一的前端路由与页面架构',
        '稳定的演示数据层，可切换到真实 Sui 读取',
        '可直接提交的 README、设计说明与演讲稿',
      ],
    },
    wallet: {
      title: '连接你的钱包',
      subtitle: '连接 EVE Vault 或任意 Sui 钱包，即可进入总览、交易模拟器和管理控制台。',
      installed: '已安装',
      unavailable: '不可用',
      noWallets: '未检测到钱包，请安装 Sui 兼容钱包后继续。',
      install: '安装',
      connectButton: '连接钱包',
      noteTitle: '测试网模式',
      noteBody: '当前连接到 Sui 测试网。安装 EVE Vault 可获得完整的 EVE Frontier 体验，也可使用任意 Sui 兼容钱包。',
    },
    dashboard: {
      badge: '实时经济监控',
      title: '经济总览',
      subtitle: '以更直观的方式观察价格压力、区域流动性与星门交通状态。',
      loadingSubtitle: '实时经济数据与分析面板',
      refresh: '刷新数据',
      lastUpdated: '最后更新',
      signal: '信号',
      signalValue: '整体平衡，但压力正在抬升',
      attention: '关注点',
      attentionValue: 'Delta 航线波动正在上升',
      action: '建议动作',
      actionValue: '建议触发金库再平衡',
      activeRegions: '活跃区域',
      totalVolume: '总交易量 (SUI)',
      totalRevenue: '总收益 (SUI)',
      avgPriceChange: '平均价格变化',
      priceTrend: '价格趋势（24 小时）',
      priceTrendDesc: '弹性定价正在平滑响应不同区域的需求变化。',
      resourceDistribution: '资源分布',
      resourceDistributionDesc: '库存饱和度可以直接看出哪些区域适合输出、哪些区域需要补给。',
      resourceFlow: '资源流向',
      resourceFlowDesc: '贸易走廊的变化反映了下一波经济压力会出现在哪里。',
      systemStatus: '系统状态',
      systemStatusDesc: '从运营视角汇总网络健康度、更新时间与拥堵情况。',
      networkStatus: '网络状态',
      operational: '运行正常',
      networkCongestion: '网络拥堵',
      level: '等级',
      units: '单位',
    },
    trade: {
      badge: '交易规划器',
      title: '资源交易',
      subtitle: '在执行前模拟路线经济性，对比拥堵程度、费用压力和优先通行折扣。',
      tip1: '在支持的航线上，优先通行可降低 20% 费用。',
      tip2: '每条路径都会反映本地价格压力与拥堵状态。',
      tip3: '系统会给出适合快速操作的优选路线。',
      createTrade: '创建交易',
      createTradeDesc: '选择一条路径，先估算成本，再执行演示交易。',
      fromRegion: '源区域',
      toRegion: '目标区域',
      amount: '数量（单位）',
      amountPlaceholder: '输入数量',
      priorityPass: '使用优先通行（费用减免 20%）',
      execute: '执行交易',
      executing: '正在执行交易...',
      estimate: '交易估算',
      estimateLoading: '正在计算估算...',
      estimateEmpty: '选择区域后即可查看交易估算',
      totalFee: '总费用',
      estimatedTime: '预计耗时',
      congestion: '拥堵等级',
      discountApplied: '已应用折扣',
      routeInfo: '路径信息',
      from: '起点',
      to: '终点',
      baseFee: '基础费用',
      perUnit: '每单位',
      bestRoutes: '推荐路线',
      bestRoutesDesc: '适合现场快速决策的低成本稳定路线。',
      low: '低',
      medium: '中',
      high: '高',
      success: '交易执行成功！',
      fail: '交易执行失败，请稍后重试。',
      selectRegion: '选择区域',
    },
    admin: {
      badge: '运营控制台',
      title: '管理面板',
      subtitle: '管理区域、调节定价策略，并在局部失衡扩散前监控金库阈值。',
      createRegion: '创建区域',
      createRegionTitle: '创建新区域',
      close: '关闭',
      cancel: '取消',
      creating: '创建中...',
      regionName: '区域名称',
      regionNamePlaceholder: '输入区域名称',
      resourceType: '资源类型',
      resourceTypePlaceholder: '输入资源类型',
      initialStock: '初始库存',
      maxCapacity: '最大容量',
      consumptionRate: '消耗速率',
      productionRate: '生产速率',
      totalUsers: '总用户数',
      dailyVolume: '日交易量 (SUI)',
      activeRegions: '活跃区域',
      systemHealth: '系统健康度',
      overview: '概览',
      regions: '区域',
      pricing: '定价',
      treasury: '金库',
      recentActivity: '最近活动',
      systemAlerts: '系统告警',
      highCongestionWarning: '高拥堵告警',
      highCongestionBody: '区域 3 的交通负载正在升高。',
      lowBalanceAlert: '低余额告警',
      lowBalanceBody: '区域 2 的金库余额低于建议阈值。',
      regionManagement: '区域管理',
      pricingConfig: '定价配置',
      treasuryManagement: '金库管理',
      name: '名称',
      stock: '库存',
      capacity: '容量',
      status: '状态',
      actions: '操作',
      currentPrice: '当前价格',
      basePrice: '基础价格',
      model: '模型',
      balance: '余额 (SUI)',
      minThreshold: '最小阈值',
      maxThreshold: '最大阈值',
      good: '良好',
      active: '活跃',
      maintenance: '维护中',
      activity1: '区域 Alpha：价格已更新',
      activity2: '新用户已注册',
      activity3: '金库已再平衡',
      activity4: '检测到高拥堵',
      minutesAgo2: '2 分钟前',
      minutesAgo5: '5 分钟前',
      minutesAgo12: '12 分钟前',
      hourAgo1: '1 小时前',
    },
    notFound: {
      title: '404 - 页面不存在',
      subtitle: '你访问的页面不存在，或者已经被移动。',
      helper: '你可以返回总览，或者进入以下页面：',
      contact: '如果你认为这是系统错误，请联系管理员。',
    },
    footer: {
      description: '面向 EVE Frontier 的动态经济调节器',
      quickLinks: '快速链接',
      resources: '资料',
      community: '社区',
      copyright: '© 2026 Dynamic Economic Regulator，EVE Frontier Hackathon 作品。',
      motto: '我们在代码中重建文明。',
    },
  },
};

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Dictionary;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = React.useState<Language>(() => {
    if (typeof window === 'undefined') {
      return 'en';
    }
    const stored = window.localStorage.getItem('der-language');
    return stored === 'zh' ? 'zh' : 'en';
  });

  const setLanguage = React.useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem('der-language', next);
  }, []);

  const value = React.useMemo(
    () => ({
      language,
      setLanguage,
      t: dictionary[language],
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
