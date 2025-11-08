/**
 * Tor Module - React Native bridge to embedded Tor daemon
 *
 * This module provides a TypeScript interface to the native Android Tor implementation
 * which uses Go with gomobile bindings and embedded Tor.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'tor-module' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const TorModule = NativeModules.TorModule
  ? NativeModules.TorModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export interface TorStatus {
  is_available: boolean;
  mode?: 'embedded' | 'system_daemon';
  error?: string;
}

export interface TorInitialState {
  accounts: Array<{
    account_id: string;
    nickname: string;
    // ... other fields
  }>;
  settings: {
    received_files_base_dir: string;
    received_files_dest_dir: string;
  };
  seen_servers: string[];
  projects: any[];
  group_chat_rooms: any[];
  group_chat_room_memberships: any[];
  tor: TorStatus;
}

export interface Account {
  account_id: string;
  nickname: string;
}

/**
 * Initialize the Tor daemon with a data directory
 * @param dataDir Path to store Tor data (default: app's internal storage)
 */
export async function initializeTor(dataDir?: string): Promise<string> {
  const dir = dataDir || '/data/data/com.blacklatch.canary/files/tor_data';
  return TorModule.initialize(dir);
}

/**
 * Get the current Tor status
 * Returns an object with Tor availability, mode, and any errors
 */
export async function getTorStatus(): Promise<string> {
  return TorModule.getTorStatus();
}

/**
 * Get the Tor data directory path
 */
export async function getDataDirectory(): Promise<string> {
  return TorModule.getDataDirectory();
}

/**
 * Check if Tor is initialized
 */
export async function isInitialized(): Promise<boolean> {
  return TorModule.isInitialized();
}

/**
 * Create a new account with optional Tor-only mode
 * @param nickname User-friendly name for the account
 * @param torOnly If true, only connect via Tor
 * @param servers JSON array of server URLs
 * @param passphrase Optional passphrase for account encryption
 */
export async function createAccount(
  nickname: string,
  torOnly: boolean = false,
  servers: string[] = [],
  passphrase: string = ''
): Promise<string> {
  const serversJSON = JSON.stringify(servers);
  return TorModule.createAccount(nickname, torOnly, serversJSON, passphrase);
}

/**
 * List all accounts
 * Returns a JSON string with account information
 */
export async function listAccounts(): Promise<string> {
  return TorModule.listAccounts();
}

/**
 * Send a text message through Tor
 * @param fromAccountID Sender's account ID
 * @param toAccountID Recipient's account ID
 * @param message The message to send
 */
export async function sendTextMessage(
  fromAccountID: string,
  toAccountID: string,
  message: string
): Promise<string> {
  return TorModule.sendTextMessage(fromAccountID, toAccountID, message);
}

/**
 * Parse accounts JSON string to typed array
 */
export function parseAccounts(accountsJSON: string): Account[] {
  try {
    return JSON.parse(accountsJSON);
  } catch (e) {
    console.error('Failed to parse accounts JSON:', e);
    return [];
  }
}

/**
 * Parse initial state JSON string
 */
export function parseInitialState(stateJSON: string): TorInitialState {
  try {
    return JSON.parse(stateJSON);
  } catch (e) {
    console.error('Failed to parse initial state JSON:', e);
    throw e;
  }
}

export default {
  initializeTor,
  getTorStatus,
  getDataDirectory,
  isInitialized,
  createAccount,
  listAccounts,
  sendTextMessage,
  parseAccounts,
  parseInitialState,
};
