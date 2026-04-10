import { useState } from 'react';
import { prompts as initialPrompts, promptCategories as initialCategories } from '@/mocks/prompts';
import type { PromptStatus } from '@/mocks/prompts';

const statusConfig: Record<PromptStatus, { label: string; color: string; bg: string; icon: string }> = {
  active:     { label: '启用中', color: 'text-green-600',  bg: 'bg-green-50',  icon: 'ri-checkbox-circle-line' },
  draft:      { label: '草稿',   color: 'text-gray-400',   bg: 'bg-gray-100',  icon: 'ri-draft-line' },
  generating: { label: '生成中', color: 'text-orange-500', bg: 'bg-orange-50', icon: 'ri-loader-4-line' },
};

const PromptsPage = () => {
  const [categories, setCategories] = useState(initialCategories);
  const [prompts, setPrompts] = useState(initialPrompts);
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modals
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showAddPromptModal, setShowAddPromptModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditCatModal, setShowEditCatModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<typeof initialPrompts[0] | null>(null);
  const [editingCat, setEditingCat] = useState<typeof initialCategories[0] | null>(null);

  // Form state
  const [newCatName, setNewCatName] = useState('');
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptCat, setNewPromptCat] = useState('情感');
  const [newPromptContent, setNewPromptContent] = useState('');

  const filtered = prompts.filter((p) => {
    if (activeCategoryId !== 'all' && p.categoryId !== activeCategoryId) return false;
    if (searchText && !p.title.includes(searchText) && !p.content.includes(searchText)) return false;
    return true;
  });

  const handleCopy = (id: number, content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newId = newCatName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    setCategories((prev) => [...prev, { id: newId, name: newCatName.trim(), count: 0 }]);
    setNewCatName('');
    setShowAddCatModal(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (id === 'all') return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (activeCategoryId === id) setActiveCategoryId('all');
  };

  const handleAddPrompt = () => {
    if (!newPromptTitle.trim()) return;
    const cat = categories.find((c) => c.name === newPromptCat);
    const newPrompt = {
      id: Date.now(),
      title: newPromptTitle.trim(),
      category: newPromptCat,
      categoryId: cat?.id || 'all',
      tags: [],
      content: newPromptContent.trim(),
      usageCount: 0,
      status: 'draft' as PromptStatus,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setPrompts((prev) => [newPrompt, ...prev]);
    setCategories((prev) => prev.map((c) => c.id === newPrompt.categoryId ? { ...c, count: c.count + 1 } : c));
    setNewPromptTitle('');
    setNewPromptContent('');
    setShowAddPromptModal(false);
  };

  const handleToggleStatus = (id: number) => {
    setPrompts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const next: PromptStatus = p.status === 'active' ? 'draft' : 'active';
      return { ...p, status: next };
    }));
  };

  const handleDeletePrompt = (id: number) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#F7F8FA]">

      {/* Left Sidebar: Category Management */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">分类管理</span>
            <button
              onClick={() => setShowAddCatModal(true)}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors cursor-pointer"
              title="新建分类"
            >
              <i className="ri-add-line text-sm" />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                activeCategoryId === cat.id
                  ? 'bg-orange-50 border-r-2 border-orange-500'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setActiveCategoryId(cat.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <i className={`ri-folder-line text-sm ${activeCategoryId === cat.id ? 'text-orange-500' : 'text-gray-400'}`} />
                </div>
                <span className={`text-sm truncate ${activeCategoryId === cat.id ? 'text-orange-500 font-semibold' : 'text-gray-600'}`}>
                  {cat.name}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  activeCategoryId === cat.id ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400'
                }`}>
                  {cat.id === 'all' ? prompts.length : prompts.filter((p) => p.categoryId === cat.id).length}
                </span>
                {cat.id !== 'all' && (
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setShowEditCatModal(true); }}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer"
                    >
                      <i className="ri-edit-line text-xs" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <i className="ri-delete-bin-line text-xs" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-50">
          <button
            onClick={() => setShowAddCatModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line text-xs" />
            新建分类
          </button>
        </div>
      </div>

      {/* Right: Prompt List */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <div>
            <span className="text-sm font-bold text-gray-800">{activeCategory?.name || '全部'}</span>
            <span className="text-xs text-gray-400 ml-2">{filtered.length} 个提示词</span>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white ml-auto w-52">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-search-line text-gray-400 text-sm" />
            </div>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索提示词..."
              className="flex-1 text-sm text-gray-600 placeholder-gray-300 outline-none bg-transparent"
            />
          </div>
          <button
            onClick={() => setShowAddPromptModal(true)}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-add-line text-sm" />
            </div>
            新建提示词
          </button>
        </div>

        {/* Table — flex col, fills remaining height */}
        <div className="flex-1 px-6 py-4 flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 mb-3">
                  <i className="ri-file-text-line text-2xl text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">暂无提示词</p>
                <p className="text-xs text-gray-300 mt-1">点击右上角「新建提示词」开始创建</p>
              </div>
            ) : (
              <>
                {/* thead 固定 */}
                <table className="w-full flex-shrink-0">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 font-medium">
                      <th className="text-left px-5 py-3">提示词名称</th>
                      <th className="text-left px-5 py-3 w-20">分类</th>
                      <th className="text-left px-5 py-3 w-24">状态</th>
                      <th className="text-left px-5 py-3 w-32">标签</th>
                      <th className="text-right px-5 py-3 w-24">使用次数</th>
                      <th className="text-left px-5 py-3 w-24">创建时间</th>
                      <th className="text-center px-5 py-3 w-44">操作</th>
                    </tr>
                  </thead>
                </table>
                {/* tbody 滚动 */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((prompt) => {
                        const sc = statusConfig[prompt.status];
                        return (
                          <tr key={prompt.id} className="hover:bg-orange-50/20 transition-colors group">
                            <td className="px-5 py-3 max-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{prompt.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{prompt.content}</p>
                            </td>
                            <td className="px-5 py-3 w-20">
                              <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">{prompt.category}</span>
                            </td>
                            <td className="px-5 py-3 w-24">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${sc.bg} ${sc.color}`}>
                                <i className={`${sc.icon} text-xs ${prompt.status === 'generating' ? 'animate-spin' : ''}`} />
                                {sc.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 w-32">
                              <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
                                {prompt.tags.slice(0, 2).map((tag) => (
                                  <span key={tag} className="text-xs bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">{tag}</span>
                                ))}
                                {prompt.tags.length > 2 && <span className="text-xs text-gray-300 flex-shrink-0">+{prompt.tags.length - 2}</span>}
                              </div>
                            </td>
                            <td className="px-5 py-3 w-24 text-right">
                              <span className="text-sm font-mono text-gray-700 whitespace-nowrap">{prompt.usageCount.toLocaleString()}</span>
                            </td>
                            <td className="px-5 py-3 w-24">
                              <span className="text-xs text-gray-400 whitespace-nowrap">{prompt.createdAt}</span>
                            </td>
                            <td className="px-5 py-3 w-44">
                              <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                                <button onClick={() => { setSelectedPrompt(prompt); setShowDetailModal(true); }} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer whitespace-nowrap">
                                  <i className="ri-eye-line text-xs" />查看
                                </button>
                                <button onClick={() => handleCopy(prompt.id, prompt.content)} className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${copiedId === prompt.id ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}>
                                  <i className={`${copiedId === prompt.id ? 'ri-check-line' : 'ri-file-copy-line'} text-xs`} />
                                  {copiedId === prompt.id ? '已复制' : '复制'}
                                </button>
                                <button onClick={() => handleToggleStatus(prompt.id)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer whitespace-nowrap">
                                  <i className={`${prompt.status === 'active' ? 'ri-pause-circle-line' : 'ri-play-circle-line'} text-xs`} />
                                  {prompt.status === 'active' ? '停用' : '启用'}
                                </button>
                                <button onClick={() => handleDeletePrompt(prompt.id)} className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                                  <i className="ri-delete-bin-line text-xs" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddCatModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[360px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">新建分类</h3>
              <button onClick={() => setShowAddCatModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">分类名称</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="例如：情感、教育、财经..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddCatModal(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer whitespace-nowrap transition-colors">取消</button>
              <button onClick={handleAddCategory} className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 cursor-pointer whitespace-nowrap transition-colors">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCatModal && editingCat && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowEditCatModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[360px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">编辑分类</h3>
              <button onClick={() => setShowEditCatModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">分类名称</label>
              <input
                type="text"
                defaultValue={editingCat.name}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
              />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowEditCatModal(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer whitespace-nowrap transition-colors">取消</button>
              <button onClick={() => setShowEditCatModal(false)} className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 cursor-pointer whitespace-nowrap transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Prompt Modal */}
      {showAddPromptModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddPromptModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[520px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">新建提示词</h3>
              <button onClick={() => setShowAddPromptModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">提示词标题 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  placeholder="给提示词起个名字..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">所属分类</label>
                <select
                  value={newPromptCat}
                  onChange={(e) => setNewPromptCat(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  {categories.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">提示词内容</label>
                <textarea
                  value={newPromptContent}
                  onChange={(e) => setNewPromptContent(e.target.value)}
                  placeholder="输入提示词内容，用{变量}表示可替换的部分..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors resize-none h-32"
                  maxLength={500}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddPromptModal(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer whitespace-nowrap transition-colors">取消</button>
              <button onClick={handleAddPrompt} className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 cursor-pointer whitespace-nowrap transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPrompt && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[640px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{selectedPrompt.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium">{selectedPrompt.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[selectedPrompt.status].bg} ${statusConfig[selectedPrompt.status].color}`}>
                    {statusConfig[selectedPrompt.status].label}
                  </span>
                  <span className="text-xs text-gray-400">使用 {selectedPrompt.usageCount.toLocaleString()} 次</span>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 mb-4 min-h-[240px] max-h-[400px] overflow-y-auto">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedPrompt.content}</p>
            </div>
            {selectedPrompt.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selectedPrompt.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(selectedPrompt.id, selectedPrompt.content)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer whitespace-nowrap transition-colors"
              >
                {copiedId === selectedPrompt.id ? '已复制 ✓' : '复制提示词'}
              </button>
              <button className="flex-1 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 cursor-pointer whitespace-nowrap transition-colors">
                立即生文
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptsPage;
