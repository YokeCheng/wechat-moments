import { hotSearchList } from '@/mocks/articles';

const rankColors = ['text-red-500 font-black', 'text-orange-500 font-black', 'text-yellow-500 font-black'];

const formatHeat = (n: number) => {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万`;
  return n.toLocaleString();
};

const HotSearchList = () => {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* 固定头部 */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 flex-shrink-0">
        <div className="w-4 h-4 flex items-center justify-center">
          <i className="ri-fire-line text-orange-500 text-sm" />
        </div>
        <span className="text-sm font-semibold text-gray-800">今日热搜榜</span>
        <span className="text-xs text-gray-400 ml-1">实时更新</span>
        <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
          <div className="w-3 h-3 flex items-center justify-center">
            <i className="ri-refresh-line text-xs" />
          </div>
          刚刚更新
        </div>
      </div>

      {/* 滚动列表 */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-50">
        {hotSearchList.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-orange-50/20 transition-colors cursor-pointer group">
            <span className={`w-6 text-center text-sm ${rankColors[item.rank - 1] || 'text-gray-400 font-medium'}`}>
              {item.rank}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 truncate group-hover:text-orange-500 transition-colors">{item.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{item.field}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">热度 {formatHeat(item.heat)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.trend === 'up' && (
                <span className="flex items-center gap-0.5 text-xs text-red-500">
                  <i className="ri-arrow-up-s-line text-sm" />升
                </span>
              )}
              {item.trend === 'down' && (
                <span className="flex items-center gap-0.5 text-xs text-green-500">
                  <i className="ri-arrow-down-s-line text-sm" />降
                </span>
              )}
              {item.trend === 'stable' && <span className="text-xs text-gray-400">平</span>}
              <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md bg-orange-500 text-white text-xs cursor-pointer whitespace-nowrap">
                仿写
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotSearchList;
