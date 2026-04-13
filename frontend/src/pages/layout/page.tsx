import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/auth';
import {
  createLayoutDraft,
  fetchLayoutDraft,
  fetchLayoutDrafts,
  renderLayout,
  updateLayoutDraft,
  uploadAsset,
  type LayoutDraft,
} from '@/lib/layout';
import { fetchWriterArticle } from '@/lib/writer';
import MarkdownToolbar, { useMarkdownKeyDown } from '@/pages/layout/components/MarkdownToolbar';

const themes = [
  { id: 'default', label: '默认', headColor: '#1a1a1a', accentColor: '#FF6600', blockquoteBg: '#fff8f3', blockquoteBorder: '#FF6600' },
  { id: 'elegant', label: '优雅', headColor: '#3d2b1f', accentColor: '#8B6F47', blockquoteBg: '#fdf8f3', blockquoteBorder: '#8B6F47' },
  { id: 'fresh', label: '清新', headColor: '#1a3a2a', accentColor: '#2E8B57', blockquoteBg: '#f3fdf7', blockquoteBorder: '#2E8B57' },
  { id: 'tech', label: '科技', headColor: '#0d1f3c', accentColor: '#1677ff', blockquoteBg: '#f0f6ff', blockquoteBorder: '#1677ff' },
];

const fontFamilies = [
  { id: 'sans', label: '无衬线', value: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif' },
  { id: 'serif', label: '衬线体', value: '"Songti SC", "SimSun", Georgia, serif' },
  { id: 'round', label: '圆体', value: '"ZCOOL KuaiLe", "Hiragino Sans GB", sans-serif' },
];

const defaultContent = `# 春天最该吃的10道时令菜

春天来了，万物复苏，正是吃时令蔬菜的好时节。今天为大家整理了10道春季必吃的时令菜，鲜嫩可口，营养丰富。

## 1. 香椿炒鸡蛋

香椿是春天最具代表性的时令食材，鲜嫩的香椿芽配上鸡蛋，香气扑鼻，是春天餐桌上的经典之作。

**做法：**
- 香椿洗净焯水，切碎备用
- 鸡蛋打散，加入香椿碎和少许盐
- 热锅冷油，倒入蛋液翻炒至熟

> 小贴士：香椿焯水可以去除亚硝酸盐，更加健康安全。

## 2. 春笋炒肉

春笋鲜嫩爽脆，是春天餐桌上不可缺少的美味。搭配五花肉一起炒，鲜香入味。

## 3. 荠菜饺子

荠菜是野菜中的佼佼者，包成饺子清香可口，是很多人童年的味道。`;

const formatDraftTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

// ── Device presets (Chrome DevTools style) ──
interface DevicePreset {
  key: string;
  label: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
  type: 'phone' | 'tablet' | 'custom';
}

const DEVICE_PRESETS: DevicePreset[] = [
  { key: 'iphone-se',    label: 'iPhone SE',          width: 375, height: 667,  devicePixelRatio: 2,   type: 'phone' },
  { key: 'iphone-xr',   label: 'iPhone XR',           width: 414, height: 896,  devicePixelRatio: 2,   type: 'phone' },
  { key: 'iphone-12',   label: 'iPhone 12 Pro',       width: 390, height: 844,  devicePixelRatio: 3,   type: 'phone' },
  { key: 'iphone-14',   label: 'iPhone 14 Pro Max',   width: 430, height: 932,  devicePixelRatio: 3,   type: 'phone' },
  { key: 'pixel-7',     label: 'Pixel 7',             width: 412, height: 915,  devicePixelRatio: 2.6, type: 'phone' },
  { key: 'samsung-s20', label: 'Samsung Galaxy S20',  width: 360, height: 800,  devicePixelRatio: 3,   type: 'phone' },
  { key: 'ipad-mini',   label: 'iPad Mini',           width: 768, height: 1024, devicePixelRatio: 2,   type: 'tablet' },
  { key: 'ipad-air',    label: 'iPad Air',            width: 820, height: 1180, devicePixelRatio: 2,   type: 'tablet' },
  { key: 'custom',      label: '自定义',               width: 390, height: 844,  type: 'custom' },
];

// Shell config for rendering
interface ShellConfig {
  radius: number;
  padding: number;
  isTablet: boolean;
}

const getShellConfig = (preset: DevicePreset): ShellConfig => {
  if (preset.type === 'tablet') return { radius: 20, padding: 10, isTablet: true };
  return { radius: 36, padding: 10, isTablet: false };
};

// Scale the device to fit the preview panel
const PREVIEW_SHELL_MAX_H = 640; // max shell height in px on screen

interface PreviewContentProps {
  preset: DevicePreset;
  customW: number;
  customH: number;
  previewScale: number;
  coverImage: string | null;
  articleTitle: string;
  fontSize: number;
  activeTheme: { headColor: string; accentColor: string; blockquoteBg: string; blockquoteBorder: string };
  titleAlign: 'left' | 'center';
  activeFontFamily: string;
  showCode: boolean;
  lineHeight: number;
  renderPreview: (md: string) => string;
  content: string;
  fullscreen?: boolean;
}

const PreviewContent = ({
  preset, customW, customH, previewScale,
  coverImage, articleTitle, fontSize,
  activeTheme, titleAlign, activeFontFamily, showCode, lineHeight,
  renderPreview, content, fullscreen = false,
}: PreviewContentProps) => {
  const isCustom = preset.key === 'custom';
  const logicalW = isCustom ? customW : preset.width;
  const logicalH = isCustom ? customH : preset.height;
  const shell = getShellConfig(preset);

  // Shell outer size = logical + padding*2
  const shellW = logicalW + shell.padding * 2;
  const shellH = logicalH + shell.padding * 2 + (shell.isTablet ? 0 : 20); // extra for status bar area

  // Auto-fit scale: fit shell into PREVIEW_SHELL_MAX_H
  const autoFit = Math.min(1, PREVIEW_SHELL_MAX_H / shellH);
  const finalScale = previewScale * autoFit;

  const screenH = logicalH;
  const statusBarH = 28;
  const navBarH = 36;
  const articleScrollH = screenH - statusBarH - navBarH;

  return (
    <div
      className="flex-1 flex items-start justify-center overflow-y-auto py-6 px-4"
      style={fullscreen ? { height: '100%' } : {}}
    >
      <div
        className="relative flex-shrink-0 transition-transform duration-200"
        style={{
          width: `${shellW}px`,
          transform: `scale(${finalScale})`,
          transformOrigin: 'top center',
          marginBottom: finalScale < 1 ? `${(finalScale - 1) * shellH}px` : undefined,
        }}
      >
        {/* Device shell */}
        <div
          className="relative bg-gray-900"
          style={{
            borderRadius: `${shell.radius}px`,
            padding: `${shell.padding}px`,
            boxShadow: '0 0 0 1px #555, 0 20px 60px rgba(0,0,0,0.4)',
            width: `${shellW}px`,
          }}
        >
          {/* Side buttons — phones only */}
          {!shell.isTablet && (
            <>
              <div className="absolute -left-[3px] top-[80px] w-[3px] h-8 bg-gray-700 rounded-l-sm" />
              <div className="absolute -left-[3px] top-[124px] w-[3px] h-8 bg-gray-700 rounded-l-sm" />
              <div className="absolute -right-[3px] top-[100px] w-[3px] h-12 bg-gray-700 rounded-r-sm" />
            </>
          )}
          {/* iPad bottom bar */}
          {shell.isTablet && (
            <div className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-10 h-[3px] bg-gray-700 rounded-b-sm" />
          )}

          {/* Screen */}
          <div
            className="overflow-hidden bg-white"
            style={{
              borderRadius: `${shell.radius - 8}px`,
              width: `${logicalW}px`,
              height: `${logicalH}px`,
            }}
          >
            {/* Status bar */}
            <div
              className="bg-white px-5 flex items-center justify-between flex-shrink-0"
              style={{ height: `${statusBarH}px` }}
            >
              <span className="text-[10px] font-semibold text-gray-800">9:41</span>
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5 items-end">
                  {[3, 5, 7, 9].map((h, i) => (
                    <div key={i} className="w-[3px] bg-gray-800 rounded-sm" style={{ height: `${h}px` }} />
                  ))}
                </div>
                <i className="ri-wifi-line text-[10px] text-gray-800" />
                <i className="ri-battery-2-charge-line text-[10px] text-gray-800" />
              </div>
            </div>

            {/* WeChat nav */}
            <div
              className="bg-[#EDEDED] px-3 flex items-center gap-2 border-b border-gray-200 flex-shrink-0"
              style={{ height: `${navBarH}px` }}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-arrow-left-s-line text-gray-600 text-base" />
              </div>
              <div className="flex-1 text-center">
                <p className="text-[11px] font-medium text-gray-700 truncate">公众号文章</p>
              </div>
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-more-line text-gray-600 text-sm" />
              </div>
            </div>

            {/* Article scroll */}
            <div className="overflow-y-auto" style={{ height: `${articleScrollH}px` }}>
              {coverImage && (
                <div className="w-full" style={{ aspectRatio: '3/2' }}>
                  <img src={coverImage} alt="封面" className="w-full h-full object-cover object-top" />
                </div>
              )}
              {articleTitle && (
                <div className="px-4 pt-4 pb-1">
                  <h1
                    className="font-bold leading-snug"
                    style={{
                      fontSize: `${Math.round(fontSize * (shell.isTablet ? 1 : 0.85))}px`,
                      color: activeTheme.headColor,
                      textAlign: titleAlign,
                      fontFamily: activeFontFamily,
                    }}
                  >
                    {articleTitle}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 pb-3 border-b border-gray-100">
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex-shrink-0" />
                    <span className="text-[9px] text-gray-400">内容创作助手</span>
                    <span className="text-[9px] text-gray-300 ml-auto">刚刚</span>
                  </div>
                </div>
              )}
              {showCode ? (
                <pre className="px-3 py-3 text-[9px] text-gray-600 leading-relaxed whitespace-pre-wrap break-all font-mono">
                  {renderPreview(content)}
                </pre>
              ) : (
                <div
                  className="px-4 py-3"
                  style={{
                    fontSize: `${Math.round(fontSize * (shell.isTablet ? 0.95 : 0.78))}px`,
                    lineHeight,
                    fontFamily: activeFontFamily,
                    color: '#333',
                  }}
                  dangerouslySetInnerHTML={{ __html: renderPreview(content) }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center mt-3">
          <div className="w-20 h-1 bg-gray-400 rounded-full" />
        </div>
      </div>
    </div>
  );
};

// ── Drag hook ──
const useDrag = (initialSize: number, min: number, max: number, invert = false) => {
  const [size, setSize] = useState(initialSize);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startSize = useRef(initialSize);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startSize.current = size;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [size]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const applied = invert ? -delta : delta;
      setSize(Math.min(max, Math.max(min, startSize.current + applied)));
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [min, max, invert]);

  return { size, onMouseDown };
};

// ── Device Selector (Chrome DevTools style) ──
interface DeviceSelectorProps {
  preset: DevicePreset;
  customW: number;
  customH: number;
  onPresetChange: (p: DevicePreset) => void;
  onCustomW: (v: number) => void;
  onCustomH: (v: number) => void;
  dark?: boolean;
}

const DeviceSelector = ({ preset, customW, customH, onPresetChange, onCustomW, onCustomH, dark = false }: DeviceSelectorProps) => {
  const isCustom = preset.key === 'custom';
  const logicalW = isCustom ? customW : preset.width;
  const logicalH = isCustom ? customH : preset.height;

  const inputCls = dark
    ? 'bg-white/10 border border-white/20 text-white text-xs rounded px-2 py-1 outline-none focus:border-white/50 w-16 text-center font-mono'
    : 'bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded px-2 py-1 outline-none focus:border-orange-400 w-16 text-center font-mono';

  const selectCls = dark
    ? 'bg-white/10 border border-white/20 text-white text-xs rounded px-2 py-1 outline-none cursor-pointer appearance-none pr-6'
    : 'bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded px-2 py-1 outline-none cursor-pointer appearance-none pr-6 focus:border-orange-400';

  return (
    <div className="flex items-center gap-2">
      {/* Device icon */}
      <div className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${dark ? 'text-white/60' : 'text-gray-400'}`}>
        <i className={`${preset.type === 'tablet' ? 'ri-tablet-line' : 'ri-smartphone-line'} text-sm`} />
      </div>

      {/* Dropdown */}
      <div className="relative flex-shrink-0">
        <select
          value={preset.key}
          onChange={(e) => {
            const found = DEVICE_PRESETS.find((d) => d.key === e.target.value);
            if (found) onPresetChange(found);
          }}
          className={selectCls}
          style={{ minWidth: '140px' }}
        >
          <optgroup label="手机">
            {DEVICE_PRESETS.filter((d) => d.type === 'phone').map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </optgroup>
          <optgroup label="平板">
            {DEVICE_PRESETS.filter((d) => d.type === 'tablet').map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </optgroup>
          <optgroup label="自定义">
            <option value="custom">自定义尺寸</option>
          </optgroup>
        </select>
        <div className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 ${dark ? 'text-white/50' : 'text-gray-400'}`}>
          <i className="ri-arrow-down-s-line text-xs" />
        </div>
      </div>

      {/* Divider */}
      <div className={`w-px h-4 flex-shrink-0 ${dark ? 'bg-white/20' : 'bg-gray-200'}`} />

      {/* Width input */}
      <input
        type="number"
        value={logicalW}
        min={240}
        max={1280}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (isCustom) onCustomW(v);
          else {
            // Switch to custom
            onPresetChange({ ...DEVICE_PRESETS.find((d) => d.key === 'custom')!, width: v, height: logicalH });
            onCustomW(v);
          }
        }}
        className={inputCls}
        title="宽度 (px)"
      />
      <span className={`text-xs flex-shrink-0 ${dark ? 'text-white/40' : 'text-gray-400'}`}>×</span>
      {/* Height input */}
      <input
        type="number"
        value={logicalH}
        min={400}
        max={2000}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (isCustom) onCustomH(v);
          else {
            onPresetChange({ ...DEVICE_PRESETS.find((d) => d.key === 'custom')!, width: logicalW, height: v });
            onCustomH(v);
          }
        }}
        className={inputCls}
        title="高度 (px)"
      />
      <span className={`text-xs flex-shrink-0 ${dark ? 'text-white/40' : 'text-gray-400'}`}>px</span>

      {/* DPR badge */}
      {preset.devicePixelRatio && (
        <span className={`text-xs flex-shrink-0 px-1.5 py-0.5 rounded font-mono ${dark ? 'bg-white/10 text-white/50' : 'bg-gray-100 text-gray-400'}`}>
          {preset.devicePixelRatio}x
        </span>
      )}
    </div>
  );
};

// ── Editor Textarea with keyboard shortcuts ──
interface EditorTextareaProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
}

const EditorTextarea = ({ textareaRef, value, onChange }: EditorTextareaProps) => {
  const handleKeyDown = useMarkdownKeyDown(textareaRef, value, onChange);
  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      className="flex-1 px-5 py-4 text-sm text-gray-700 outline-none resize-none bg-white leading-relaxed"
      placeholder="在此输入 Markdown 内容..."
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
    />
  );
};

// ── Main Page ──
const LayoutPage = () => {
  const [searchParams] = useSearchParams();
  const articleIdFromQuery = searchParams.get('articleId');
  const draftIdFromQuery = searchParams.get('draftId');
  const [articleTitle, setArticleTitle] = useState('春天最该吃的10道时令菜');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverAssetId, setCoverAssetId] = useState<string | null>(null);
  const [content, setContent] = useState(defaultContent);
  const [activeThemeId, setActiveThemeId] = useState('default');
  const [themeColor, setThemeColor] = useState('#FF6600');
  const [fontSize, setFontSize] = useState(15);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState('sans');
  const [roundImage, setRoundImage] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [titleAlign, setTitleAlign] = useState<'left' | 'center'>('center');
  const [paraIndent, setParaIndent] = useState(true);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [showEditor, setShowEditor] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [previewScale, setPreviewScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [linkedArticleId, setLinkedArticleId] = useState<string | null>(articleIdFromQuery);
  const [busyMessage, setBusyMessage] = useState('');
  const [drafts, setDrafts] = useState<LayoutDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [draftLoadError, setDraftLoadError] = useState('');

  // Device state
  const [activePreset, setActivePreset] = useState<DevicePreset>(
    DEVICE_PRESETS.find((d) => d.key === 'iphone-12')!
  );
  const [customW, setCustomW] = useState(390);
  const [customH, setCustomH] = useState(844);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const settingsPanel = useDrag(256, 180, 360, false);
  const [editorFlex, setEditorFlex] = useState(5);
  const previewFlex = 10 - editorFlex;
  const midDragging = useRef(false);
  const midStartX = useRef(0);
  const midStartFlex = useRef(5);

  const onMidMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    midDragging.current = true;
    midStartX.current = e.clientX;
    midStartFlex.current = editorFlex;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [editorFlex]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!midDragging.current) return;
      const totalWidth = window.innerWidth - settingsPanel.size - 2;
      const delta = e.clientX - midStartX.current;
      const deltaFlex = (delta / totalWidth) * 10;
      const next = Math.min(8.5, Math.max(1.5, midStartFlex.current + deltaFlex));
      setEditorFlex(next);
    };
    const onMouseUp = () => {
      if (!midDragging.current) return;
      midDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [settingsPanel.size]);

  useEffect(() => {
    const articleContent = searchParams.get('content');
    if (articleContent) {
      const decoded = decodeURIComponent(articleContent);
      setContent(decoded);
      const match = decoded.match(/^# (.+)$/m);
      if (match) setArticleTitle(match[1]);
    }
  }, [searchParams]);

  const hydrateDraft = useCallback((draft: LayoutDraft) => {
    setDraftId(draft.id);
    setLinkedArticleId(draft.article_id);
    setArticleTitle(draft.title);
    setContent(draft.content_md);
    setCoverAssetId(draft.cover_asset_id);
    setCoverImage(null);
    setActiveThemeId(draft.theme_id);
    setThemeColor(draft.theme_color);
    setFontFamily(draft.font_family);
    setFontSize(draft.font_size);
    setLineHeight(draft.line_height);
    setTitleAlign(draft.title_align);
    setParaIndent(draft.para_indent);
    setRoundImage(draft.round_image);
  }, []);

  const loadDraftItems = useCallback(async () => {
    try {
      setLoadingDrafts(true);
      setDraftLoadError('');
      const response = await fetchLayoutDrafts({ page: 1, page_size: 12 });
      setDrafts(response.items);
    } catch {
      setDraftLoadError('草稿列表读取失败');
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  useEffect(() => {
    void loadDraftItems();
  }, [loadDraftItems]);

  useEffect(() => {
    if (!draftIdFromQuery) {
      return;
    }

    void (async () => {
      try {
        const draft = await fetchLayoutDraft(draftIdFromQuery);
        hydrateDraft(draft);
      } catch {
        // Keep local editor state if the remote draft is unavailable.
      }
    })();
  }, [draftIdFromQuery, hydrateDraft]);

  useEffect(() => {
    if (!articleIdFromQuery || draftIdFromQuery) {
      return;
    }

    void (async () => {
      try {
        const article = await fetchWriterArticle(articleIdFromQuery);
        setLinkedArticleId(article.id);
        setArticleTitle(article.title);
        setContent(article.content_md || defaultContent);
      } catch {
        // Keep local editor state if the remote article is unavailable.
      }
    })();
  }, [articleIdFromQuery, draftIdFromQuery]);

  const activeTheme = themes.find((t) => t.id === activeThemeId) || themes[0];
  const activeFontFamily = fontFamilies.find((f) => f.id === fontFamily)?.value || fontFamilies[0].value;
  const accentColor = themeColor || activeTheme.accentColor;

  const renderPreview = (md: string) => {
    let html = md;
    html = html.replace(/^# (.+)$/gm, `<h1 style="font-size:20px;font-weight:bold;margin:0 0 18px;color:${activeTheme.headColor};text-align:${titleAlign};line-height:1.4;letter-spacing:0.5px">$1</h1>`);
    html = html.replace(/^## (.+)$/gm, `<h2 style="font-size:16px;font-weight:bold;margin:22px 0 10px;color:${accentColor};padding-left:10px;border-left:3px solid ${accentColor};line-height:1.4">$1</h2>`);
    html = html.replace(/^### (.+)$/gm, `<h3 style="font-size:14px;font-weight:bold;margin:16px 0 8px;color:${activeTheme.headColor}">$1</h3>`);
    html = html.replace(/\*\*(.+?)\*\*/g, `<strong style="font-weight:bold;color:${activeTheme.headColor}">$1</strong>`);
    html = html.replace(/\*(.+?)\*/g, '<em style="font-style:italic">$1</em>');
    html = html.replace(/^> (.+)$/gm, `<blockquote style="border-left:3px solid ${accentColor};padding:10px 14px;background:${activeTheme.blockquoteBg};margin:14px 0;border-radius:0 6px 6px 0;color:#666;font-size:13px;line-height:1.7">$1</blockquote>`);
    html = html.replace(/^- (.+)$/gm, `<li style="margin:5px 0;padding-left:4px;color:#555">$1</li>`);
    html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, `<ul style="padding-left:18px;margin:10px 0;list-style:disc">$&</ul>`);
    const paragraphIndent = paraIndent ? 'text-indent:2em;' : '';
    html = html.replace(/\n\n/g, `</p><p style="margin:0 0 14px;${paragraphIndent}color:#444;line-height:${lineHeight}">`);
    html = html.replace(/^(?!<[hbupl])(.+)$/gm, `<p style="margin:0 0 14px;${paragraphIndent}color:#444;line-height:${lineHeight}">$1</p>`);
    return html;
  };

  const buildLayoutPayload = () => ({
    title: articleTitle,
    article_id: linkedArticleId,
    cover_asset_id: coverAssetId,
    content_md: content,
    theme_id: activeThemeId,
    theme_color: themeColor,
    font_family: fontFamily as 'sans' | 'serif' | 'round',
    font_size: fontSize,
    line_height: lineHeight,
    title_align: titleAlign,
    para_indent: paraIndent,
    round_image: roundImage,
  });

  const handleCopy = async () => {
    try {
      setBusyMessage('正在生成 HTML...');
      const response = await renderLayout(buildLayoutPayload());
      await navigator.clipboard.writeText(response.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setBusyMessage('');
    }
  };

  const handleSave = async () => {
    try {
      setBusyMessage('正在保存草稿...');
      const payload = buildLayoutPayload();
      const draft = draftId ? await updateLayoutDraft(draftId, payload) : await createLayoutDraft(payload);
      setDraftId(draft.id);
      setLinkedArticleId(draft.article_id);
      setSaved(true);
      void loadDraftItems();
      setShowSaveToast(true);
      setTimeout(() => { setSaved(false); setShowSaveToast(false); }, 2500);
    } finally {
      setBusyMessage('');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusyMessage('正在上传封面...');
      const asset = await uploadAsset(file, 'cover_image');
      setCoverAssetId(asset.id);
      setCoverImage(`${getApiBaseUrl()}${asset.public_url}`);
    } finally {
      e.target.value = '';
      setBusyMessage('');
    }
  };

  const wordCount = content.replace(/\s/g, '').length;
  const isBusy = busyMessage.length > 0;

  const clearCover = () => {
    setCoverImage(null);
    setCoverAssetId(null);
  };

  const handleDraftSelect = async (nextDraftId: string) => {
    if (nextDraftId === draftId) {
      return;
    }
    if (!window.confirm('切换草稿会覆盖当前编辑内容，是否继续？')) {
      return;
    }

    try {
      setBusyMessage('正在载入草稿...');
      const draft = await fetchLayoutDraft(nextDraftId);
      hydrateDraft(draft);
    } finally {
      setBusyMessage('');
    }
  };

  const previewProps = {
    preset: activePreset,
    customW,
    customH,
    previewScale,
    coverImage,
    articleTitle,
    fontSize,
    activeTheme,
    titleAlign,
    activeFontFamily,
    showCode,
    lineHeight,
    renderPreview,
    content,
  };

  return (
    <div className="flex-1 flex bg-[#F7F8FA] overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>
      {busyMessage && (
        <div className="fixed top-16 left-1/2 z-40 -translate-x-1/2 rounded-full border border-orange-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <i className="ri-loader-4-line animate-spin text-orange-500" />
            <span>{busyMessage}</span>
          </div>
        </div>
      )}

      {/* ── Left: Settings Panel (collapsed) ── */}
      {!showSettings && (
        <div className="flex-shrink-0 flex flex-col items-center bg-white border-r border-gray-100">
          <button
            onClick={() => setShowSettings(true)}
            title="展开设置面板"
            className="flex flex-col items-center gap-2 px-3 py-4 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer group"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-lg group-hover:bg-orange-50 transition-colors">
              <i className="ri-settings-3-line text-sm" />
            </div>
            <span className="text-xs font-medium" style={{ writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>排版设置</span>
          </button>
        </div>
      )}

      {/* ── Left: Settings Panel (expanded) ── */}
      {showSettings && (
        <div className="flex-shrink-0 bg-white border-r border-gray-100 flex flex-col" style={{ width: settingsPanel.size }}>
          <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">排版设置</h2>
              <p className="text-xs text-gray-400 mt-0.5">调整样式，实时预览效果</p>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              title="收起设置面板"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
            >
              <i className="ri-layout-left-2-line text-sm" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Article Title */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">文章标题</label>
              <input
                type="text"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="请输入文章标题..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-orange-400 transition-colors placeholder-gray-300"
              />
            </div>

            {/* Cover Image */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">文章封面</label>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              {coverImage ? (
                <div className="relative rounded-xl overflow-hidden group cursor-pointer" style={{ aspectRatio: '3/2' }} onClick={() => coverInputRef.current?.click()}>
                  <img src={coverImage} alt="封面" className="w-full h-full object-cover object-top" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <i className="ri-image-edit-line text-white text-xl" />
                    </div>
                    <p className="text-white text-xs font-medium">更换封面</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearCover(); }}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer"
                  >
                    <i className="ri-close-line text-xs" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer"
                  style={{ aspectRatio: '3/2' }}
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100">
                    <i className="ri-image-add-line text-gray-400 text-lg" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-500">点击上传封面图</p>
                    <p className="text-xs text-gray-300 mt-0.5">建议尺寸 900×600</p>
                  </div>
                </button>
              )}
            </div>

            <div className="border-t border-gray-100" />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-600">最近草稿</label>
                <span className="text-[11px] text-gray-400">最多展示 12 条</span>
              </div>

              {loadingDrafts ? (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">正在读取草稿...</p>
              ) : draftLoadError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">{draftLoadError}</p>
              ) : drafts.length === 0 ? (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">还没有已保存草稿</p>
              ) : (
                <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {drafts.map((draft) => (
                    <button
                      key={draft.id}
                      onClick={() => void handleDraftSelect(draft.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                        draft.id === draftId
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-100 bg-gray-50 hover:border-orange-200 hover:bg-orange-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-gray-700">{draft.title || '未命名草稿'}</p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {formatDraftTime(draft.updated_at)}
                          </p>
                        </div>
                        {draft.id === draftId && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-600">
                            当前
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Theme */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">主题风格</label>
              <div className="grid grid-cols-2 gap-1.5">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveThemeId(t.id); setThemeColor(t.accentColor); }}
                    className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${activeThemeId === t.id ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: t.accentColor }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Color */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">主题色</label>
              <div className="flex items-center gap-2">
                <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer flex-shrink-0" />
                <span className="text-xs text-gray-500 font-mono flex-1">{themeColor}</span>
                <div className="flex gap-1">
                  {['#FF6600', '#07C160', '#1677ff', '#E6162D'].map((c) => (
                    <button key={c} onClick={() => setThemeColor(c)} className="w-5 h-5 rounded-full cursor-pointer border-2 transition-all flex-shrink-0" style={{ backgroundColor: c, borderColor: themeColor === c ? '#333' : 'transparent' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">字体</label>
              <div className="flex gap-1.5">
                {fontFamilies.map((f) => (
                  <button key={f.id} onClick={() => setFontFamily(f.id)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${fontFamily === f.id ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">字体大小</label>
                <span className="text-xs text-orange-500 font-medium">{fontSize}px</span>
              </div>
              <input type="range" min={12} max={20} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-orange-500" />
              <div className="flex justify-between text-xs text-gray-300 mt-1"><span>12</span><span>20</span></div>
            </div>

            {/* Line Height */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">行间距</label>
                <span className="text-xs text-orange-500 font-medium">{lineHeight}</span>
              </div>
              <input type="range" min={1.4} max={2.4} step={0.1} value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className="w-full accent-orange-500" />
              <div className="flex justify-between text-xs text-gray-300 mt-1"><span>紧凑</span><span>宽松</span></div>
            </div>

            {/* Title Align */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">标题对齐</label>
              <div className="flex gap-1.5">
                {[{ key: 'left' as const, label: '左对齐', icon: 'ri-align-left' }, { key: 'center' as const, label: '居中', icon: 'ri-align-center' }].map((opt) => (
                  <button key={opt.key} onClick={() => setTitleAlign(opt.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${titleAlign === opt.key ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                    <i className={`${opt.icon} text-xs`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              {[
                { label: '段落首行缩进', value: paraIndent, toggle: () => setParaIndent(!paraIndent) },
                { label: '图片圆角', value: roundImage, toggle: () => setRoundImage(!roundImage) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600">{item.label}</label>
                  <button onClick={item.toggle} className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative flex-shrink-0 ${item.value ? 'bg-orange-500' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${item.value ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100" />

            {/* View Toggle */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">编辑模式</label>
              <div className="flex gap-1.5 bg-gray-50 rounded-lg p-1">
                {[{ key: false, label: '预览', icon: 'ri-eye-line' }, { key: true, label: '源码', icon: 'ri-code-line' }].map((opt) => (
                  <button key={String(opt.key)} onClick={() => setShowCode(opt.key)} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${showCode === opt.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                    <i className={`${opt.icon} mr-1 text-xs`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-2 flex-shrink-0">
            <button
              onClick={handleSave}
              disabled={isBusy}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${isBusy ? 'cursor-not-allowed bg-gray-200 text-gray-500' : saved ? 'cursor-pointer bg-green-500 text-white' : 'cursor-pointer bg-orange-500 hover:bg-orange-600 text-white'}`}
            >
              <i className={`${isBusy ? 'ri-loader-4-line animate-spin' : saved ? 'ri-check-line' : 'ri-save-line'} text-sm`} />
              {isBusy ? busyMessage : saved ? '已保存' : '保存'}
            </button>
            <button
              onClick={handleCopy}
              disabled={isBusy}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${isBusy ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400' : copied ? 'cursor-pointer bg-green-500 text-white' : 'cursor-pointer border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              <i className={`${isBusy ? 'ri-loader-4-line animate-spin' : copied ? 'ri-check-line' : 'ri-file-copy-line'} text-sm`} />
              {isBusy ? '请稍候' : copied ? '已复制' : '复制排版内容'}
            </button>
          </div>
        </div>
      )}

      {/* Drag handle: settings | editor */}
      {showSettings && (
        <div
          onMouseDown={settingsPanel.onMouseDown}
          className="w-1 flex-shrink-0 bg-gray-100 hover:bg-orange-300 active:bg-orange-400 transition-colors cursor-col-resize relative group"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gray-300 group-hover:bg-orange-400 transition-colors" />
        </div>
      )}

      {/* ── Middle: Editor Area ── */}
      {showEditor && (
        <div
          className="flex flex-col min-w-0 bg-white"
          style={{ flex: showPreview ? editorFlex : 1, minWidth: 0 }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800">内容编辑</h3>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{wordCount} 字</span>
            </div>
            <button
              onClick={() => setShowEditor(false)}
              title="收起编辑区"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <i className="ri-layout-right-line text-sm" />
            </button>
          </div>

          <div className="px-5 pt-4 pb-2 border-b border-gray-50 flex-shrink-0">
            <input
              type="text"
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value)}
              placeholder="文章标题..."
              className="w-full text-xl font-bold text-gray-900 placeholder-gray-200 outline-none bg-transparent"
            />
          </div>

          {coverImage && (
            <div className="px-5 py-2 border-b border-gray-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={coverImage} alt="封面" className="w-full h-full object-cover object-top" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600">封面图已设置</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">点击左侧封面区域可更换</p>
                </div>
                <button
                  onClick={clearCover}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                >
                  <i className="ri-delete-bin-line text-sm" />
                </button>
              </div>
            </div>
          )}

          {/* Markdown Toolbar */}
          <MarkdownToolbar
            textareaRef={textareaRef}
            value={content}
            onChange={setContent}
          />

          <EditorTextarea
            textareaRef={textareaRef}
            value={content}
            onChange={setContent}
          />
        </div>
      )}

      {/* Collapsed editor tab */}
      {!showEditor && (
        <div className="flex-shrink-0 flex flex-col items-center bg-white border-r border-gray-100 border-l border-gray-100">
          <button
            onClick={() => setShowEditor(true)}
            title="展开编辑区"
            className="flex flex-col items-center gap-2 px-3 py-4 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer group"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-lg group-hover:bg-orange-50 transition-colors">
              <i className="ri-edit-line text-sm" />
            </div>
            <span className="text-xs font-medium" style={{ writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>内容编辑</span>
          </button>
        </div>
      )}

      {/* Drag handle: editor | preview */}
      {showEditor && showPreview && (
        <div
          onMouseDown={onMidMouseDown}
          className="w-1 flex-shrink-0 bg-gray-100 hover:bg-orange-300 active:bg-orange-400 transition-colors cursor-col-resize relative group"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gray-300 group-hover:bg-orange-400 transition-colors" />
        </div>
      )}

      {/* ── Right: Phone Preview ── */}
      {showPreview && (
        <div
          className="flex flex-col bg-[#F0F2F5]"
          style={{ flex: showEditor ? previewFlex : 1, minWidth: 0 }}
        >
          {/* Preview toolbar — Chrome DevTools style */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0 overflow-x-auto">
            <h3 className="text-sm font-semibold text-gray-800 flex-shrink-0 mr-1">公众号预览</h3>

            <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

            {/* Device selector */}
            <DeviceSelector
              preset={activePreset}
              customW={customW}
              customH={customH}
              onPresetChange={(p) => {
                setActivePreset(p);
                if (p.key !== 'custom') {
                  setCustomW(p.width);
                  setCustomH(p.height);
                }
              }}
              onCustomW={(v) => {
                setCustomW(v);
                setActivePreset(DEVICE_PRESETS.find((d) => d.key === 'custom')!);
              }}
              onCustomH={(v) => {
                setCustomH(v);
                setActivePreset(DEVICE_PRESETS.find((d) => d.key === 'custom')!);
              }}
            />

            <div className="w-px h-4 bg-gray-200 flex-shrink-0 ml-1" />

            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button onClick={() => setPreviewScale((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(1))))} title="缩小" className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-subtract-line text-xs" />
              </button>
              <span className="text-xs text-gray-500 font-mono w-9 text-center select-none">{Math.round(previewScale * 100)}%</span>
              <button onClick={() => setPreviewScale((s) => Math.min(2, parseFloat((s + 0.1).toFixed(1))))} title="放大" className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-add-line text-xs" />
              </button>
              <button onClick={() => setPreviewScale(1)} title="重置缩放" className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-refresh-line text-xs" />
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setFullscreen(true)} title="全屏预览" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer">
                <i className="ri-fullscreen-line text-sm" />
              </button>
              <div className="w-px h-4 bg-gray-200" />
              <button onClick={() => setShowPreview(false)} title="收起预览" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-layout-left-line text-sm" />
              </button>
            </div>
          </div>

          <PreviewContent {...previewProps} />
        </div>
      )}

      {/* ── Fullscreen Preview Modal ── */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col" style={{ backdropFilter: 'blur(4px)' }}>
          {/* Fullscreen toolbar */}
          <div className="flex items-center gap-3 px-6 py-3 bg-gray-900/95 flex-shrink-0 overflow-x-auto">
            <h3 className="text-sm font-semibold text-white flex-shrink-0">全屏预览</h3>
            <div className="w-px h-4 bg-white/20 flex-shrink-0" />

            {/* Device selector (dark) */}
            <DeviceSelector
              preset={activePreset}
              customW={customW}
              customH={customH}
              onPresetChange={(p) => {
                setActivePreset(p);
                if (p.key !== 'custom') {
                  setCustomW(p.width);
                  setCustomH(p.height);
                }
              }}
              onCustomW={(v) => {
                setCustomW(v);
                setActivePreset(DEVICE_PRESETS.find((d) => d.key === 'custom')!);
              }}
              onCustomH={(v) => {
                setCustomH(v);
                setActivePreset(DEVICE_PRESETS.find((d) => d.key === 'custom')!);
              }}
              dark
            />

            <div className="ml-auto flex-shrink-0">
              <button
                onClick={() => setFullscreen(false)}
                title="退出全屏"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-fullscreen-exit-line text-sm" />
                退出全屏
              </button>
            </div>
          </div>

          {/* Fullscreen preview body */}
          <div className="flex-1 overflow-hidden">
            <PreviewContent {...previewProps} fullscreen />
          </div>
        </div>
      )}

      {/* Collapsed preview tab */}
      {!showPreview && (
        <div className="flex-shrink-0 flex flex-col items-center bg-[#F0F2F5] border-l border-gray-200">
          <button
            onClick={() => setShowPreview(true)}
            title="展开预览"
            className="flex flex-col items-center gap-2 px-3 py-4 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer group"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-lg group-hover:bg-orange-50 transition-colors">
              <i className="ri-smartphone-line text-sm" />
            </div>
            <span className="text-xs font-medium" style={{ writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>公众号预览</span>
          </button>
        </div>
      )}

      {/* Save Toast */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 text-white text-sm font-medium transition-all duration-300 pointer-events-none ${
          showSaveToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          <i className="ri-checkbox-circle-line text-green-400 text-base" />
        </div>
        文章已保存到草稿箱
      </div>
    </div>
  );
};

export default LayoutPage;
