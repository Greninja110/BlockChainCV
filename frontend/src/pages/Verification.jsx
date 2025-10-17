import React from 'react'
import { Shield, CheckCircle, Clock, XCircle } from 'lucide-react'

const Verification = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Verification Center</h1>
          <p className="text-gray-600">Manage verification requests and trusted verifiers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Verification Status Cards */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Verified</h3>
              <p className="text-2xl font-bold text-green-600">0</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pending</h3>
              <p className="text-2xl font-bold text-yellow-600">0</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Rejected</h3>
              <p className="text-2xl font-bold text-red-600">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Requests */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Verification Requests</h2>

        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Verification Requests</h3>
          <p className="text-gray-600 mb-6">
            Verification requests will appear here when institutions verify your credentials.
          </p>
        </div>
      </div>

      {/* How Verification Works */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">How Verification Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Submit Information</h3>
            <p className="text-sm text-gray-600">
              Add your education, certifications, or work experience to your profile.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-blue-600">2</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Institution Verification</h3>
            <p className="text-sm text-gray-600">
              Authorized institutions verify your credentials using blockchain technology.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-blue-600">3</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Permanent Record</h3>
            <p className="text-sm text-gray-600">
              Verified credentials become part of your immutable blockchain record.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Verification