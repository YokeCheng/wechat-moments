import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { writerArticles as initialArticles, WriterArticle, WriterArticleStatus, writerGroups } from '@/mocks/writerArticles';
import { prompts } from '@/mocks/prompts';

const statusConfig: Record<WriterArticleStatus, { label: string; color: string; bg: string; icon: string }> = {
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-50', icon: 'ri-checkbox-circle-line' },
  generating: { label: '生成中', color: 'text-orange-500', bg: 'bg-orange-50', icon: 'ri-loader-4-line' },
  failed: { label: '生成失败', color: 'text-red-500', bg: 'bg-red-50', icon: 'ri-error-warning-line' },
  draft: { label: '草稿', color: 'text-gray-400', bg: 'bg-gray-100', icon: 'ri-file-edit-line' },
};

const WriterPage = () => {
  const [articles, setArticles] = useState<WriterArticle[]>(initialArticles);
  const [activeGroup, setActiveGroup] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [generating, setGenerating] = useState(false);

  const navigate = useNavigate();

  // Modals
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<WriterArticle | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form state
  const [newGroupName, setNewGroupName] = useState('');
  const [genTitle, setGenTitle] = useState('');
  const [genGroup, setGenGroup] = useState('');
  const [genPrompt, setGenPrompt] = useState('');
  const [genRefLink, setGenRefLink] = useState('');
  const [genImageCount, setGenImageCount] = useState(3);

  // Groups (remove '全部' from management)
  const [groups, setGroups] = useState(writerGroups.filter(g => g !== '全部'));

  const filtered = articles.filter((a) => {
    if (activeGroup !== '全部' && a.group !== activeGroup) return false;
    if (searchText && !a.title.includes(searchText)) return false;
    return true;
  });

  const activePrompts = prompts.filter((p) => p.status === 'active');

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    setGroups((prev) => [...prev, newGroupName.trim()]);
    setNewGroupName('');
    setShowAddGroupModal(false);
  };

  const handleDeleteGroup = (groupName: string) => {
    setGroups((prev) => prev.filter((g) => g !== groupName));
    if (activeGroup === groupName) setActiveGroup('全部');
  };

  const handleGenerate = () => {
    if (!genTitle.trim()) return;

    const foundPrompt = activePrompts.find((p) => String(p.id) === genPrompt);
    const promptTitle = foundPrompt ? foundPrompt.title : '';

    const newArticle: WriterArticle = {
      id: Date.now(),
      title: genTitle.trim(),
      group: genGroup,
      promptTitle,
      status: 'generating',
      wordCount: 0,
      createdAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/\//g, '-'),
      imageCount: genImageCount,
      refLink: genRefLink || undefined,
      content: '',
    };

    setArticles((prev) => [newArticle, ...prev]);
    setGenerating(true);
    setShowGenerateModal(false);

    // Reset form
    setGenTitle('');
    setGenGroup('');
    setGenPrompt('');
    setGenRefLink('');
    setGenImageCount(3);

    // Simulate async generation
    setTimeout(() => {
      setArticles((prev) =>
        prev.map((a) =>
          a.id === newArticle.id
            ? {
                ...a,
                status: 'completed',
                wordCount: Math.floor(Math.random() * 600) + 600,
                content: `# ${a.title}\n\n在这个信息爆炸的时代，每一个创作者都在寻找突破的方法。今天，我们来深入探讨这个话题，为你提供最实用的解决方案。\n\n## 一、问题的本质\n\n很多人在面对这个问题时，往往陷入了一个误区：他们以为只要努力就能成功。但事实上，方向比努力更重要。\n\n根据最新数据显示，超过80%的内容创作者在起步阶段都会遇到同样的困境——不知道如何找到自己的定位。\n\n## 二、三个核心策略\n\n**策略一：精准定位你的受众**\n\n在开始创作之前，你需要清楚地知道你的内容是为谁而写的。不同的受众有不同的需求和痛点。\n\n**策略二：建立内容创作系统**\n\n成功的创作者都有一套属于自己的内容生产流程。从选题、写作到发布，每个环节都需要标准化。\n\n**策略三：数据驱动优化**\n\n定期分析你的内容数据，找出表现最好的内容类型，然后持续复制这种成功。\n\n## 三、立即行动\n\n理论再好，不如立即行动。从今天开始，按照上面的三个策略，制定你的内容创作计划。\n\n记住：成功不是一蹴而就的，但只要坚持正确的方法，你一定能够实现突破。`,
              }
            : a
        )
      );
      setGenerating(false);
    }, 3000);
  };

  const handleUpdate = (updated: Partial<WriterArticle>) => {
    if (!editingArticle) return;
    setArticles((prev) =>
      prev.map((a) => (a.id === editingArticle.id ? { ...a, ...updated } : a))
    );
    setShowEditModal(false);
    setEditingArticle(null);
  };

  const handleDelete = () => {
    if (deletingId === null) return;
    setArticles((prev) => prev.filter((a) => a.id !== deletingId));
    setDeletingId(null);
  };

  const handleGoLayout = (article: WriterArticle) => {
    navigate(`/layout?content=${encodeURIComponent(article.content)}`);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#F7F8FA]">

      {/* Left Sidebar: Group Management */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">分组管理</span>
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors cursor-pointer"
              title="新建分组"
            >
              <i className="ri-add-line text-sm" />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {/* All */}
          <div
            className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
              activeGroup === '全部'
                ? 'bg-orange-50 border-r-2 border-orange-500'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setActiveGroup('全部')}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <i className={`ri-folder-line text-sm ${activeGroup === '全部' ? 'text-orange-500' : 'text-gray-400'}`} />
              </div>
              <span className={`text-sm truncate ${activeGroup === '全部' ? 'text-orange-500 font-semibold' : 'text-gray-600'}`}>
                全部
              </span>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              activeGroup === '全部' ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400'
            }`}>
              {articles.length}
            </span>
          </div>

          {/* Groups */}
          {groups.map((group) => (
            <div
              key={group}
              className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                activeGroup === group
                  ? 'bg-orange-50 border-r-2 border-orange-500'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setActiveGroup(group)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <i className={`ri-folder-line text-sm ${activeGroup === group ? 'text-orange-500' : 'text-gray-400'}`} />
                </div>
                <span className={`text-sm truncate ${activeGroup === group ? 'text-orange-500 font-semibold' : 'text-gray-600'}`}>
                  {group}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  activeGroup === group ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400'
                }`}>
                  {articles.filter((a) => a.group === group).length}
                </span>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }}
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <i className="ri-delete-bin-line text-xs" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-50">
          <button
            onClick={() => setShowAddGroupModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line text-xs" />
            新建分组
          </button>
        </div>
      </div>

      {/* Right: Article List */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <div>
            <span className="text-sm font-bold text-gray-800">{activeGroup}</span>
            <span className="text-xs text-gray-400 ml-2">{filtered.length} 篇文章</span>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white ml-auto w-52">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-search-line text-gray-400 text-sm" />
            </div>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索文章..."
              className="flex-1 text-sm text-gray-600 placeholder-gray-300 outline-none bg-transparent"
            />
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={generating}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              generating
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className={`${generating ? 'ri-loader-4-line animate-spin' : 'ri-magic-line'} text-sm`} />
            </div>
            {generating ? '生成中...' : '一键生文'}
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
                <p className="text-sm text-gray-400">暂无文章</p>
                <p className="text-xs text-gray-300 mt-1">点击右上角「一键生文」开始创作</p>
              </div>
            ) : (
              <>
                {/* thead 固定 */}
                <table className="w-full flex-shrink-0">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 font-medium">
                      <th className="text-left px-5 py-3 w-[35%]">文章标题</th>
                      <th className="text-left px-5 py-3 w-[12%]">分组</th>
                      <th className="text-left px-5 py-3 w-[18%]">提示词</th>
                      <th className="text-left px-5 py-3 w-[10%]">状态</th>
                      <th className="text-left px-5 py-3 w-[10%]">字数</th>
                      <th className="text-left px-5 py-3 w-[15%]">创建时间</th>
                      <th className="text-center px-5 py-3 w-32">操作</th>
                    </tr>
                  </thead>
                </table>
                {/* tbody 滚动 */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((article) => {
                        const sc = statusConfig[article.status];
                        return (
                          <tr key={article.id} className="hover:bg-orange-50/20 transition-colors group">
                            <td className="px-5 py-3 w-[35%] max-w-0">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-50 flex-shrink-0">
                                  <i className="ri-file-text-line text-orange-400 text-sm" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-800 truncate leading-snug">{article.title}</p>
                                  {article.refLink && (
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                                      <i className="ri-link text-xs mr-0.5" />参考链接
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 w-[12%]">
                              {article.group ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap block truncate max-w-[80px]">{article.group}</span>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 w-[18%] max-w-0">
                              <p className="text-xs text-gray-500 truncate">{article.promptTitle || '—'}</p>
                            </td>
                            <td className="px-5 py-3 w-[10%]">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${sc.bg} ${sc.color}`}>
                                <i className={`${sc.icon} text-xs ${article.status === 'generating' ? 'animate-spin' : ''}`} />
                                {sc.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 w-[10%]">
                              <span className="text-xs text-gray-500 whitespace-nowrap">{article.wordCount > 0 ? `${article.wordCount} 字` : '—'}</span>
                            </td>
                            <td className="px-5 py-3 w-[15%]">
                              <span className="text-xs text-gray-400 whitespace-nowrap">{article.createdAt}</span>
                            </td>
                            <td className="px-5 py-3 w-32">
                              <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                                <button onClick={() => { setEditingArticle(article); setShowEditModal(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer" title="编辑">
                                  <i className="ri-edit-line text-sm" />
                                </button>
                                <button onClick={() => article.status === 'completed' && handleGoLayout(article)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${article.status === 'completed' ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50' : 'text-gray-200 cursor-not-allowed'}`} title={article.status === 'completed' ? '一键排版' : '文章未生成完成'}>
                                  <i className="ri-layout-line text-sm" />
                                </button>
                                <button onClick={() => setDeletingId(article.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="删除">
                                  <i className="ri-delete-bin-line text-sm" />
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

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddGroupModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[360px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">新建分组</h3>
              <button onClick={() => setShowAddGroupModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">分组名称</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="例如：情感类、财经类..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
              />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddGroupModal(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer whitespace-nowrap transition-colors">取消</button>
              <button onClick={handleAddGroup} className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 cursor-pointer whitespace-nowrap transition-colors">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowGenerateModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[480px] max-w-[90vw] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">智能生文</h3>
              <button onClick={() => setShowGenerateModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">文章标题 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  placeholder="输入文章标题或关键词..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">选择分组</label>
                <select
                  value={genGroup}
                  onChange={(e) => setGenGroup(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  <option value="">不分组</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">选择提示词</label>
                <select
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  <option value="">不使用提示词</option>
                  {activePrompts.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">参考素材链接</label>
                <input
                  type="text"
                  value={genRefLink}
                  onChange={(e) => setGenRefLink(e.target.value)}
                  placeholder="粘贴参考文章链接（可选）..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">图片数量：{genImageCount} 张</label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={genImageCount}
                  onChange={(e) => setGenImageCount(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>10</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowGenerateModal(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer whitespace-nowrap transition-colors">取消</button>
              <button onClick={handleGenerate} disabled={!genTitle.trim()} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${genTitle.trim() ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>开始生成</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingArticle && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[480px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">编辑文章信息</h3>
              <button onClick={() => setShowEditModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">文章标题 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  defaultValue={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">所属分组</label>
                <select
                  defaultValue={editingArticle.group}
                  onChange={(e) => setEditingArticle({ ...editingArticle, group: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  <option value="">不分组</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">使用提示词</label>
                <select
                  defaultValue={editingArticle.promptTitle}
                  onChange={(e) => setEditingArticle({ ...editingArticle, promptTitle: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors bg-white"
                >
                  <option value="">未使用提示词</option>
                  {prompts.map((p) => (
                    <option key={p.id} value={p.title}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">参考素材链接</label>
                <input
                  type="text"
                  defaultValue={editingArticle.refLink || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, refLink: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">图片数量：{editingArticle.imageCount} 张</label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  defaultValue={editingArticle.imageCount}
                  onChange={(e) => setEditingArticle({ ...editingArticle, imageCount: Number(e.target.value) })}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer whitespace-nowrap transition-colors">取消</button>
              <button onClick={() => handleUpdate({ title: editingArticle.title, group: editingArticle.group, promptTitle: editingArticle.promptTitle, refLink: editingArticle.refLink, imageCount: editingArticle.imageCount })} className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 cursor-pointer whitespace-nowrap transition-colors">保存修改</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deletingId !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDeletingId(null)}>
          <div className="bg-white rounded-2xl w-80 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-50 mx-auto mb-4">
              <i className="ri-delete-bin-line text-red-500 text-xl" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">确认删除</h3>
            <p className="text-sm text-gray-500 text-center mb-5">删除后无法恢复，确定要删除这篇文章吗？</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">取消</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer whitespace-nowrap">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WriterPage;
