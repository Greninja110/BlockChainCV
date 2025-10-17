import React, { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'

const WalletContext = createContext()

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState('')
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [chainId, setChainId] = useState(null)

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.')
      return
    }

    try {
      setIsLoading(true)
      const ethereum = window.ethereum

      // Force MetaMask to show permission popup with current account
      // This ensures the connection uses the currently selected account in MetaMask
      try {
        await ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        })
      } catch (permError) {
        // User cancelled the permission request
        if (permError.code === 4001) {
          toast.error('Connection cancelled')
          setIsLoading(false)
          return
        }
        // If permissions fail, continue with regular connection
        console.log('Permission request failed, trying regular connection:', permError.message)
      }

      // Request account access (this will now use the fresh permission)
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })

      if (accounts.length === 0) {
        toast.error('No accounts found. Please connect your wallet.')
        return
      }

      // Create provider and signer
      const provider = new ethers.BrowserProvider(ethereum)
      const signer = await provider.getSigner()
      const network = await provider.getNetwork()

      setAccount(accounts[0])
      setProvider(provider)
      setSigner(signer)
      setIsConnected(true)
      setChainId(network.chainId.toString())

      toast.success('Wallet connected successfully!')

      // Store connection state
      localStorage.setItem('walletConnected', 'true')
      localStorage.setItem('walletAccount', accounts[0])

    } catch (error) {
      console.error('Error connecting wallet:', error)

      // Handle user rejection
      if (error.code === 4001) {
        toast.error('Connection cancelled')
      } else {
        toast.error('Failed to connect wallet. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setAccount('')
    setProvider(null)
    setSigner(null)
    setIsConnected(false)
    setChainId(null)

    // Clear storage
    localStorage.removeItem('walletConnected')
    localStorage.removeItem('walletAccount')

    toast.success('Wallet disconnected')
  }

  const switchToGanache = async () => {
    if (!window.ethereum) return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x539' }], // Ganache default chain ID (1337)
      })
    } catch (switchError) {
      // Chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x539',
                chainName: 'Ganache Local',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['http://127.0.0.1:7545'],
                blockExplorerUrls: null,
              },
            ],
          })
        } catch (addError) {
          toast.error('Failed to add Ganache network')
        }
      }
    }
  }

  const getShortAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Check for existing connection on load
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum && localStorage.getItem('walletConnected') === 'true') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()
            const network = await provider.getNetwork()

            setAccount(accounts[0])
            setProvider(provider)
            setSigner(signer)
            setIsConnected(true)
            setChainId(network.chainId.toString())
          }
        } catch (error) {
          console.error('Error checking connection:', error)
        }
      }
    }

    checkConnection()
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else if (accounts[0] !== account) {
          // Account changed - update everything
          try {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()
            const network = await provider.getNetwork()

            setAccount(accounts[0])
            setProvider(provider)
            setSigner(signer)
            setChainId(network.chainId.toString())
            localStorage.setItem('walletAccount', accounts[0])

            toast.success(`Switched to account ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`)

            // Reload page to refresh all contract instances
            setTimeout(() => {
              window.location.reload()
            }, 500)
          } catch (error) {
            console.error('Error updating account:', error)
            toast.error('Failed to switch account')
          }
        }
      }

      const handleChainChanged = (chainId) => {
        setChainId(parseInt(chainId, 16).toString())
        toast.info('Network changed - reloading...')
        // Reload the page to reset state
        window.location.reload()
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [account])

  const value = {
    account,
    provider,
    signer,
    isConnected,
    isLoading,
    chainId,
    connectWallet,
    disconnectWallet,
    switchToGanache,
    getShortAddress,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}