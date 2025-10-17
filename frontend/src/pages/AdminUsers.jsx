import React, { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { useContract } from '../context/ContractContext'
import { Users, Plus, Search, Shield, UserCheck, UserX, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const AdminUsers = () => {
  const { account, isConnected } = useWallet()
  const { contracts } = useContract()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    walletAddress: '',
    role: '2', // Default to STUDENT
    name: '',
    organizationName: '',
    email: ''
  })

  const roles = [
    { value: 1, label: 'Admin', color: 'red' },
    { value: 2, label: 'Student', color: 'blue' },
    { value: 3, label: 'Institution', color: 'green' },
    { value: 4, label: 'Certifier', color: 'purple' },
    { value: 5, label: 'Employer', color: 'orange' },
    { value: 6, label: 'Organizer', color: 'pink' }
  ]

  useEffect(() => {
    if (isConnected && account && contracts.userRegistry) {
      loadUsers()
    }
  }, [isConnected, account, contracts])

  const loadUsers = async () => {
    try {
      setLoading(true)
      if (!contracts.userRegistry) return

      // Get all user addresses
      const allUserAddresses = await contracts.userRegistry.getAllUsers()

      // Fetch full profile for each user
      const userProfiles = await Promise.all(
        allUserAddresses.map(async (address) => {
          try {
            const profile = await contracts.userRegistry.getUserProfile(address)
            return {
              address: profile.walletAddress,
              role: Number(profile.role),
              name: profile.name,
              organizationName: profile.organizationName,
              email: profile.email,
              isActive: profile.isActive,
              registeredAt: Number(profile.registeredAt),
              updatedAt: Number(profile.updatedAt)
            }
          } catch (error) {
            console.error('Error fetching user:', address, error)
            return null
          }
        })
      )

      setUsers(userProfiles.filter(u => u !== null))
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()

    if (!formData.walletAddress || !formData.name) {
      toast.error('Please fill all required fields')
      return
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress)) {
      toast.error('Invalid Ethereum address')
      return
    }

    try {
      setSubmitting(true)

      const tx = await contracts.userRegistry.registerUser(
        formData.walletAddress,
        parseInt(formData.role),
        formData.name,
        formData.organizationName,
        formData.email
      )

      const loadingToast = toast.loading('Registering user on blockchain...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('User registered successfully!')

      // Reset form
      setFormData({
        walletAddress: '',
        role: '2',
        name: '',
        organizationName: '',
        email: ''
      })

      setShowAddForm(false)
      loadUsers()
    } catch (error) {
      console.error('Error registering user:', error)
      if (error.message.includes('User already registered')) {
        toast.error('This wallet address is already registered')
      } else {
        toast.error(error.message || 'Failed to register user')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivateUser = async (userAddress) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return

    try {
      const tx = await contracts.userRegistry.deactivateUser(userAddress)
      const loadingToast = toast.loading('Deactivating user...')
      await tx.wait()
      toast.dismiss(loadingToast)
      toast.success('User deactivated')
      loadUsers()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to deactivate user')
    }
  }

  const handleReactivateUser = async (userAddress) => {
    try {
      const tx = await contracts.userRegistry.reactivateUser(userAddress)
      const loadingToast = toast.loading('Reactivating user...')
      await tx.wait()
      toast.dismiss(loadingToast)
      toast.success('User reactivated')
      loadUsers()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to reactivate user')
    }
  }

  const getRoleInfo = (roleValue) => {
    return roles.find(r => r.value === roleValue) || { label: 'Unknown', color: 'gray' }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.organizationName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = filterRole === 'all' || user.role === parseInt(filterRole)

    return matchesSearch && matchesRole
  })

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to access admin panel</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600">Register and manage system users</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="card mb-6">
          <h3 className="text-xl font-bold mb-4">Register New User</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Address *
                </label>
                <input
                  type="text"
                  value={formData.walletAddress}
                  onChange={(e) => setFormData({...formData, walletAddress: e.target.value})}
                  placeholder="0x..."
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="input"
                  required
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
                  placeholder="Harvard University, Google Inc."
                  className="input"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="user@example.com"
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Registering...' : 'Register User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filter */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, address, or organization..."
                className="input pl-10"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="input"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Registered Users ({filteredUsers.length})
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
            <p className="text-gray-600">
              {searchQuery || filterRole !== 'all'
                ? 'No users match your search criteria'
                : 'Start by adding your first user'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const roleInfo = getRoleInfo(user.role)
                  return (
                    <tr key={user.address} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500 font-mono">{formatAddress(user.address)}</p>
                          {user.email && (
                            <p className="text-xs text-gray-400">{user.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${roleInfo.color}-100 text-${roleInfo.color}-800`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {user.organizationName || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(user.registeredAt)}
                      </td>
                      <td className="px-4 py-4">
                        {user.isActive ? (
                          <span className="flex items-center text-green-600 text-sm">
                            <UserCheck className="h-4 w-4 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600 text-sm">
                            <UserX className="h-4 w-4 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {user.address.toLowerCase() !== account.toLowerCase() && (
                          <button
                            onClick={() => user.isActive ? handleDeactivateUser(user.address) : handleReactivateUser(user.address)}
                            className={`text-sm ${user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                          >
                            {user.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUsers