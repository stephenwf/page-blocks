declare module 'vite' {
  export interface UserConfig {
    root?: string;
    define?: Record<string, string>;
  }

  export interface ViteDevServer {
    config: {
      root: string;
      logger: {
        error(message: string): void;
      };
    };
    middlewares: {
      use(
        handler: (
          req: import('node:http').IncomingMessage,
          res: import('node:http').ServerResponse<import('node:http').IncomingMessage>,
          next: () => void
        ) => void | Promise<void>
      ): void;
    };
    watcher: {
      add(path: string): void;
      on(event: string, callback: (event: string, file: string) => void): void;
    };
    ssrLoadModule(url: string): Promise<Record<string, unknown>>;
    ws: {
      send(payload: { type: string }): void;
    };
  }

  export interface Plugin {
    name: string;
    config?(
      config: UserConfig,
      env: { command: 'build' | 'serve'; mode: string; isSsrBuild?: boolean }
    ): UserConfig | void | Promise<UserConfig | void>;
    configureServer?(server: ViteDevServer): void;
  }
}
