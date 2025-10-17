import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { Clock, Database, Hash, User, FileText, Layers, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const BlockchainVisualizer = () => {
  const { provider } = useWallet();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [contractAddresses] = useState({
    ProfileManager: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    EducationContract: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    CertificationContract: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    ExperienceContract: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    AchievementContract: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'
  });

  useEffect(() => {
    if (provider) {
      fetchBlocks();

      if (autoRefresh) {
        const interval = setInterval(fetchBlocks, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [provider, autoRefresh]);

  const fetchBlocks = async () => {
    try {
      if (!provider) return;

      const blockNumber = await provider.getBlockNumber();
      setCurrentBlock(blockNumber);

      // Fetch last 10 blocks
      const blockPromises = [];
      const startBlock = Math.max(0, blockNumber - 9);

      for (let i = blockNumber; i >= startBlock; i--) {
        blockPromises.push(fetchBlockWithTransactions(i));
      }

      const fetchedBlocks = await Promise.all(blockPromises);
      setBlocks(fetchedBlocks.filter(b => b !== null));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching blocks:', error);
      toast.error('Failed to fetch blockchain data');
      setLoading(false);
    }
  };

  const fetchBlockWithTransactions = async (blockNumber) => {
    try {
      const block = await provider.getBlock(blockNumber, true);
      if (!block) return null;

      const transactionsWithDetails = await Promise.all(
        block.transactions.map(async (txHash) => {
          try {
            const tx = typeof txHash === 'string'
              ? await provider.getTransaction(txHash)
              : txHash;

            const receipt = await provider.getTransactionReceipt(tx.hash);

            return {
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              gasUsed: receipt?.gasUsed || 0,
              status: receipt?.status,
              data: tx.data,
              functionName: decodeFunctionName(tx.data),
              contractType: identifyContract(tx.to),
              logs: receipt?.logs || []
            };
          } catch (err) {
            console.error('Error fetching transaction:', err);
            return null;
          }
        })
      );

      return {
        number: block.number,
        hash: block.hash,
        timestamp: block.timestamp,
        transactions: transactionsWithDetails.filter(t => t !== null),
        miner: block.miner,
        gasUsed: block.gasUsed,
        gasLimit: block.gasLimit
      };
    } catch (error) {
      console.error(`Error fetching block ${blockNumber}:`, error);
      return null;
    }
  };

  const decodeFunctionName = (data) => {
    if (!data || data === '0x') return 'Transfer';

    const functionSignatures = {
      '0x9e6c8d4f': 'createProfile',
      '0x2f54bf6e': 'updateProfile',
      '0xa8d4f4b5': 'addEducationRecord',
      '0xf851a440': 'addVerifier',
      '0xc3bbd2d7': 'updateGrade',
      '0x5c19a95c': 'verifyEducationRecord',
      '0x8a8c523c': 'issueCertification',
      '0xb5c645bd': 'addWorkExperience',
      '0xe2c0c3e6': 'addAchievement',
      '0x1e89d545': 'requestVerification',
      '0x9a7c4b7f': 'approveVerification'
    };

    const selector = data.slice(0, 10);
    return functionSignatures[selector] || 'Unknown Function';
  };

  const identifyContract = (address) => {
    if (!address) return 'Unknown';

    const lowerAddress = address.toLowerCase();
    for (const [name, addr] of Object.entries(contractAddresses)) {
      if (addr.toLowerCase() === lowerAddress) {
        return name;
      }
    }
    return 'Unknown';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getContractColor = (contractType) => {
    const colors = {
      ProfileManager: 'bg-blue-100 text-blue-800',
      EducationContract: 'bg-green-100 text-green-800',
      CertificationContract: 'bg-purple-100 text-purple-800',
      ExperienceContract: 'bg-orange-100 text-orange-800',
      AchievementContract: 'bg-pink-100 text-pink-800',
      Unknown: 'bg-gray-100 text-gray-800'
    };
    return colors[contractType] || colors.Unknown;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading blockchain data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Blockchain Explorer</h1>
                <p className="text-gray-600">Real-time blockchain visualization</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Current Block</p>
                <p className="text-2xl font-bold text-blue-600">#{currentBlock}</p>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  autoRefresh
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {autoRefresh ? '● Live' : '○ Paused'}
              </button>
              <button
                onClick={fetchBlocks}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Blocks</p>
                <p className="text-2xl font-bold">{blocks.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold">
                  {blocks.reduce((sum, block) => sum + block.transactions.length, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Gas Used</p>
                <p className="text-2xl font-bold">
                  {blocks.length > 0
                    ? Math.round(Number(blocks.reduce((sum, b) => sum + BigInt(b.gasUsed), 0n)) / blocks.length)
                    : 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Latest Block</p>
                <p className="text-sm font-bold">
                  {blocks[0] ? formatTimestamp(blocks[0].timestamp) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Blocks Timeline */}
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <div
              key={block.hash}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
            >
              {/* Block Header */}
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 cursor-pointer"
                onClick={() => setSelectedBlock(selectedBlock === block.number ? null : block.number)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 rounded-lg p-3">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Block #{block.number}</h3>
                      <p className="text-blue-100 text-sm">{formatTimestamp(block.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4" />
                      <span className="font-bold">{block.transactions.length} Transactions</span>
                    </div>
                    <div className="text-blue-100 text-sm">
                      Gas: {Number(block.gasUsed).toLocaleString()} / {Number(block.gasLimit).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Hash className="w-4 h-4" />
                  <span className="font-mono">{block.hash}</span>
                </div>
              </div>

              {/* Block Details */}
              {selectedBlock === block.number && (
                <div className="p-4 bg-gray-50">
                  {block.transactions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No transactions in this block</p>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-900 mb-3">Transactions:</h4>
                      {block.transactions.map((tx, txIndex) => (
                        <div
                          key={tx.hash}
                          className="bg-white rounded-lg p-4 border-l-4 border-blue-500"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getContractColor(tx.contractType)}`}>
                                  {tx.contractType}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  tx.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {tx.status === 1 ? 'Success' : 'Failed'}
                                </span>
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">From:</span>
                                  <span className="font-mono text-gray-900">{formatAddress(tx.from)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">To:</span>
                                  <span className="font-mono text-gray-900">{formatAddress(tx.to)}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Function:</span>
                                  <span className="font-bold text-blue-600">{tx.functionName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Gas Used:</span>
                                  <span className="font-mono">{Number(tx.gasUsed).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Value:</span>
                                  <span className="font-mono">{ethers.formatEther(tx.value)} ETH</span>
                                </div>
                                {tx.logs.length > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Events:</span>
                                    <span className="font-bold text-purple-600">{tx.logs.length} emitted</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Hash className="w-3 h-3" />
                              <span className="font-mono">{tx.hash}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {blocks.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Blocks Found</h3>
            <p className="text-gray-600">Start interacting with the contracts to see blockchain activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainVisualizer;