// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract ProfileManager is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant INSTITUTION_ROLE = keccak256("INSTITUTION_ROLE");

    struct Profile {
        address userAddress;
        string profileHash;
        uint256 createdAt;
        uint256 updatedAt;
        bool isVerified;
        bool isActive;
    }

    struct VerificationRequest {
        address user;
        address verifier;
        string dataHash;
        uint256 timestamp;
        bool isApproved;
        string verifierComments;
    }

    mapping(address => Profile) public profiles;
    mapping(address => bool) public hasProfile;
    mapping(bytes32 => VerificationRequest) public verificationRequests;
    mapping(address => bytes32[]) public userVerificationRequests;
    mapping(address => address[]) public authorizedViewers;

    address[] public allUsers;

    event ProfileCreated(address indexed user, string profileHash, uint256 timestamp);
    event ProfileUpdated(address indexed user, string newProfileHash, uint256 timestamp);
    event VerificationRequested(bytes32 indexed requestId, address indexed user, address indexed verifier);
    event VerificationCompleted(bytes32 indexed requestId, bool approved, string comments);
    event ViewerAuthorized(address indexed user, address indexed viewer);
    event ViewerRevoked(address indexed user, address indexed viewer);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(INSTITUTION_ROLE, msg.sender);
    }

    modifier onlyProfileOwner(address user) {
        require(msg.sender == user, "Only profile owner can perform this action");
        _;
    }

    modifier profileExists(address user) {
        require(hasProfile[user], "Profile does not exist");
        _;
    }

    function createProfile(string memory _profileHash) external nonReentrant whenNotPaused {
        require(!hasProfile[msg.sender], "Profile already exists");
        require(bytes(_profileHash).length > 0, "Profile hash cannot be empty");

        profiles[msg.sender] = Profile({
            userAddress: msg.sender,
            profileHash: _profileHash,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            isVerified: false,
            isActive: true
        });

        hasProfile[msg.sender] = true;
        allUsers.push(msg.sender);

        emit ProfileCreated(msg.sender, _profileHash, block.timestamp);
    }

    function updateProfile(string memory _newProfileHash)
        external
        nonReentrant
        whenNotPaused
        profileExists(msg.sender)
        onlyProfileOwner(msg.sender)
    {
        require(bytes(_newProfileHash).length > 0, "Profile hash cannot be empty");

        profiles[msg.sender].profileHash = _newProfileHash;
        profiles[msg.sender].updatedAt = block.timestamp;
        profiles[msg.sender].isVerified = false;

        emit ProfileUpdated(msg.sender, _newProfileHash, block.timestamp);
    }

    function requestVerification(address _verifier, string memory _dataHash)
        external
        nonReentrant
        whenNotPaused
        profileExists(msg.sender)
    {
        require(hasRole(VERIFIER_ROLE, _verifier) || hasRole(INSTITUTION_ROLE, _verifier), "Invalid verifier");
        require(bytes(_dataHash).length > 0, "Data hash cannot be empty");

        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, _verifier, _dataHash, block.timestamp));

        verificationRequests[requestId] = VerificationRequest({
            user: msg.sender,
            verifier: _verifier,
            dataHash: _dataHash,
            timestamp: block.timestamp,
            isApproved: false,
            verifierComments: ""
        });

        userVerificationRequests[msg.sender].push(requestId);

        emit VerificationRequested(requestId, msg.sender, _verifier);
    }

    function approveVerification(bytes32 _requestId, string memory _comments)
        external
        nonReentrant
        whenNotPaused
    {
        VerificationRequest storage request = verificationRequests[_requestId];
        require(request.verifier == msg.sender, "Only assigned verifier can approve");
        require(request.timestamp > 0, "Verification request does not exist");
        require(!request.isApproved, "Already approved");

        request.isApproved = true;
        request.verifierComments = _comments;

        profiles[request.user].isVerified = true;

        emit VerificationCompleted(_requestId, true, _comments);
    }

    function rejectVerification(bytes32 _requestId, string memory _comments)
        external
        nonReentrant
        whenNotPaused
    {
        VerificationRequest storage request = verificationRequests[_requestId];
        require(request.verifier == msg.sender, "Only assigned verifier can reject");
        require(request.timestamp > 0, "Verification request does not exist");

        request.verifierComments = _comments;

        emit VerificationCompleted(_requestId, false, _comments);
    }

    function authorizeViewer(address _viewer)
        external
        nonReentrant
        whenNotPaused
        profileExists(msg.sender)
    {
        require(_viewer != address(0), "Invalid viewer address");
        require(_viewer != msg.sender, "Cannot authorize self");

        for (uint i = 0; i < authorizedViewers[msg.sender].length; i++) {
            require(authorizedViewers[msg.sender][i] != _viewer, "Viewer already authorized");
        }

        authorizedViewers[msg.sender].push(_viewer);

        emit ViewerAuthorized(msg.sender, _viewer);
    }

    function revokeViewer(address _viewer)
        external
        nonReentrant
        whenNotPaused
        profileExists(msg.sender)
    {
        address[] storage viewers = authorizedViewers[msg.sender];

        for (uint i = 0; i < viewers.length; i++) {
            if (viewers[i] == _viewer) {
                viewers[i] = viewers[viewers.length - 1];
                viewers.pop();
                emit ViewerRevoked(msg.sender, _viewer);
                return;
            }
        }

        revert("Viewer not found");
    }

    function getProfile(address _user)
        external
        view
        profileExists(_user)
        returns (Profile memory)
    {
        require(
            _user == msg.sender ||
            isAuthorizedViewer(_user, msg.sender) ||
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(INSTITUTION_ROLE, msg.sender),
            "Not authorized to view this profile"
        );

        return profiles[_user];
    }

    function isAuthorizedViewer(address _user, address _viewer) public view returns (bool) {
        address[] memory viewers = authorizedViewers[_user];
        for (uint i = 0; i < viewers.length; i++) {
            if (viewers[i] == _viewer) {
                return true;
            }
        }
        return false;
    }

    function getUserVerificationRequests(address _user)
        external
        view
        returns (bytes32[] memory)
    {
        require(
            _user == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(INSTITUTION_ROLE, msg.sender),
            "Not authorized to view verification requests"
        );

        return userVerificationRequests[_user];
    }

    function getAuthorizedViewers(address _user)
        external
        view
        returns (address[] memory)
    {
        require(_user == msg.sender, "Only profile owner can view authorized viewers");
        return authorizedViewers[_user];
    }

    function getAllUsers() external view returns (address[] memory) {
        require(
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(INSTITUTION_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view all users"
        );

        return allUsers;
    }

    function addVerifier(address _verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, _verifier);
    }

    function addInstitution(address _institution) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(INSTITUTION_ROLE, _institution);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}