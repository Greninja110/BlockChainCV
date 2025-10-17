import React, { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { useContract } from '../context/ContractContext'
import { Trophy, Plus, Calendar, Tag, CheckCircle, XCircle, History, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadToIPFSWithFallback, getIPFSUrl } from '../utils/ipfs'

const Achievements = () => {
  const { account, isConnected } = useWallet()
  const { contracts, getAchievementRecords } = useContract()
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('history')
  const [userRole, setUserRole] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [selectedPDF, setSelectedPDF] = useState(null)
  const [isRegisteredOrganizer, setIsRegisteredOrganizer] = useState(false)
  const [checkingRegistration, setCheckingRegistration] = useState(false)
  const [pendingVerifications, setPendingVerifications] = useState([])

  const [formData, setFormData] = useState({
    studentAddress: '',
    title: '',
    description: '',
    category: '0',
    dateAchieved: '',
    organizationName: '',
    proofURL: ''
  })

  const achievementCategories = [
    { value: 0, label: 'Project' },
    { value: 1, label: 'Award' },
    { value: 2, label: 'Competition' },
    { value: 3, label: 'Publication' },
    { value: 4, label: 'Volunteer' },
    { value: 5, label: 'Other' }
  ]

  useEffect(() => {
    if (isConnected && account && contracts.userRegistry) {
      loadUserRole()
      loadAllUsers()
      checkOrganizerRegistration()
    }
  }, [isConnected, account, contracts])

  useEffect(() => {
    if (userRole) {
      // Check organizer registration for organizers
      if (userRole === 6) {
        checkOrganizerRegistration()
        loadPendingVerifications()
      }
      // Only load records for roles that need allUsers data
      if ((userRole === 1 || userRole === 6) && allUsers.length === 0) {
        return // Wait for allUsers to load
      }
      loadAchievements()
    }
  }, [userRole, account, allUsers])

  const loadUserRole = async () => {
    try {
      const role = await contracts.userRegistry.getUserRole(account)
      setUserRole(Number(role))
    } catch (error) {
      console.error('Error loading user role:', error)
    }
  }

  const checkOrganizerRegistration = async () => {
    try {
      if (!contracts.achievementContract || !account) return

      const isRegistered = await contracts.achievementContract.isRegisteredOrganizer(account)
      setIsRegisteredOrganizer(isRegistered)
      console.log('🔍 Organizer Registration Check:', {
        account,
        isRegistered,
        userRole
      })
    } catch (error) {
      console.error('Error checking organizer registration:', error)
      setIsRegisteredOrganizer(false)
    }
  }

  const registerAsOrganizer = async () => {
    try {
      setCheckingRegistration(true)

      const profile = await contracts.userRegistry.getUserProfile(account)
      const organizationName = profile.name || 'My Organization'
      const organizationType = 'Event Organizer'
      const website = ''
      const registrationNumber = `REG-${Date.now()}`

      const tx = await contracts.achievementContract.registerOrganizer(
        organizationName,
        organizationType,
        website,
        registrationNumber
      )

      const loadingToast = toast.loading('Registering organizer...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Organizer registered successfully!')

      // Re-check registration status to confirm
      await checkOrganizerRegistration()
    } catch (error) {
      console.error('Error registering organizer:', error)
      toast.error('Failed to register organizer: ' + error.message)
    } finally {
      setCheckingRegistration(false)
    }
  }

  const loadAllUsers = async () => {
    try {
      if (!contracts.userRegistry) {
        console.error('UserRegistry contract not initialized')
        return
      }

      console.log('Calling getAllStudents()...')
      const allUserAddresses = await contracts.userRegistry.getAllStudents()
      console.log('All student addresses:', allUserAddresses)

      if (!allUserAddresses || allUserAddresses.length === 0) {
        console.warn('No users found in the system')
        setAllUsers([])
        return
      }

      const userProfiles = await Promise.all(
        allUserAddresses.map(async (address) => {
          try {
            const profile = await contracts.userRegistry.getUserProfile(address)
            console.log('User profile:', profile)
            return {
              address: profile.walletAddress,
              name: profile.name,
              role: Number(profile.role)
            }
          } catch (error) {
            console.error('Error loading profile for', address, error)
            return null
          }
        })
      )

      // Filter for students only (role === 2)
      const students = userProfiles.filter(u => u !== null && u.role === 2)
      console.log('Filtered students:', students)
      console.log('Student details:', JSON.stringify(students, null, 2))
      setAllUsers(students)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users: ' + error.message)
    }
  }

  const loadAchievements = async () => {
    try {
      setLoading(true)

      // For ADMIN (role 1), load all achievements from all users
      if (userRole === 1) {
        const allRecords = []
        for (const user of allUsers) {
          try {
            const records = await getAchievementRecords(user.address)
            allRecords.push(...records.map(r => ({ ...r, studentName: user.name })))
          } catch (error) {
            console.error('Error loading records for', user.address, error)
          }
        }
        setAchievements(allRecords)
      }
      // For ORGANIZER (role 6), load achievements they added
      else if (userRole === 6) {
        const allRecords = []
        for (const user of allUsers) {
          try {
            const records = await getAchievementRecords(user.address)
            allRecords.push(...records.map(r => ({ ...r, studentName: user.name, studentAddress: user.address })))
          } catch (error) {
            console.error('Error loading records for', user.address, error)
          }
        }
        setAchievements(allRecords)
      }
      // For STUDENT (role 2), load only their own achievements
      else if (userRole === 2) {
        const records = await getAchievementRecords(account)
        setAchievements(records)
      }
    } catch (error) {
      console.error('Error loading achievements:', error)
      toast.error('Failed to load achievements')
    } finally {
      setLoading(false)
    }
  }

  const loadPendingVerifications = async () => {
    try {
      if (!contracts.achievementContract || userRole !== 6) return

      const pendingIds = await contracts.achievementContract.getOrganizerPendingVerifications(account)
      console.log('Pending verification IDs:', pendingIds)

      const pendingRecords = []
      for (const recordId of pendingIds) {
        try {
          const record = await contracts.achievementContract.getAchievement(recordId)
          console.log('Raw record from contract:', record)

          // Get student name
          const studentProfile = await contracts.userRegistry.getUserProfile(record.participant)

          pendingRecords.push({
            id: record.id,
            student: record.participant,
            title: record.title,
            description: record.description,
            category: record.category,
            dateAchieved: record.eventDate,
            organizationName: record.organizerName,
            documentHash: record.documentHash,
            isVerified: record.isVerified,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            studentName: studentProfile.name
          })
        } catch (error) {
          console.error('Error loading pending record', recordId, error)
        }
      }

      console.log('Pending verification records:', pendingRecords)
      setPendingVerifications(pendingRecords)
    } catch (error) {
      console.error('Error loading pending verifications:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    console.log('🚀 Form Submit - Registration Status:', {
      isRegisteredOrganizer,
      userRole,
      account
    })

    if (!formData.studentAddress || !formData.title || !formData.organizationName) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)

      // Convert date to timestamp
      const dateTimestamp = Math.floor(new Date(formData.dateAchieved).getTime() / 1000)

      // Upload PDF to IPFS if selected
      let documentHash = ''
      if (selectedPDF) {
        try {
          const uploadToast = toast.loading('Uploading document to IPFS...')
          documentHash = await uploadToIPFSWithFallback(selectedPDF)
          toast.dismiss(uploadToast)
          toast.success('Document uploaded to IPFS!')
          console.log('Document uploaded to IPFS:', documentHash)
        } catch (error) {
          console.error('Error uploading to IPFS:', error)
          toast.error('Failed to upload document to IPFS')
          setSubmitting(false)
          return
        }
      }

      if (!contracts.achievementContract) {
        throw new Error('Achievement contract not initialized')
      }

      const tx = await contracts.achievementContract.addAchievement(
        formData.studentAddress,        // _participant
        formData.title,                 // _title
        formData.description || '',     // _description
        parseInt(formData.category),    // _achType (AchievementType enum)
        0,                              // _partType (ParticipationType: INDIVIDUAL)
        0,                              // _level (AchievementLevel: LOCAL)
        formData.category.toString(),   // _category (string)
        dateTimestamp,                  // _eventDate
        '',                             // _result
        [],                             // _skills (empty array)
        [],                             // _technologies (empty array)
        formData.proofURL || '',        // _projectUrl
        '',                             // _certificateHash
        documentHash                    // _documentHash
      )

      const loadingToast = toast.loading('Adding achievement to blockchain...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Achievement added successfully!')

      // Reset form
      setFormData({
        studentAddress: '',
        title: '',
        description: '',
        category: '0',
        dateAchieved: '',
        organizationName: '',
        proofURL: ''
      })

      setSelectedPDF(null)

      setActiveTab('history')
      loadAchievements()
    } catch (error) {
      console.error('Error adding achievement:', error)
      toast.error(error.message || 'Failed to add achievement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestVerification = async (recordId) => {
    try {
      setSubmitting(true)

      if (!contracts.achievementContract) {
        throw new Error('Achievement contract not initialized')
      }

      const tx = await contracts.achievementContract.requestRecordVerification(recordId)
      const loadingToast = toast.loading('Requesting verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Verification request sent to organizer!')

      // Reload records to show updated status
      loadAchievements()
    } catch (error) {
      console.error('Error requesting verification:', error)
      toast.error(error.message || 'Failed to request verification')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveVerification = async (recordId) => {
    try {
      setSubmitting(true)

      if (!contracts.achievementContract) {
        throw new Error('Achievement contract not initialized')
      }

      const tx = await contracts.achievementContract.approveRecordVerification(recordId)
      const loadingToast = toast.loading('Approving verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Record verified successfully!')

      // Reload pending verifications and records
      loadPendingVerifications()
      loadAchievements()
    } catch (error) {
      console.error('Error approving verification:', error)
      toast.error(error.message || 'Failed to approve verification')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectVerification = async (recordId) => {
    try {
      setSubmitting(true)

      if (!contracts.achievementContract) {
        throw new Error('Achievement contract not initialized')
      }

      const reason = prompt('Enter reason for rejection (optional):') || 'No reason provided'

      const tx = await contracts.achievementContract.rejectRecordVerification(recordId, reason)
      const loadingToast = toast.loading('Rejecting verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Verification request rejected')

      // Reload pending verifications and records
      loadPendingVerifications()
      loadAchievements()
    } catch (error) {
      console.error('Error rejecting verification:', error)
      toast.error(error.message || 'Failed to reject verification')
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryLabel = (category) => {
    const categoryObj = achievementCategories.find(c => c.value === Number(category))
    return categoryObj ? categoryObj.label : 'Unknown'
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to manage achievements</p>
      </div>
    )
  }

  // STUDENT VIEW - Read Only
  if (userRole === 2) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Achievements</h1>
              <p className="text-gray-600">View your accomplishments and awards</p>
            </div>
          </div>
        </div>

        {/* Achievements List */}
        <div className="space-y-4">
          {loading ? (
            <div className="card text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading achievements...</p>
            </div>
          ) : achievements.length === 0 ? (
            <div className="card text-center py-12">
              <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Achievements</h3>
              <p className="text-gray-600">Your achievements will be added by event organizers.</p>
            </div>
          ) : (
            achievements.map((achievement, index) => (
              <div key={index} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="bg-yellow-100 rounded-lg p-3">
                      <Trophy className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{achievement.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          achievement.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {achievement.isVerified ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </span>
                      </div>

                      {achievement.description && (
                        <p className="text-gray-700 mb-2">{achievement.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center space-x-1">
                          <Tag className="h-4 w-4" />
                          <span className="font-medium">{getCategoryLabel(achievement.category)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>by {achievement.organizationName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(achievement.dateAchieved)}</span>
                        </div>
                      </div>

                      {achievement.documentHash && (
                        <div className="mt-3">
                          <a
                            href={getIPFSUrl(achievement.documentHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <FileText className="h-4 w-4" />
                            <span>View Document</span>
                          </a>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-gray-500">
                        Record ID: {Number(achievement.id)} • Added: {formatDate(achievement.createdAt)}
                      </div>

                      {/* Request Verification Button */}
                      {!achievement.isVerified && (
                        <div className="mt-4">
                          <button
                            onClick={() => handleRequestVerification(achievement.id)}
                            disabled={submitting}
                            className="btn btn-primary text-sm"
                          >
                            {submitting ? 'Requesting...' : 'Request Verification'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // ORGANIZER & ADMIN VIEW - Tabbed Interface
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Trophy className="h-8 w-8 text-yellow-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Achievements</h1>
            <p className="text-gray-600">
              {userRole === 1 ? 'View all achievements in the system' : 'Manage student achievements and awards'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'history'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="h-4 w-4" />
              <span>History</span>
            </button>
            {userRole === 6 && (
              <>
                <button
                  onClick={() => setActiveTab('add')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'add'
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Achievement</span>
                </button>
                <button
                  onClick={() => setActiveTab('verifications')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'verifications'
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Verification Requests ({pendingVerifications.length})</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {loading ? (
            <div className="card text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading achievements...</p>
            </div>
          ) : achievements.length === 0 ? (
            <div className="card text-center py-12">
              <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Achievements</h3>
              <p className="text-gray-600">
                {userRole === 6
                  ? 'No achievements added yet. Switch to "Add Achievement" tab to add your first record.'
                  : 'No achievements in the system yet.'
                }
              </p>
            </div>
          ) : (
            <div className="card">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Achievements ({achievements.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Achievement</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {achievements.map((achievement, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{achievement.studentName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              {achievement.student?.slice(0, 6)}...{achievement.student?.slice(-4)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{achievement.title}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{getCategoryLabel(achievement.category)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{achievement.organizationName}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatDate(achievement.dateAchieved)}</td>
                        <td className="px-4 py-4">
                          {achievement.documentHash ? (
                            <a
                              href={getIPFSUrl(achievement.documentHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">No document</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {achievement.isVerified ? (
                            <span className="flex items-center text-green-600 text-sm">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verified
                            </span>
                          ) : (
                            <span className="flex items-center text-yellow-600 text-sm">
                              <XCircle className="h-4 w-4 mr-1" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'add' && userRole === 6 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Achievement for Student</h3>

          {!isRegisteredOrganizer && (
            <div className="mb-6 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-red-900 mb-2">Organizer Not Registered</h4>
                  <p className="text-sm text-red-800 mb-4">
                    You must register as an organizer in the Achievement Contract before you can add achievements.
                  </p>
                  <button
                    type="button"
                    onClick={registerAsOrganizer}
                    disabled={checkingRegistration}
                    className="btn btn-primary"
                  >
                    {checkingRegistration ? 'Registering...' : 'Register as Organizer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isRegisteredOrganizer && (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student *
                </label>
                <select
                  name="studentAddress"
                  value={formData.studentAddress}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="">Select a student</option>
                  {allUsers.map(user => (
                    <option key={user.address} value={user.address}>
                      {user.name} ({user.address.slice(0, 6)}...{user.address.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Achievement Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., First Place in Hackathon"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="input"
                >
                  {achievementCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  placeholder="e.g., TechFest 2024"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Achieved *
                </label>
                <input
                  type="date"
                  name="dateAchieved"
                  value={formData.dateAchieved}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the achievement..."
                  className="input"
                  rows="3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Certificate/Proof (optional)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedPDF(e.target.files[0])}
                    className="input"
                  />
                  {selectedPDF && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <FileText className="h-4 w-4" />
                      <span>{selectedPDF.name}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  PDF only. Document will be stored on IPFS.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    studentAddress: '',
                    title: '',
                    description: '',
                    category: '0',
                    dateAchieved: '',
                    organizationName: '',
                    proofURL: ''
                  })
                  setSelectedPDF(null)
                }}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Clear
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Achievement'}
              </button>
            </div>
          </form>
          )}
        </div>
      )}

      {/* Verification Requests Tab */}
      {activeTab === 'verifications' && userRole === 6 && (
        <div className="space-y-4">
          {pendingVerifications.length === 0 ? (
            <div className="card text-center py-12">
              <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Verifications</h3>
              <p className="text-gray-600">All verification requests have been processed.</p>
            </div>
          ) : (
            <div className="card">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Pending Verification Requests ({pendingVerifications.length})
                </h3>
              </div>
              <div className="space-y-4">
                {pendingVerifications.map((record, index) => (
                  <div key={index} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{record.title}</h4>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Awaiting Verification
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Student:</span>
                            <p className="text-gray-900">{record.studentName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              {record.student?.slice(0, 6)}...{record.student?.slice(-4)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Category:</span>
                            <p className="text-gray-900">{getCategoryLabel(record.category)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Organization:</span>
                            <p className="text-gray-900">{record.organizationName}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Date Achieved:</span>
                            <p className="text-gray-900">{formatDate(record.dateAchieved)}</p>
                          </div>
                          {record.description && (
                            <div className="col-span-2">
                              <span className="font-medium text-gray-700">Description:</span>
                              <p className="text-gray-900">{record.description}</p>
                            </div>
                          )}
                        </div>

                        {record.documentHash && (
                          <div className="mt-3 mb-3">
                            <a
                              href={getIPFSUrl(record.documentHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              <FileText className="h-4 w-4" />
                              <span>View Submitted Document</span>
                            </a>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mb-3">
                          Record ID: {Number(record.id)} • Added: {formatDate(record.createdAt)}
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleApproveVerification(record.id)}
                            disabled={submitting}
                            className="btn btn-primary text-sm"
                          >
                            {submitting ? 'Approving...' : '✓ Approve'}
                          </button>
                          <button
                            onClick={() => handleRejectVerification(record.id)}
                            disabled={submitting}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                          >
                            {submitting ? 'Rejecting...' : '✗ Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Achievements
