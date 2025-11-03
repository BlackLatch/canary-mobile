/**
 * WalletContext - Unified wallet management
 *
 * Provides a single interface for managing multiple wallet types:
 * - Burner Wallet (anonymous, client-side generated)
 * - WalletConnect v2 (mobile wallet connection) - TODO
 * - Embedded Wallet (Magic/Privy) - TODO
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { burnerWalletService } from '../lib/burnerWallet';
import { contractService } from '../lib/contract';
import type { WalletType, Address } from '../types/dossier';

const WALLET_TYPE_KEY = '@canary:wallet_type';

interface WalletContextState {
  // Wallet state
  walletType: WalletType | null;
  address: Address | null;
  isConnected: boolean;
  isConnecting: boolean;
  isLoading: boolean;

  // Wallet methods
  connectBurnerWallet: (password?: string) => Promise<void>;
  connectWalletConnect: () => Promise<void>; // TODO
  connectEmbeddedWallet: () => Promise<void>; // TODO
  disconnect: () => Promise<void>;

  // Provider/signer access
  getSigner: () => Promise<ethers.Signer | null>;
  getProvider: () => ethers.providers.Provider;

  // Balance
  balance: ethers.BigNumber | null;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextState | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<ethers.BigNumber | null>(null);

  /**
   * Initialize wallet on mount
   */
  useEffect(() => {
    initializeWallet();
  }, []);

  /**
   * Initialize wallet from stored preference
   */
  const initializeWallet = async () => {
    try {
      console.log('🔐 Initializing wallet...');
      setIsLoading(true);

      // Check for stored wallet type preference
      const storedType = await AsyncStorage.getItem(WALLET_TYPE_KEY);

      if (storedType === 'burner') {
        // Try to load burner wallet
        const wallet = await burnerWalletService.loadWallet();
        if (wallet) {
          setWalletType('burner');
          setAddress(wallet.address as Address);
          setIsConnected(true);
          console.log('✅ Burner wallet loaded:', wallet.address);

          // Load balance
          await refreshBalanceInternal(wallet);
        }
      }
      // TODO: Handle walletconnect and embedded wallet types
    } catch (error) {
      console.error('❌ Failed to initialize wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Connect burner wallet
   */
  const connectBurnerWallet = async (password?: string) => {
    try {
      setIsConnecting(true);
      console.log('🔥 Connecting burner wallet...');

      const wallet = await burnerWalletService.getOrCreateWallet(password);

      // Store wallet type preference
      await AsyncStorage.setItem(WALLET_TYPE_KEY, 'burner');

      setWalletType('burner');
      setAddress(wallet.address as Address);
      setIsConnected(true);

      console.log('✅ Burner wallet connected:', wallet.address);

      // Load balance
      await refreshBalanceInternal(wallet);
    } catch (error) {
      console.error('❌ Failed to connect burner wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Connect WalletConnect (TODO)
   */
  const connectWalletConnect = async () => {
    try {
      setIsConnecting(true);
      console.log('🔗 Connecting WalletConnect...');

      // TODO: Implement WalletConnect v2 integration
      throw new Error('WalletConnect not yet implemented');

      // When implemented:
      // 1. Initialize WalletConnect modal
      // 2. Request connection
      // 3. Get address and provider
      // 4. Store wallet type preference
      // 5. Update state
    } catch (error) {
      console.error('❌ Failed to connect WalletConnect:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Connect embedded wallet (TODO)
   */
  const connectEmbeddedWallet = async () => {
    try {
      setIsConnecting(true);
      console.log('🔐 Connecting embedded wallet...');

      // TODO: Implement Magic/Privy integration
      throw new Error('Embedded wallet not yet implemented');

      // When implemented:
      // 1. Initialize Magic/Privy SDK
      // 2. Request authentication (email/social)
      // 3. Get address and provider
      // 4. Store wallet type preference
      // 5. Update state
    } catch (error) {
      console.error('❌ Failed to connect embedded wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Disconnect wallet
   */
  const disconnect = async () => {
    try {
      console.log('🔌 Disconnecting wallet...');

      // Clear wallet type preference
      await AsyncStorage.removeItem(WALLET_TYPE_KEY);

      // Type-specific cleanup
      if (walletType === 'burner') {
        // Don't delete burner wallet, just disconnect
        // User can explicitly delete it in settings if needed
      } else if (walletType === 'walletconnect') {
        // TODO: Disconnect WalletConnect session
      } else if (walletType === 'embedded') {
        // TODO: Logout from Magic/Privy
      }

      setWalletType(null);
      setAddress(null);
      setIsConnected(false);
      setBalance(null);

      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect wallet:', error);
      throw error;
    }
  };

  /**
   * Get signer for transactions
   */
  const getSigner = async (): Promise<ethers.Signer | null> => {
    try {
      if (!isConnected || !walletType) {
        console.error('❌ No wallet connected');
        return null;
      }

      if (walletType === 'burner') {
        const wallet = burnerWalletService.getWallet();
        if (wallet) {
          // Connect to Status Network provider
          return await contractService.createSigner(wallet);
        }
      } else if (walletType === 'walletconnect') {
        // TODO: Get WalletConnect signer
        throw new Error('WalletConnect not yet implemented');
      } else if (walletType === 'embedded') {
        // TODO: Get embedded wallet signer
        throw new Error('Embedded wallet not yet implemented');
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get signer:', error);
      return null;
    }
  };

  /**
   * Get provider for read operations
   */
  const getProvider = (): ethers.providers.Provider => {
    // Return Status Network provider
    return contractService['provider'];
  };

  /**
   * Refresh balance
   */
  const refreshBalance = async () => {
    try {
      if (!isConnected || !address) {
        return;
      }

      if (walletType === 'burner') {
        const wallet = burnerWalletService.getWallet();
        if (wallet) {
          await refreshBalanceInternal(wallet);
        }
      }
      // TODO: Handle other wallet types
    } catch (error) {
      console.error('❌ Failed to refresh balance:', error);
    }
  };

  /**
   * Internal balance refresh
   */
  const refreshBalanceInternal = async (wallet: ethers.Wallet) => {
    try {
      const provider = getProvider();
      const balance = await provider.getBalance(wallet.address);
      setBalance(balance);
      console.log('💰 Balance:', ethers.utils.formatEther(balance), 'ETH');
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
    }
  };

  const value: WalletContextState = {
    walletType,
    address,
    isConnected,
    isConnecting,
    isLoading,
    connectBurnerWallet,
    connectWalletConnect,
    connectEmbeddedWallet,
    disconnect,
    getSigner,
    getProvider,
    balance,
    refreshBalance,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

/**
 * Hook to use wallet context
 */
export const useWallet = (): WalletContextState => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
