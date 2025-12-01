package com.canarymobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import mobile.Mobile
import mobile.RelayMobileAPI

class RelayModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var relayAPI: RelayMobileAPI? = null
    private val reactContext: ReactApplicationContext = reactContext

    override fun getName(): String {
        return "RelayModule"
    }

    @ReactMethod
    fun initialize(dataDir: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                relayAPI = Mobile.newRelayMobileAPI()
            }

            // Use app's files directory if no dataDir specified
            val finalDataDir = if (dataDir.isEmpty()) {
                reactApplicationContext.filesDir.absolutePath + "/relay"
            } else {
                dataDir
            }

            relayAPI?.initialize(finalDataDir)
            promise.resolve(finalDataDir)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", "Failed to initialize Relay: ${e.message}", e)
        }
    }

    @ReactMethod
    fun isInitialized(promise: Promise) {
        try {
            val initialized = relayAPI?.isInitialized() ?: false
            promise.resolve(initialized)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", "Failed to check initialization: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getDataDirectory(promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            val dataDir = relayAPI?.dataDirectory ?: ""
            promise.resolve(dataDir)
        } catch (e: Exception) {
            promise.reject("GET_DIR_ERROR", "Failed to get data directory: ${e.message}", e)
        }
    }

    @ReactMethod
    fun createAccount(nickname: String, torOnly: Boolean, serversJSON: String, passphrase: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            val accountId = relayAPI?.createAccount(nickname, torOnly, serversJSON, passphrase)
            promise.resolve(accountId)
        } catch (e: Exception) {
            promise.reject("CREATE_ACCOUNT_ERROR", "Failed to create account: ${e.message}", e)
        }
    }

    @ReactMethod
    fun listAccounts(promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            val accountsJSON = relayAPI?.listAccounts()
            promise.resolve(accountsJSON)
        } catch (e: Exception) {
            promise.reject("LIST_ACCOUNTS_ERROR", "Failed to list accounts: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getAccountInfo(accountID: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            val accountInfo = relayAPI?.getAccountInfo(accountID)
            promise.resolve(accountInfo)
        } catch (e: Exception) {
            promise.reject("GET_ACCOUNT_ERROR", "Failed to get account info: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getAccountByNickname(nickname: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            val accountId = relayAPI?.getAccountByNickname(nickname)
            promise.resolve(accountId)
        } catch (e: Exception) {
            promise.reject("GET_ACCOUNT_ERROR", "Failed to get account by nickname: ${e.message}", e)
        }
    }

    @ReactMethod
    fun sendTextMessage(fromAccountID: String, toAccountID: String, message: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            val result = relayAPI?.sendTextMessage(fromAccountID, toAccountID, message)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SEND_TEXT_ERROR", "Failed to send text message: ${e.message}", e)
        }
    }

    @ReactMethod
    fun sendFile(fromAccountID: String, toAccountID: String, filePathsJSON: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            val result = relayAPI?.sendFile(fromAccountID, toAccountID, filePathsJSON)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SEND_FILE_ERROR", "Failed to send file: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getInitialState(promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            val initialStateJSON = relayAPI?.getInitialState()
            promise.resolve(initialStateJSON)
        } catch (e: Exception) {
            promise.reject("GET_STATE_ERROR", "Failed to get initial state: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getContacts(promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            val contactsJSON = relayAPI?.getContacts()
            promise.resolve(contactsJSON)
        } catch (e: Exception) {
            promise.reject("GET_CONTACTS_ERROR", "Failed to get contacts: ${e.message}", e)
        }
    }

    @ReactMethod
    fun createContact(accountID: String, nickname: String, serversJSON: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            relayAPI?.createContact(accountID, nickname, serversJSON)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CREATE_CONTACT_ERROR", "Failed to create contact: ${e.message}", e)
        }
    }

    @ReactMethod
    fun createContactFromAccountString(accountString: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            relayAPI?.createContactFromAccountString(accountString)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CREATE_CONTACT_ERROR", "Failed to create contact from string: ${e.message}", e)
        }
    }

    @ReactMethod
    fun editContact(accountID: String, newNickname: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            relayAPI?.editContact(accountID, newNickname)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("EDIT_CONTACT_ERROR", "Failed to edit contact: ${e.message}", e)
        }
    }

    @ReactMethod
    fun editAccount(accountID: String, newNickname: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            relayAPI?.editAccount(accountID, newNickname)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("EDIT_ACCOUNT_ERROR", "Failed to edit account: ${e.message}", e)
        }
    }

    @ReactMethod
    fun deleteContact(accountID: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            relayAPI?.deleteContact(accountID)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DELETE_CONTACT_ERROR", "Failed to delete contact: ${e.message}", e)
        }
    }

    @ReactMethod
    fun deleteAccount(accountID: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }
            relayAPI?.deleteAccount(accountID)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DELETE_ACCOUNT_ERROR", "Failed to delete account: ${e.message}", e)
        }
    }

    @ReactMethod
    fun startConnectLoop(accountNicknames: String, promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Relay API not initialized")
                return
            }

            // Start the connect loop in a background thread
            Thread {
                try {
                    val reader = relayAPI?.startConnectLoop(accountNicknames)

                    // Continuously read messages and emit them to React Native
                    while (true) {
                        val messageJSON = reader?.readMessage()
                        if (messageJSON != null && messageJSON.isNotEmpty()) {
                            sendEvent("RelayMessage", messageJSON)
                        }
                    }
                } catch (e: Exception) {
                    // If the loop breaks, emit an error event
                    val errorMap = Arguments.createMap().apply {
                        putString("error", e.message)
                    }
                    sendEvent("RelayError", errorMap)
                }
            }.start()

            promise.resolve("ConnectLoop started")
        } catch (e: Exception) {
            promise.reject("START_LOOP_ERROR", "Failed to start connect loop: ${e.message}", e)
        }
    }

    private fun sendEvent(eventName: String, data: Any?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    override fun invalidate() {
        super.invalidate()
        // Clean up resources if needed
        relayAPI = null
    }
}
