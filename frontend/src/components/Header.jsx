import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useContract } from '../context/ContractContext'
import { User, Shield, GraduationCap, Award, Briefcase, Trophy, Wallet, LogOut, Database, Users } from 'lucide-react'

const Header = () => {
  const { account, isConnected, connectWallet, disconnectWallet, getShortAddress } = useWallet()
  const { contracts } = useContract()
  const location = useLocation()
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    if (isConnected && account && contracts.userRegistry) {
      loadUserRole()
    }
  }, [isConnected, account, contracts])

  const loadUserRole = async () => {
    try {
      const role = await contracts.userRegistry.getUserRole(account)
      setUserRole(Number(role))
    } catch (error) {
      console.error('Error loading user role:', error)
    }
  }

  // Role-based navigation items
  const getNavItems = () => {
    if (!userRole) return []

    // ADMIN - sees everything
    if (userRole === 1) {
      return [
        { path: '/', label: 'Dashboard', icon: User },
        { path: '/admin/users', label: 'Users', icon: Users },
        { path: '/blockchain', label: 'Blockchain', icon: Database },
      ]
    }

    // STUDENT - sees their own records
    if (userRole === 2) {
      return [
        { path: '/', label: 'Dashboard', icon: User },
        { path: '/education', label: 'Education', icon: GraduationCap },
        { path: '/certifications', label: 'Certifications', icon: Award },
        { path: '/experience', label: 'Experience', icon: Briefcase },
        { path: '/achievements', label: 'Achievements', icon: Trophy },
      ]
    }

    // INSTITUTION - only education
    if (userRole === 3) {
      return [
        { path: '/', label: 'Dashboard', icon: User },
        { path: '/education', label: 'Education', icon: GraduationCap },
      ]
    }

    // CERTIFIER - only certifications
    if (userRole === 4) {
      return [
        { path: '/', label: 'Dashboard', icon: User },
        { path: '/certifications', label: 'Certifications', icon: Award },
      ]
    }

    // EMPLOYER - only experience
    if (userRole === 5) {
      return [
        { path: '/', label: 'Dashboard', icon: User },
        { path: '/experience', label: 'Experience', icon: Briefcase },
      ]
    }

    // ORGANIZER - only achievements
    if (userRole === 6) {
      return [
        { path: '/', label: 'Dashboard', icon: User },
        { path: '/achievements', label: 'Achievements', icon: Trophy },
      ]
    }

    return []
  }

  const navItems = getNavItems()
  const isActive = (path) => location.pathname === path

  return (
    <header className="blockchain-bg text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <Shield className="h-7 w-7" />
            <span className="text-lg font-bold hidden sm:block">BlockchainCV</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center max-w-3xl mx-4">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
                  isActive(path)
                    ? 'bg-white bg-opacity-20 text-white'
                    : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xl:inline">{label}</span>
              </Link>
            ))}
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {isConnected ? (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center space-x-2 bg-white bg-opacity-20 px-3 py-1.5 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs font-medium">{getShortAddress(account)}</span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium transition-colors duration-200"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="flex flex-wrap gap-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                  isActive(path)
                    ? 'bg-white bg-opacity-20 text-white'
                    : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header