const hre = require("hardhat");

async function main() {
  console.log("\n🎯 Setting up Organizer Role and Registration...\n");

  const ACHIEVEMENT_CONTRACT = "0x01c4052ac7EEF0cbDdc83F3780149D52D4174776";
  const ORGANIZER_ADDRESS = "0x111E2f99FE20fBdC0042B811a2fF5CfEBf7c7D55";

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);

  const AchievementContract = await hre.ethers.getContractAt("AchievementContract", ACHIEVEMENT_CONTRACT);
  const ORGANIZER_ROLE = await AchievementContract.ORGANIZER_ROLE();

  const hasRole = await AchievementContract.hasRole(ORGANIZER_ROLE, ORGANIZER_ADDRESS);
  console.log("Has ORGANIZER_ROLE?", hasRole);

  if (!hasRole) {
    console.log("Granting ORGANIZER_ROLE...");
    const tx = await AchievementContract.grantRole(ORGANIZER_ROLE, ORGANIZER_ADDRESS);
    await tx.wait();
    console.log("✅ ORGANIZER_ROLE granted!");
  }

  const isRegistered = await AchievementContract.isRegisteredOrganizer(ORGANIZER_ADDRESS);
  console.log("Is registered?", isRegistered);

  console.log("\n✅ Setup complete!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
