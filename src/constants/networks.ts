// Network and chain configurations for Canary mobile

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Polygon Amoy (for TACo encryption)
export const POLYGON_AMOY: ChainConfig = {
  id: 80002,
  name: 'Polygon Amoy',
  rpcUrl: 'https://rpc-amoy.polygon.technology/',
  explorerUrl: 'https://amoy.polygonscan.com/',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
};

// Status Network Sepolia (for Dossier contract)
export const STATUS_SEPOLIA: ChainConfig = {
  id: 1660990954,
  name: 'Status Network Sepolia',
  rpcUrl: 'https://public.sepolia.rpc.status.network',
  explorerUrl: 'https://sepolia.explorer.status.network',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
};

export const SUPPORTED_CHAINS = [POLYGON_AMOY, STATUS_SEPOLIA];

export const CHAIN_IDS = {
  POLYGON_AMOY: POLYGON_AMOY.id,
  STATUS_SEPOLIA: STATUS_SEPOLIA.id,
} as const;
