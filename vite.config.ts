import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, type PluginOption, type UserConfig } from 'vite'

const platform = process.env.CWN_PLATFORM || 'node'

// The in-browser server runtime plugin is only needed for the static "Netlify Drop"
// edition (CWN_PLATFORM=netlify). Load it lazily so the regular build never depends
// on that file being present.
async function loadBrowserServerRuntime(): Promise<PluginOption[]> {
  if (platform !== 'netlify') return []
  const pluginPath = './scripts/vite-plugin-browser-server.ts'
  const { browserServerRuntime } = await import(pluginPath)
  return [browserServerRuntime()]
}

export default defineConfig(async (): Promise<UserConfig> => ({
  plugins: [react(), ...(await loadBrowserServerRuntime())],
  resolve: {
    alias: {
      // Node edition: the entry point that throws if reached, so the bundle never
      // depends on the generated browser runtime. Netlify build swaps in the real one.
      ...(platform === 'netlify'
        ? {}
        : { 'virtual:cwn-browser-server': path.resolve(process.cwd(), 'src/platform/browser-runtime-node-stub.ts') }),
    },
  },
  define: {
    __CWN_PLATFORM__: JSON.stringify(platform),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
}))
