import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

type TabKey = 'steps' | 'video' | 'spec';

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'steps', icon: 'ri-footprint-line', label: '四步使用' },
  { key: 'video', icon: 'ri-play-circle-line', label: '视频演示' },
  { key: 'spec', icon: 'ri-file-list-3-line', label: '需求说明' },
];

/* ─────────────── 四步使用数据 ─────────────── */
const steps = [
  {
    id: 1,
    icon: 'ri-search-eye-line',
    color: 'bg-orange-50 text-orange-500',
    title: '发现爆款内容',
    desc: '在「每日爆款」页面，浏览各平台热门文章，一键查看爆款数据分析，找到适合自己的选题方向。',
    tips: ['支持微信公众号、头条号等多平台', '实时更新热榜数据', '可按阅读量、点赞数筛选'],
    path: '/',
    btnLabel: '去看爆款',
  },
  {
    id: 2,
    icon: 'ri-lightbulb-flash-line',
    color: 'bg-amber-50 text-amber-500',
    title: '选择提示词模板',
    desc: '在「提示词库」中，选择适合你内容类型的 AI 提示词模板，支持美食、科技、生活等多种分类。',
    tips: ['100+ 精选提示词模板', '按行业分类快速筛选', '支持收藏常用模板'],
    path: '/prompts',
    btnLabel: '浏览提示词',
  },
  {
    id: 3,
    icon: 'ri-quill-pen-line',
    color: 'bg-green-50 text-green-600',
    title: '智能生成文章',
    desc: '在「智能生文」页面，输入主题或粘贴参考内容，AI 自动生成高质量文章，支持多种写作风格。',
    tips: ['一键生成完整文章', '支持续写、改写、扩写', '自动提取关键词和摘要'],
    path: '/writer',
    btnLabel: '开始生文',
  },
  {
    id: 4,
    icon: 'ri-layout-masonry-line',
    color: 'bg-rose-50 text-rose-500',
    title: '一键排版美化',
    desc: '将生成的文章发送到「一键排版」，选择主题风格、字体、颜色，实时预览公众号效果，复制粘贴即可发布。',
    tips: ['多种主题风格可选', '实时手机/iPad 预览', '一键复制排版 HTML'],
    path: '/layout',
    btnLabel: '去排版',
  },
];

/* ─────────────── 需求说明数据 ─────────────── */
interface SpecSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  overview: string;
  menus?: { name: string; desc: string }[];
  features: {
    name: string;
    desc: string;
    ops?: string[];
  }[];
}

const specSections: SpecSection[] = [
  {
    id: 'home',
    title: '每日爆款',
    icon: 'ri-fire-line',
    color: 'text-orange-500',
    overview: '平台默认落地页，聚合微信公众号、头条号等多平台的热门爆款内容，帮助创作者快速发现选题灵感。',
    menus: [
      { name: '公众号爆款', desc: '展示微信公众号近期高阅读量文章，按热度排序' },
      { name: '头条号爆款', desc: '展示今日头条平台热门文章，实时更新' },
      { name: '今日热搜榜', desc: '聚合微博、百度、抖音等平台实时热搜词条' },
    ],
    features: [
      {
        name: '爆款文章列表',
        desc: '以卡片形式展示文章标题、封面、来源账号、发布时间、阅读量、点赞数、分享数等核心数据。',
        ops: ['点击文章卡片查看详情', '点击「仿写」跳转智能生文并预填主题', '点击「收藏」保存到个人收藏夹', '点击「提示词」查看推荐提示词模板'],
      },
      {
        name: '多维筛选',
        desc: '支持按内容分类（美食/科技/生活/财经等）、时间范围（今日/本周/本月）、数据指标（阅读量/点赞数）进行筛选。',
        ops: ['顶部 Tab 切换平台', '左侧分类标签快速筛选', '右上角排序方式切换'],
      },
      {
        name: '数据统计卡片',
        desc: '页面顶部展示今日新增爆款数、平均阅读量、热门分类等平台整体数据概览。',
        ops: ['悬停卡片查看趋势图', '点击数字跳转对应筛选结果'],
      },
      {
        name: '热搜趋势图',
        desc: '以折线图展示近7天热搜词条变化趋势，帮助判断话题热度走势。',
        ops: ['切换时间维度（日/周/月）', '点击词条查看相关文章'],
      },
    ],
  },
  {
    id: 'prompts',
    title: '提示词库',
    icon: 'ri-lightbulb-flash-line',
    color: 'text-amber-500',
    overview: '精选 100+ 经过验证的 AI 写作提示词模板，覆盖美食、科技、生活、财经、情感等主流内容方向，帮助创作者快速启动 AI 写作。',
    menus: [
      { name: '全部提示词', desc: '展示所有可用提示词模板，支持搜索和筛选' },
      { name: '我的收藏', desc: '展示用户收藏的提示词，方便快速复用' },
      { name: '最近使用', desc: '展示最近使用过的提示词，提升操作效率' },
    ],
    features: [
      {
        name: '提示词卡片列表',
        desc: '以卡片形式展示提示词名称、适用场景、预览内容、使用次数、评分等信息。',
        ops: ['点击卡片展开完整提示词内容', '点击「使用」跳转智能生文并预填提示词', '点击「收藏」加入收藏夹', '点击「复制」复制提示词文本'],
      },
      {
        name: '分类筛选',
        desc: '按内容类型（美食/科技/生活/财经/情感/职场/健康）分类展示，支持多标签组合筛选。',
        ops: ['点击分类标签切换', '支持多选组合筛选', '搜索框关键词搜索'],
      },
      {
        name: '提示词详情',
        desc: '展示完整提示词内容、使用说明、适用场景、示例输出，帮助用户理解如何使用。',
        ops: ['查看完整提示词文本', '查看示例生成效果', '一键复制或直接使用'],
      },
    ],
  },
  {
    id: 'writer',
    title: '智能生文',
    icon: 'ri-quill-pen-line',
    color: 'text-green-600',
    overview: '基于 AI 大语言模型的文章生成工具，支持输入主题、选择风格、粘贴参考素材，一键生成完整的公众号文章。',
    menus: [
      { name: '新建文章', desc: '从空白开始创建新文章，输入主题和要求' },
      { name: '草稿箱', desc: '查看和继续编辑已保存的草稿文章' },
      { name: '历史记录', desc: '查看所有已生成的文章历史' },
    ],
    features: [
      {
        name: '文章主题输入',
        desc: '在左侧输入区填写文章主题、关键词、目标读者等基本信息，支持从爆款文章一键导入主题。',
        ops: ['输入文章主题（必填）', '添加关键词标签', '选择目标读者群体', '设置文章字数范围（500-3000字）'],
      },
      {
        name: '提示词选择',
        desc: '从提示词库中选择适合的写作模板，或直接输入自定义提示词，控制文章的写作风格和结构。',
        ops: ['点击「选择提示词」打开提示词库弹窗', '搜索并选择合适的提示词', '支持自定义修改提示词内容'],
      },
      {
        name: '参考素材上传',
        desc: '支持粘贴参考文章链接或文本内容，AI 会参考素材的风格和内容进行创作，避免直接抄袭。',
        ops: ['粘贴参考文章 URL', '直接粘贴参考文本', '上传本地文档（TXT/Word）'],
      },
      {
        name: '写作风格设置',
        desc: '提供多种写作风格选项：专业严谨、轻松幽默、情感共鸣、干货实用、故事叙述等。',
        ops: ['点击风格标签选择', '支持组合多种风格', '预览风格示例文本'],
      },
      {
        name: 'AI 生成与编辑',
        desc: '点击「开始生成」后，AI 实时流式输出文章内容，生成完成后可在右侧编辑区直接修改。',
        ops: ['点击「开始生成」触发 AI 写作', '生成过程中可点击「停止」中断', '生成完成后支持全文编辑', '点击「重新生成」获取不同版本', '点击「发送到排版」跳转一键排版页'],
      },
      {
        name: '文章操作',
        desc: '生成的文章支持保存草稿、复制全文、导出为 Markdown 等操作。',
        ops: ['保存为草稿', '复制全文到剪贴板', '导出 Markdown 文件', '一键发送到排版页面'],
      },
    ],
  },
  {
    id: 'layout',
    title: '一键排版',
    icon: 'ri-layout-masonry-line',
    color: 'text-rose-500',
    overview: '专为微信公众号设计的排版美化工具，支持 Markdown 编辑、多主题风格、实时手机预览，一键复制排版好的 HTML 内容直接粘贴发布。',
    menus: [
      { name: '排版设置', desc: '左侧面板，设置主题、字体、颜色、封面等样式参数' },
      { name: '内容编辑', desc: '中间编辑区，Markdown 格式输入文章内容' },
      { name: '公众号预览', desc: '右侧预览区，实时渲染公众号效果，支持多设备切换' },
    ],
    features: [
      {
        name: '文章标题与封面',
        desc: '在排版设置面板顶部设置文章标题和封面图，封面支持本地上传，预览区实时同步显示。',
        ops: ['输入文章标题', '点击封面区域上传本地图片', '鼠标悬停封面可更换或删除', '编辑区顶部同步显示标题和封面缩略图'],
      },
      {
        name: '主题风格',
        desc: '提供默认、优雅、清新、科技四种预设主题，每种主题有对应的标题色、强调色、引用块样式。',
        ops: ['点击主题卡片切换', '选择主题后可进一步自定义主题色', '颜色选择器支持自定义任意颜色', '快捷色板提供常用颜色'],
      },
      {
        name: '字体与排版',
        desc: '支持无衬线、衬线体、圆体三种字体，可调节字体大小（12-20px）、行间距（1.4-2.4）、标题对齐方式、段落首行缩进。',
        ops: ['点击字体按钮切换', '拖动滑块调节字体大小', '拖动滑块调节行间距', '切换标题左对齐/居中', '开关段落首行缩进'],
      },
      {
        name: '多设备预览',
        desc: '右侧预览区模拟真实手机/平板外壳，支持 iPhone SE、iPhone 15、iPad 三种设备尺寸切换，实时渲染排版效果。',
        ops: ['点击设备按钮切换尺寸', '使用 +/- 按钮缩放预览大小', '点击百分比数字重置缩放', '点击全屏按钮进入沉浸式预览'],
      },
      {
        name: '全屏预览',
        desc: '点击全屏按钮后，预览区铺满整个屏幕，背景变为深色，方便仔细检查排版细节。全屏模式下同样支持设备切换。',
        ops: ['点击全屏图标进入全屏', '全屏内切换设备类型', '点击「退出全屏」或按 ESC 退出'],
      },
      {
        name: '面板收起与展开',
        desc: '排版设置、内容编辑、公众号预览三个面板均可独立收起，收起后变为细竖条，其余面板自动填满空间。',
        ops: ['点击面板右上角收起按钮', '点击竖条上的图标重新展开', '拖动面板间分隔条调整宽度比例'],
      },
      {
        name: '保存与复制',
        desc: '底部操作区提供保存草稿和复制排版内容两个核心操作。',
        ops: ['点击「保存」保存到草稿箱，显示保存成功提示', '点击「复制排版内容」复制完整 HTML 代码', '粘贴到微信公众号编辑器即可保留样式'],
      },
    ],
  },
  {
    id: 'channels',
    title: '公众号管理',
    icon: 'ri-wechat-line',
    color: 'text-green-500',
    overview: '管理已授权的微信公众号账号，查看账号数据，支持多账号切换管理。',
    menus: [
      { name: '我的公众号', desc: '展示已授权绑定的公众号列表' },
      { name: '数据概览', desc: '查看各公众号的粉丝数、阅读量等核心数据' },
    ],
    features: [
      {
        name: '公众号授权',
        desc: '通过微信公众平台 OAuth 授权，将公众号与爆了么账号绑定，获取内容发布权限。',
        ops: ['点击「添加公众号」发起授权', '扫码完成微信授权', '授权成功后显示账号信息'],
      },
      {
        name: '账号数据展示',
        desc: '展示公众号基本信息（头像/名称/简介）、粉丝数量、近期文章数据等。',
        ops: ['查看粉丝增长趋势', '查看近期文章阅读数据', '切换多个已授权账号'],
      },
    ],
  },
  {
    id: 'vip',
    title: '会员中心',
    icon: 'ri-vip-crown-line',
    color: 'text-yellow-500',
    overview: '展示会员套餐权益，支持免费版与付费会员的功能对比，引导用户升级以解锁更多 AI 生文次数和高级功能。',
    menus: [
      { name: '套餐对比', desc: '免费版、基础版、专业版三档套餐权益对比' },
      { name: '我的权益', desc: '查看当前账号的会员状态和剩余使用次数' },
    ],
    features: [
      {
        name: '套餐展示',
        desc: '以卡片形式展示免费版（3次/天）、基础版（50次/月）、专业版（无限次）三档套餐，标注各套餐功能差异。',
        ops: ['查看各套餐功能对比表', '点击「立即升级」进入支付流程', '查看限时优惠活动'],
      },
      {
        name: '使用量统计',
        desc: '展示当前账号本月 AI 生文使用次数、剩余次数、历史使用趋势。',
        ops: ['查看本月使用量进度条', '查看历史使用记录', '查看到期时间'],
      },
    ],
  },
  {
    id: 'tutorial',
    title: '使用教程',
    icon: 'ri-book-open-line',
    color: 'text-sky-500',
    overview: '平台使用文档中心，包含四步快速上手指南、视频演示和完整的平台需求说明文档。',
    menus: [
      { name: '四步使用', desc: '图文并茂的快速上手流程，每步附有跳转链接' },
      { name: '视频演示', desc: '完整功能演示视频，时长约3分钟' },
      { name: '需求说明', desc: '完整的平台功能需求文档，包含所有菜单和操作说明' },
    ],
    features: [
      {
        name: '快速上手',
        desc: '以四步流程图文说明平台核心使用路径，每步附有直达对应功能页面的快捷按钮。',
        ops: ['阅读步骤说明', '点击「去看爆款/浏览提示词/开始生文/去排版」直达功能'],
      },
      {
        name: '视频演示',
        desc: '提供完整的平台功能演示视频，覆盖从发现爆款到发布文章的完整操作流程。',
        ops: ['点击播放按钮观看视频', '查看视频时长和观看数据'],
      },
      {
        name: '需求说明文档',
        desc: '完整的平台功能需求文档，按菜单模块分章节说明，包含功能描述、子菜单、操作步骤。',
        ops: ['点击左侧菜单切换模块', '展开/收起功能详情', '查看操作步骤列表'],
      },
    ],
  },
  {
    id: 'contact',
    title: '联系我们',
    icon: 'ri-customer-service-2-line',
    color: 'text-rose-400',
    overview: '用户支持与反馈入口，提供微信客服、邮件、QQ群等多种联系方式，以及在线留言表单。',
    menus: [
      { name: '联系方式', desc: '微信客服、邮件、官方交流群入口' },
      { name: '在线留言', desc: '填写姓名、邮箱、反馈类型和内容，提交后24小时内回复' },
    ],
    features: [
      {
        name: '多渠道联系',
        desc: '提供微信客服（工作日9:00-18:00）、邮件（support@baolem.com）、官方QQ交流群三种联系方式。',
        ops: ['扫码添加微信客服', '点击邮箱地址发送邮件', '申请加入官方交流群'],
      },
      {
        name: '在线留言表单',
        desc: '填写姓名、邮箱、反馈类型（功能建议/问题反馈/商务合作/账号问题/其他）和消息内容（500字以内），提交后显示成功状态。',
        ops: ['填写必填字段（姓名/邮箱/内容）', '选择反馈类型', '点击「发送消息」提交', '提交成功后显示确认提示'],
      },
    ],
  },
];

/* ─────────────── 子组件 ─────────────── */

const StepsTab = ({ navigate }: { navigate: (p: string) => void }) => (
  <div className="space-y-5">
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">四步搞定爆款内容</h2>
      <p className="text-sm text-gray-400">从发现热点到发布文章，打通内容创作全流程</p>
    </div>
    {steps.map((step, idx) => (
      <div key={step.id} className="bg-white rounded-2xl p-7 flex gap-6 items-start">
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${step.color}`}>
            <i className={`${step.icon} text-xl`} />
          </div>
          {idx < steps.length - 1 && <div className="w-px h-8 bg-gray-100" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold text-gray-300">STEP {step.id}</span>
            <h3 className="text-base font-bold text-gray-900">{step.title}</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">{step.desc}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {step.tips.map((tip) => (
              <span key={tip} className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                <i className="ri-check-line text-green-500 text-xs" />
                {tip}
              </span>
            ))}
          </div>
          <button
            onClick={() => navigate(step.path)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            {step.btnLabel}
            <i className="ri-arrow-right-line text-sm" />
          </button>
        </div>
      </div>
    ))}
    <div className="bg-orange-500 rounded-2xl px-8 py-10 text-center mt-4">
      <h2 className="text-xl font-bold text-white mb-2">准备好开始了吗？</h2>
      <p className="text-orange-100 text-sm mb-6">免费体验 AI 内容创作，每天 3 篇文章无限制</p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => navigate('/writer')} className="flex items-center gap-2 bg-white text-orange-500 px-6 py-2.5 rounded-full text-sm font-bold hover:bg-orange-50 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-quill-pen-line" />立即开始创作
        </button>
        <button onClick={() => navigate('/vip')} className="flex items-center gap-2 bg-orange-400 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-orange-300 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-vip-crown-line" />了解会员权益
        </button>
      </div>
    </div>
  </div>
);

const VideoTab = () => (
  <div className="space-y-8">
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">视频演示</h2>
      <p className="text-sm text-gray-400">完整功能演示，3分钟快速掌握平台使用方法</p>
    </div>
    <div className="bg-white rounded-2xl overflow-hidden">
      <div className="relative w-full bg-gray-900" style={{ aspectRatio: '16/9' }}>
        <img
          src="https://readdy.ai/api/search-image?query=modern%20AI%20content%20creation%20platform%20dashboard%20with%20orange%20accent%20colors%2C%20clean%20minimal%20UI%2C%20dark%20background%20with%20glowing%20interface%20elements%2C%20professional%20SaaS%20software%20screenshot%20overview&width=1280&height=720&seq=tutorial-video-main&orientation=landscape"
          alt="视频封面"
          className="w-full h-full object-cover object-top opacity-60"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <button className="w-16 h-16 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer border-2 border-white/50">
            <i className="ri-play-fill text-white text-2xl ml-1" />
          </button>
          <p className="text-white text-sm font-medium">爆了么完整使用演示（3分钟）</p>
        </div>
      </div>
      <div className="px-6 py-4 flex items-center gap-6 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><i className="ri-time-line" />时长 3:24</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><i className="ri-eye-line" />12,480 次观看</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><i className="ri-thumb-up-line" />98% 好评</div>
      </div>
    </div>

    <div>
      <h3 className="text-base font-bold text-gray-800 mb-4">分章节演示</h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: '发现爆款内容', duration: '0:00 – 0:45', icon: 'ri-fire-line', color: 'bg-orange-50 text-orange-500' },
          { title: '选择提示词模板', duration: '0:45 – 1:20', icon: 'ri-lightbulb-flash-line', color: 'bg-amber-50 text-amber-500' },
          { title: '智能生成文章', duration: '1:20 – 2:10', icon: 'ri-quill-pen-line', color: 'bg-green-50 text-green-600' },
          { title: '一键排版发布', duration: '2:10 – 3:24', icon: 'ri-layout-masonry-line', color: 'bg-rose-50 text-rose-500' },
        ].map((item) => (
          <div key={item.title} className="bg-white rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 ${item.color}`}>
              <i className={`${item.icon} text-base`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.duration}</p>
            </div>
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <i className="ri-play-circle-line text-gray-300 text-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SpecTab = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleFeature = (key: string) => {
    setExpandedFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const section = specSections.find((s) => s.id === activeSection) || specSections[0];

  return (
    <div className="flex gap-0 -mx-8 -mb-8" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Spec left nav */}
      <div className="w-52 flex-shrink-0 border-r border-gray-100 bg-white/60 py-4">
        <p className="text-xs font-bold text-gray-400 px-5 mb-3 uppercase tracking-wider">功能模块</p>
        <nav className="space-y-0.5 px-2">
          {specSections.map((s) => (
            <button
              key={s.id}
              onClick={() => handleNavClick(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left whitespace-nowrap ${
                activeSection === s.id
                  ? 'bg-orange-50 text-orange-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <i className={`${s.icon} text-sm ${activeSection === s.id ? s.color : ''}`} />
              </div>
              {s.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Spec content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-8 py-6 min-w-0">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
          <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50`}>
            <i className={`${section.icon} text-xl ${section.color}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">路由：/{section.id === 'home' ? '' : section.id}</p>
          </div>
        </div>

        {/* Overview */}
        <div className="bg-gray-50 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">{section.overview}</p>
        </div>

        {/* Sub menus */}
        {section.menus && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <i className="ri-menu-line text-gray-400" />
              子菜单 / Tab
            </h3>
            <div className="space-y-2">
              {section.menus.map((m, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-4 py-3">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-orange-100 text-orange-500 text-xs font-bold mt-0.5">{i + 1}</span>
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{m.name}</span>
                    <span className="text-sm text-gray-400 ml-2">— {m.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <i className="ri-function-line text-gray-400" />
            功能详情
          </h3>
          <div className="space-y-3">
            {section.features.map((feat, fi) => {
              const key = `${section.id}-${fi}`;
              const expanded = expandedFeatures[key] ?? true;
              return (
                <div key={fi} className="bg-white rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleFeature(key)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-800">{feat.name}</span>
                    </div>
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <i className={`ri-arrow-down-s-line text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-5 pb-4 space-y-3">
                      <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
                      {feat.ops && feat.ops.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">操作步骤</p>
                          <ul className="space-y-1.5">
                            {feat.ops.map((op, oi) => (
                              <li key={oi} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-orange-50 text-orange-500 text-xs font-bold mt-0.5">{oi + 1}</span>
                                {op}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────── 主页面 ─────────────── */
const TutorialPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('steps');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-8">
          <div className="pt-10 pb-6">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-500 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <i className="ri-book-open-line text-sm" />
              使用教程
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">帮助文档中心</h1>
            <p className="text-gray-400 text-sm">快速上手爆了么，掌握 AI 内容创作全流程</p>
          </div>
          {/* Tab nav */}
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap -mb-px ${
                  activeTab === tab.key
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <i className={`${tab.icon} text-sm`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className={`flex-1 overflow-y-auto min-h-0 max-w-5xl w-full mx-auto px-8 ${activeTab === 'spec' ? 'py-0' : 'py-10'}`}>
        {activeTab === 'steps' && <StepsTab navigate={navigate} />}
        {activeTab === 'video' && <VideoTab />}
        {activeTab === 'spec' && <SpecTab />}
      </div>
    </div>
  );
};

export default TutorialPage;
