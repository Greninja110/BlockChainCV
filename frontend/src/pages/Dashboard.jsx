import React, { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { useContract } from '../context/ContractContext'
import { User, GraduationCap, Award, Briefcase, Trophy, Shield, Plus, Eye, Users, Building2, FileCheck } from 'lucide-react'

const Dashboard = () => {
  const { account, isConnected } = useWallet()
  const { contracts, hasProfile, getProfile, getEducationRecords, getCertifications, getWorkExperiences, getAchievements } = useContract()

  const [userRole, setUserRole] = useState(null)
  const [profileExists, setProfileExists] = useState(false)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    education: 0,
    certifications: 0,
    experience: 0,
    achievements: 0
  })
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    students: 0,
    institutions: 0,
    employers: 0,
    certifiers: 0,
    organizers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isConnected && account && contracts.userRegistry) {
      loadDashboardData()
    }
  }, [isConnected, account, contracts])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Get user role
      const role = await contracts.userRegistry.getUserRole(account)
      setUserRole(Number(role))

      // If admin, load admin stats
      if (Number(role) === 1) {
        await loadAdminStats()
      } else {
        // For non-admin users, load their profile data
        const profileExists = await hasProfile(account)
        setProfileExists(profileExists)

        if (profileExists) {
          const profileData = await getProfile(account)
          setProfile(profileData)

          const [education, certifications, experience, achievements] = await Promise.all([
            getEducationRecords(account),
            getCertifications(account),
            getWorkExperiences(account),
            getAchievements(account)
          ])

          setStats({
            education: education.length,
            certifications: certifications.length,
            experience: experience.length,
            achievements: achievements.length
          })
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAdminStats = async () => {
    try {
      const totalUsers = await contracts.userRegistry.getTotalUsers()

      // Get users by role
      const [students, institutions, certifiers, employers, organizers] = await Promise.all([
        contracts.userRegistry.getUsersByRole(2), // STUDENT
        contracts.userRegistry.getUsersByRole(3), // INSTITUTION
        contracts.userRegistry.getUsersByRole(4), // CERTIFIER
        contracts.userRegistry.getUsersByRole(5), // EMPLOYER
        contracts.userRegistry.getUsersByRole(6)  // ORGANIZER
      ])

      setAdminStats({
        totalUsers: Number(totalUsers),
        students: students.length,
        institutions: institutions.length,
        certifiers: certifiers.length,
        employers: employers.length,
        organizers: organizers.length
      })
    } catch (error) {
      console.error('Error loading admin stats:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600 mb-6">
          Please connect your wallet to access your blockchain professional profile.
        </p>
        <div className="bg-blue-50 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="font-semibold text-blue-900 mb-2">Why Connect?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Secure, tamper-proof professional records</li>
            <li>• Verified education and certifications</li>
            <li>• Transparent work experience tracking</li>
            <li>• Immutable achievement records</li>
          </ul>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    )
  }

  // ADMIN DASHBOARD
  if (userRole === 1) {
    return (
      <div className="space-y-8">
        {/* Admin Welcome Header */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-xl text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-red-100">
                System overview and user management
              </p>
            </div>
            <Shield className="h-16 w-16 text-red-200" />
          </div>
        </div>

        {/* Admin Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{adminStats.totalUsers}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <a
                href="/admin/users"
                className="inline-flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Eye className="h-4 w-4" />
                <span>Manage Users</span>
              </a>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Students</p>
                <p className="text-3xl font-bold text-gray-900">{adminStats.students}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <User className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Institutions</p>
                <p className="text-3xl font-bold text-gray-900">{adminStats.institutions}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Employers</p>
                <p className="text-3xl font-bold text-gray-900">{adminStats.employers}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100">
                <Briefcase className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Certifiers</p>
                <p className="text-3xl font-bold text-gray-900">{adminStats.certifiers}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <FileCheck className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Organizers</p>
                <p className="text-3xl font-bold text-gray-900">{adminStats.organizers}</p>
              </div>
              <div className="p-3 rounded-lg bg-pink-100">
                <Trophy className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Admin Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/admin/users"
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200"
            >
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <h4 className="font-medium text-gray-900">Manage Users</h4>
                <p className="text-sm text-gray-600">Register and manage users</p>
              </div>
            </a>

            <a
              href="/education"
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors duration-200"
            >
              <GraduationCap className="h-8 w-8 text-green-600" />
              <div>
                <h4 className="font-medium text-gray-900">Education Records</h4>
                <p className="text-sm text-gray-600">View all education records</p>
              </div>
            </a>

            <a
              href="/certifications"
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors duration-200"
            >
              <Award className="h-8 w-8 text-purple-600" />
              <div>
                <h4 className="font-medium text-gray-900">Certifications</h4>
                <p className="text-sm text-gray-600">View all certifications</p>
              </div>
            </a>

            <a
              href="/blockchain"
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors duration-200"
            >
              <Shield className="h-8 w-8 text-yellow-600" />
              <div>
                <h4 className="font-medium text-gray-900">Blockchain</h4>
                <p className="text-sm text-gray-600">View blockchain data</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // INSTITUTION DASHBOARD (Role 3)
  if (userRole === 3) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Institution Dashboard</h1>
              <p className="text-green-100">
                Manage and add education records for students
              </p>
            </div>
            <GraduationCap className="h-16 w-16 text-green-200" />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/education"
              className="flex items-center space-x-3 p-6 rounded-lg border-2 border-green-300 hover:bg-green-50 transition-colors duration-200"
            >
              <GraduationCap className="h-10 w-10 text-green-600" />
              <div>
                <h4 className="font-medium text-gray-900 text-lg">Manage Education Records</h4>
                <p className="text-sm text-gray-600">Add and view education records for students</p>
              </div>
            </a>
            <a
              href="/profile"
              className="flex items-center space-x-3 p-6 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
              <User className="h-10 w-10 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900 text-lg">Institution Profile</h4>
                <p className="text-sm text-gray-600">View and update your institution profile</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // CERTIFIER DASHBOARD (Role 4)
  if (userRole === 4) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Certifier Dashboard</h1>
              <p className="text-purple-100">
                Issue and manage professional certifications
              </p>
            </div>
            <Award className="h-16 w-16 text-purple-200" />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/certifications"
              className="flex items-center space-x-3 p-6 rounded-lg border-2 border-purple-300 hover:bg-purple-50 transition-colors duration-200"
            >
              <Award className="h-10 w-10 text-purple-600" />
              <div>
                <h4 className="font-medium text-gray-900 text-lg">Manage Certifications</h4>
                <p className="text-sm text-gray-600">Issue and view certifications</p>
              </div>
            </a>
            <a
              href="/profile"
              className="flex items-center space-x-3 p-6 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
              <User className="h-10 w-10 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900 text-lg">Organization Profile</h4>
                <p className="text-sm text-gray-600">View and update your organization profile</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // EMPLOYER DASHBOARD (Role 5)
  if (userRole === 5) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Employer Dashboard</h1>
              <p className="text-orange-100">
                Manage employee work experience records
              </p>
            </div>
            <Briefcase className="h-16 w-16 text-orange-200" />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/experience"
              className="flex items-center space-x-3 p-6 rounded-lg border-2 border-orange-300 hover:bg-orange-50 transition-colors duration-200"
            >
              <Briefcase className="h-10 w-10 text-orange-600" />
              <div>
                <h4 className="font-medium text-gray-900 text-lg">Manage Experience Records</h4>
                <p className="text-sm text-gray-600">Add and view employee work experience</p>
              </div>
            </a>
            <a
              href="/profile"
              className="flex items-center space-x-3 p-6 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
              <User className="h-10 w-10 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900 text-lg">Company Profile</h4>
                <p className="text-sm text-gray-600">View and update your company profile</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ORGANIZER DASHBOARD (Role 6)
  if (userRole === 6) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-yellow-600 to-pink-600 rounded-xl text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Organizer Dashboard</h1>
              <p className="text-yellow-100">
                Manage participant achievements and awards
              </p>
            </div>
            <Trophy className="h-16 w-16 text-yellow-200" />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/achievements"
              className="flex items-center space-x-3 p-6 rounded-lg border-2 border-yellow-300 hover:bg-yellow-50 transition-colors duration-200"
            >
              <Trophy className="h-10 w-10 text-yellow-600" />
              <div>
                <h4 className="font-medium text-gray-900 text-lg">Manage Achievements</h4>
                <p className="text-sm text-gray-600">Add and view participant achievements</p>
              </div>
            </a>
            <a
              href="/profile"
              className="flex items-center space-x-3 p-6 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
              <User className="h-10 w-10 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900 text-lg">Organization Profile</h4>
                <p className="text-sm text-gray-600">View and update your organization profile</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // STUDENT/USER DASHBOARD
  if (!profileExists) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Profile</h2>
        <p className="text-gray-600 mb-6">
          You don't have a blockchain profile yet. Create one to start building your professional credentials.
        </p>
        <a
          href="/profile"
          className="inline-flex items-center space-x-2 btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          <span>Create Profile</span>
        </a>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Education Records',
      count: stats.education,
      icon: GraduationCap,
      bgClass: 'bg-blue-100',
      iconClass: 'text-blue-600',
      link: '/education'
    },
    {
      title: 'Certifications',
      count: stats.certifications,
      icon: Award,
      bgClass: 'bg-green-100',
      iconClass: 'text-green-600',
      link: '/certifications'
    },
    {
      title: 'Work Experience',
      count: stats.experience,
      icon: Briefcase,
      bgClass: 'bg-purple-100',
      iconClass: 'text-purple-600',
      link: '/experience'
    },
    {
      title: 'Achievements',
      count: stats.achievements,
      icon: Trophy,
      bgClass: 'bg-yellow-100',
      iconClass: 'text-yellow-600',
      link: '/achievements'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome to Your Blockchain Profile</h1>
            <p className="text-blue-100">
              Your professional credentials, secured and verified on the blockchain
            </p>
            <div className="flex items-center space-x-2 mt-4">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${profile?.isVerified ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                <span className="text-sm">
                  {profile?.isVerified ? 'Verified Profile' : 'Pending Verification'}
                </span>
              </div>
            </div>
          </div>
          <Shield className="h-16 w-16 text-blue-200" />
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgClass}`}>
                  <Icon className={`h-6 w-6 ${stat.iconClass}`} />
                </div>
              </div>
              <div className="mt-4">
                <a
                  href={stat.link}
                  className="inline-flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Details</span>
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <p className="text-sm text-gray-600 mb-4">Note: Only authorized institutions can add records to your profile</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/education"
            className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200"
          >
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">View Education</h4>
              <p className="text-sm text-gray-600">See your academic records</p>
            </div>
          </a>

          <a
            href="/certifications"
            className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors duration-200"
          >
            <Award className="h-8 w-8 text-green-600" />
            <div>
              <h4 className="font-medium text-gray-900">View Certifications</h4>
              <p className="text-sm text-gray-600">See your certifications</p>
            </div>
          </a>

          <a
            href="/experience"
            className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors duration-200"
          >
            <Briefcase className="h-8 w-8 text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">View Experience</h4>
              <p className="text-sm text-gray-600">See your work history</p>
            </div>
          </a>

          <a
            href="/achievements"
            className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors duration-200"
          >
            <Trophy className="h-8 w-8 text-yellow-600" />
            <div>
              <h4 className="font-medium text-gray-900">View Achievements</h4>
              <p className="text-sm text-gray-600">See your accomplishments</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
