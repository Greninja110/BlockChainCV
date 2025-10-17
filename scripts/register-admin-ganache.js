const hre = require("hardhat");

async function main() {
  console.log("\n🔧 Registering Ganache Account #0 as ADMIN...\n");

  const USER_REGISTRY_ADDRESS = "0x8E7a8d3CAeEbbe9A92faC4db19424218aE6791a3";
  const GANACHE_ACCOUNT_0 = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Registering:", GANACHE_ACCOUNT_0);

  const UserRegistry = await hre.ethers.getContractAt("UserRegistry", USER_REGISTRY_ADDRESS);

  // Check if already registered
  const isRegistered = await UserRegistry.isRegistered(GANACHE_ACCOUNT_0);
  console.log("Already registered?", isRegistered);

  if (!isRegistered) {
    console.log("\n⏳ Registering as ADMIN (role 1)...");
    
    const tx = await UserRegistry.registerUser(
      GANACHE_ACCOUNT_0,
      "System Administrator",
      "admin@blockchain.com",
      1  // ADMIN role
    );
    
    await tx.wait();
    console.log("✅ Registered successfully!");
  } else {
    console.log("✅ Already registered");
  }

  // Verify registration
  const profile = await UserRegistry.getUserProfile(GANACHE_ACCOUNT_0);
  console.log("\n📊 User Profile:");
  console.log("  Name:", profile.name);
  console.log("  Email:", profile.email);
  console.log("  Role:", Number(profile.role));
  console.log("  Active:", profile.isActive);

  console.log("\n✨ Setup complete! You can now login.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
