const hre = require("hardhat");

async function main() {
  console.log("Testing UserRegistry contract deployment...\n");

  const userRegistryAddress = "0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab";

  console.log("Contract address:", userRegistryAddress);

  // Get contract instance
  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
  const userRegistry = UserRegistry.attach(userRegistryAddress);

  try {
    // Test 1: Check if contract exists
    const code = await hre.ethers.provider.getCode(userRegistryAddress);
    console.log("\n1. Contract code exists:", code !== "0x" ? "✅ YES" : "❌ NO");

    if (code === "0x") {
      console.log("\n❌ ERROR: No contract deployed at this address!");
      console.log("The contract addresses in the frontend don't match the deployed contracts.");
      console.log("\nPossible reasons:");
      console.log("1. Ganache was restarted and lost the deployed contracts");
      console.log("2. Wrong network");
      console.log("3. Contracts need to be redeployed");
      return;
    }

    // Test 2: Get total users
    const totalUsers = await userRegistry.getTotalUsers();
    console.log("2. Total users registered:", totalUsers.toString(), "✅");

    // Test 3: Check if deployer is registered
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n3. Deployer address:", deployer.address);

    const isDeployerRegistered = await userRegistry.isRegistered(deployer.address);
    console.log("   Deployer is registered:", isDeployerRegistered ? "✅ YES" : "❌ NO");

    if (isDeployerRegistered) {
      const deployerProfile = await userRegistry.getUserProfile(deployer.address);
      console.log("   Deployer name:", deployerProfile.name);
      console.log("   Deployer role:", deployerProfile.role.toString());
      console.log("   Deployer is active:", deployerProfile.isActive);
    }

    // Test 4: Get all users (requires admin role)
    try {
      const allUsers = await userRegistry.getAllUsers();
      console.log("\n4. All registered users:", allUsers.length);
      for (let i = 0; i < allUsers.length; i++) {
        console.log(`   User ${i + 1}:`, allUsers[i]);
      }
    } catch (error) {
      console.log("\n4. ❌ Error getting all users:", error.message);
    }

    console.log("\n✅ Contract is working correctly!");

  } catch (error) {
    console.error("\n❌ Error testing contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
