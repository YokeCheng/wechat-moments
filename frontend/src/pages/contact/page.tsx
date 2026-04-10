import { useState } from 'react';

const contactMethods = [
  {
    icon: 'ri-wechat-line',
    color: 'bg-green-50 text-green-600',
    title: '微信客服',
    desc: '扫码添加微信，工作日 9:00–18:00 在线',
    action: '扫码添加',
  },
  {
    icon: 'ri-mail-line',
    color: 'bg-orange-50 text-orange-500',
    title: '邮件支持',
    desc: 'support@baolem.com，24小时内回复',
    action: 'support@baolem.com',
  },
  {
    icon: 'ri-qq-line',
    color: 'bg-sky-50 text-sky-500',
    title: '官方交流群',
    desc: '加入用户交流群，获取最新功能更新',
    action: '申请加群',
  },
];

const ContactPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', type: '功能建议', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'message') setCharCount(value.length);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;
    if (charCount > 500) return;
    setSubmitting(true);
    try {
      const body = new URLSearchParams();
      body.append('name', formData.name);
      body.append('email', formData.email);
      body.append('type', formData.type);
      body.append('message', formData.message);
      await fetch('https://readdy.ai/api/form/d7ac94n6e3lk97049p9g', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F7F8FA]">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-8 py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-500 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <i className="ri-customer-service-2-line text-sm" />
            联系我们
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">我们随时在这里</h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-xl mx-auto">
            有任何问题、建议或合作意向，欢迎随时联系我们。我们会在第一时间回复你。
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left: contact methods */}
          <div className="lg:col-span-2 space-y-5">
            <h2 className="text-base font-bold text-gray-900">联系方式</h2>
            {contactMethods.map((m) => (
              <div key={m.title} className="bg-white rounded-xl p-5 flex items-start gap-4">
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 ${m.color}`}>
                  <i className={`${m.icon} text-lg`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 mb-0.5">{m.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed mb-2">{m.desc}</p>
                  <span className="text-xs font-medium text-orange-500 cursor-pointer hover:text-orange-600 transition-colors">{m.action}</span>
                </div>
              </div>
            ))}

            {/* Business hours */}
            <div className="bg-white rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i className="ri-time-line text-orange-500" />
                工作时间
              </h3>
              <div className="space-y-2">
                {[
                  { day: '周一 ~ 周五', time: '09:00 – 18:00' },
                  { day: '周六', time: '10:00 – 16:00' },
                  { day: '周日', time: '休息' },
                ].map((row) => (
                  <div key={row.day} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{row.day}</span>
                    <span className={`font-medium ${row.time === '休息' ? 'text-gray-300' : 'text-gray-700'}`}>{row.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl p-7">
              <h2 className="text-base font-bold text-gray-900 mb-5">发送消息</h2>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-14 h-14 flex items-center justify-center rounded-full bg-green-50">
                    <i className="ri-checkbox-circle-line text-green-500 text-3xl" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-gray-900 mb-1">消息已发送！</p>
                    <p className="text-sm text-gray-400">我们会在 24 小时内通过邮件回复你</p>
                  </div>
                  <button
                    onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', type: '功能建议', message: '' }); setCharCount(0); }}
                    className="text-sm text-orange-500 hover:text-orange-600 font-medium cursor-pointer transition-colors whitespace-nowrap"
                  >
                    再发一条
                  </button>
                </div>
              ) : (
                <form data-readdy-form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">姓名 <span className="text-red-400">*</span></label>
                      <input
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="你的名字"
                        required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors placeholder-gray-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">邮箱 <span className="text-red-400">*</span></label>
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors placeholder-gray-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">反馈类型</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={(e) => handleChange('type', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors bg-white cursor-pointer"
                    >
                      {['功能建议', '问题反馈', '商务合作', '账号问题', '其他'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-600">消息内容 <span className="text-red-400">*</span></label>
                      <span className={`text-xs ${charCount > 500 ? 'text-red-400' : 'text-gray-300'}`}>{charCount}/500</span>
                    </div>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      placeholder="请详细描述你的问题或建议..."
                      required
                      maxLength={500}
                      rows={5}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors resize-none placeholder-gray-300"
                    />
                    {charCount > 500 && (
                      <p className="text-xs text-red-400 mt-1">内容不能超过 500 字</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || charCount > 500}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {submitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin text-sm" />
                        发送中...
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-line text-sm" />
                        发送消息
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
