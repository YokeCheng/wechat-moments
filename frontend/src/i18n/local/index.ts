const modules = import.meta.glob('./*/*.ts', { eager: true });

const messages: Record<string, { translation: Record<string, unknown> }> = {};

Object.keys(modules).forEach((path) => {
  const match = path.match(/\.\/([^/]+)\/([^/]+)\.ts$/);
  if (match) {
    const [, lang] = match;
    const module = modules[path] as { default?: Record<string, unknown> };
    
    if (!messages[lang]) {
      messages[lang] = { translation: {} };
    }
    
    // 合并翻译内容
    if (module.default) {
      messages[lang].translation = {
        ...messages[lang].translation,
        ...module.default
      };
    }
  }
});

export default messages; 
