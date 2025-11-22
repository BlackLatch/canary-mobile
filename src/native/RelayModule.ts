import { NativeModules, NativeEventEmitter } from 'react-native';

const { RelayModule } = NativeModules;

export interface RelayAccount {
  account_id: string;
  nickname: string;
}

export interface RelayContact {
  AccountID: string;
  Nickname: string;
  Servers?: Array<{ BaseURL: string }>;
  Private?: any;
}

export interface RelayMessage {
  Type: string;
  From?: string;
  To?: string;
  Text?: string;
  Files?: string[];
  [key: string]: any;
}

export interface RelaySettings {
  ReceivedFilesBaseDir: string;
  ReceivedFilesDestDir: string;
}

export interface RelayInitialState {
  accounts: RelayContact[];
  settings: RelaySettings;
  seen_servers: string[];
  projects: any[];
  group_chat_rooms: any[];
  group_chat_room_memberships: any[];
  tor: any;
}

class RelayModuleWrapper {
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(RelayModule);
  }

  /**
   * Initialize the Relay API with a data directory
   * @param dataDir - Path to data directory (empty string uses default app directory)
   * @returns Promise that resolves to the actual data directory used
   */
  async initialize(dataDir: string = ''): Promise<string> {
    return RelayModule.initialize(dataDir);
  }

  /**
   * Check if the Relay API is initialized
   */
  async isInitialized(): Promise<boolean> {
    return RelayModule.isInitialized();
  }

  /**
   * Get the current data directory
   */
  async getDataDirectory(): Promise<string> {
    return RelayModule.getDataDirectory();
  }

  /**
   * Create a new Relay account
   * @param nickname - Account nickname
   * @param torOnly - Whether to use Tor only
   * @param servers - JSON array of server URLs (e.g., '["server1.com", "server2.com"]')
   * @param passphrase - Account passphrase (can be empty)
   * @returns Promise that resolves to the account ID
   */
  async createAccount(
    nickname: string,
    torOnly: boolean = false,
    servers: string[] = [],
    passphrase: string = ''
  ): Promise<string> {
    const serversJSON = JSON.stringify(servers);
    return RelayModule.createAccount(nickname, torOnly, serversJSON, passphrase);
  }

  /**
   * List all accounts
   * @returns Promise that resolves to array of accounts
   */
  async listAccounts(): Promise<RelayAccount[]> {
    const accountsJSON = await RelayModule.listAccounts();
    return JSON.parse(accountsJSON);
  }

  /**
   * Get account info by account ID
   */
  async getAccountInfo(accountID: string): Promise<string> {
    return RelayModule.getAccountInfo(accountID);
  }

  /**
   * Get account ID by nickname
   */
  async getAccountByNickname(nickname: string): Promise<string> {
    return RelayModule.getAccountByNickname(nickname);
  }

  /**
   * Send a text message
   * @param fromAccountID - Sender's account ID
   * @param toAccountID - Recipient's account ID
   * @param message - Message text
   */
  async sendTextMessage(
    fromAccountID: string,
    toAccountID: string,
    message: string
  ): Promise<string> {
    return RelayModule.sendTextMessage(fromAccountID, toAccountID, message);
  }

  /**
   * Send file(s)
   * @param fromAccountID - Sender's account ID
   * @param toAccountID - Recipient's account ID
   * @param filePaths - Array of file paths
   */
  async sendFile(
    fromAccountID: string,
    toAccountID: string,
    filePaths: string[]
  ): Promise<string> {
    const filePathsJSON = JSON.stringify(filePaths);
    return RelayModule.sendFile(fromAccountID, toAccountID, filePathsJSON);
  }

  /**
   * Get initial state (accounts, settings, etc.)
   */
  async getInitialState(): Promise<RelayInitialState> {
    const stateJSON = await RelayModule.getInitialState();
    return JSON.parse(stateJSON);
  }

  /**
   * Get all contacts (non-private accounts)
   */
  async getContacts(): Promise<RelayContact[]> {
    const contactsJSON = await RelayModule.getContacts();
    return JSON.parse(contactsJSON);
  }

  /**
   * Create a new contact
   * @param accountID - Contact's account ID
   * @param nickname - Contact's nickname
   * @param servers - Array of server URLs
   */
  async createContact(
    accountID: string,
    nickname: string,
    servers: string[] = []
  ): Promise<void> {
    const serversJSON = JSON.stringify(servers);
    return RelayModule.createContact(accountID, nickname, serversJSON);
  }

  /**
   * Create contact from account string (format: "nickname#account_id@server1,server2")
   */
  async createContactFromAccountString(accountString: string): Promise<void> {
    return RelayModule.createContactFromAccountString(accountString);
  }

  /**
   * Edit a contact's nickname
   */
  async editContact(accountID: string, newNickname: string): Promise<void> {
    return RelayModule.editContact(accountID, newNickname);
  }

  /**
   * Edit an account's nickname
   */
  async editAccount(accountID: string, newNickname: string): Promise<void> {
    return RelayModule.editAccount(accountID, newNickname);
  }

  /**
   * Delete a contact
   */
  async deleteContact(accountID: string): Promise<void> {
    return RelayModule.deleteContact(accountID);
  }

  /**
   * Delete an account
   */
  async deleteAccount(accountID: string): Promise<void> {
    return RelayModule.deleteAccount(accountID);
  }

  /**
   * Start the connect loop for specified accounts
   * @param accountNicknames - Array of account nicknames to connect
   * @returns Promise that resolves when loop starts
   */
  async startConnectLoop(accountNicknames: string[]): Promise<string> {
    const nicknamesJSON = JSON.stringify(accountNicknames);
    return RelayModule.startConnectLoop(nicknamesJSON);
  }

  /**
   * Add listener for incoming Relay messages
   */
  addMessageListener(callback: (messageJSON: string) => void) {
    return this.eventEmitter.addListener('RelayMessage', callback);
  }

  /**
   * Add listener for Relay errors
   */
  addErrorListener(callback: (error: { error: string }) => void) {
    return this.eventEmitter.addListener('RelayError', callback);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.eventEmitter.removeAllListeners('RelayMessage');
    this.eventEmitter.removeAllListeners('RelayError');
  }
}

export default new RelayModuleWrapper();
