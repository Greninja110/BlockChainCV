import React from 'react'
import { Shield, X, AlertCircle } from 'lucide-react'

const UnauthorizedModal = ({ isOpen, onClose, walletAddress }) => {
  if (!isOpen) return null

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-red-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white rounded-full p-2">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-white">Access Denied</h3>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6">
            <div className="flex items-start space-x-4 mb-6">
              <div className="bg-red-100 rounded-full p-3 flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Wallet Not Registered
                </h4>
                <p className="text-gray-600 mb-4">
                  The wallet address <span className="font-mono font-semibold text-gray-900">{formatAddress(walletAddress)}</span> is not registered in the system.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Only pre-registered users can access this system. All users must be registered by a system administrator before they can connect.
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <h5 className="font-semibold text-gray-900">To gain access:</h5>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Contact the system administrator</li>
                <li>Provide your wallet address: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{walletAddress}</span></li>
                <li>Wait for admin approval and registration</li>
                <li>Once registered, reconnect your wallet to access the system</li>
              </ol>
            </div>

            {/* Contact Info */}
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-2">Administrator Contact</h5>
              <p className="text-sm text-gray-600">
                Please contact your system administrator or support team to request access to this platform.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnauthorizedModal