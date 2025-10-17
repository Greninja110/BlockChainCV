const hre = require("hardhat");

async function main() {
  console.log("Setting up roles for testing...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load deployed contract addresses
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '../deployments/localhost-deployment.json');

  if (!fs.existsSync(deploymentFile)) {
    console.error("Deployment file not found. Please deploy contracts first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  console.log("\nUsing deployed contracts:");
  console.log("EducationContract:", deployment.contracts.EducationContract);
  console.log("CertificationContract:", deployment.contracts.CertificationContract);
  console.log("ExperienceContract:", deployment.contracts.ExperienceContract);
  console.log("AchievementContract:", deployment.contracts.AchievementContract);

  // Get contract instances
  const EducationContract = await hre.ethers.getContractFactory("EducationContract");
  const educationContract = EducationContract.attach(deployment.contracts.EducationContract);

  const CertificationContract = await hre.ethers.getContractFactory("CertificationContract");
  const certificationContract = CertificationContract.attach(deployment.contracts.CertificationContract);

  const ExperienceContract = await hre.ethers.getContractFactory("ExperienceContract");
  const experienceContract = ExperienceContract.attach(deployment.contracts.ExperienceContract);

  const AchievementContract = await hre.ethers.getContractFactory("AchievementContract");
  const achievementContract = AchievementContract.attach(deployment.contracts.AchievementContract);

  // Register deployer as institution in EducationContract
  console.log("\n1. Registering as institution in EducationContract...");
  try {
    const tx1 = await educationContract.registerInstitution(
      "Test Institution",
      "TEST-001",
      "India"
    );
    await tx1.wait();
    console.log("✅ Registered as institution in EducationContract");
  } catch (error) {
    if (error.message.includes("Institution already registered")) {
      console.log("✅ Already registered as institution in EducationContract");
    } else {
      console.error("❌ Error:", error.message);
    }
  }

  // Register deployer as certifier in CertificationContract
  console.log("\n2. Registering as certifier in CertificationContract...");
  try {
    const tx2 = await certificationContract.registerCertifier(
      "Test Certifier",
      "https://test.com",
      "CERT-001"
    );
    await tx2.wait();
    console.log("✅ Registered as certifier in CertificationContract");
  } catch (error) {
    if (error.message.includes("Certifier already registered")) {
      console.log("✅ Already registered as certifier in CertificationContract");
    } else {
      console.error("❌ Error:", error.message);
    }
  }

  // Register deployer as employer in ExperienceContract
  console.log("\n3. Registering as employer in ExperienceContract...");
  try {
    const tx3 = await experienceContract.registerEmployer(
      "Test Company",
      "Technology",
      "EMP-001",
      "https://testcompany.com",
      "India"
    );
    await tx3.wait();
    console.log("✅ Registered as employer in ExperienceContract");
  } catch (error) {
    if (error.message.includes("Employer already registered")) {
      console.log("✅ Already registered as employer in ExperienceContract");
    } else {
      console.error("❌ Error:", error.message);
    }
  }

  // Register deployer as organizer in AchievementContract
  console.log("\n4. Registering as organizer in AchievementContract...");
  try {
    const tx4 = await achievementContract.registerOrganizer(
      "Test Organizer",
      "Educational",
      "https://testorg.com",
      "ORG-001"
    );
    await tx4.wait();
    console.log("✅ Registered as organizer in AchievementContract");
  } catch (error) {
    if (error.message.includes("Organizer already registered")) {
      console.log("✅ Already registered as organizer in AchievementContract");
    } else {
      console.error("❌ Error:", error.message);
    }
  }

  console.log("\n✅ All roles setup complete!");
  console.log("\nYour address (" + deployer.address + ") can now:");
  console.log("  - Add education records");
  console.log("  - Issue certifications");
  console.log("  - Add work experience");
  console.log("  - Add achievements");
  console.log("\nNote: Students can now add records for themselves using this address.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error setting up roles:");
    console.error(error);
    process.exit(1);
  });