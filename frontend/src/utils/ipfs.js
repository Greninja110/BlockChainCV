import axios from 'axios'

// Pinata API configuration
// For production, store these in .env file
const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY || 'your_pinata_api_key'
const PINATA_SECRET_KEY = process.env.REACT_APP_PINATA_SECRET_KEY || 'your_pinata_secret_key'

/**
 * Upload file to IPFS via Pinata
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - IPFS hash
 */
export const uploadToIPFS = async (file) => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const metadata = JSON.stringify({
      name: file.name,
    })
    formData.append('pinataMetadata', metadata)

    const options = JSON.stringify({
      cidVersion: 0,
    })
    formData.append('pinataOptions', options)

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        }
      }
    )

    return response.data.IpfsHash
  } catch (error) {
    console.error('Error uploading file to IPFS:', error)
    throw new Error('Failed to upload file to IPFS')
  }
}

/**
 * Get IPFS file URL from hash
 * @param {string} ipfsHash - The IPFS hash
 * @returns {string} - Public IPFS gateway URL
 */
export const getIPFSUrl = (ipfsHash) => {
  if (!ipfsHash) return null
  return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
}

/**
 * Upload file to IPFS with fallback to mock (for testing without API keys)
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - IPFS hash (or mock hash)
 */
export const uploadToIPFSWithFallback = async (file) => {
  // If no API keys configured, use mock hash for testing
  if (PINATA_API_KEY === 'your_pinata_api_key') {
    console.warn('Pinata API keys not configured. Using mock IPFS hash for testing.')
    // Generate a mock hash based on file name and size
    const mockHash = `Qm${btoa(file.name + file.size).substring(0, 44)}`
    return mockHash
  }

  return uploadToIPFS(file)
}
