import React, { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { useContract } from '../context/ContractContext'
import { Briefcase, Plus, Calendar, Building, CheckCircle, XCircle, History, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadToIPFSWithFallback, getIPFSUrl } from '../utils/ipfs'

const Experience = () => {
  const { account, isConnected } = useWallet()
  const { contracts, getExperienceRecords } = useContract()
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('history')
  const [userRole, setUserRole] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [selectedPDF, setSelectedPDF] = useState(null)
  const [isRegisteredEmployer, setIsRegisteredEmployer] = useState(false)
  const [checkingRegistration, setCheckingRegistration] = useState(false)
  const [pendingVerifications, setPendingVerifications] = useState([])

  const [formData, setFormData] = useState({
    studentAddress: '',
    companyName: '',
    position: '',
    location: '',
    startDate: '',
    endDate: '',
    description: '',
    isCurrentlyWorking: false
  })

  useEffect(() => {
    if (isConnected && account && contracts.userRegistry) {
      loadUserRole()
      loadAllUsers()
      checkEmployerRegistration()
    }
  }, [isConnected, account, contracts])

  useEffect(() => {
    if (userRole) {
      // Check employer registration for employers
      if (userRole === 5) {
        checkEmployerRegistration()
        loadPendingVerifications()
      }
      // Only load records for roles that need allUsers data
      if ((userRole === 1 || userRole === 5) && allUsers.length === 0) {
        return // Wait for allUsers to load
      }
      loadExperiences()
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

  const checkEmployerRegistration = async () => {
    try {
      if (!contracts.experienceContract || userRole !== 5) return
      const isRegistered = await contracts.experienceContract.isRegisteredEmployer(account)
      setIsRegisteredEmployer(isRegistered)
      console.log('Employer registered:', isRegistered)
    } catch (error) {
      console.error('Error checking employer registration:', error)
    }
  }

  const registerAsEmployer = async () => {
    try {
      setCheckingRegistration(true)

      const profile = await contracts.userRegistry.getUserProfile(account)
      const companyName = profile.name || 'My Company'
      const registrationNumber = `REG-${Date.now()}`
      const country = 'India'

      const tx = await contracts.experienceContract.registerEmployer(
        companyName,
        registrationNumber,
        country
      )

      const loadingToast = toast.loading('Registering employer...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Employer registered successfully!')
      setIsRegisteredEmployer(true)
    } catch (error) {
      console.error('Error registering employer:', error)
      toast.error('Failed to register employer: ' + error.message)
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

  const loadExperiences = async () => {
    try {
      setLoading(true)

      // For ADMIN (role 1), load all experience records from all users
      if (userRole === 1) {
        const allRecords = []
        for (const user of allUsers) {
          try {
            const records = await getExperienceRecords(user.address)
            allRecords.push(...records.map(r => ({ ...r, studentName: user.name })))
          } catch (error) {
            console.error('Error loading records for', user.address, error)
          }
        }
        setExperiences(allRecords)
      }
      // For EMPLOYER (role 5), load experience records they added
      else if (userRole === 5) {
        const allRecords = []
        for (const user of allUsers) {
          try {
            const records = await getExperienceRecords(user.address)
            allRecords.push(...records.map(r => ({ ...r, studentName: user.name, studentAddress: user.address })))
          } catch (error) {
            console.error('Error loading records for', user.address, error)
          }
        }
        setExperiences(allRecords)
      }
      // For STUDENT (role 2), load only their own experience
      else if (userRole === 2) {
        const records = await getExperienceRecords(account)
        setExperiences(records)
      }
    } catch (error) {
      console.error('Error loading experience records:', error)
      toast.error('Failed to load experience records')
    } finally {
      setLoading(false)
    }
  }

  const loadPendingVerifications = async () => {
    try {
      if (!contracts.experienceContract || userRole !== 5) return

      const pendingIds = await contracts.experienceContract.getEmployerPendingVerifications(account)
      console.log('Pending verification IDs:', pendingIds)

      const pendingRecords = []
      for (const recordId of pendingIds) {
        try {
          const record = await contracts.experienceContract.getExperienceRecord(recordId)
          console.log('Raw record from contract:', record)

          // Get student name
          const studentProfile = await contracts.userRegistry.getUserProfile(record.student)

          pendingRecords.push({
            id: record.id,
            student: record.student,
            companyName: record.companyName,
            position: record.position,
            location: record.location,
            startDate: record.startDate,
            endDate: record.endDate,
            description: record.description,
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
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.studentAddress || !formData.companyName || !formData.position) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)

      // Convert dates to timestamps
      const startTimestamp = Math.floor(new Date(formData.startDate).getTime() / 1000)
      const endTimestamp = formData.isCurrentlyWorking || !formData.endDate
        ? 0
        : Math.floor(new Date(formData.endDate).getTime() / 1000)

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

      if (!contracts.experienceContract) {
        throw new Error('Experience contract not initialized')
      }

      const tx = await contracts.experienceContract.addExperienceRecord(
        formData.studentAddress,
        formData.companyName,
        formData.position,
        formData.location || '',
        startTimestamp,
        endTimestamp,
        formData.description || '',
        documentHash
      )

      const loadingToast = toast.loading('Adding experience to blockchain...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Experience added successfully!')

      // Reset form
      setFormData({
        studentAddress: '',
        companyName: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
        isCurrentlyWorking: false
      })

      setSelectedPDF(null)

      setActiveTab('history')
      loadExperiences()
    } catch (error) {
      console.error('Error adding experience:', error)
      toast.error(error.message || 'Failed to add experience')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestVerification = async (recordId) => {
    try {
      setSubmitting(true)

      if (!contracts.experienceContract) {
        throw new Error('Experience contract not initialized')
      }

      const tx = await contracts.experienceContract.requestRecordVerification(recordId)
      const loadingToast = toast.loading('Requesting verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Verification request sent to employer!')

      // Reload records to show updated status
      loadExperiences()
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

      if (!contracts.experienceContract) {
        throw new Error('Experience contract not initialized')
      }

      const tx = await contracts.experienceContract.approveRecordVerification(recordId)
      const loadingToast = toast.loading('Approving verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Record verified successfully!')

      // Reload pending verifications and records
      loadPendingVerifications()
      loadExperiences()
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

      if (!contracts.experienceContract) {
        throw new Error('Experience contract not initialized')
      }

      const reason = prompt('Enter reason for rejection (optional):') || 'No reason provided'

      const tx = await contracts.experienceContract.rejectRecordVerification(recordId, reason)
      const loadingToast = toast.loading('Rejecting verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Verification request rejected')

      // Reload pending verifications and records
      loadPendingVerifications()
      loadExperiences()
    } catch (error) {
      console.error('Error rejecting verification:', error)
      toast.error(error.message || 'Failed to reject verification')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === '0') return 'Present'
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to manage work experience</p>
      </div>
    )
  }

  // STUDENT VIEW - Read Only
  if (userRole === 2) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Briefcase className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Work Experience</h1>
              <p className="text-gray-600">View your professional career journey</p>
            </div>
          </div>
        </div>

        {/* Experience List */}
        <div className="space-y-4">
          {loading ? (
            <div className="card text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading work experience...</p>
            </div>
          ) : experiences.length === 0 ? (
            <div className="card text-center py-12">
              <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Work Experience</h3>
              <p className="text-gray-600">Your employer will add your work experience here.</p>
            </div>
          ) : (
            experiences.map((exp, index) => (
              <div key={index} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="bg-purple-100 rounded-lg p-3">
                      <Briefcase className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{exp.position}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          exp.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exp.isVerified ? (
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

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4" />
                          <span className="font-medium">{exp.companyName}</span>
                        </div>
                        {exp.location && (
                          <div className="flex items-center space-x-1">
                            <span>{exp.location}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(exp.startDate)} - {formatDate(exp.endDate)}</span>
                        </div>
                      </div>

                      {exp.description && (
                        <p className="text-sm text-gray-700 mb-2">{exp.description}</p>
                      )}

                      {exp.documentHash && (
                        <div className="mt-3">
                          <a
                            href={getIPFSUrl(exp.documentHash)}
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
                        Record ID: {Number(exp.id)} • Added: {formatDate(exp.createdAt)}
                      </div>

                      {/* Request Verification Button */}
                      {!exp.isVerified && (
                        <div className="mt-4">
                          <button
                            onClick={() => handleRequestVerification(exp.id)}
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

  // EMPLOYER & ADMIN VIEW - Tabbed Interface
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Briefcase className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Work Experience</h1>
            <p className="text-gray-600">
              {userRole === 1 ? 'View all work experience in the system' : 'Manage employee work experience records'}
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
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="h-4 w-4" />
              <span>History</span>
            </button>
            {userRole === 5 && (
              <>
                <button
                  onClick={() => setActiveTab('add')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'add'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Experience</span>
                </button>
                <button
                  onClick={() => setActiveTab('verifications')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'verifications'
                      ? 'border-purple-500 text-purple-600'
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading work experience...</p>
            </div>
          ) : experiences.length === 0 ? (
            <div className="card text-center py-12">
              <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Work Experience</h3>
              <p className="text-gray-600">
                {userRole === 5
                  ? 'No work experience added yet. Switch to "Add Experience" tab to add your first record.'
                  : 'No work experience in the system yet.'
                }
              </p>
            </div>
          ) : (
            <div className="card">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Work Experience Records ({experiences.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {experiences.map((exp, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{exp.studentName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              {exp.student?.slice(0, 6)}...{exp.student?.slice(-4)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{exp.position}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{exp.companyName}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{exp.location || '-'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                        </td>
                        <td className="px-4 py-4">
                          {exp.documentHash ? (
                            <a
                              href={getIPFSUrl(exp.documentHash)}
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
                          {exp.isVerified ? (
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

      {activeTab === 'add' && userRole === 5 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Work Experience for Employee</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee *
                </label>
                <select
                  name="studentAddress"
                  value={formData.studentAddress}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="">Select an employee</option>
                  {allUsers.map(user => (
                    <option key={user.address} value={user.address}>
                      {user.name} ({user.address.slice(0, 6)}...{user.address.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="e.g., Google Inc."
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="e.g., Software Engineer"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., San Francisco, CA"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="input"
                  disabled={formData.isCurrentlyWorking}
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="isCurrentlyWorking"
                    checked={formData.isCurrentlyWorking}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Currently working here</span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of responsibilities and achievements..."
                  className="input"
                  rows="4"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Experience Letter (optional)
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
                    companyName: '',
                    position: '',
                    location: '',
                    startDate: '',
                    endDate: '',
                    description: '',
                    isCurrentlyWorking: false
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
                {submitting ? 'Adding...' : 'Add Work Experience'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Verification Requests Tab */}
      {activeTab === 'verifications' && userRole === 5 && (
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
                          <h4 className="text-lg font-semibold text-gray-900">{record.position}</h4>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Awaiting Verification
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Employee:</span>
                            <p className="text-gray-900">{record.studentName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              {record.student?.slice(0, 6)}...{record.student?.slice(-4)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Company:</span>
                            <p className="text-gray-900">{record.companyName}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Location:</span>
                            <p className="text-gray-900">{record.location || '-'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Period:</span>
                            <p className="text-gray-900">
                              {formatDate(record.startDate)} - {formatDate(record.endDate)}
                            </p>
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

export default Experience
