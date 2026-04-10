import { useRef, useState } from 'react';

interface ToolAction {
  type: 'wrap' | 'line-prefix' | 'block' | 'insert';
  before?: string;
  after?: string;
  prefix?: string;
  block?: string;
  placeholder?: string;
}

interface ToolItem {
  icon: string;
  label: string;
  shortcut?: string;
  action: ToolAction;
  dividerAfter?: boolean;
}

const TOOLS: ToolItem[] = [
  // Headings dropdown handled separately
  {
    icon: 'ri-bold',
    label: '加粗',
    shortcut: 'Ctrl+B',
    action: { type: 'wrap', before: '**', after: '**', placeholder: '加粗文字' },
  },
  {
    icon: 'ri-italic',
    label: '斜体',
    shortcut: 'Ctrl+I',
    action: { type: 'wrap', before: '*', after: '*', placeholder: '斜体文字' },
  },
  {
    icon: 'ri-strikethrough',
    label: '删除线',
    action: { type: 'wrap', before: '~~', after: '~~', placeholder: '删除线文字' },
    dividerAfter: true,
  },
  {
    icon: 'ri-double-quotes-l',
    label: '引用',
    action: { type: 'line-prefix', prefix: '> ', placeholder: '引用内容' },
  },
  {
    icon: 'ri-list-unordered',
    label: '无序列表',
    action: { type: 'line-prefix', prefix: '- ', placeholder: '列表项' },
  },
  {
    icon: 'ri-list-ordered',
    label: '有序列表',
    action: { type: 'line-prefix', prefix: '1. ', placeholder: '列表项' },
  },
  {
    icon: 'ri-checkbox-line',
    label: '任务列表',
    action: { type: 'line-prefix', prefix: '- [ ] ', placeholder: '任务项' },
    dividerAfter: true,
  },
  {
    icon: 'ri-separator',
    label: '分割线',
    action: { type: 'block', block: '\n---\n' },
  },
  {
    icon: 'ri-link',
    label: '链接',
    action: { type: 'wrap', before: '[', after: '](https://)', placeholder: '链接文字' },
  },
  {
    icon: 'ri-image-line',
    label: '图片',
    action: { type: 'insert', block: '![图片描述](https://)', placeholder: '' },
  },
  {
    icon: 'ri-code-line',
    label: '行内代码',
    action: { type: 'wrap', before: '`', after: '`', placeholder: '代码' },
  },
  {
    icon: 'ri-code-box-line',
    label: '代码块',
    action: { type: 'block', block: '\n```\n代码内容\n```\n' },
    dividerAfter: true,
  },
  {
    icon: 'ri-table-line',
    label: '表格',
    action: {
      type: 'block',
      block: '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n',
    },
  },
];

const HEADING_OPTIONS = [
  { label: '正文', prefix: '', style: 'text-sm text-gray-600' },
  { label: '一级标题', prefix: '# ', style: 'text-base font-bold text-gray-800' },
  { label: '二级标题', prefix: '## ', style: 'text-sm font-bold text-gray-700' },
  { label: '三级标题', prefix: '### ', style: 'text-xs font-bold text-gray-600' },
];

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (val: string) => void;
}

const MarkdownToolbar = ({ textareaRef, value, onChange }: MarkdownToolbarProps) => {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const headingBtnRef = useRef<HTMLButtonElement>(null);

  // ── Core insert logic ──
  const applyAction = (action: ToolAction) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    let newValue = value;
    let newCursorStart = start;
    let newCursorEnd = end;

    if (action.type === 'wrap') {
      const before = action.before ?? '';
      const after = action.after ?? '';
      const inner = selected || action.placeholder || '';
      newValue = value.slice(0, start) + before + inner + after + value.slice(end);
      newCursorStart = start + before.length;
      newCursorEnd = newCursorStart + inner.length;
    } else if (action.type === 'line-prefix') {
      const prefix = action.prefix ?? '';
      // Find line start
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', end);
      const lineEndActual = lineEnd === -1 ? value.length : lineEnd;
      const lineContent = value.slice(lineStart, lineEndActual);

      // Toggle: if already has prefix, remove it; else add it
      if (lineContent.startsWith(prefix)) {
        const removed = lineContent.slice(prefix.length);
        newValue = value.slice(0, lineStart) + removed + value.slice(lineEndActual);
        newCursorStart = Math.max(lineStart, start - prefix.length);
        newCursorEnd = Math.max(lineStart, end - prefix.length);
      } else {
        const inner = selected || action.placeholder || '';
        if (selected) {
          newValue = value.slice(0, lineStart) + prefix + lineContent + value.slice(lineEndActual);
          newCursorStart = start + prefix.length;
          newCursorEnd = end + prefix.length;
        } else {
          newValue = value.slice(0, lineStart) + prefix + inner + value.slice(lineEndActual);
          newCursorStart = lineStart + prefix.length;
          newCursorEnd = newCursorStart + inner.length;
        }
      }
    } else if (action.type === 'block' || action.type === 'insert') {
      const block = action.block ?? '';
      newValue = value.slice(0, start) + block + value.slice(end);
      newCursorStart = start + block.length;
      newCursorEnd = newCursorStart;
    }

    onChange(newValue);

    // Restore focus + cursor after React re-render
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newCursorStart, newCursorEnd);
    });
  };

  const applyHeading = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    setShowHeadingMenu(false);

    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const lineEndActual = lineEnd === -1 ? value.length : lineEnd;
    const lineContent = value.slice(lineStart, lineEndActual);

    // Strip existing heading prefix
    const stripped = lineContent.replace(/^#{1,3}\s/, '');
    const newLine = prefix + stripped;
    const newValue = value.slice(0, lineStart) + newLine + value.slice(lineEndActual);
    onChange(newValue);

    requestAnimationFrame(() => {
      ta.focus();
      const newPos = lineStart + newLine.length;
      ta.setSelectionRange(newPos, newPos);
    });
  };

  // Detect current heading level for the dropdown label
  const getCurrentHeading = () => {
    const ta = textareaRef.current;
    if (!ta) return HEADING_OPTIONS[0];
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const lineEndActual = lineEnd === -1 ? value.length : lineEnd;
    const line = value.slice(lineStart, lineEndActual);
    if (line.startsWith('### ')) return HEADING_OPTIONS[3];
    if (line.startsWith('## ')) return HEADING_OPTIONS[2];
    if (line.startsWith('# ')) return HEADING_OPTIONS[1];
    return HEADING_OPTIONS[0];
  };

  const [, forceUpdate] = useState(0);
  const currentHeading = getCurrentHeading();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+B / Ctrl+I shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        applyAction({ type: 'wrap', before: '**', after: '**', placeholder: '加粗文字' });
      } else if (e.key === 'i') {
        e.preventDefault();
        applyAction({ type: 'wrap', before: '*', after: '*', placeholder: '斜体文字' });
      }
    }
  };

  return (
    <div className="flex flex-col flex-shrink-0">
      {/* Toolbar row */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-gray-100 bg-gray-50/60 flex-wrap">

        {/* Heading dropdown */}
        <div className="relative mr-1">
          <button
            ref={headingBtnRef}
            onClick={() => { forceUpdate((n) => n + 1); setShowHeadingMenu((v) => !v); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors cursor-pointer whitespace-nowrap font-medium min-w-[72px] justify-between"
            title="标题级别"
          >
            <span>{currentHeading.label}</span>
            <i className="ri-arrow-down-s-line text-xs text-gray-400" />
          </button>

          {showHeadingMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowHeadingMenu(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl overflow-hidden z-20 w-36" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                {HEADING_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => applyHeading(opt.prefix)}
                    className={`w-full text-left px-3 py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer ${opt.style} ${currentHeading.label === opt.label ? 'bg-orange-50 text-orange-600' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-gray-200 mx-0.5 flex-shrink-0" />

        {/* Tool buttons */}
        {TOOLS.map((tool, idx) => (
          <span key={idx} className="contents">
            <button
              onClick={() => applyAction(tool.action)}
              title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors cursor-pointer flex-shrink-0"
            >
              <i className={`${tool.icon} text-sm`} />
            </button>
            {tool.dividerAfter && (
              <div className="w-px h-4 bg-gray-200 mx-0.5 flex-shrink-0" />
            )}
          </span>
        ))}
      </div>

      {/* Expose keydown handler via data attribute trick — caller must attach it */}
      <textarea
        style={{ display: 'none' }}
        data-md-keydown-handler="true"
        onKeyDown={handleKeyDown}
        readOnly
      />
    </div>
  );
};

// Export the keydown handler separately so the main textarea can use it
export const useMarkdownKeyDown = (
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (val: string) => void
) => {
  const applyWrap = (before: string, after: string, placeholder: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  return (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); applyWrap('**', '**', '加粗文字'); }
      if (e.key === 'i') { e.preventDefault(); applyWrap('*', '*', '斜体文字'); }
    }
  };
};

export default MarkdownToolbar;
