package com.canarymobile

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import mobile.Mobile
import mobile.RelayMobileAPI
import android.util.Log
import kotlinx.coroutines.*

class TorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val TAG = "TorModule"
    private var relayAPI: RelayMobileAPI? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName(): String {
        return "TorModule"
    }

    @ReactMethod
    fun initialize(dataDir: String, promise: Promise) {
        scope.launch {
            try {
                Log.d(TAG, "Initializing Tor with data directory: $dataDir")

                if (relayAPI == null) {
                    relayAPI = Mobile.newRelayMobileAPI()
                }

                relayAPI?.initialize(dataDir)

                withContext(Dispatchers.Main) {
                    promise.resolve("Tor initialized successfully")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize Tor", e)
                withContext(Dispatchers.Main) {
                    promise.reject("INIT_ERROR", "Failed to initialize Tor: ${e.message}", e)
                }
            }
        }
    }

    @ReactMethod
    fun getTorStatus(promise: Promise) {
        scope.launch {
            try {
                if (relayAPI == null || !relayAPI!!.isInitialized) {
                    withContext(Dispatchers.Main) {
                        promise.reject("NOT_INITIALIZED", "Tor not initialized. Call initialize() first.")
                    }
                    return@launch
                }

                val initialState = relayAPI?.getInitialState()

                // Parse the JSON to extract tor status
                // The initialState contains a "tor" field with status info
                withContext(Dispatchers.Main) {
                    promise.resolve(initialState)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to get Tor status", e)
                withContext(Dispatchers.Main) {
                    promise.reject("STATUS_ERROR", "Failed to get Tor status: ${e.message}", e)
                }
            }
        }
    }

    @ReactMethod
    fun getDataDirectory(promise: Promise) {
        try {
            if (relayAPI == null) {
                promise.reject("NOT_INITIALIZED", "Tor not initialized")
                return
            }

            val dataDir = relayAPI?.dataDirectory ?: ""
            promise.resolve(dataDir)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get data directory", e)
            promise.reject("ERROR", "Failed to get data directory: ${e.message}", e)
        }
    }

    @ReactMethod
    fun isInitialized(promise: Promise) {
        try {
            val initialized = relayAPI?.isInitialized ?: false
            promise.resolve(initialized)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun createAccount(nickname: String, torOnly: Boolean, serversJSON: String, passphrase: String, promise: Promise) {
        scope.launch {
            try {
                if (relayAPI == null || !relayAPI!!.isInitialized) {
                    withContext(Dispatchers.Main) {
                        promise.reject("NOT_INITIALIZED", "Tor not initialized")
                    }
                    return@launch
                }

                val accountID = relayAPI?.createAccount(nickname, torOnly, serversJSON, passphrase)

                withContext(Dispatchers.Main) {
                    promise.resolve(accountID)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to create account", e)
                withContext(Dispatchers.Main) {
                    promise.reject("CREATE_ERROR", "Failed to create account: ${e.message}", e)
                }
            }
        }
    }

    @ReactMethod
    fun listAccounts(promise: Promise) {
        scope.launch {
            try {
                if (relayAPI == null || !relayAPI!!.isInitialized) {
                    withContext(Dispatchers.Main) {
                        promise.reject("NOT_INITIALIZED", "Tor not initialized")
                    }
                    return@launch
                }

                val accountsJSON = relayAPI?.listAccounts()

                withContext(Dispatchers.Main) {
                    promise.resolve(accountsJSON)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to list accounts", e)
                withContext(Dispatchers.Main) {
                    promise.reject("LIST_ERROR", "Failed to list accounts: ${e.message}", e)
                }
            }
        }
    }

    @ReactMethod
    fun sendTextMessage(fromAccountID: String, toAccountID: String, message: String, promise: Promise) {
        scope.launch {
            try {
                if (relayAPI == null || !relayAPI!!.isInitialized) {
                    withContext(Dispatchers.Main) {
                        promise.reject("NOT_INITIALIZED", "Tor not initialized")
                    }
                    return@launch
                }

                val result = relayAPI?.sendTextMessage(fromAccountID, toAccountID, message)

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send message", e)
                withContext(Dispatchers.Main) {
                    promise.reject("SEND_ERROR", "Failed to send message: ${e.message}", e)
                }
            }
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        scope.cancel()
    }

    companion object {
        const val NAME = "TorModule"
    }
}
