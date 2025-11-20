/**
 * WalletContext - Unified wallet management with PIN protection
 *
 * Provides a single interface for managing multiple wallet types:
 * - Local Wallet (PIN-protected, locally stored)
 * - WalletConnect v2 (mobile wallet connection) - TODO
 * - Embedded Wallet (Magic/Privy) - TODO
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pinWalletService } from '../lib/pinWallet';
import { sessionManager, SessionEventListener } from '../lib/sessionManager';
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
  isLocked: boolean;

  // PIN-protected wallet methods
  createPinProtectedWallet: (pin: string) => Promise<void>;
  importWalletWithPin: (privateKey: string, pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  lockWallet: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<void>;
  resetWallet: () => Promise<void>;

  // Legacy methods (will be updated to use PIN)
  connectBurnerWallet: (password?: string) => Promise<void>;
  connectWalletConnect: () => Promise<void>; // TODO
  connectEmbeddedWallet: () => Promise<void>; // TODO
  disconnect: () => Promise<void>;

  // Provider/signer access
  getSigner: () => Promise<ethers.Signer | null>;
  getProvider: () => ethers.providers.Provider;
  signTypedData: (domain: ethers.TypedDataDomain, types: Record<string, ethers.TypedDataField[]>, value: Record<string, any>) => Promise<string>;

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
  const [isLocked, setIsLocked] = useState(false);
  const [balance, setBalance] = useState<ethers.BigNumber | null>(null);

  // In-memory wallet instance (cleared when locked)
  const walletRef = useRef<ethers.Wallet | null>(null);
  const sessionListenerRef = useRef<(() => void) | null>(null);

  /**
   * Initialize wallet on mount
   */
  useEffect(() => {
    initializeWallet();

    // Setup session manager
    sessionManager.start();
    const listener: SessionEventListener = (event) => {
      if (event.type === 'locked') {
        lockWallet();
      }
    };
    sessionListenerRef.current = sessionManager.addEventListener(listener);

    // Cleanup
    return () => {
      sessionListenerRef.current?.();
      sessionManager.stop();
      clearInMemoryWallet();
    };
  }, []);

  /**
   * Initialize wallet from stored preference
   */
  const initializeWallet = async () => {
    try {
      console.log('🔐 Initializing wallet...');
      setIsLoading(true);

      // Check if PIN-protected wallet exists
      const hasWallet = await pinWalletService.hasWallet();
      if (hasWallet) {
        const walletAddress = await pinWalletService.getWalletAddress();
        if (walletAddress) {
          setWalletType('burner'); // Using 'burner' for backward compatibility
          setAddress(walletAddress as Address);
          setIsConnected(true);
          setIsLocked(true); // Start locked, require PIN to unlock
          console.log('✅ PIN-protected wallet found:', walletAddress);
          return;
        }
      }

      // Legacy: Check for old burner wallet that needs migration
      const storedType = await AsyncStorage.getItem(WALLET_TYPE_KEY);
      if (storedType === 'burner') {
        // Will be handled by migration service
        console.log('⚠️ Legacy burner wallet detected - migration needed');
      }
    } catch (error) {
      console.error('❌ Failed to initialize wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear in-memory wallet
   */
  const clearInMemoryWallet = () => {
    if (walletRef.current) {
      // Clear sensitive data from memory
      walletRef.current = null;
    }
  };

  /**
   * Create PIN-protected wallet
   */
  const createPinProtectedWallet = async (pin: string) => {
    try {
      setIsConnecting(true);
      console.log('🔐 Creating PIN-protected wallet...');

      const { wallet, address: walletAddress } = await pinWalletService.createPinProtectedWallet(pin);

      // Store wallet type preference
      await AsyncStorage.setItem(WALLET_TYPE_KEY, 'burner');

      // Store wallet instance (already unlocked from creation)
      walletRef.current = wallet;

      setWalletType('burner');
      setAddress(walletAddress as Address);
      setIsConnected(true);
      setIsLocked(false);

      console.log('✅ PIN-protected wallet created:', walletAddress);

      // Start session manager
      sessionManager.start();

      // Load balance
      await refreshBalanceInternal(wallet);
    } catch (error) {
      console.error('❌ Failed to create PIN-protected wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Import wallet with PIN protection
   */
  const importWalletWithPin = async (privateKey: string, pin: string) => {
    try {
      setIsConnecting(true);
      console.log('🔐 Importing wallet with PIN protection...');

      const { wallet, address: walletAddress } = await pinWalletService.importWalletWithPin(privateKey, pin);

      // Store wallet type preference
      await AsyncStorage.setItem(WALLET_TYPE_KEY, 'burner');

      // Store wallet instance (already unlocked from import)
      walletRef.current = wallet;

      setWalletType('burner');
      setAddress(walletAddress as Address);
      setIsConnected(true);
      setIsLocked(false);

      console.log('✅ Wallet imported with PIN protection:', walletAddress);

      // Start session manager
      sessionManager.start();

      // Load balance
      await refreshBalanceInternal(wallet);
    } catch (error) {
      console.error('❌ Failed to import wallet with PIN:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Unlock wallet with PIN
   */
  const unlockWithPin = async (pin: string): Promise<boolean> => {
    try {
      console.log('🔓 Unlocking wallet with PIN...');

      const wallet = await pinWalletService.unlockWithPin(pin);
      walletRef.current = wallet;

      setIsLocked(false);

      // Start session manager
      sessionManager.start();

      console.log('✅ Wallet unlocked');

      // Load balance
      await refreshBalanceInternal(wallet);

      return true;
    } catch (error) {
      console.error('❌ Failed to unlock wallet:', error);
      return false;
    }
  };

  /**
   * Lock wallet (clear from memory)
   */
  const lockWallet = () => {
    console.log('🔒 Locking wallet...');

    clearInMemoryWallet();
    setIsLocked(true);

    console.log('✅ Wallet locked');
  };

  /**
   * Change PIN
   */
  const changePin = async (currentPin: string, newPin: string) => {
    try {
      console.log('🔑 Changing PIN...');

      await pinWalletService.changePin(currentPin, newPin);

      console.log('✅ PIN changed successfully');
    } catch (error) {
      console.error('❌ Failed to change PIN:', error);
      throw error;
    }
  };

  /**
   * Reset wallet completely
   */
  const resetWallet = async () => {
    try {
      console.log('🔄 Resetting wallet...');

      // Clear from secure storage
      await pinWalletService.resetWallet();

      // Clear wallet type preference
      await AsyncStorage.removeItem(WALLET_TYPE_KEY);

      // Clear in-memory wallet
      clearInMemoryWallet();

      // Reset all state - this will trigger AuthenticatedApp to show login screen
      setWalletType(null);
      setAddress(null);
      setIsConnected(false);
      setIsLocked(false);
      setBalance(null);

      // Stop session manager
      sessionManager.stop();

      console.log('✅ Wallet reset complete - ready for new account creation');
    } catch (error) {
      console.error('❌ Failed to reset wallet:', error);
      throw error;
    }
  };

  /**
   * Connect burner wallet (legacy - redirects to PIN flow)
   */
  const connectBurnerWallet = async (password?: string) => {
    // Legacy method - now handled by PIN-protected wallet
    throw new Error('Please use createPinProtectedWallet instead');
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

      if (isLocked) {
        console.error('❌ Wallet is locked');
        return null;
      }

      if (walletType === 'burner') {
        const wallet = walletRef.current;
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
      if (!isConnected || !address || isLocked) {
        return;
      }

      if (walletType === 'burner') {
        const wallet = walletRef.current;
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

  /**
   * Sign typed data (EIP-712)
   */
  const signTypedData = async (
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): Promise<string> => {
    try {
      if (!isConnected || !walletType) {
        throw new Error('No wallet connected');
      }

      if (isLocked) {
        throw new Error('Wallet is locked');
      }

      if (walletType === 'burner') {
        const wallet = walletRef.current;
        if (!wallet) {
          throw new Error('Wallet not found');
        }

        // Sign typed data using ethers
        const signature = await wallet._signTypedData(domain, types, value);
        console.log('✍️ Signed typed data:', signature);
        return signature;
      } else if (walletType === 'walletconnect') {
        // TODO: Get WalletConnect to sign typed data
        throw new Error('WalletConnect not yet implemented');
      } else if (walletType === 'embedded') {
        // TODO: Get embedded wallet to sign typed data
        throw new Error('Embedded wallet not yet implemented');
      }

      throw new Error('Unknown wallet type');
    } catch (error) {
      console.error('❌ Failed to sign typed data:', error);
      throw error;
    }
  };

  const value: WalletContextState = {
    // Wallet state
    walletType,
    address,
    isConnected,
    isConnecting,
    isLoading,
    isLocked,
    // PIN-protected wallet methods
    createPinProtectedWallet,
    importWalletWithPin,
    unlockWithPin,
    lockWallet,
    changePin,
    resetWallet,
    // Legacy methods
    connectBurnerWallet,
    connectWalletConnect,
    connectEmbeddedWallet,
    disconnect,
    // Provider/signer access
    getSigner,
    getProvider,
    signTypedData,
    // Balance
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
