/**
 * Pinata IPFS Pinning Service for React Native
 */

import { PINATA_CONFIG } from '../constants/taco';

const PINATA_API_URL = 'https://api.pinata.cloud';

export interface PinataUploadResult {
  ipfsHash: string;
  pinSize: number;
  timestamp: string;
  success: boolean;
  error?: string;
  gatewayUrl: string;
}

class PinataService {
  private apiKey: string;
  private apiSecret: string;
  private jwt: string;
  private gateway: string;

  constructor() {
    this.apiKey = PINATA_CONFIG.apiKey;
    this.apiSecret = PINATA_CONFIG.apiSecret;
    this.jwt = PINATA_CONFIG.jwt;
    this.gateway = PINATA_CONFIG.gateway;

    console.log('🟣 Pinata service initialized');
    console.log('📍 API Key available:', !!this.apiKey);
    console.log('📍 JWT available:', !!this.jwt);
    console.log('📍 Gateway:', this.gateway);
  }

  /**
   * Pin file to IPFS via Pinata
   */
  async pinFileToIPFS(
    encryptedData: Uint8Array,
    filename: string = 'encrypted_file'
  ): Promise<PinataUploadResult> {
    try {
      console.log('🟣 PINATA UPLOAD ATTEMPT');
      console.log('📍 Target:', PINATA_API_URL);
      console.log('- File size:', encryptedData.length, 'bytes');
      console.log('- Filename:', filename);

      // Check for authentication
      if (!this.jwt && !this.apiKey) {
        throw new Error('No Pinata API credentials found. Please configure PINATA_CONFIG.');
      }

      // Create FormData
      const formData = new FormData();

      // In React Native, we can append Uint8Array directly as a blob
      // Convert Uint8Array to Blob-like object
      const blob = {
        uri: `data:application/octet-stream;base64,${this.uint8ArrayToBase64(encryptedData)}`,
        type: 'application/octet-stream',
        name: filename,
      };

      // @ts-ignore - React Native FormData accepts this format
      formData.append('file', blob);

      // Add metadata
      const metadata = JSON.stringify({
        name: filename,
        keyvalues: {
          type: 'encrypted_file',
          timestamp: new Date().toISOString(),
          size: encryptedData.length.toString(),
        },
      });
      formData.append('pinataMetadata', metadata);

      // Add options
      const options = JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false,
      });
      formData.append('pinataOptions', options);

      // Prepare headers
      const headers: Record<string, string> = {};
      if (this.jwt) {
        headers['Authorization'] = `Bearer ${this.jwt}`;
      } else if (this.apiKey && this.apiSecret) {
        headers['pinata_api_key'] = this.apiKey;
        headers['pinata_secret_api_key'] = this.apiSecret;
      }

      console.log('📤 Uploading to Pinata...');

      const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Pinata upload failed:', response.status, errorText);
        throw new Error(`Pinata upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const ipfsHash = result.IpfsHash;
      const gatewayUrl = `${this.gateway}/ipfs/${ipfsHash}`;

      console.log('🎉 PINATA UPLOAD SUCCESS!');
      console.log('📦 IPFS Hash:', ipfsHash);
      console.log('📦 Pin Size:', result.PinSize);
      console.log('📦 Gateway URL:', gatewayUrl);

      return {
        ipfsHash: ipfsHash,
        pinSize: result.PinSize,
        timestamp: result.Timestamp,
        success: true,
        gatewayUrl: gatewayUrl,
      };
    } catch (error) {
      console.error('❌ Pinata upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown Pinata error';

      return {
        ipfsHash: '',
        pinSize: 0,
        timestamp: '',
        success: false,
        error: errorMessage,
        gatewayUrl: '',
      };
    }
  }

  /**
   * Retrieve file from IPFS via Pinata gateway
   */
  async retrieveFromIPFS(ipfsHash: string): Promise<Uint8Array | null> {
    try {
      console.log('🟣 Retrieving from Pinata gateway:', ipfsHash);

      const gatewayUrl = `${this.gateway}/ipfs/${ipfsHash}`;
      console.log('📍 Gateway URL:', gatewayUrl);

      const response = await fetch(gatewayUrl);

      if (!response.ok) {
        console.error('❌ Failed to retrieve from Pinata:', response.status);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      console.log('✅ Retrieved from Pinata:', data.length, 'bytes');
      return data;
    } catch (error) {
      console.error('❌ Pinata retrieve error:', error);
      return null;
    }
  }

  /**
   * Unpin file from Pinata
   */
  async unpinFile(ipfsHash: string): Promise<boolean> {
    try {
      console.log('🟣 Unpinning from Pinata:', ipfsHash);

      const headers: Record<string, string> = {};
      if (this.jwt) {
        headers['Authorization'] = `Bearer ${this.jwt}`;
      } else if (this.apiKey && this.apiSecret) {
        headers['pinata_api_key'] = this.apiKey;
        headers['pinata_secret_api_key'] = this.apiSecret;
      }

      const response = await fetch(`${PINATA_API_URL}/pinning/unpin/${ipfsHash}`, {
        method: 'DELETE',
        headers: headers,
      });

      if (response.ok) {
        console.log('✅ File unpinned from Pinata');
        return true;
      } else {
        console.error('❌ Pinata unpin failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Pinata unpin error:', error);
      return false;
    }
  }

  /**
   * Test Pinata connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🟣 Testing Pinata connection...');

      const headers: Record<string, string> = {};
      if (this.jwt) {
        headers['Authorization'] = `Bearer ${this.jwt}`;
      } else if (this.apiKey && this.apiSecret) {
        headers['pinata_api_key'] = this.apiKey;
        headers['pinata_secret_api_key'] = this.apiSecret;
      }

      const response = await fetch(`${PINATA_API_URL}/data/testAuthentication`, {
        method: 'GET',
        headers: headers,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Pinata connection successful:', result.message);
        return true;
      } else {
        console.error('❌ Pinata connection failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Pinata connection error:', error);
      return false;
    }
  }

  /**
   * Generate gateway URL for IPFS hash
   */
  generateGatewayUrl(ipfsHash: string): string {
    return `${this.gateway}/ipfs/${ipfsHash}`;
  }

  /**
   * Helper: Convert Uint8Array to Base64 string
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Use btoa if available (web), otherwise use Buffer (Node.js polyfill)
    if (typeof btoa !== 'undefined') {
      return btoa(binary);
    } else {
      return Buffer.from(binary, 'binary').toString('base64');
    }
  }
}

// Export singleton instance
export const pinataService = new PinataService();

/**
 * Utility function to upload encrypted data to Pinata
 */
export async function uploadToPinata(
  encryptedData: Uint8Array,
  filename?: string
): Promise<PinataUploadResult> {
  return await pinataService.pinFileToIPFS(encryptedData, filename);
}

/**
 * Utility function to retrieve data from Pinata
 */
export async function retrieveFromPinata(ipfsHash: string): Promise<Uint8Array | null> {
  return await pinataService.retrieveFromIPFS(ipfsHash);
}

/**
 * Parse IPFS URI to get hash
 * Supports formats: ipfs://QmHash, /ipfs/QmHash, QmHash
 */
export function parseIpfsUri(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return uri.slice(7);
  } else if (uri.startsWith('/ipfs/')) {
    return uri.slice(6);
  }
  return uri;
}
