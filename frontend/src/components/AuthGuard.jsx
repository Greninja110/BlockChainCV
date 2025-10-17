import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useContract } from '../context/ContractContext'
import UnauthorizedModal from './UnauthorizedModal'

const AuthGuard = ({ children }) => {
  const { account, isConnected, disconnectWallet } = useWallet()
  const { contracts } = useContract()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false)

  useEffect(() => {
    if (isConnected && account && contracts.userRegistry) {
      checkUserAuthorization()
    } else {
      setIsChecking(false)
    }
  }, [isConnected, account, contracts])

  const checkUserAuthorization = async () => {
    try {
      setIsChecking(true)

      // Check if user is registered
      const isRegistered = await contracts.userRegistry.isRegistered(account)

      if (!isRegistered) {
        setIsAuthorized(false)
        setShowUnauthorizedModal(true)
        setIsChecking(false)
        return
      }

      // Check if user is active
      const isActive = await contracts.userRegistry.isActiveUser(account)

      if (!isActive) {
        setIsAuthorized(false)
        setShowUnauthorizedModal(true)
        setIsChecking(false)
        return
      }

      // Get user role
      const role = await contracts.userRegistry.getUserRole(account)
      setUserRole(Number(role))
      setIsAuthorized(true)

      // Role-based routing
      routeBasedOnRole(Number(role))

    } catch (error) {
      console.error('Error checking authorization:', error)
      setIsAuthorized(false)
      setShowUnauthorizedModal(true)
    } finally {
      setIsChecking(false)
    }
  }

  const routeBasedOnRole = (role) => {
    const currentPath = window.location.pathname

    // Role definitions
    const ROLES = {
      NONE: 0,
      ADMIN: 1,
      STUDENT: 2,
      INSTITUTION: 3,
      CERTIFIER: 4,
      EMPLOYER: 5,
      ORGANIZER: 6
    }

    // Define allowed paths for each role
    const roleRoutes = {
      [ROLES.ADMIN]: ['/admin/users', '/admin', '/blockchain', '/profile'],
      [ROLES.STUDENT]: ['/', '/profile', '/blockchain', '/education', '/certifications', '/experience', '/achievements'],
      [ROLES.INSTITUTION]: ['/', '/education', '/profile', '/blockchain'],
      [ROLES.CERTIFIER]: ['/', '/certifications', '/profile', '/blockchain'],
      [ROLES.EMPLOYER]: ['/', '/experience', '/profile', '/blockchain'],
      [ROLES.ORGANIZER]: ['/', '/achievements', '/profile', '/blockchain']
    }

    // Default routes for each role
    const defaultRoutes = {
      [ROLES.ADMIN]: '/admin/users',
      [ROLES.STUDENT]: '/',
      [ROLES.INSTITUTION]: '/education',
      [ROLES.CERTIFIER]: '/certifications',
      [ROLES.EMPLOYER]: '/experience',
      [ROLES.ORGANIZER]: '/achievements'
    }

    // If current path is root or not allowed for this role, redirect to default
    if (currentPath === '/' || currentPath === '') {
      const defaultRoute = defaultRoutes[role] || '/'
      if (currentPath !== defaultRoute) {
        navigate(defaultRoute)
      }
    }
  }

  const handleCloseModal = () => {
    setShowUnauthorizedModal(false)
    disconnectWallet()
    navigate('/')
  }

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Show unauthorized modal if not authorized
  if (!isAuthorized && isConnected) {
    return (
      <>
        {children}
        <UnauthorizedModal
          isOpen={showUnauthorizedModal}
          onClose={handleCloseModal}
          walletAddress={account}
        />
      </>
    )
  }

  // Render children if authorized or not connected
  return <>{children}</>
}

export default AuthGuard