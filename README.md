# Blockchain Professional Profile System

A comprehensive blockchain-based professional profile system that creates tamper-proof, verifiable CV/resume records from kindergarten to career progression. This system tracks education, certifications, work experience, and achievements on a private blockchain network.

## 🌟 Features

### Core Functionality
- **Immutable Professional Records**: All data stored on blockchain for tamper-proof verification
- **Complete Career Journey**: Track from kindergarten through PhD, jobs, and career changes
- **Multi-Type Credentials**: Education, certifications, work experience, and achievements
- **Verification System**: Trusted institutions can verify credentials
- **Privacy-Focused**: No personal information stored, only professional data
- **Permission-Based Sharing**: Users control who can view their profiles

### Smart Contracts
1. **ProfileManager** - Main profile management and access control
2. **EducationContract** - Academic records and institutional verification
3. **CertificationContract** - Professional certifications and skills tracking
4. **ExperienceContract** - Work history and performance reviews
5. **AchievementContract** - Projects, awards, competitions, and accomplishments

### Frontend Features
- **React.js Web Interface** - Modern, responsive UI
- **MetaMask Integration** - Secure wallet connection
- **Real-time Verification Status** - Track credential verification
- **Dashboard Overview** - Complete profile statistics
- **Mobile-Friendly Design** - Works on all devices

## 🏗️ Architecture

### Blockchain Layer
- **Consensus Mechanism**: Proof of Authority (PoA)
- **Validators**: Educational institutions, certification bodies, employers
- **Network Type**: Private blockchain for controlled access
- **Smart Contract Platform**: Ethereum-compatible

### Technology Stack
- **Smart Contracts**: Solidity ^0.8.20
- **Development Framework**: Hardhat
- **Frontend**: React.js with Vite
- **Styling**: Tailwind CSS
- **Blockchain Interaction**: Ethers.js
- **State Management**: React Context API
- **Local Development**: Ganache CLI

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- MetaMask browser extension
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blockchain
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm run frontend:install
   ```

3. **Compile smart contracts**
   ```bash
   npm run compile
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## 🔧 Development Setup

### Option 1: Using Hardhat Local Network (Recommended)

1. **Start local blockchain**
   ```bash
   npm run node
   ```

2. **Deploy contracts (in new terminal)**
   ```bash
   npm run deploy:local
   ```

3. **Start frontend (in new terminal)**
   ```bash
   npm run frontend:dev
   ```

4. **Configure MetaMask**
   - Network: Localhost 8545
   - Chain ID: 31337
   - Import one of the test accounts from Hardhat node output

### Option 2: Using Ganache

1. **Start Ganache**
   ```bash
   npm run ganache
   ```

2. **Deploy contracts**
   ```bash
   npm run deploy:ganache
   ```

3. **Start frontend**
   ```bash
   npm run frontend:dev
   ```

4. **Configure MetaMask**
   - Network: Localhost 7545
   - Chain ID: 1337

### Option 3: Development with Auto-reload
```bash
npm run dev
```
This starts both the blockchain node and frontend simultaneously.

## 📋 Usage Guide

### For Students/Professionals

1. **Connect Wallet**: Use MetaMask to connect to the application
2. **Create Profile**: Set up your basic professional information
3. **Add Education**: Record academic achievements from K-12 through higher education
4. **Add Certifications**: Document professional certifications and skills
5. **Add Work Experience**: Track job history and career progression
6. **Add Achievements**: Showcase projects, awards, and accomplishments
7. **Request Verification**: Submit credentials for institutional verification
8. **Share Profile**: Grant access to employers or other authorized viewers

### For Institutions/Employers

1. **Register as Verifier**: Get authorized to verify credentials
2. **Verify Records**: Approve or reject verification requests
3. **Add Employee Records**: Create work experience entries for employees
4. **Issue Certifications**: Grant professional certifications
5. **View Profiles**: Access authorized professional profiles

### For Administrators

1. **Add Verifiers**: Authorize institutions and organizations
2. **Manage Network**: Control network access and permissions
3. **Monitor Verification**: Oversee verification processes

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Files
```bash
npx hardhat test test/ProfileManager.test.js
```

### Test Coverage
```bash
npx hardhat coverage
```

## 🚀 Deployment

### Local Deployment
```bash
# Start local network
npm run node

# Deploy contracts
npm run deploy:local
```

### Production Deployment
1. Configure production network in `hardhat.config.js`
2. Set environment variables for private keys
3. Deploy contracts to production network
4. Update frontend contract addresses
5. Build and deploy frontend

## 🛠️ Configuration

### Environment Variables
Create `.env` file in root directory:
```
PRIVATE_KEY=your_private_key_here
INFURA_PROJECT_ID=your_infura_project_id
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Frontend Configuration
Update contract addresses in `frontend/src/context/ContractContext.jsx`:
```javascript
const contractAddresses = {
  ProfileManager: "deployed_contract_address",
  EducationContract: "deployed_contract_address",
  // ... other contracts
}
```

## 📁 Project Structure

```
blockchain/
├── contracts/              # Smart contracts
│   ├── ProfileManager.sol
│   ├── EducationContract.sol
│   ├── CertificationContract.sol
│   ├── ExperienceContract.sol
│   └── AchievementContract.sol
├── scripts/                # Deployment scripts
│   └── deploy.js
├── test/                   # Contract tests
│   └── ProfileManager.test.js
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React contexts
│   │   └── contracts/      # Contract ABIs
│   ├── public/
│   └── package.json
├── hardhat.config.js       # Hardhat configuration
├── package.json
└── README.md
```

## 🔒 Security Features

- **Access Control**: Role-based permissions for different user types
- **Verification System**: Multi-signature verification from trusted institutions
- **Privacy Protection**: No personal information stored on blockchain
- **Tamper-Proof Records**: Immutable blockchain storage
- **Audit Trail**: Complete history of all changes and verifications

## 🌐 Consensus Mechanism

### Proof of Authority (PoA)
- **Fast Transactions**: 2-3 second block times
- **Energy Efficient**: No mining required
- **Controlled Network**: Only authorized validators
- **Institutional Validators**: Universities, certification bodies, employers

### Validator Types
1. **Educational Institutions**: Universities, schools, training centers
2. **Certification Bodies**: Professional organizations, online platforms
3. **Employers**: Companies for work experience verification
4. **Government Bodies**: For official certifications and licenses

## 📊 Benefits

### For Job Seekers
- **Instant Verification**: Employers can immediately verify credentials
- **Complete History**: Comprehensive professional journey
- **Fraud Prevention**: Tamper-proof records eliminate resume fraud
- **Privacy Control**: Share only relevant information
- **Global Recognition**: Blockchain credentials work worldwide

### For Employers
- **Fast Hiring**: Quick credential verification
- **Reduced Risk**: Verified candidate information
- **Comprehensive View**: Complete professional history
- **Cost Savings**: Reduced background check costs

### For Institutions
- **Digital Credentials**: Issue tamper-proof certificates
- **Reduced Admin**: Automated verification process
- **Global Reach**: International recognition
- **Brand Protection**: Prevent credential fraud

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and ensure they pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Open an issue on GitHub
- Check the documentation
- Review test files for usage examples

## 🔮 Future Enhancements

- **IPFS Integration**: Store large documents off-chain
- **Mobile App**: Native mobile applications
- **AI Integration**: Smart credential analysis
- **Multi-language Support**: International accessibility
- **API Endpoints**: Third-party integrations
- **Advanced Analytics**: Career progression insights