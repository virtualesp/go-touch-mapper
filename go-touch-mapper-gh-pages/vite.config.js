import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { minify } from 'html-minifier-terser';

const BUILD_TARGETS = ['go', 'static', 'pico'];
const DEFAULT_MODES = ['development', 'production'];
const DEFAULT_BUILD_TARGET = 'go';

function assertBuildTarget(target) {
  if (!BUILD_TARGETS.includes(target)) {
    throw new Error(`[build-target] 不支持的构建目标: ${target}。允许值: ${BUILD_TARGETS.join(', ')}`);
  }

  return target;
}

function resolveBuildTarget(mode) {
  const env = loadEnv(mode, process.cwd(), '');
  const envTarget = env.VITE_BUILD_TARGET || env.BUILD_TARGET;

  if (envTarget) {
    return assertBuildTarget(envTarget);
  }

  if (BUILD_TARGETS.includes(mode)) {
    return mode;
  }

  if (DEFAULT_MODES.includes(mode)) {
    console.warn(`[build-target] 未指定构建目标，使用默认目标: ${DEFAULT_BUILD_TARGET}`);
    return DEFAULT_BUILD_TARGET;
  }

  return assertBuildTarget(mode);
}

function buildTargetTitle(buildTarget) {
  return {
    name: 'build-target-title',
    transformIndexHtml(html) {
      return html.replace(/<title>.*?<\/title>/, `<title>TouchMapper:${buildTarget}</title>`);
    },
  };
}

function minifySingleFileHtml() {
  return {
    name: 'minify-single-file-html',
    enforce: 'post',
    async generateBundle(_, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || !asset.fileName.endsWith('.html')) {
          continue;
        }

        asset.source = await minify(String(asset.source), {
          collapseBooleanAttributes: true,
          collapseWhitespace: true,
          html5: true,
          minifyCSS: true,
          minifyJS: true,
          removeAttributeQuotes: true,
          removeComments: true,
          removeEmptyAttributes: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          sortAttributes: true,
          sortClassName: true,
          useShortDoctype: true,
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const buildTarget = resolveBuildTarget(mode);

  return {
    base: './',
    publicDir: false,
    define: {
      __BUILD_TARGET__: JSON.stringify(buildTarget),
      __BUILD_TARGETS__: JSON.stringify(BUILD_TARGETS),
    },
    plugins: [react(), buildTargetTitle(buildTarget), viteSingleFile(), minifySingleFileHtml()],
    server: {
      proxy: buildTarget === 'pico' ? {
        '/': {
          target: 'http://192.168.3.117',
          changeOrigin: true,
          ws: true,
        },
      } : undefined,
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
      assetsInlineLimit: 100000000,
      modulePreload: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          passes: 3,
          pure_getters: true,
          toplevel: true,
          unsafe_arrows: true,
          unsafe_methods: true,
        },
        format: {
          comments: false,
        },
        mangle: {
          safari10: true,
          toplevel: true,
        },
      },
    },
  };
});
