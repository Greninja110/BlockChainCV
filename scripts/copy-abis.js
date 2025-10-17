const fs = require('fs');
const path = require('path');

const contracts = [
  'UserRegistry',
  'ProfileManager',
  'EducationContract',
  'CertificationContract',
  'ExperienceContract',
  'AchievementContract'
];

const artifactsDir = path.join(__dirname, '../artifacts/contracts');
const frontendContractsDir = path.join(__dirname, '../frontend/src/contracts');

// Create frontend contracts directory if it doesn't exist
if (!fs.existsSync(frontendContractsDir)) {
  fs.mkdirSync(frontendContractsDir, { recursive: true });
}

console.log('Copying contract ABIs to frontend...\n');

contracts.forEach(contractName => {
  const sourcePath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
  const destPath = path.join(frontendContractsDir, `${contractName}.json`);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied ${contractName}.json`);
  } else {
    console.log(`❌ ${contractName}.json not found at ${sourcePath}`);
  }
});

console.log('\n✅ All ABIs copied successfully!');
