import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import AutoImport from "unplugin-auto-import/vite";
// import { readdyJsxRuntimeProxyPlugin } from "./vite.jsx-runtime-proxy";

//const proxyPlugins = isPreview ? [readdyJsxRuntimeProxyPlugin()] : [];
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.BASE_PATH || "/";
  const isPreview = Boolean(env.IS_PREVIEW);
  const devApiProxyTarget = env.VITE_DEV_API_PROXY_TARGET || "http://127.0.0.1:8000";

  return {
    define: {
      __BASE_PATH__: JSON.stringify(base),
      __IS_PREVIEW__: JSON.stringify(isPreview),
      __READDY_PROJECT_ID__: JSON.stringify(env.PROJECT_ID || ""),
      __READDY_VERSION_ID__: JSON.stringify(env.VERSION_ID || ""),
      __READDY_AI_DOMAIN__: JSON.stringify(env.READDY_AI_DOMAIN || ""),
    },
    plugins: [
      // ...proxyPlugins,
      react(),
      AutoImport({
        imports: [
          {
            react: [
              ["default", "React"],
              "useState",
              "useEffect",
              "useContext",
              "useReducer",
              "useCallback",
              "useMemo",
              "useRef",
              "useImperativeHandle",
              "useLayoutEffect",
              "useDebugValue",
              "useDeferredValue",
              "useId",
              "useInsertionEffect",
              "useSyncExternalStore",
              "useTransition",
              "startTransition",
              "lazy",
              "memo",
              "forwardRef",
              "createContext",
              "createElement",
              "cloneElement",
              "isValidElement",
            ],
          },
          {
            "react-router-dom": [
              "useNavigate",
              "useLocation",
              "useParams",
              "useSearchParams",
              "Link",
              "NavLink",
              "Navigate",
              "Outlet",
            ],
          },
          {
            "react-i18next": ["useTranslation", "Trans"],
          },
        ],
        dts: true,
      }),
    ],
    base,
    build: {
      sourcemap: true,
      outDir: "out",
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      host: "127.0.0.1",
      strictPort: true,
      proxy: {
        "/api": {
          target: devApiProxyTarget,
          changeOrigin: true,
        },
        "/health": {
          target: devApiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
