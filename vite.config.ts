import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';

const buildId = `kojac-${Date.now().toString(36)}`;
const builtAt = new Date().toISOString();

const buildVersionPlugin: Plugin = {
  name: 'kojac-build-version',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildId, builtAt }, null, 2),
    });
  },
};

export default defineConfig({
  plugins: [react(), buildVersionPlugin],
  define: {
    __KOJAC_BUILD_ID__: JSON.stringify(buildId),
  },
  server: { port: 5173 },
});
