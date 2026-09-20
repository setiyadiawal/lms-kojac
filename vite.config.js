import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
var buildId = "kojac-".concat(Date.now().toString(36));
var builtAt = new Date().toISOString();
var buildVersionPlugin = {
    name: 'kojac-build-version',
    generateBundle: function () {
        this.emitFile({
            type: 'asset',
            fileName: 'version.json',
            source: JSON.stringify({ buildId: buildId, builtAt: builtAt }, null, 2),
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
