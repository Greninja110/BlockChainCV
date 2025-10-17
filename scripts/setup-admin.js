const hre = require("hardhat");

async function main() {
  console.log("Setting up admin account...");

  // The admin address you want to register
  const ADMIN_ADDRESS = "0x39c067F6EEa98dF2585F3E47582905D21e0cdF7a";

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using deployer account:", deployer.address);

  // Load deployed contract addresses
  const fs = require('fs');
  const path = require('path');
  // Determine which deployment file to use based on network
  const network = hre.network.name;
  const deploymentFile = path.join(__dirname, `../deployments/${network}-deployment.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please deploy contracts first.");
    console.error(`   Run: npm run deploy:${network}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  console.log("\nUsing UserRegistry at:", deployment.contracts.UserRegistry);

  // Get UserRegistry contract instance
  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
  const userRegistry = UserRegistry.attach(deployment.contracts.UserRegistry);

  // Check if deployer is already admin (should be from constructor)
  const deployerIsRegistered = await userRegistry.isRegistered(deployer.address);
  console.log("\nDeployer registered:", deployerIsRegistered);

  // Check if your address is already registered
  const isAlreadyRegistered = await userRegistry.isRegistered(ADMIN_ADDRESS);

  if (isAlreadyRegistered) {
    console.log(`\n✅ Address ${ADMIN_ADDRESS} is already registered!`);
    const profile = await userRegistry.getUserProfile(ADMIN_ADDRESS);
    console.log("   Role:", Number(profile.role));
    console.log("   Name:", profile.name);
    console.log("   Active:", profile.isActive);
    process.exit(0);
  }

  // Register your address as ADMIN
  console.log(`\n📝 Registering ${ADMIN_ADDRESS} as ADMIN...`);

  try {
    const tx = await userRegistry.registerUser(
      ADMIN_ADDRESS,
      1, // UserRole.ADMIN
      "System Administrator",
      "BlockchainCV Admin",
      ""
    );

    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");

    await tx.wait();

    console.log("\n✅ Admin account registered successfully!");
    console.log(`\nYou can now:`);
    console.log(`1. Connect MetaMask with address: ${ADMIN_ADDRESS}`);
    console.log(`2. Access the admin panel at: http://localhost:3000/admin/users`);
    console.log(`3. Start registering other users!`);

  } catch (error) {
    console.error("\n❌ Error registering admin:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error setting up admin:");
    console.error(error);
    process.exit(1);
  });
