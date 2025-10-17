import React, { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { useContract } from '../context/ContractContext'
import { User, Shield, Edit, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

const Profile = () => {
  const { account, isConnected } = useWallet()
  const { hasProfile, getProfile, createProfile, updateProfile } = useContract()

  const [profileExists, setProfileExists] = useState(false)
  const [profile, setProfile] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    title: '',
    bio: '',
    location: '',
    website: '',
    github: '',
    linkedin: '',
    skills: ''
  })

  useEffect(() => {
    if (isConnected && account) {
      loadProfile()
    }
  }, [isConnected, account])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const exists = await hasProfile(account)
      setProfileExists(exists)

      if (exists) {
        const profileData = await getProfile(account)
        setProfile(profileData)

        // Parse profile hash (assuming it's JSON)
        try {
          const profileInfo = JSON.parse(profileData.profileHash)
          setFormData(profileInfo)
        } catch (error) {
          console.error('Error parsing profile hash:', error)
        }
      } else {
        setIsEditing(true) // Start in edit mode if no profile exists
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Create profile hash from form data
      const profileHash = JSON.stringify(formData)

      if (profileExists) {
        await updateProfile(profileHash)
      } else {
        await createProfile(profileHash)
        setProfileExists(true)
      }

      setIsEditing(false)
      await loadProfile() // Reload profile data
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (profile) {
      // Restore original data
      try {
        const profileInfo = JSON.parse(profile.profileHash)
        setFormData(profileInfo)
      } catch (error) {
        console.error('Error restoring profile data:', error)
      }
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to view your profile.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <User className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profileExists ? 'Your Profile' : 'Create Your Profile'}
              </h1>
              <p className="text-gray-600">
                {profileExists
                  ? 'Manage your blockchain professional profile'
                  : 'Set up your blockchain professional profile'
                }
              </p>
            </div>
          </div>

          {profileExists && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* Profile Status */}
        {profile && (
          <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${profile.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm font-medium">
                {profile.isVerified ? 'Verified Profile' : 'Pending Verification'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Created: {new Date(Number(profile.createdAt) * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Profile Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="input"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="label">Professional Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="input"
                placeholder="e.g., Software Engineer, Data Scientist"
              />
            </div>

            <div>
              <label className="label">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="input"
                placeholder="City, Country"
              />
            </div>

            <div>
              <label className="label">Website</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="input"
                placeholder="https://your-website.com"
              />
            </div>

            <div>
              <label className="label">GitHub</label>
              <input
                type="text"
                name="github"
                value={formData.github}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="input"
                placeholder="github.com/username"
              />
            </div>

            <div>
              <label className="label">LinkedIn</label>
              <input
                type="text"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="input"
                placeholder="linkedin.com/in/username"
              />
            </div>
          </div>

          <div>
            <label className="label">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              disabled={!isEditing}
              rows={4}
              className="input"
              placeholder="Tell us about yourself, your experience, and your goals..."
            />
          </div>

          <div>
            <label className="label">Skills (comma-separated)</label>
            <textarea
              name="skills"
              value={formData.skills}
              onChange={handleInputChange}
              disabled={!isEditing}
              rows={3}
              className="input"
              placeholder="JavaScript, React, Node.js, Python, Machine Learning, etc."
            />
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex items-center space-x-4 pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : (profileExists ? 'Update Profile' : 'Create Profile')}</span>
              </button>

              {profileExists && (
                <button
                  onClick={handleCancel}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Blockchain Info */}
      {profile && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Blockchain Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Profile Address:</span>
              <p className="font-mono text-gray-600 break-all">{profile.userAddress}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <p className="text-gray-600">{profile.isActive ? 'Active' : 'Inactive'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <p className="text-gray-600">{new Date(Number(profile.createdAt) * 1000).toLocaleString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <p className="text-gray-600">{new Date(Number(profile.updatedAt) * 1000).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile