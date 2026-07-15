import { mkdir, readFile } from 'node:fs/promises';
import { posix, relative, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, UserConfig } from 'vite';
import {
  ContextFlatNode,
  normalizeSlotResponse,
  PageBlocksStaticManifest,
  SlotResponse,
  validateSlotManifestEntries,
} from '../core';
import { compileBlueprintFiles } from '../designer';
import { createFileSystemLoader, createFileSystemStore } from '../file-system';
import { parseSingleFile } from '../file-system/parse-single-file';
import { readAllFiles } from '../file-system/utils';
import { createPageBlocksHandler, createPageBlocksService } from '../server';
import { createManifestLoader } from './manifest-loader';
import { createManifestStore } from './manifest-store';
import {
  pageBlocksStaticFilesManifestDefine,
  pageBlocksStaticManifestDefine,
  pageBlocksStaticModeDefine,
  PageBlocksStaticFilesRuntimeManifest,
  pageBlocksViteConfigDefine,
  PageBlocksRuntimeConfig,
  PageBlocksViteOptions,
  ResolvedPageBlocksViteOptions,
} from './shared';

type ViteConfigEnv = {
  command: 'build' | 'serve';
  mode: string;
  isSsrBuild?: boolean;
};

interface ResolvedPluginOptions extends ResolvedPageBlocksViteOptions {
  designs?: string | string[];
  generateScreenshots?: () => Promise<void>;
  previewBootstrap?: string;
}

const previewBootstrapId = 'virtual:page-blocks-preview-bootstrap';
const resolvedPreviewBootstrapId = `\0${previewBootstrapId}`;

type StaticSlotSource = {
  entry: ContextFlatNode;
  relativePath: string;
  slot: SlotResponse;
};

type StaticBuildAsset = {
  fileName: string;
  source: string;
};

type StaticBuildState = {
  runtimeConfig: PageBlocksRuntimeConfig;
  manifest?: PageBlocksStaticManifest;
  staticFilesManifest?: PageBlocksStaticFilesRuntimeManifest;
  staticAssets?: StaticBuildAsset[];
};

function toPosixPath(value: string) {
  return value.replaceAll('\\', '/');
}

function normalizeBasePath(basePath?: string) {
  if (!basePath) {
    return '/';
  }

  return basePath.endsWith('/') ? basePath : `${basePath}/`;
}

function normalizeStaticAssetDir(staticAssetDir?: string) {
  const normalized = toPosixPath(staticAssetDir || 'page-blocks/slots').replace(/^\/+|\/+$/g, '');
  return normalized || 'page-blocks/slots';
}

function resolvePluginOptions(
  root: string,
  basePath: string | undefined,
  options: PageBlocksViteOptions = {}
): ResolvedPluginOptions {
  return {
    mode: 'local',
    configuredMode: options.mode || 'auto',
    readOnly: false,
    root,
    slotsDir: resolve(root, options.slotsDir || 'slots'),
    apiPath: options.apiPath || '/api/page-blocks',
    contexts: options.contexts?.length ? options.contexts : ['path'],
    screenshots: options.screenshots,
    designs: options.designs,
    defaultContexts: ['path'],
    basePath: normalizeBasePath(basePath),
    staticOutput: options.staticOutput || 'inline',
    staticAssetDir: normalizeStaticAssetDir(options.staticAssetDir),
    generateScreenshots: options.generateScreenshots,
    previewBootstrap: options.preview?.bootstrap ? resolve(root, options.preview.bootstrap) : undefined,
  };
}

async function collectStaticSlotSources(options: ResolvedPluginOptions): Promise<StaticSlotSource[]> {
  await mkdir(options.slotsDir, { recursive: true });

  const entries: StaticSlotSource[] = [];

  for (const file of Array.from(readAllFiles(options.slotsDir))) {
    if (!file.endsWith('.json')) {
      continue;
    }

    const relativePath = toPosixPath(relative(options.slotsDir, file));
    const entry = parseSingleFile(relativePath, options.contexts);
    if (!entry) {
      continue;
    }

    const json = JSON.parse(await readFile(file, 'utf8'));
    entries.push({
      entry,
      relativePath,
      slot: normalizeSlotResponse(entry.id, entry.slot, json),
    });
  }

  validateSlotManifestEntries(
    options.contexts,
    entries.map(({ entry }) => entry),
    (entry) => entries.find((candidate) => candidate.entry.id === entry.id)?.relativePath || entry.id
  );
  return entries;
}

async function buildStaticManifest(options: ResolvedPluginOptions): Promise<PageBlocksStaticManifest> {
  const entries = await collectStaticSlotSources(options);

  return {
    contexts: options.contexts,
    entries: entries.map(({ entry }) => entry),
    slots: Object.fromEntries(entries.map(({ entry, slot }) => [entry.id, slot])),
  };
}

async function buildStaticFilesManifest(options: ResolvedPluginOptions): Promise<{
  manifest: PageBlocksStaticFilesRuntimeManifest;
  assets: StaticBuildAsset[];
}> {
  const entries = await collectStaticSlotSources(options);

  return {
    manifest: {
      contexts: options.contexts,
      entries: entries.map(({ entry, relativePath }) => ({
        ...entry,
        file: posix.join(options.staticAssetDir, relativePath),
      })),
    },
    assets: entries.map(({ relativePath, slot }) => ({
      fileName: posix.join(options.staticAssetDir, relativePath),
      source: JSON.stringify(slot, null, 2),
    })),
  };
}

class BodyTooLargeError extends Error {}

async function readBody(req: IncomingMessage, maximumBytes = 1024 * 1024) {
  const chunks: Uint8Array[] = [];
  let size = 0;

  for await (const chunk of req) {
    const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    size += bytes.byteLength;
    if (size > maximumBytes) {
      throw new BodyTooLargeError('Page Blocks request bodies may not exceed 1 MiB.');
    }
    chunks.push(bytes);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function sendJson(
  res: ServerResponse<IncomingMessage>,
  status: number,
  body: unknown
) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function isWithinDirectory(root: string, file: string) {
  const rel = relative(root, file);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith('../'));
}

function toRuntimeConfig(
  options: ResolvedPluginOptions,
  env: ViteConfigEnv
): StaticBuildState | Promise<StaticBuildState> {
  const mode = options.configuredMode === 'auto'
    ? env.command === 'serve' ? 'local' : 'static'
    : options.configuredMode;

  if (mode === 'local') {
    return {
      runtimeConfig: {
        mode: 'local',
        readOnly: Boolean(options.designs),
        apiPath: options.apiPath,
        root: options.root,
        slotsDir: options.slotsDir,
        contexts: options.contexts,
        screenshots: options.screenshots,
        basePath: options.basePath,
        defaultContexts: options.defaultContexts,
      },
    };
  }

  if (options.staticOutput === 'lazy-files') {
    return buildStaticFilesManifest(options).then(({ manifest, assets }) => ({
      runtimeConfig: {
        mode,
        staticOutput: 'lazy-files',
        readOnly: mode === 'static',
        ...(mode === 'preview' ? { apiPath: options.apiPath } : {}),
        contexts: options.contexts,
        screenshots: options.screenshots,
        basePath: options.basePath,
        defaultContexts: options.defaultContexts,
      },
      staticFilesManifest: manifest,
      staticAssets: assets,
    }));
  }

  return buildStaticManifest(options).then((manifest) => ({
    runtimeConfig: {
      mode,
      staticOutput: 'inline',
      readOnly: mode === 'static',
      ...(mode === 'preview' ? { apiPath: options.apiPath } : {}),
      contexts: options.contexts,
      screenshots: options.screenshots,
      basePath: options.basePath,
      defaultContexts: options.defaultContexts,
    },
    manifest,
  }));
}

export type { PageBlocksViteOptions } from './shared';

export default function pageBlocks(options: PageBlocksViteOptions = {}): Plugin {
  let resolvedOptions: ResolvedPluginOptions | null = null;
  let staticAssetsToEmit: StaticBuildAsset[] = [];

  return {
    name: 'page-blocks:vite',
    resolveId(id) {
      if (id === previewBootstrapId) return resolvedPreviewBootstrapId;
    },
    load(id) {
      if (id !== resolvedPreviewBootstrapId) return;
      if (!resolvedOptions?.previewBootstrap) {
        throw new Error('pageBlocks({ mode: "preview" }) requires preview.bootstrap.');
      }
      return [
        `import bootstrap from ${JSON.stringify(resolvedOptions.previewBootstrap)};`,
        `import { startPageBlocksPreview } from "page-blocks/client";`,
        `const loadEditor = async () => {`,
        `  await import("page-blocks/editor/style.css");`,
        `  return import("page-blocks/editor");`,
        `};`,
        `startPageBlocksPreview(bootstrap, loadEditor);`,
      ].join('\n');
    },
    async config(config, env) {
      const root = resolve(config.root || process.cwd());
      resolvedOptions = resolvePluginOptions(root, config.base, options);

      const { runtimeConfig, manifest, staticFilesManifest, staticAssets } = await toRuntimeConfig(
        resolvedOptions,
        env as ViteConfigEnv
      );
      staticAssetsToEmit = staticAssets || [];

      return {
        define: {
          [pageBlocksViteConfigDefine]: JSON.stringify(runtimeConfig),
          [pageBlocksStaticManifestDefine]: manifest ? JSON.stringify(manifest) : 'undefined',
          [pageBlocksStaticFilesManifestDefine]: staticFilesManifest ? JSON.stringify(staticFilesManifest) : 'undefined',
          [pageBlocksStaticModeDefine]: runtimeConfig.mode === 'local' ? 'false' : 'true',
        },
      } satisfies UserConfig;
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        if (resolvedOptions?.configuredMode !== 'preview') return;
        if (!resolvedOptions.previewBootstrap) {
          throw new Error('pageBlocks({ mode: "preview" }) requires preview.bootstrap.');
        }
        return [{
          tag: 'script',
          attrs: { type: 'module' },
          children: `import ${JSON.stringify(previewBootstrapId)};`,
          injectTo: 'head',
        }];
      },
    },
    generateBundle() {
      for (const asset of staticAssetsToEmit) {
        this.emitFile({
          type: 'asset',
          fileName: asset.fileName,
          source: asset.source,
        });
      }
    },
    configureServer(server) {
      if (!resolvedOptions) {
        resolvedOptions = resolvePluginOptions(server.config.root, server.config.base, options);
      }

      const blueprintMode = Boolean(resolvedOptions.designs);
      let cachedBlueprintManifest: PageBlocksStaticManifest | null = null;
      let blueprintManifestStale = blueprintMode;
      const loader = blueprintMode
        ? createManifestLoader(() => {
            if (!cachedBlueprintManifest) {
              throw new Error('Blueprint manifest was requested before it was compiled.');
            }

            return cachedBlueprintManifest;
          })
        : createFileSystemLoader({
            path: resolvedOptions.slotsDir,
            contexts: resolvedOptions.contexts,
          });

      const store = blueprintMode
        ? createManifestStore(() => {
            if (!cachedBlueprintManifest) throw new Error('Blueprint manifest was requested before it was compiled.');
            return cachedBlueprintManifest;
          }, 'local')
        : createFileSystemStore({
            path: resolvedOptions.slotsDir,
            contexts: resolvedOptions.contexts,
            scope: 'local',
            loader: loader as ReturnType<typeof createFileSystemLoader>,
          });
      const handler = createPageBlocksHandler({
        service: createPageBlocksService({ store }),
        scope: 'local',
        ...(blueprintMode ? {} : { authorize: () => true }),
      });

      const refreshBlueprintManifest = async () => {
        if (!blueprintMode || !blueprintManifestStale) {
          return;
        }

        const compiled = await compileBlueprintFiles({
          root: resolvedOptions!.root,
          designs: resolvedOptions!.designs!,
          contexts: resolvedOptions!.contexts,
          loadModule: (file) => server.ssrLoadModule(file),
        });

        cachedBlueprintManifest = compiled.manifest;
        blueprintManifestStale = false;
      };

      if (blueprintMode) {
        refreshBlueprintManifest().catch((error) => {
          server.config.logger.error(`[page-blocks] failed to compile blueprints: ${String(error)}`);
        });
      } else {
        loader.init().catch((error) => {
          server.config.logger.error(`[page-blocks] failed to initialize slots: ${String(error)}`);
        });
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://page-blocks.local');

        const screenshotPath = `${resolvedOptions!.apiPath.replace(/\/$/, '')}/screenshots`;
        if (
          req.method !== 'POST' ||
          (url.pathname !== resolvedOptions!.apiPath && url.pathname !== screenshotPath)
        ) {
          next();
          return;
        }

        try {
          if (blueprintMode) {
            await refreshBlueprintManifest();
          }

          if (url.pathname === screenshotPath) {
            if (blueprintMode || !resolvedOptions!.generateScreenshots) {
              sendJson(res, 403, { error: { code: 'forbidden', message: 'Screenshot generation is unavailable.' } });
              return;
            }
            await resolvedOptions!.generateScreenshots();
            sendJson(res, 200, { success: true });
            return;
          }

          const rawBody = await readBody(req);
          const headers = new Headers();
          for (const [name, value] of Object.entries(req.headers)) {
            for (const item of Array.isArray(value) ? value : value ? [value] : []) headers.append(name, item);
          }
          const response = await handler(
            new Request(url, { method: 'POST', headers, body: rawBody || '{}' })
          );
          const responseBody = await response.json();
          sendJson(res, response.status, responseBody);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          const status = error instanceof BodyTooLargeError ? 413 : error instanceof SyntaxError ? 400 : 500;
          sendJson(res, status, { error: { code: status === 413 ? 'body_too_large' : 'request_failed', message } });
        }
      });

      if (blueprintMode) {
        server.watcher.add(resolvedOptions.root);
        server.watcher.on('all', (_event, file) => {
          if (!isWithinDirectory(resolvedOptions!.root, file)) {
            return;
          }

          if (!/(\.(c|m)?jsx?$|\.tsx?$|\.json)$/i.test(file)) {
            return;
          }

          blueprintManifestStale = true;
          server.ws.send({ type: 'full-reload' });
        });
        return;
      }

      server.watcher.add(resolvedOptions.slotsDir);
      server.watcher.on('all', (_event, file) => {
        if (!file.endsWith('.json') || !isWithinDirectory(resolvedOptions!.slotsDir, file)) {
          return;
        }

        loader.init(true).catch((error) => {
          server.config.logger.error(`[page-blocks] failed to refresh slots: ${String(error)}`);
        });
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
