interface TanStackQueryBlockResolver {
  type: 'tanstack-query';
  endpoint: string;
  screenshots?: string;
}

export type BlockResolver = TanStackQueryBlockResolver;
