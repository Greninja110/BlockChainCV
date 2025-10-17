import React, { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWallet } from './WalletContext'
import toast from 'react-hot-toast'

// Import ABI files (these would be generated after contract compilation)
import UserRegistryABI from '../contracts/UserRegistry.json'
import ProfileManagerABI from '../contracts/ProfileManager.json'
import EducationContractABI from '../contracts/EducationContract.json'
import CertificationContractABI from '../contracts/CertificationContract.json'
import ExperienceContractABI from '../contracts/ExperienceContract.json'
import AchievementContractABI from '../contracts/AchievementContract.json'

const ContractContext = createContext()

export const useContract = () => {
  const context = useContext(ContractContext)
  if (!context) {
    throw new Error('useContract must be used within a ContractProvider')
  }
  return context
}

export const ContractProvider = ({ children }) => {
  const { provider, signer, isConnected } = useWallet()
  const [contracts, setContracts] = useState({})
  const [contractAddresses, setContractAddresses] = useState({
    UserRegistry: process.env.REACT_APP_USER_REGISTRY_ADDRESS || '0x8E7a8d3CAeEbbe9A92faC4db19424218aE6791a3',
    ProfileManager: process.env.REACT_APP_PROFILE_MANAGER_ADDRESS || '0x49bC4443E05f7c05A823920CaD1c9EbaAcD7201E',
    EducationContract: process.env.REACT_APP_EDUCATION_CONTRACT_ADDRESS || '0xBc53027c52B0Ee6ad90347b8D03A719f30d9d7aB',
    CertificationContract: process.env.REACT_APP_CERTIFICATION_CONTRACT_ADDRESS || '0x8c634b72fF5d6A9F6a0281EEF36365E4db8bDF8d',
    ExperienceContract: process.env.REACT_APP_EXPERIENCE_CONTRACT_ADDRESS || '0x959306A913D041D4f634310f6aD3789cBF0e9b18',
    AchievementContract: process.env.REACT_APP_ACHIEVEMENT_CONTRACT_ADDRESS || '0x01c4052ac7EEF0cbDdc83F3780149D52D4174776'
  })

  // Initialize contracts when wallet is connected
  useEffect(() => {
    if (isConnected && signer) {
      initializeContracts()
    }
  }, [isConnected, signer])

  const initializeContracts = async () => {
    try {
      const contractInstances = {}

      // Initialize UserRegistry
      if (UserRegistryABI) {
        contractInstances.userRegistry = new ethers.Contract(
          contractAddresses.UserRegistry,
          UserRegistryABI.abi,
          signer
        )
      }

      // Initialize ProfileManager
      if (ProfileManagerABI) {
        contractInstances.profileManager = new ethers.Contract(
          contractAddresses.ProfileManager,
          ProfileManagerABI.abi,
          signer
        )
      }

      // Initialize EducationContract
      if (EducationContractABI) {
        contractInstances.educationContract = new ethers.Contract(
          contractAddresses.EducationContract,
          EducationContractABI.abi,
          signer
        )
      }

      // Initialize CertificationContract
      if (CertificationContractABI) {
        contractInstances.certificationContract = new ethers.Contract(
          contractAddresses.CertificationContract,
          CertificationContractABI.abi,
          signer
        )
      }

      // Initialize ExperienceContract
      if (ExperienceContractABI) {
        contractInstances.experienceContract = new ethers.Contract(
          contractAddresses.ExperienceContract,
          ExperienceContractABI.abi,
          signer
        )
      }

      // Initialize AchievementContract
      if (AchievementContractABI) {
        contractInstances.achievementContract = new ethers.Contract(
          contractAddresses.AchievementContract,
          AchievementContractABI.abi,
          signer
        )
      }

      setContracts(contractInstances)
      console.log('Contracts initialized successfully')
    } catch (error) {
      console.error('Error initializing contracts:', error)
      toast.error('Failed to initialize contracts')
    }
  }

  // Profile Manager functions
  const createProfile = async (profileHash) => {
    try {
      if (!contracts.profileManager) throw new Error('ProfileManager contract not initialized')

      const tx = await contracts.profileManager.createProfile(profileHash)
      await tx.wait()

      toast.success('Profile created successfully!')
      return tx
    } catch (error) {
      console.error('Error creating profile:', error)
      toast.error('Failed to create profile')
      throw error
    }
  }

  const updateProfile = async (newProfileHash) => {
    try {
      if (!contracts.profileManager) throw new Error('ProfileManager contract not initialized')

      const tx = await contracts.profileManager.updateProfile(newProfileHash)
      await tx.wait()

      toast.success('Profile updated successfully!')
      return tx
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
      throw error
    }
  }

  const getProfile = async (userAddress) => {
    try {
      if (!contracts.profileManager) throw new Error('ProfileManager contract not initialized')

      const profile = await contracts.profileManager.getProfile(userAddress)
      return profile
    } catch (error) {
      console.error('Error getting profile:', error)
      return null
    }
  }

  const hasProfile = async (userAddress) => {
    try {
      if (!contracts.profileManager) throw new Error('ProfileManager contract not initialized')

      const exists = await contracts.profileManager.hasProfile(userAddress)
      return exists
    } catch (error) {
      console.error('Error checking profile existence:', error)
      return false
    }
  }

  // Education Contract functions
  const addEducationRecord = async (recordData) => {
    try {
      if (!contracts.educationContract) throw new Error('EducationContract not initialized')

      const tx = await contracts.educationContract.addEducationRecord(
        recordData.student,
        recordData.degree,
        recordData.fieldOfStudy,
        recordData.level,
        recordData.startDate,
        recordData.endDate,
        recordData.credentialHash
      )
      await tx.wait()

      toast.success('Education record added successfully!')
      return tx
    } catch (error) {
      console.error('Error adding education record:', error)
      toast.error('Failed to add education record')
      throw error
    }
  }

  const getEducationRecords = async (studentAddress) => {
    try {
      if (!contracts.educationContract) throw new Error('EducationContract not initialized')

      const recordIds = await contracts.educationContract.getStudentRecords(studentAddress)
      const records = []

      for (const recordId of recordIds) {
        const record = await contracts.educationContract.getEducationRecord(recordId)
        records.push(record)
      }

      return records
    } catch (error) {
      console.error('Error getting education records:', error)
      return []
    }
  }

  // Certification Contract functions
  const issueCertification = async (certData) => {
    try {
      if (!contracts.certificationContract) throw new Error('CertificationContract not initialized')

      const tx = await contracts.certificationContract.issueCertification(
        certData.holder,
        certData.certificationName,
        certData.skillDomain,
        certData.certType,
        certData.expiryDate,
        certData.credentialHash,
        certData.metadataHash
      )
      await tx.wait()

      toast.success('Certification issued successfully!')
      return tx
    } catch (error) {
      console.error('Error issuing certification:', error)
      toast.error('Failed to issue certification')
      throw error
    }
  }

  const getCertifications = async (holderAddress) => {
    try {
      if (!contracts.certificationContract) throw new Error('CertificationContract not initialized')

      const certIds = await contracts.certificationContract.getHolderCertifications(holderAddress)
      const certifications = []

      for (const certId of certIds) {
        const cert = await contracts.certificationContract.getCertification(certId)
        certifications.push(cert)
      }

      return certifications
    } catch (error) {
      console.error('Error getting certifications:', error)
      return []
    }
  }

  // Experience Contract functions
  const addWorkExperience = async (expData) => {
    try {
      if (!contracts.experienceContract) throw new Error('ExperienceContract not initialized')

      const tx = await contracts.experienceContract.addWorkExperience(
        expData.employee,
        expData.position,
        expData.department,
        expData.jobDescription,
        expData.skills,
        expData.responsibilities,
        expData.empType,
        expData.startDate,
        expData.endDate,
        expData.salary,
        expData.location
      )
      await tx.wait()

      toast.success('Work experience added successfully!')
      return tx
    } catch (error) {
      console.error('Error adding work experience:', error)
      toast.error('Failed to add work experience')
      throw error
    }
  }

  const getWorkExperiences = async (employeeAddress) => {
    try {
      if (!contracts.experienceContract) throw new Error('ExperienceContract not initialized')

      const expIds = await contracts.experienceContract.getEmployeeExperiences(employeeAddress)
      const experiences = []

      for (const expId of expIds) {
        const exp = await contracts.experienceContract.getWorkExperience(expId)
        experiences.push(exp)
      }

      return experiences
    } catch (error) {
      console.error('Error getting work experiences:', error)
      return []
    }
  }

  // Achievement Contract functions
  const addAchievement = async (achData) => {
    try {
      if (!contracts.achievementContract) throw new Error('AchievementContract not initialized')

      const tx = await contracts.achievementContract.addAchievement(
        achData.participant,
        achData.title,
        achData.description,
        achData.achType,
        achData.partType,
        achData.level,
        achData.category,
        achData.eventDate,
        achData.result,
        achData.skills,
        achData.technologies,
        achData.projectUrl,
        achData.certificateHash
      )
      await tx.wait()

      toast.success('Achievement added successfully!')
      return tx
    } catch (error) {
      console.error('Error adding achievement:', error)
      toast.error('Failed to add achievement')
      throw error
    }
  }

  const getAchievements = async (participantAddress) => {
    try {
      if (!contracts.achievementContract) throw new Error('AchievementContract not initialized')

      const achIds = await contracts.achievementContract.getParticipantAchievements(participantAddress)
      const achievements = []

      for (const achId of achIds) {
        const ach = await contracts.achievementContract.getAchievement(achId)
        achievements.push(ach)
      }

      return achievements
    } catch (error) {
      console.error('Error getting achievements:', error)
      return []
    }
  }

  const value = {
    contracts,
    contractAddresses,
    // Profile functions
    createProfile,
    updateProfile,
    getProfile,
    hasProfile,
    // Education functions
    addEducationRecord,
    getEducationRecords,
    // Certification functions
    issueCertification,
    getCertifications,
    // Experience functions
    addWorkExperience,
    getWorkExperiences,
    // Achievement functions
    addAchievement,
    getAchievements,
  }

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  )
}