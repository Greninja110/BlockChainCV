const hre = require("hardhat");

async function main() {
  console.log("Starting deployment of Professional Profile Blockchain System...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy UserRegistry FIRST
  console.log("\n1. Deploying UserRegistry...");
  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  console.log("UserRegistry deployed to:", await userRegistry.getAddress());
  console.log("✅ Deployer registered as ADMIN");

  // Deploy ProfileManager
  console.log("\n2. Deploying ProfileManager...");
  const ProfileManager = await hre.ethers.getContractFactory("ProfileManager");
  const profileManager = await ProfileManager.deploy();
  await profileManager.waitForDeployment();
  console.log("ProfileManager deployed to:", await profileManager.getAddress());

  // Deploy EducationContract
  console.log("\n3. Deploying EducationContract...");
  const EducationContract = await hre.ethers.getContractFactory("EducationContract");
  const educationContract = await EducationContract.deploy();
  await educationContract.waitForDeployment();
  console.log("EducationContract deployed to:", await educationContract.getAddress());

  // Deploy CertificationContract
  console.log("\n4. Deploying CertificationContract...");
  const CertificationContract = await hre.ethers.getContractFactory("CertificationContract");
  const certificationContract = await CertificationContract.deploy();
  await certificationContract.waitForDeployment();
  console.log("CertificationContract deployed to:", await certificationContract.getAddress());

  // Deploy ExperienceContract
  console.log("\n5. Deploying ExperienceContract...");
  const ExperienceContract = await hre.ethers.getContractFactory("ExperienceContract");
  const experienceContract = await ExperienceContract.deploy();
  await experienceContract.waitForDeployment();
  console.log("ExperienceContract deployed to:", await experienceContract.getAddress());

  // Deploy AchievementContract
  console.log("\n6. Deploying AchievementContract...");
  const AchievementContract = await hre.ethers.getContractFactory("AchievementContract");
  const achievementContract = await AchievementContract.deploy();
  await achievementContract.waitForDeployment();
  console.log("AchievementContract deployed to:", await achievementContract.getAddress());

  // Save deployment addresses
  const deploymentInfo = {
    deployer: deployer.address,
    network: hre.network.name,
    deploymentTime: new Date().toISOString(),
    contracts: {
      UserRegistry: await userRegistry.getAddress(),
      ProfileManager: await profileManager.getAddress(),
      EducationContract: await educationContract.getAddress(),
      CertificationContract: await certificationContract.getAddress(),
      ExperienceContract: await experienceContract.getAddress(),
      AchievementContract: await achievementContract.getAddress()
    }
  };

  // Write deployment info to file
  const fs = require('fs');
  const path = require('path');

  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}-deployment.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✅ All contracts deployed successfully!");
  console.log("📄 Deployment info saved to:", `deployments/${hre.network.name}-deployment.json`);

  console.log("\n📋 Contract Addresses Summary:");
  console.log("==========================================");
  Object.entries(deploymentInfo.contracts).forEach(([name, address]) => {
    console.log(`${name}: ${address}`);
  });
  console.log("==========================================");

  // Optional: Verify contracts on etherscan (if not local network)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\n🔍 Starting contract verification...");
    try {
      await hre.run("verify:verify", {
        address: await profileManager.getAddress(),
        constructorArguments: [],
      });
      console.log("ProfileManager verified ✅");
    } catch (error) {
      console.log("Verification error:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:");
    console.error(error);
    process.exit(1);
  });