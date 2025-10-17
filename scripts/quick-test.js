const { ethers } = require("hardhat");

async function main() {
  console.log("Quick Contract Test\n");

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");

  const userRegistryAddress = "0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab";

  console.log("Checking contract at:", userRegistryAddress);

  // Check if contract exists
  const code = await provider.getCode(userRegistryAddress);

  if (code === "0x") {
    console.log("❌ NO CONTRACT DEPLOYED AT THIS ADDRESS!");
    console.log("\nThis means:");
    console.log("1. Ganache was restarted and the database was cleared");
    console.log("2. The contract addresses in the frontend are from an old deployment");
    console.log("\nSOLUTION: Redeploy contracts with: npm run deploy:ganache");
  } else {
    console.log("✅ Contract exists!");
    console.log("Code length:", code.length, "bytes");
  }

  // Check current block number
  const blockNumber = await provider.getBlockNumber();
  console.log("\nCurrent block number:", blockNumber);

  // List recent blocks to see if there are any transactions
  if (blockNumber > 0) {
    const block = await provider.getBlock(blockNumber);
    console.log("Latest block has", block.transactions.length, "transactions");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
