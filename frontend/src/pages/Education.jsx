import React, { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { useContract } from '../context/ContractContext'
import { GraduationCap, Plus, Calendar, Building, Award, X, CheckCircle, XCircle, History, Users, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadToIPFSWithFallback, getIPFSUrl } from '../utils/ipfs'

const Education = () => {
  const { account, isConnected } = useWallet()
  const { contracts, getEducationRecords } = useContract()
  const [educationRecords, setEducationRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('history')

  // Debug: Log when tab changes
  useEffect(() => {
    console.log('Active tab changed to:', activeTab, 'allUsers.length:', allUsers.length)
  }, [activeTab])
  const [userRole, setUserRole] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [isRegisteredInstitution, setIsRegisteredInstitution] = useState(false)
  const [checkingRegistration, setCheckingRegistration] = useState(false)
  const [pendingVerifications, setPendingVerifications] = useState([])

  // Debug: Log whenever allUsers changes
  useEffect(() => {
    console.log('allUsers state changed:', allUsers)
  }, [allUsers])

  const [formData, setFormData] = useState({
    studentAddress: '',
    degree: '',
    fieldOfStudy: '',
    institutionName: '',
    level: '0',
    startDate: '',
    endDate: '',
    grade: '',
    credentialHash: ''
  })
  const [selectedPDF, setSelectedPDF] = useState(null)

  const educationLevels = [
    { value: 0, label: 'Kindergarten' },
    { value: 1, label: 'Primary' },
    { value: 2, label: 'Secondary' },
    { value: 3, label: 'High School' },
    { value: 4, label: 'Undergraduate' },
    { value: 5, label: 'Graduate' },
    { value: 6, label: 'Masters' },
    { value: 7, label: 'PhD' },
    { value: 8, label: 'Postdoc' },
    { value: 9, label: 'Other' }
  ]

  useEffect(() => {
    if (isConnected && account && contracts.userRegistry) {
      loadUserRole()
      loadAllUsers()
      checkInstitutionRegistration()
    }
  }, [isConnected, account, contracts])

  useEffect(() => {
    if (userRole) {
      // Check institution registration for institutions
      if (userRole === 3) {
        checkInstitutionRegistration()
        loadPendingVerifications()
      }
      // Only load records for roles that need allUsers data
      if ((userRole === 1 || userRole === 3) && allUsers.length === 0) {
        return // Wait for allUsers to load
      }
      loadEducationRecords()
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

  const checkInstitutionRegistration = async () => {
    try {
      if (!contracts.educationContract || userRole !== 3) return
      const isRegistered = await contracts.educationContract.isRegisteredInstitution(account)
      setIsRegisteredInstitution(isRegistered)
      console.log('Institution registered:', isRegistered)
    } catch (error) {
      console.error('Error checking institution registration:', error)
    }
  }

  const registerAsInstitution = async () => {
    try {
      setCheckingRegistration(true)

      const profile = await contracts.userRegistry.getUserProfile(account)
      const institutionName = profile.name || 'My Institution'
      const registrationNumber = `REG-${Date.now()}`
      const country = 'India'

      const tx = await contracts.educationContract.registerInstitution(
        institutionName,
        registrationNumber,
        country
      )

      const loadingToast = toast.loading('Registering institution...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Institution registered successfully!')
      setIsRegisteredInstitution(true)
    } catch (error) {
      console.error('Error registering institution:', error)
      toast.error('Failed to register institution: ' + error.message)
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

  const loadEducationRecords = async () => {
    try {
      setLoading(true)
      console.log('Loading education records for userRole:', userRole, 'allUsers:', allUsers.length)

      // For ADMIN (role 1), load all education records from all users
      if (userRole === 1) {
        const allRecords = []
        for (const user of allUsers) {
          try {
            const records = await getEducationRecords(user.address)
            console.log(`Loaded ${records.length} records for ${user.name}`)
            allRecords.push(...records.map(r => ({ ...r, studentName: user.name })))
          } catch (error) {
            console.error('Error loading records for', user.address, error)
          }
        }
        console.log('Total records loaded:', allRecords.length)
        setEducationRecords(allRecords)
      }
      // For INSTITUTION (role 3), load records they added
      else if (userRole === 3) {
        // For now, show all records (we'll filter by institution in future)
        const allRecords = []
        console.log('Loading records for', allUsers.length, 'students')
        for (const user of allUsers) {
          try {
            const records = await getEducationRecords(user.address)
            console.log(`Loaded ${records.length} records for student ${user.name} (${user.address})`)
            allRecords.push(...records.map(r => ({ ...r, studentName: user.name, studentAddress: user.address })))
          } catch (error) {
            console.error('Error loading records for', user.address, error)
          }
        }
        console.log('Total education records loaded:', allRecords.length, allRecords)
        setEducationRecords(allRecords)
      }
      // For STUDENT (role 2), load only their own records
      else if (userRole === 2) {
        const records = await getEducationRecords(account)
        setEducationRecords(records)
      }
    } catch (error) {
      console.error('Error loading education records:', error)
      toast.error('Failed to load education records')
    } finally {
      setLoading(false)
    }
  }

  const loadPendingVerifications = async () => {
    try {
      if (!contracts.educationContract || userRole !== 3) return

      const pendingIds = await contracts.educationContract.getInstitutionPendingVerifications(account)
      console.log('Pending verification IDs:', pendingIds)

      const pendingRecords = []
      for (const recordId of pendingIds) {
        try {
          const record = await contracts.educationContract.getEducationRecord(recordId)
          console.log('Raw record from contract:', record)

          // Get student name
          const studentProfile = await contracts.userRegistry.getUserProfile(record.student)

          // Explicitly map all fields from the struct
          pendingRecords.push({
            id: record.id,
            student: record.student,
            institution: record.institution,
            institutionName: record.institutionName,
            degree: record.degree,
            fieldOfStudy: record.fieldOfStudy,
            level: record.level,
            status: record.status,
            startDate: record.startDate,
            endDate: record.endDate,
            grade: record.grade,
            credentialHash: record.credentialHash,
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

    if (!formData.studentAddress || !formData.degree || !formData.institutionName) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)

      // Convert dates to timestamps
      const startTimestamp = Math.floor(new Date(formData.startDate).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(formData.endDate).getTime() / 1000)

      // Validation
      const now = Math.floor(Date.now() / 1000)
      console.log('Date validation:', {
        startTimestamp,
        endTimestamp,
        now,
        startValid: startTimestamp > 0 && startTimestamp <= now,
        endValid: endTimestamp >= startTimestamp
      })

      if (startTimestamp > now) {
        toast.error('Start date cannot be in the future')
        setSubmitting(false)
        return
      }

      if (endTimestamp < startTimestamp) {
        toast.error('End date must be after start date')
        setSubmitting(false)
        return
      }

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

      const recordData = {
        student: formData.studentAddress,
        degree: formData.degree,
        fieldOfStudy: formData.fieldOfStudy,
        level: parseInt(formData.level),
        startDate: startTimestamp,
        endDate: endTimestamp,
        credentialHash: formData.credentialHash || `credential-${Date.now()}`,
        documentHash: documentHash
      }

      console.log('Submitting record:', recordData)

      // Call contract
      if (!contracts.educationContract) {
        throw new Error('Education contract not initialized')
      }

      // Check if user has role
      const hasRole = await contracts.educationContract.hasRole(
        await contracts.educationContract.INSTITUTION_ROLE(),
        account
      )
      console.log('Has INSTITUTION_ROLE:', hasRole)

      if (!hasRole) {
        toast.error('You do not have the INSTITUTION_ROLE. Please register as institution first.')
        setSubmitting(false)
        return
      }

      const tx = await contracts.educationContract.addEducationRecord(
        recordData.student,
        recordData.degree,
        recordData.fieldOfStudy,
        recordData.level,
        recordData.startDate,
        recordData.endDate,
        recordData.credentialHash,
        recordData.documentHash
      )

      const loadingToast = toast.loading('Adding education record to blockchain...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Education record added successfully!')

      // Reset form
      setFormData({
        studentAddress: '',
        degree: '',
        fieldOfStudy: '',
        institutionName: '',
        level: '0',
        startDate: '',
        endDate: '',
        grade: '',
        credentialHash: ''
      })
      setSelectedPDF(null)

      setShowForm(false)
      setActiveTab('history')
      loadEducationRecords()
    } catch (error) {
      console.error('Error adding education record:', error)
      toast.error(error.message || 'Failed to add education record')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestVerification = async (recordId) => {
    try {
      setSubmitting(true)

      if (!contracts.educationContract) {
        throw new Error('Education contract not initialized')
      }

      const tx = await contracts.educationContract.requestRecordVerification(recordId)
      const loadingToast = toast.loading('Requesting verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Verification request sent to institution!')

      // Reload records to show updated status
      loadEducationRecords()
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

      if (!contracts.educationContract) {
        throw new Error('Education contract not initialized')
      }

      const tx = await contracts.educationContract.approveRecordVerification(recordId)
      const loadingToast = toast.loading('Approving verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Record verified successfully!')

      // Reload pending verifications and records
      loadPendingVerifications()
      loadEducationRecords()
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

      if (!contracts.educationContract) {
        throw new Error('Education contract not initialized')
      }

      const reason = prompt('Enter reason for rejection (optional):') || 'No reason provided'

      const tx = await contracts.educationContract.rejectRecordVerification(recordId, reason)
      const loadingToast = toast.loading('Rejecting verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Verification request rejected')

      // Reload pending verifications and records
      loadPendingVerifications()
      loadEducationRecords()
    } catch (error) {
      console.error('Error rejecting verification:', error)
      toast.error(error.message || 'Failed to reject verification')
    } finally {
      setSubmitting(false)
    }
  }

  const getLevelLabel = (level) => {
    const levelObj = educationLevels.find(l => l.value === Number(level))
    return levelObj ? levelObj.label : 'Unknown'
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to manage education records</p>
      </div>
    )
  }

  // STUDENT VIEW - Read Only
  if (userRole === 2) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Education Records</h1>
              <p className="text-gray-600">View your academic credentials on the blockchain</p>
            </div>
          </div>
        </div>

        {/* Education Records List */}
        <div className="space-y-4">
          {loading ? (
            <div className="card text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading education records...</p>
            </div>
          ) : educationRecords.length === 0 ? (
            <div className="card text-center py-12">
              <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Education Records</h3>
              <p className="text-gray-600">Your institution will add your education records here.</p>
            </div>
          ) : (
            educationRecords.map((record, index) => (
              <div key={index} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <GraduationCap className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{record.degree}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.isVerified ? (
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

                      {record.fieldOfStudy && (
                        <p className="text-gray-700 mb-2">{record.fieldOfStudy}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4" />
                          <span>{record.institutionName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Award className="h-4 w-4" />
                          <span>{getLevelLabel(record.level)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(record.startDate)} - {formatDate(record.endDate)}</span>
                        </div>
                      </div>

                      {record.grade && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700">Grade: </span>
                          <span className="text-sm text-gray-900 font-semibold">{record.grade}</span>
                        </div>
                      )}

                      {record.documentHash && (
                        <div className="mt-3">
                          <a
                            href={getIPFSUrl(record.documentHash)}
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
                        Record ID: {Number(record.id)} • Added: {formatDate(record.createdAt)}
                      </div>

                      {/* Request Verification Button */}
                      {!record.isVerified && (
                        <div className="mt-4">
                          <button
                            onClick={() => handleRequestVerification(record.id)}
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

  // INSTITUTION & ADMIN VIEW - Tabbed Interface
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Education Records</h1>
            <p className="text-gray-600">
              {userRole === 1 ? 'View all education records in the system' : 'Manage student education records'}
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
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="h-4 w-4" />
              <span>History</span>
            </button>
            {userRole === 3 && (
              <>
                <button
                  onClick={() => setActiveTab('add')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'add'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Record</span>
                </button>
                <button
                  onClick={() => setActiveTab('verifications')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'verifications'
                      ? 'border-blue-500 text-blue-600'
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading education records...</p>
            </div>
          ) : educationRecords.length === 0 ? (
            <div className="card text-center py-12">
              <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Education Records</h3>
              <p className="text-gray-600">
                {userRole === 3
                  ? 'No education records added yet. Switch to "Add Record" tab to add your first record.'
                  : 'No education records in the system yet.'
                }
              </p>
            </div>
          ) : (
            <div className="card">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Education Records ({educationRecords.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Degree</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {educationRecords.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{record.studentName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              {record.student?.slice(0, 6)}...{record.student?.slice(-4)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{record.degree}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{record.fieldOfStudy || '-'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{getLevelLabel(record.level)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {formatDate(record.startDate)} - {formatDate(record.endDate)}
                        </td>
                        <td className="px-4 py-4">
                          {record.documentHash ? (
                            <a
                              href={getIPFSUrl(record.documentHash)}
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
                          {record.isVerified ? (
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

      {activeTab === 'add' && userRole === 3 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Education Record for Student</h3>

          {console.log('Registration status - isRegisteredInstitution:', isRegisteredInstitution, 'userRole:', userRole)}

          {!isRegisteredInstitution && (
            <div className="mb-6 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-red-900 mb-2">Institution Not Registered</h4>
                  <p className="text-sm text-red-800 mb-4">
                    You must register as an institution in the Education Contract before you can add education records.
                  </p>
                  <button
                    type="button"
                    onClick={registerAsInstitution}
                    disabled={checkingRegistration}
                    className="btn btn-primary"
                  >
                    {checkingRegistration ? 'Registering...' : 'Register as Institution'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isRegisteredInstitution && (
            <>
              {allUsers.length === 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">⚠️ No students loaded. Please wait or refresh the page.</p>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Manually reloading users...')
                      loadAllUsers()
                    }}
                    className="mt-2 btn btn-secondary text-sm"
                  >
                    Reload Students
                  </button>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student * ({allUsers.length} students available)
                </label>
                <select
                  name="studentAddress"
                  value={formData.studentAddress}
                  onChange={handleInputChange}
                  className="input"
                  required
                  key={`student-select-${allUsers.length}`}
                >
                  <option value="">Select a student ({allUsers.length} available)</option>
                  {allUsers.length > 0 ? (
                    allUsers.map((user, index) => {
                      console.log(`Rendering option ${index}:`, user)
                      return (
                        <option key={user.address} value={user.address}>
                          {user.name} ({user.address?.slice(0, 6)}...{user.address?.slice(-4)})
                        </option>
                      )
                    })
                  ) : (
                    <option disabled>Loading students...</option>
                  )}
                </select>
                {allUsers.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Available students: {allUsers.map(u => u.name).join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Degree/Certificate *
                </label>
                <input
                  type="text"
                  name="degree"
                  value={formData.degree}
                  onChange={handleInputChange}
                  placeholder="e.g., Class 10th, Bachelor of Science"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field of Study
                </label>
                <input
                  type="text"
                  name="fieldOfStudy"
                  value={formData.fieldOfStudy}
                  onChange={handleInputChange}
                  placeholder="e.g., Computer Science, General"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institution Name *
                </label>
                <input
                  type="text"
                  name="institutionName"
                  value={formData.institutionName}
                  onChange={handleInputChange}
                  placeholder="e.g., ABC High School"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education Level
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  className="input"
                >
                  {educationLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
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
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade/Score (optional)
                </label>
                <input
                  type="text"
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  placeholder="e.g., 95%, 8.5 CGPA"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credential Hash (optional)
                </label>
                <input
                  type="text"
                  name="credentialHash"
                  value={formData.credentialHash}
                  onChange={handleInputChange}
                  placeholder="Auto-generated if empty"
                  className="input"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Marksheet/Certificate (optional)
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
                    degree: '',
                    fieldOfStudy: '',
                    institutionName: '',
                    level: '0',
                    startDate: '',
                    endDate: '',
                    grade: '',
                    credentialHash: ''
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
                {submitting ? 'Adding...' : 'Add Education Record'}
              </button>
            </div>
          </form>
            </>
          )}
        </div>
      )}

      {/* Verification Requests Tab */}
      {activeTab === 'verifications' && userRole === 3 && (
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
                          <h4 className="text-lg font-semibold text-gray-900">{record.degree}</h4>
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
                            <span className="font-medium text-gray-700">Field of Study:</span>
                            <p className="text-gray-900">{record.fieldOfStudy || '-'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Level:</span>
                            <p className="text-gray-900">{getLevelLabel(record.level)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Period:</span>
                            <p className="text-gray-900">
                              {formatDate(record.startDate)} - {formatDate(record.endDate)}
                            </p>
                          </div>
                          {record.grade && (
                            <div>
                              <span className="font-medium text-gray-700">Grade/Marks:</span>
                              <p className="text-gray-900 font-semibold text-green-600">{record.grade}</p>
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

export default Education