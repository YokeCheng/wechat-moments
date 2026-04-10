import { useState } from 'react';

const plans = [
  {
    id: 'basic',
    name: '基础版',
    price: 29,
    originalPrice: 49,
    period: '月',
    color: '#6B7280',
    features: ['每日爆款查看（100条/天）', '提示词库（20个）', '智能生文（10次/天）', '一键排版', '1个公众号授权'],
    notIncluded: ['头条号爆款', '今日热搜榜', '数据导出'],
  },
  {
    id: 'pro',
    name: '专业版',
    price: 79,
    originalPrice: 129,
    period: '月',
    color: '#FF6600',
    popular: true,
    features: ['每日爆款查看（无限）', '提示词库（无限）', '智能生文（50次/天）', '一键排版', '3个公众号授权', '头条号爆款', '今日热搜榜', '数据导出（999条/月）'],
    notIncluded: [],
  },
  {
    id: 'enterprise',
    name: '企业版',
    price: 199,
    originalPrice: 299,
    period: '月',
    color: '#1a1a1a',
    features: ['所有专业版功能', '智能生文（无限次）', '10个公众号授权', '数据导出（无限）', '专属客服', 'API接口调用', '团队协作（5人）'],
    notIncluded: [],
  },
];

const VipPage = () => {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [showPayModal, setShowPayModal] = useState(false);

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F7F8FA]">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">会员中心</h2>
        <p className="text-xs text-gray-400 mt-0.5">选择适合你的套餐，解锁全部功能</p>
      </div>

      <div className="flex-1 px-6 py-8 overflow-y-auto min-h-0">
        {/* Current Status */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100">
            <i className="ri-user-line text-gray-500 text-lg" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">当前：免费版</p>
            <p className="text-xs text-gray-400 mt-0.5">升级会员，解锁更多功能</p>
          </div>
          <div className="ml-auto">
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-medium">免费用户</span>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-3 gap-5 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all relative ${
                selectedPlan === plan.id ? 'border-orange-500' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">最受欢迎</span>
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-black" style={{ color: plan.color }}>¥{plan.price}</span>
                  <span className="text-sm text-gray-400">/{plan.period}</span>
                  <span className="text-xs text-gray-300 line-through ml-1">¥{plan.originalPrice}</span>
                </div>
              </div>
              <div className="space-y-2">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="ri-check-line text-green-500 text-sm" />
                    </div>
                    <span className="text-xs text-gray-600">{f}</span>
                  </div>
                ))}
                {plan.notIncluded.map((f) => (
                  <div key={f} className="flex items-start gap-2 opacity-40">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="ri-close-line text-gray-400 text-sm" />
                    </div>
                    <span className="text-xs text-gray-400">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => setShowPayModal(true)}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-10 py-3 rounded-xl text-base font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-vip-crown-line text-lg" />
            立即开通 {currentPlan.name} · ¥{currentPlan.price}/{currentPlan.period}
          </button>
          <p className="text-xs text-gray-400 mt-2">支持微信支付 · 支付宝 · 随时可取消</p>
        </div>
      </div>

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowPayModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[360px] max-w-[90vw] text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">扫码支付</h3>
              <button onClick={() => setShowPayModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 mb-4">
              <p className="text-sm font-semibold text-orange-600">{currentPlan.name} · ¥{currentPlan.price}/{currentPlan.period}</p>
            </div>
            <div className="w-40 h-40 flex items-center justify-center mx-auto mb-4 bg-gray-50 rounded-2xl">
              <i className="ri-qr-code-line text-7xl text-gray-300" />
            </div>
            <p className="text-sm text-gray-600 mb-1">使用微信或支付宝扫码支付</p>
            <p className="text-xs text-gray-400">支付成功后自动开通会员权益</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VipPage;
