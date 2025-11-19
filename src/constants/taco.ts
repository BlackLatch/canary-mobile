// TACo (Threshold Access Control) configuration constants

// TACo Domain - using devnet (Lynx domain)
export const TACO_DOMAIN = 'lynx';

// Ritual ID for threshold encryption (Lynx devnet)
export const RITUAL_ID = 27;

// TACo operates on Polygon Amoy network
export const TACO_NETWORK_CHAIN_ID = 80002; // Polygon Amoy

// Pinata IPFS configuration
export const PINATA_CONFIG = {
  apiKey: 'afbaeacb39a9b50e2d0b',
  apiSecret: '0776df9027df8278eca6a7f89bd373c853436779f7332d625d1ff62fa07f5490',
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIzZjNlODA4MC04Y2Q5LTQxNDMtOThiMS0zMDhjNzgzOTg4OWMiLCJlbWFpbCI6ImtpZXJhbnByYXNjaEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYWZiYWVhY2IzOWE5YjUwZTJkMGIiLCJzY29wZWRLZXlTZWNyZXQiOiIwNzc2ZGY5MDI3ZGY4Mjc4ZWNhNmE3Zjg5YmQzNzNjODUzNDM2Nzc5ZjczMzJkNjI1ZDFmZjYyZmEwN2Y1NDkwIiwiZXhwIjoxNzkzODAyMDY3fQ.wOvVLQF4TzQcqqofWmWG11F2vudd9eseJ18AA9gXm5A',
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

// Contract constants (from DossierV3)
export const DOSSIER_LIMITS = {
  MIN_CHECK_IN_INTERVAL: 3600, // 1 hour
  MAX_CHECK_IN_INTERVAL: 31536000, // 1 year
  MAX_DOSSIERS_PER_USER: 100,
  MAX_FILES_PER_DOSSIER: 50,
  MAX_RECIPIENTS_PER_DOSSIER: 20,
  GRACE_PERIOD: 86400, // 24 hours
} as const;
