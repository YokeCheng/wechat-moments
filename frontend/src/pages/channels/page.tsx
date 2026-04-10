import { useState } from 'react';

const mockChannels = [
  { id: 1, name: '科技前沿观察', avatar: 'https://readdy.ai/api/search-image?query=tech%20science%20logo%20icon%20minimal%20clean&width=48&height=48&seq=c1&orientation=squarish', followers: 128400, articles: 342, authorized: true, lastSync: '10分钟前' },
  { id: 2, name: '职场成长日记', avatar: 'https://readdy.ai/api/search-image?query=career%20growth%20office%20professional%20logo%20minimal&width=48&height=48&seq=c2&orientation=squarish', followers: 56700, articles: 189, authorized: true, lastSync: '1小时前' },
  { id: 3, name: '美食探店记录', avatar: 'https://readdy.ai/api/search-image?query=food%20restaurant%20gourmet%20logo%20minimal%20clean&width=48&height=48&seq=c3&orientation=squarish', followers: 234100, articles: 567, authorized: true, lastSync: '3小时前' },
];

const ChannelsPage = () => {
  const [channels] = useState(mockChannels);
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F7F8FA]">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">公众号管理</h2>
            <p className="text-xs text-gray-400 mt-0.5">管理已授权的公众号，一键发布内容</p>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-add-line text-sm" />
            </div>
            授权公众号
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-4 overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((ch) => (
            <div key={ch.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <img src={ch.avatar} alt={ch.name} className="w-12 h-12 rounded-xl object-cover object-top" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{ch.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-medium">已授权</span>
                    <span className="text-xs text-gray-400">· {ch.lastSync}同步</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-base font-bold text-gray-800 font-mono">{(ch.followers / 10000).toFixed(1)}万</p>
                  <p className="text-xs text-gray-400 mt-0.5">粉丝数</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-base font-bold text-gray-800 font-mono">{ch.articles}</p>
                  <p className="text-xs text-gray-400 mt-0.5">文章数</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg bg-orange-50 text-orange-500 text-xs font-medium hover:bg-orange-100 cursor-pointer whitespace-nowrap transition-colors">
                  发布文章
                </button>
                <button className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 cursor-pointer whitespace-nowrap transition-colors">
                  查看数据
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 cursor-pointer transition-colors">
                  <i className="ri-delete-bin-line text-xs" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Card */}
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-3 hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer min-h-[200px]"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-orange-50">
              <i className="ri-add-line text-2xl text-orange-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">授权新公众号</p>
              <p className="text-xs text-gray-400 mt-0.5">点击添加并授权</p>
            </div>
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[400px] max-w-[90vw] text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">授权公众号</h3>
              <button onClick={() => setShowAuthModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="w-32 h-32 flex items-center justify-center mx-auto mb-4 bg-gray-50 rounded-2xl">
              <i className="ri-qr-code-line text-6xl text-gray-300" />
            </div>
            <p className="text-sm text-gray-600 mb-1">使用微信扫描二维码</p>
            <p className="text-xs text-gray-400">在微信中完成公众号授权操作</p>
            <div className="mt-5 p-3 bg-orange-50 rounded-xl">
              <p className="text-xs text-orange-600">授权后即可在平台直接发布文章到公众号</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelsPage;
