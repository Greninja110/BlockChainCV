import React, { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { useContract } from '../context/ContractContext'
import { Award, Plus, Calendar, Building, CheckCircle, XCircle, History, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadToIPFSWithFallback, getIPFSUrl } from '../utils/ipfs'

const Certifications = () => {
  const { account, isConnected } = useWallet()
  const { contracts, getCertificationRecords } = useContract()
  const [certifications, setCertifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('history')
  const [userRole, setUserRole] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [selectedPDF, setSelectedPDF] = useState(null)
  const [isRegisteredCertifier, setIsRegisteredCertifier] = useState(false)
  const [checkingRegistration, setCheckingRegistration] = useState(false)
  const [pendingVerifications, setPendingVerifications] = useState([])

  const [formData, setFormData] = useState({
    studentAddress: '',
    certificationName: '',
    issuingOrganization: '',
    issueDate: '',
    expirationDate: '',
    credentialID: '',
    credentialURL: ''
  })

  useEffect(() => {
    if (isConnected && account && contracts.userRegistry) {
      loadUserRole()
      loadAllUsers()
      checkCertifierRegistration()
    }
  }, [isConnected, account, contracts])

  useEffect(() => {
    if (userRole) {
      // Check certifier registration for certifiers
      if (userRole === 4) {
        checkCertifierRegistration()
        loadPendingVerifications()
      }
      // Only load records for roles that need allUsers data
      if ((userRole === 1 || userRole === 4) && allUsers.length === 0) {
        return // Wait for allUsers to load
      }
      loadCertifications()
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

  const checkCertifierRegistration = async () => {
    try {
      if (!contracts.certificationContract || userRole !== 4) return
      const isRegistered = await contracts.certificationContract.isRegisteredCertifier(account)
      setIsRegisteredCertifier(isRegistered)
      console.log('Certifier registered:', isRegistered)
    } catch (error) {
      console.error('Error checking certifier registration:', error)
    }
  }

  const registerAsCertifier = async () => {
    try {
      setCheckingRegistration(true)

      const profile = await contracts.userRegistry.getUserProfile(account)
      const certifierName = profile.name || 'My Organization'
      const registrationNumber = `REG-${Date.now()}`
      const country = 'India'

      const tx = await contracts.certificationContract.registerCertifier(
        certifierName,
        registrationNumber,
        country
      )

      const loadingToast = toast.loading('Registering certifier...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Certifier registered successfully!')
      setIsRegisteredCertifier(true)
    } catch (error) {
      console.error('Error registering certifier:', error)
      toast.error('Failed to register certifier: ' + error.message)
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

  const loadCertifications = async () => {
    try {
      setLoading(true)

      // For ADMIN (role 1), load all certifications from all users
      if (userRole === 1) {
        const allRecords = []
        for (const user of allUsers) {
          try {
            const records = await getCertificationRecords(user.address)
            allRecords.push(...records.map(r => ({ ...r, studentName: user.name })))
          } catch (error) {
            console.error('Error loading records for', user.address, error)
          }
        }
        setCertifications(allRecords)
      }
      // For CERTIFIER (role 4), load certifications they issued
      else if (userRole === 4) {
        const allRecords = []
        for (const user of allUsers) {
          try {
            const records = await getCertificationRecords(user.address)
            allRecords.push(...records.map(r => ({ ...r, studentName: user.name, studentAddress: user.address })))
          } catch (error) {
            console.error('Error loading records for', user.address, error)
          }
        }
        setCertifications(allRecords)
      }
      // For STUDENT (role 2), load only their own certifications
      else if (userRole === 2) {
        const records = await getCertificationRecords(account)
        setCertifications(records)
      }
    } catch (error) {
      console.error('Error loading certifications:', error)
      toast.error('Failed to load certifications')
    } finally {
      setLoading(false)
    }
  }

  const loadPendingVerifications = async () => {
    try {
      if (!contracts.certificationContract || userRole !== 4) return

      const pendingIds = await contracts.certificationContract.getCertifierPendingVerifications(account)
      console.log('Pending verification IDs:', pendingIds)

      const pendingRecords = []
      for (const recordId of pendingIds) {
        try {
          const record = await contracts.certificationContract.getCertificationRecord(recordId)
          console.log('Raw record from contract:', record)

          // Get student name
          const studentProfile = await contracts.userRegistry.getUserProfile(record.student)

          pendingRecords.push({
            id: record.id,
            student: record.student,
            certificationName: record.certificationName,
            issuingOrganization: record.issuingOrganization,
            issueDate: record.issueDate,
            expirationDate: record.expirationDate,
            credentialID: record.credentialID,
            credentialURL: record.credentialURL,
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

    if (!formData.studentAddress || !formData.certificationName || !formData.issuingOrganization) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)

      // Convert dates to timestamps
      const issueTimestamp = Math.floor(new Date(formData.issueDate).getTime() / 1000)
      const expirationTimestamp = formData.expirationDate
        ? Math.floor(new Date(formData.expirationDate).getTime() / 1000)
        : 0

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

      if (!contracts.certificationContract) {
        throw new Error('Certification contract not initialized')
      }

      const tx = await contracts.certificationContract.addCertificationRecord(
        formData.studentAddress,
        formData.certificationName,
        formData.issuingOrganization,
        issueTimestamp,
        expirationTimestamp,
        formData.credentialID || `cert-${Date.now()}`,
        formData.credentialURL || '',
        documentHash
      )

      const loadingToast = toast.loading('Adding certification to blockchain...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Certification added successfully!')

      // Reset form
      setFormData({
        studentAddress: '',
        certificationName: '',
        issuingOrganization: '',
        issueDate: '',
        expirationDate: '',
        credentialID: '',
        credentialURL: ''
      })
      setSelectedPDF(null)

      setActiveTab('history')
      loadCertifications()
    } catch (error) {
      console.error('Error adding certification:', error)
      toast.error(error.message || 'Failed to add certification')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestVerification = async (recordId) => {
    try {
      setSubmitting(true)

      if (!contracts.certificationContract) {
        throw new Error('Certification contract not initialized')
      }

      const tx = await contracts.certificationContract.requestRecordVerification(recordId)
      const loadingToast = toast.loading('Requesting verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Verification request sent to certifier!')

      // Reload records to show updated status
      loadCertifications()
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

      if (!contracts.certificationContract) {
        throw new Error('Certification contract not initialized')
      }

      const tx = await contracts.certificationContract.approveRecordVerification(recordId)
      const loadingToast = toast.loading('Approving verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Record verified successfully!')

      // Reload pending verifications and records
      loadPendingVerifications()
      loadCertifications()
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

      if (!contracts.certificationContract) {
        throw new Error('Certification contract not initialized')
      }

      const reason = prompt('Enter reason for rejection (optional):') || 'No reason provided'

      const tx = await contracts.certificationContract.rejectRecordVerification(recordId, reason)
      const loadingToast = toast.loading('Rejecting verification...')
      await tx.wait()
      toast.dismiss(loadingToast)

      toast.success('Verification request rejected')

      // Reload pending verifications and records
      loadPendingVerifications()
      loadCertifications()
    } catch (error) {
      console.error('Error rejecting verification:', error)
      toast.error(error.message || 'Failed to reject verification')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === '0') return 'No Expiration'
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to manage certifications</p>
      </div>
    )
  }

  // STUDENT VIEW - Read Only
  if (userRole === 2) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Award className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Certifications</h1>
              <p className="text-gray-600">View your professional certifications</p>
            </div>
          </div>
        </div>

        {/* Certifications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="card text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading certifications...</p>
            </div>
          ) : certifications.length === 0 ? (
            <div className="card text-center py-12">
              <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Certifications</h3>
              <p className="text-gray-600">Your certifier will add your certifications here.</p>
            </div>
          ) : (
            certifications.map((cert, index) => (
              <div key={index} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="bg-green-100 rounded-lg p-3">
                      <Award className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{cert.certificationName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          cert.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {cert.isVerified ? (
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
                          <span>{cert.issuingOrganization}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Issued: {formatDate(cert.issueDate)}</span>
                        </div>
                        {cert.expirationDate && Number(cert.expirationDate) > 0 && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Expires: {formatDate(cert.expirationDate)}</span>
                          </div>
                        )}
                      </div>

                      {cert.credentialID && (
                        <div className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Credential ID: </span>
                          <span className="font-mono">{cert.credentialID}</span>
                        </div>
                      )}

                      {cert.credentialURL && (
                        <div className="text-sm">
                          <a
                            href={cert.credentialURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            View Certificate
                          </a>
                        </div>
                      )}

                      {cert.documentHash && (
                        <div className="mt-3">
                          <a
                            href={getIPFSUrl(cert.documentHash)}
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
                        Record ID: {Number(cert.id)} • Added: {formatDate(cert.createdAt)}
                      </div>

                      {/* Request Verification Button */}
                      {!cert.isVerified && (
                        <div className="mt-4">
                          <button
                            onClick={() => handleRequestVerification(cert.id)}
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

  // CERTIFIER & ADMIN VIEW - Tabbed Interface
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Award className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Certifications</h1>
            <p className="text-gray-600">
              {userRole === 1 ? 'View all certifications in the system' : 'Manage student certifications'}
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
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="h-4 w-4" />
              <span>History</span>
            </button>
            {userRole === 4 && (
              <>
                <button
                  onClick={() => setActiveTab('add')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'add'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Certification</span>
                </button>
                <button
                  onClick={() => setActiveTab('verifications')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'verifications'
                      ? 'border-green-500 text-green-600'
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading certifications...</p>
            </div>
          ) : certifications.length === 0 ? (
            <div className="card text-center py-12">
              <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Certifications</h3>
              <p className="text-gray-600">
                {userRole === 4
                  ? 'No certifications issued yet. Switch to "Add Certification" tab to issue your first certification.'
                  : 'No certifications in the system yet.'
                }
              </p>
            </div>
          ) : (
            <div className="card">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Certifications ({certifications.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certification</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {certifications.map((cert, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{cert.studentName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              {cert.student?.slice(0, 6)}...{cert.student?.slice(-4)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{cert.certificationName}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{cert.issuingOrganization}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatDate(cert.issueDate)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatDate(cert.expirationDate)}</td>
                        <td className="px-4 py-4">
                          {cert.documentHash ? (
                            <a
                              href={getIPFSUrl(cert.documentHash)}
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
                          {cert.isVerified ? (
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

      {activeTab === 'add' && userRole === 4 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Issue Certification to Student</h3>

          {!isRegisteredCertifier && (
            <div className="mb-6 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-red-900 mb-2">Certifier Not Registered</h4>
                  <p className="text-sm text-red-800 mb-4">
                    You must register as a certifier in the Certification Contract before you can issue certifications.
                  </p>
                  <button
                    type="button"
                    onClick={registerAsCertifier}
                    disabled={checkingRegistration}
                    className="btn btn-primary"
                  >
                    {checkingRegistration ? 'Registering...' : 'Register as Certifier'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isRegisteredCertifier && (
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
                  Certification Name *
                </label>
                <input
                  type="text"
                  name="certificationName"
                  value={formData.certificationName}
                  onChange={handleInputChange}
                  placeholder="e.g., AWS Certified Solutions Architect"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issuing Organization *
                </label>
                <input
                  type="text"
                  name="issuingOrganization"
                  value={formData.issuingOrganization}
                  onChange={handleInputChange}
                  placeholder="e.g., Amazon Web Services"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date *
                </label>
                <input
                  type="date"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date (optional)
                </label>
                <input
                  type="date"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credential ID (optional)
                </label>
                <input
                  type="text"
                  name="credentialID"
                  value={formData.credentialID}
                  onChange={handleInputChange}
                  placeholder="Auto-generated if empty"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credential URL (optional)
                </label>
                <input
                  type="url"
                  name="credentialURL"
                  value={formData.credentialURL}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  className="input"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Certificate Document (optional)
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
                    certificationName: '',
                    issuingOrganization: '',
                    issueDate: '',
                    expirationDate: '',
                    credentialID: '',
                    credentialURL: ''
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
                className="btn btn-success"
                disabled={submitting}
              >
                {submitting ? 'Issuing...' : 'Issue Certification'}
              </button>
            </div>
          </form>
          )}
        </div>
      )}

      {/* Verification Requests Tab */}
      {activeTab === 'verifications' && userRole === 4 && (
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
                          <h4 className="text-lg font-semibold text-gray-900">{record.certificationName}</h4>
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
                            <span className="font-medium text-gray-700">Issuing Organization:</span>
                            <p className="text-gray-900">{record.issuingOrganization}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Issue Date:</span>
                            <p className="text-gray-900">{formatDate(record.issueDate)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Expiration:</span>
                            <p className="text-gray-900">{formatDate(record.expirationDate)}</p>
                          </div>
                          {record.credentialID && (
                            <div>
                              <span className="font-medium text-gray-700">Credential ID:</span>
                              <p className="text-gray-900 font-mono text-xs">{record.credentialID}</p>
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

export default Certifications
