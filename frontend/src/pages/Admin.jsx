import React, { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { useContract } from '../context/ContractContext'
import { Shield, Building, Award, Briefcase, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'

const Admin = () => {
  const { account, isConnected } = useWallet()
  const { contracts } = useContract()
  const [activeTab, setActiveTab] = useState('institution')
  const [loading, setLoading] = useState(false)
  const [registrationStatus, setRegistrationStatus] = useState({
    institution: false,
    certifier: false,
    employer: false,
    organizer: false
  })

  const [institutionForm, setInstitutionForm] = useState({
    name: '',
    registrationNumber: '',
    country: ''
  })

  const [certifierForm, setCertifierForm] = useState({
    name: '',
    website: '',
    registrationNumber: ''
  })

  const [employerForm, setEmployerForm] = useState({
    companyName: '',
    industry: '',
    registrationNumber: '',
    website: '',
    country: ''
  })

  const [organizerForm, setOrganizerForm] = useState({
    name: '',
    organizationType: '',
    website: '',
    registrationNumber: ''
  })

  useEffect(() => {
    checkRegistrationStatus()
  }, [account, contracts])

  const checkRegistrationStatus = async () => {
    if (!account || !contracts) return

    try {
      // Check if registered in each contract
      const [instStatus, certStatus, empStatus, orgStatus] = await Promise.all([
        contracts.educationContract?.isRegisteredInstitution(account).catch(() => false),
        contracts.certificationContract?.isRegisteredCertifier(account).catch(() => false),
        contracts.experienceContract?.isRegisteredEmployer(account).catch(() => false),
        contracts.achievementContract?.isRegisteredOrganizer(account).catch(() => false)
      ])

      setRegistrationStatus({
        institution: instStatus || false,
        certifier: certStatus || false,
        employer: empStatus || false,
        organizer: orgStatus || false
      })
    } catch (error) {
      console.error('Error checking registration status:', error)
    }
  }

  const registerInstitution = async (e) => {
    e.preventDefault()
    if (!institutionForm.name || !institutionForm.registrationNumber) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const tx = await contracts.educationContract.registerInstitution(
        institutionForm.name,
        institutionForm.registrationNumber,
        institutionForm.country
      )
      toast.loading('Registering institution...')
      await tx.wait()
      toast.success('Institution registered successfully!')
      setInstitutionForm({ name: '', registrationNumber: '', country: '' })
      checkRegistrationStatus()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to register institution')
    } finally {
      setLoading(false)
    }
  }

  const registerCertifier = async (e) => {
    e.preventDefault()
    if (!certifierForm.name) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const tx = await contracts.certificationContract.registerCertifier(
        certifierForm.name,
        certifierForm.website,
        certifierForm.registrationNumber
      )
      toast.loading('Registering certifier...')
      await tx.wait()
      toast.success('Certifier registered successfully!')
      setCertifierForm({ name: '', website: '', registrationNumber: '' })
      checkRegistrationStatus()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to register certifier')
    } finally {
      setLoading(false)
    }
  }

  const registerEmployer = async (e) => {
    e.preventDefault()
    if (!employerForm.companyName || !employerForm.industry) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const tx = await contracts.experienceContract.registerEmployer(
        employerForm.companyName,
        employerForm.industry,
        employerForm.registrationNumber,
        employerForm.website,
        employerForm.country
      )
      toast.loading('Registering employer...')
      await tx.wait()
      toast.success('Employer registered successfully!')
      setEmployerForm({ companyName: '', industry: '', registrationNumber: '', website: '', country: '' })
      checkRegistrationStatus()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to register employer')
    } finally {
      setLoading(false)
    }
  }

  const registerOrganizer = async (e) => {
    e.preventDefault()
    if (!organizerForm.name || !organizerForm.organizationType) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const tx = await contracts.achievementContract.registerOrganizer(
        organizerForm.name,
        organizerForm.organizationType,
        organizerForm.website,
        organizerForm.registrationNumber
      )
      toast.loading('Registering organizer...')
      await tx.wait()
      toast.success('Organizer registered successfully!')
      setOrganizerForm({ name: '', organizationType: '', website: '', registrationNumber: '' })
      checkRegistrationStatus()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to register organizer')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to register as an organization</p>
      </div>
    )
  }

  const tabs = [
    { id: 'institution', label: 'Institution', icon: Building, registered: registrationStatus.institution },
    { id: 'certifier', label: 'Certifier', icon: Award, registered: registrationStatus.certifier },
    { id: 'employer', label: 'Employer', icon: Briefcase, registered: registrationStatus.employer },
    { id: 'organizer', label: 'Organizer', icon: Trophy, registered: registrationStatus.organizer }
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Organization Registration</h1>
        </div>
        <p className="text-gray-600">Register your wallet as an institution, certifier, employer, or event organizer</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-2 border-b">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 font-medium transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
                {tab.registered && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    Registered
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Institution Registration */}
      {activeTab === 'institution' && (
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Register as Educational Institution</h3>
          {registrationStatus.institution ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              ✅ Already registered as an institution. You can now add education records for students.
            </div>
          ) : (
            <form onSubmit={registerInstitution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name *</label>
                <input
                  type="text"
                  value={institutionForm.name}
                  onChange={(e) => setInstitutionForm({...institutionForm, name: e.target.value})}
                  placeholder="e.g., Harvard University, Delhi Public School"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
                <input
                  type="text"
                  value={institutionForm.registrationNumber}
                  onChange={(e) => setInstitutionForm({...institutionForm, registrationNumber: e.target.value})}
                  placeholder="e.g., INST-001, REG-12345"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={institutionForm.country}
                  onChange={(e) => setInstitutionForm({...institutionForm, country: e.target.value})}
                  placeholder="e.g., India, USA"
                  className="input"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Registering...' : 'Register Institution'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Certifier Registration */}
      {activeTab === 'certifier' && (
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Register as Certification Body</h3>
          {registrationStatus.certifier ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              ✅ Already registered as a certifier. You can now issue certifications to students.
            </div>
          ) : (
            <form onSubmit={registerCertifier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certifier Name *</label>
                <input
                  type="text"
                  value={certifierForm.name}
                  onChange={(e) => setCertifierForm({...certifierForm, name: e.target.value})}
                  placeholder="e.g., AWS Certification, Google Cloud"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="text"
                  value={certifierForm.website}
                  onChange={(e) => setCertifierForm({...certifierForm, website: e.target.value})}
                  placeholder="e.g., https://aws.amazon.com"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                <input
                  type="text"
                  value={certifierForm.registrationNumber}
                  onChange={(e) => setCertifierForm({...certifierForm, registrationNumber: e.target.value})}
                  placeholder="e.g., CERT-001"
                  className="input"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Registering...' : 'Register Certifier'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Employer Registration */}
      {activeTab === 'employer' && (
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Register as Employer/Company</h3>
          {registrationStatus.employer ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              ✅ Already registered as an employer. You can now add work experience for employees.
            </div>
          ) : (
            <form onSubmit={registerEmployer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={employerForm.companyName}
                  onChange={(e) => setEmployerForm({...employerForm, companyName: e.target.value})}
                  placeholder="e.g., Google, Microsoft"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
                <input
                  type="text"
                  value={employerForm.industry}
                  onChange={(e) => setEmployerForm({...employerForm, industry: e.target.value})}
                  placeholder="e.g., Technology, Finance"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                <input
                  type="text"
                  value={employerForm.registrationNumber}
                  onChange={(e) => setEmployerForm({...employerForm, registrationNumber: e.target.value})}
                  placeholder="e.g., EMP-001"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="text"
                  value={employerForm.website}
                  onChange={(e) => setEmployerForm({...employerForm, website: e.target.value})}
                  placeholder="e.g., https://google.com"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={employerForm.country}
                  onChange={(e) => setEmployerForm({...employerForm, country: e.target.value})}
                  placeholder="e.g., India, USA"
                  className="input"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Registering...' : 'Register Employer'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Organizer Registration */}
      {activeTab === 'organizer' && (
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Register as Event Organizer</h3>
          {registrationStatus.organizer ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              ✅ Already registered as an organizer. You can now add achievements for participants.
            </div>
          ) : (
            <form onSubmit={registerOrganizer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organizer Name *</label>
                <input
                  type="text"
                  value={organizerForm.name}
                  onChange={(e) => setOrganizerForm({...organizerForm, name: e.target.value})}
                  placeholder="e.g., Hackathon XYZ, Tech Conference"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type *</label>
                <select
                  value={organizerForm.organizationType}
                  onChange={(e) => setOrganizerForm({...organizerForm, organizationType: e.target.value})}
                  className="input"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="Educational">Educational</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Non-Profit">Non-Profit</option>
                  <option value="Government">Government</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="text"
                  value={organizerForm.website}
                  onChange={(e) => setOrganizerForm({...organizerForm, website: e.target.value})}
                  placeholder="e.g., https://event.com"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                <input
                  type="text"
                  value={organizerForm.registrationNumber}
                  onChange={(e) => setOrganizerForm({...organizerForm, registrationNumber: e.target.value})}
                  placeholder="e.g., ORG-001"
                  className="input"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Registering...' : 'Register Organizer'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

export default Admin