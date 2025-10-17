import React, { createContext, useContext, useState } from 'react'

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
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const connectWallet = async () => {
    try {
      setIsLoading(true)
      console.log('Attempting to connect wallet...')

      if (!window.ethereum) {
        console.error('MetaMask not found')
        alert('MetaMask is not installed. Please install MetaMask to continue.')
        return
      }

      console.log('MetaMask detected, requesting accounts...')
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      console.log('Accounts received:', accounts)

      if (accounts.length > 0) {
        setAccount(accounts[0])
        setIsConnected(true)
        localStorage.setItem('walletConnected', 'true')
        localStorage.setItem('walletAccount', accounts[0])
        console.log('Wallet connected successfully:', accounts[0])
        alert('Wallet connected successfully!')
      } else {
        console.error('No accounts returned')
        alert('No accounts found. Please make sure MetaMask is unlocked.')
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      if (error.code === 4001) {
        alert('Connection rejected by user.')
      } else if (error.code === -32002) {
        alert('Connection request already pending. Please check MetaMask.')
      } else {
        alert(`Failed to connect wallet: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setAccount('')
    setIsConnected(false)
    localStorage.removeItem('walletConnected')
    alert('Wallet disconnected')
  }

  const getShortAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const value = {
    account,
    isConnected,
    isLoading,
    connectWallet,
    disconnectWallet,
    getShortAddress,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}