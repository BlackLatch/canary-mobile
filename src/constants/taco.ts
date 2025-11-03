// TACo (Threshold Access Control) configuration constants

// TACo Domain - using DEVNET for testnet deployment
export const TACO_DOMAIN = 'devnet'; // This will map to domains.DEVNET in taco-mobile

// Ritual ID for threshold encryption (testnet)
export const RITUAL_ID = 27;

// TACo operates on Polygon Amoy network
export const TACO_NETWORK_CHAIN_ID = 80002; // Polygon Amoy

// Pinata IPFS configuration (from reference implementation)
export const PINATA_CONFIG = {
  apiKey: 'ffd0e25caf5a99b73c11', // Reference app API key
  apiSecret: 'b89f98e0f4f33f94e4f67c9e4e6e18b9ee3c1f9a7f9e6e7e9f0f1f2f3f4f5f6f',
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5ZTQzZWE3Yy01YzQ3LTQ4YzctOGE4OS0xNjQzYzM5NzA4MTgiLCJlbWFpbCI6ImRldm9wc0BudWN5cGhlci5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZmZkMGUyNWNhZjVhOTliNzNjMTEiLCJzY29wZWRLZXlTZWNyZXQiOiJiODlmOThlMGY0ZjMzZjk0ZTRmNjdjOWU0ZTZlMThiOWVlM2MxZjlhN2Y5ZTZlN2U5ZjBmMWYyZjNmNGY1ZjZmIiwiaWF0IjoxNzMxMDk1OTMyfQ.IiJlbWFpbCI6ImRldm9wc0BudWN5cGhlci5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZmZkMGUyNWNhZjVhOTliNzNjMTEiLCJzY29wZWRLZXlTZWNyZXQiOiJiODlmOThlMGY0ZjMzZjk0ZTRmNjdjOWU0ZTZlMThiOWVlM2MxZjlhN2Y5ZTZlN2U5ZjBmMWYyZjNmNGY1ZjZmIiwiaWF0IjoxNzMxMDk1OTMyfQ',
  gateway: 'https://purple-certain-guan-605.mypinata.cloud',
};

// Check-in interval presets (in seconds)
export const CHECK_IN_INTERVALS = {
  ONE_HOUR: 3600,
  SIX_HOURS: 21600,
  TWELVE_HOURS: 43200,
  ONE_DAY: 86400,
  THREE_DAYS: 259200,
  ONE_WEEK: 604800,
  TWO_WEEKS: 1209600,
  ONE_MONTH: 2592000,
  THREE_MONTHS: 7776000,
  SIX_MONTHS: 15552000,
  ONE_YEAR: 31536000,
} as const;

// Contract constants (from DossierV2)
export const DOSSIER_LIMITS = {
  MIN_CHECK_IN_INTERVAL: 3600, // 1 hour
  MAX_CHECK_IN_INTERVAL: 31536000, // 1 year
  MAX_DOSSIERS_PER_USER: 100,
  MAX_FILES_PER_DOSSIER: 50,
  MAX_RECIPIENTS_PER_DOSSIER: 20,
  GRACE_PERIOD: 86400, // 24 hours
} as const;
