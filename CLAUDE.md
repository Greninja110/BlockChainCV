# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A blockchain-based professional profile system that creates tamper-proof, verifiable CV/resume records from kindergarten to career progression. Built on a private Proof of Authority (PoA) blockchain with Ethereum-compatible smart contracts.

## Commands

### Building and Testing
```bash
npm run compile              # Compile Solidity contracts
npm test                     # Run all Hardhat tests
npx hardhat test test/ProfileManager.test.js  # Run specific test file
npx hardhat coverage         # Generate test coverage report
npm run clean                # Clean artifacts and cache
```

### Development - Local Blockchain
```bash
npm run node                 # Start Hardhat local node (port 8545)
npm run deploy:local         # Deploy contracts to Hardhat localhost
npm run setup:roles          # IMPORTANT: Setup institutional roles for testing
npm run frontend:install     # Install frontend dependencies
npm run frontend:dev         # Start Vite dev server (frontend)
npm run dev                  # Start both node and frontend concurrently
```

### Development - Ganache
```bash
npm run ganache              # Start Ganache CLI (port 7545)
npm run deploy:ganache       # Deploy contracts to Ganache
```

### Frontend Only
```bash
cd frontend && npm run dev   # Start frontend dev server
cd frontend && npm run build # Build for production
cd frontend && npm run lint  # Lint React code
```

## Architecture

### Smart Contract System

The system uses 5 interconnected smart contracts:

1. **ProfileManager** (`contracts/ProfileManager.sol`)
   - Central registry for user profiles
   - Role-based access control (VERIFIER_ROLE, INSTITUTION_ROLE)
   - Manages verification requests and authorized viewers
   - Uses OpenZeppelin AccessControl, ReentrancyGuard, Pausable

2. **EducationContract** (`contracts/EducationContract.sol`)
   - Stores academic records (K-12, undergraduate, graduate, PhD)
   - Tracks educational institutions and degrees
   - Institution-verified credentials

3. **CertificationContract** (`contracts/CertificationContract.sol`)
   - Professional certifications and skills tracking
   - Issuing organization verification
   - Expiration date management

4. **ExperienceContract** (`contracts/ExperienceContract.sol`)
   - Work history and employment records
   - Company-verified experience entries
   - Performance review tracking

5. **AchievementContract** (`contracts/AchievementContract.sol`)
   - Projects, awards, competitions, and accomplishments
   - Multi-type achievement tracking

### Frontend Architecture

- **React + Vite**: Modern frontend with fast HMR
- **Tailwind CSS**: Utility-first styling
- **Ethers.js v6**: Contract interaction and wallet management
- **React Context API**: State management with two contexts:
  - `WalletContext`: MetaMask connection, wallet state, account management
  - `ContractContext`: Contract instances, transaction management

### Key Frontend Files

- `frontend/src/context/ContractContext.jsx`: Contract initialization, default addresses for localhost deployment
- `frontend/src/context/WalletContext.jsx`: Wallet connection and account handling
- `frontend/src/pages/Dashboard.jsx`: Main profile overview
- `frontend/src/pages/Profile.jsx`: Profile management interface
- `frontend/src/contracts/`: Contract ABIs (generated from compilation)

### Deployment Flow

1. Deployment script (`scripts/deploy.js`) deploys all 5 contracts sequentially
2. Saves deployment addresses to `deployments/{network}-deployment.json`
3. Frontend reads contract addresses from environment variables or hardcoded defaults
4. Default localhost addresses are predefined in `ContractContext.jsx` for Hardhat node

### Contract Addresses Configuration

After deployment, update contract addresses:
- Set environment variables: `REACT_APP_PROFILE_MANAGER_ADDRESS`, etc.
- Or update hardcoded addresses in `frontend/src/context/ContractContext.jsx:26-30`
- Deployment info is automatically saved to `deployments/{network}-deployment.json`

### MetaMask Configuration

**Hardhat Network:**
- URL: http://127.0.0.1:8545
- Chain ID: 31337
- Import test accounts from Hardhat node output

**Ganache Network:**
- URL: http://127.0.0.1:7545
- Chain ID: 1337
- Mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

## Important Notes

- Solidity version: 0.8.20 with optimizer enabled (200 runs) and viaIR compilation
- Uses OpenZeppelin contracts v5.4.0 for security patterns
- All contracts use AccessControl for role-based permissions
- Frontend expects contract ABIs in `frontend/src/contracts/` directory (auto-generated in `artifacts/` after compilation)
- The system is designed for private blockchain with institutional validators (universities, employers, certification bodies)

### Role-Based Access Control & Admin System

**CRITICAL**: This system uses admin-controlled user registration. Only pre-registered addresses can access the system.

#### User Registration Flow:

1. **Admin registers all users** via Admin Panel (`/admin/users`)
2. **Admin assigns roles** to wallet addresses:
   - `ADMIN` - System administrator (can register users)
   - `STUDENT` - Student/job seeker (can view records)
   - `INSTITUTION` - School/university (can add education records)
   - `CERTIFIER` - Certification body (can issue certificates)
   - `EMPLOYER` - Company (can add work experience)
   - `ORGANIZER` - Event organizer (can add achievements)

3. **Users connect wallet** - system checks UserRegistry
4. **If registered** → redirect to role-appropriate dashboard
5. **If NOT registered** → show "Unauthorized" modal, block access

#### Admin Panel Access:

Only addresses registered as `ADMIN` can access `/admin/users`:
- Register new users with roles
- View all registered users
- Search and filter users
- Deactivate/reactivate users

#### First-Time Setup (Create Admin):

**IMPORTANT**: By default, the deployer address (Account #0 from Hardhat) is automatically registered as ADMIN during contract deployment.

To register YOUR MetaMask address as admin:

1. **Edit the admin address** in `scripts/setup-admin.js`:
   ```javascript
   const ADMIN_ADDRESS = "0xYourMetaMaskAddress";
   ```

2. **Run the setup script**:
   ```bash
   npm run setup:admin
   ```

This will register your address as ADMIN with full access to the admin panel.

#### Who Can Add What:

- **Education records**: Only INSTITUTION role
- **Certifications**: Only CERTIFIER role
- **Work experience**: Only EMPLOYER role
- **Achievements**: Only ORGANIZER role
- **View own records**: STUDENT role (and the record owner)

Students CANNOT add their own records - they must be added by verified institutions/organizations.