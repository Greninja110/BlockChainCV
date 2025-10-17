const ethers = require('ethers');
const fs = require('fs');

async function main() {
  console.log('🔧 Quick Registration Script\n');

  const provider = new ethers.JsonRpcProvider('http://localhost:7545');
  const privateKey = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Using account:', wallet.address);

  const userRegistryABI = JSON.parse(
    fs.readFileSync('./artifacts/contracts/UserRegistry.sol/UserRegistry.json', 'utf8')
  ).abi;

  const contract = new ethers.Contract(
    '0x8E7a8d3CAeEbbe9A92faC4db19424218aE6791a3',
    userRegistryABI,
    wallet
  );

  const isRegistered = await contract.isRegistered(wallet.address);
  console.log('Already registered?', isRegistered);

  if (!isRegistered) {
    console.log('\n⏳ Registering...');
    const tx = await contract.registerUser(
      wallet.address,
      'System Administrator',
      'admin@blockchain.com',
      1  // ADMIN
    );
    await tx.wait();
    console.log('✅ Registered!');
  }

  const profile = await contract.getUserProfile(wallet.address);
  console.log('\n✅ Profile:', {
    name: profile.name,
    role: Number(profile.role),
    active: profile.isActive
  });
}

main().catch(console.error);
