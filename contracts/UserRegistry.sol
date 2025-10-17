// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title UserRegistry
 * @dev Central registry for all system users with role-based access control
 * Only admin can register users and assign roles
 */
contract UserRegistry is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    enum UserRole {
        NONE,           // 0 - Not registered
        ADMIN,          // 1 - System administrator
        STUDENT,        // 2 - Student/job seeker
        INSTITUTION,    // 3 - School/university
        CERTIFIER,      // 4 - Certification body
        EMPLOYER,       // 5 - Company
        ORGANIZER       // 6 - Event organizer
    }

    struct UserProfile {
        address walletAddress;
        UserRole role;
        string name;
        string organizationName;
        string email;
        bool isActive;
        uint256 registeredAt;
        uint256 updatedAt;
    }

    // Mappings
    mapping(address => UserProfile) public users;
    mapping(address => bool) public isRegistered;

    // Arrays for iteration
    address[] public allUsers;
    mapping(UserRole => address[]) public usersByRole;

    // Events
    event UserRegistered(address indexed userAddress, UserRole role, string name, uint256 timestamp);
    event UserUpdated(address indexed userAddress, UserRole newRole, uint256 timestamp);
    event UserDeactivated(address indexed userAddress, uint256 timestamp);
    event UserReactivated(address indexed userAddress, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Register deployer as first admin
        users[msg.sender] = UserProfile({
            walletAddress: msg.sender,
            role: UserRole.ADMIN,
            name: "System Administrator",
            organizationName: "System",
            email: "",
            isActive: true,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        isRegistered[msg.sender] = true;
        allUsers.push(msg.sender);
        usersByRole[UserRole.ADMIN].push(msg.sender);

        emit UserRegistered(msg.sender, UserRole.ADMIN, "System Administrator", block.timestamp);
    }

    /**
     * @dev Register a new user with a specific role
     * @param _userAddress Wallet address of the user
     * @param _role Role to assign
     * @param _name User's name
     * @param _organizationName Organization name (if applicable)
     * @param _email Email (optional)
     */
    function registerUser(
        address _userAddress,
        UserRole _role,
        string memory _name,
        string memory _organizationName,
        string memory _email
    ) external nonReentrant whenNotPaused onlyRole(ADMIN_ROLE) {
        require(_userAddress != address(0), "Invalid address");
        require(!isRegistered[_userAddress], "User already registered");
        require(_role != UserRole.NONE, "Invalid role");
        require(bytes(_name).length > 0, "Name cannot be empty");

        users[_userAddress] = UserProfile({
            walletAddress: _userAddress,
            role: _role,
            name: _name,
            organizationName: _organizationName,
            email: _email,
            isActive: true,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        isRegistered[_userAddress] = true;
        allUsers.push(_userAddress);
        usersByRole[_role].push(_userAddress);

        // Grant appropriate contract role
        if (_role == UserRole.ADMIN) {
            _grantRole(ADMIN_ROLE, _userAddress);
        }

        emit UserRegistered(_userAddress, _role, _name, block.timestamp);
    }

    /**
     * @dev Batch register multiple users
     */
    function batchRegisterUsers(
        address[] memory _addresses,
        UserRole[] memory _roles,
        string[] memory _names,
        string[] memory _organizationNames,
        string[] memory _emails
    ) external nonReentrant whenNotPaused onlyRole(ADMIN_ROLE) {
        require(_addresses.length == _roles.length, "Array length mismatch");
        require(_addresses.length == _names.length, "Array length mismatch");
        require(_addresses.length == _organizationNames.length, "Array length mismatch");
        require(_addresses.length == _emails.length, "Array length mismatch");

        for (uint256 i = 0; i < _addresses.length; i++) {
            address userAddress = _addresses[i];

            if (isRegistered[userAddress] || userAddress == address(0)) {
                continue;
            }

            require(_roles[i] != UserRole.NONE, "Invalid role");
            require(bytes(_names[i]).length > 0, "Name cannot be empty");

            users[userAddress] = UserProfile({
                walletAddress: userAddress,
                role: _roles[i],
                name: _names[i],
                organizationName: _organizationNames[i],
                email: _emails[i],
                isActive: true,
                registeredAt: block.timestamp,
                updatedAt: block.timestamp
            });

            isRegistered[userAddress] = true;
            allUsers.push(userAddress);
            usersByRole[_roles[i]].push(userAddress);

            // Grant appropriate contract role
            if (_roles[i] == UserRole.ADMIN) {
                _grantRole(ADMIN_ROLE, userAddress);
            }

            emit UserRegistered(userAddress, _roles[i], _names[i], block.timestamp);
        }
    }

    /**
     * @dev Update user role
     */
    function updateUserRole(
        address _userAddress,
        UserRole _newRole
    ) external nonReentrant whenNotPaused onlyRole(ADMIN_ROLE) {
        require(isRegistered[_userAddress], "User not registered");
        require(_newRole != UserRole.NONE, "Invalid role");

        UserProfile storage user = users[_userAddress];
        UserRole oldRole = user.role;

        user.role = _newRole;
        user.updatedAt = block.timestamp;

        // Update role arrays
        _removeFromRoleArray(oldRole, _userAddress);
        usersByRole[_newRole].push(_userAddress);

        // Update access control
        if (oldRole == UserRole.ADMIN && _newRole != UserRole.ADMIN) {
            _revokeRole(ADMIN_ROLE, _userAddress);
        } else if (oldRole != UserRole.ADMIN && _newRole == UserRole.ADMIN) {
            _grantRole(ADMIN_ROLE, _userAddress);
        }

        emit UserUpdated(_userAddress, _newRole, block.timestamp);
    }

    /**
     * @dev Deactivate a user
     */
    function deactivateUser(address _userAddress) external nonReentrant whenNotPaused onlyRole(ADMIN_ROLE) {
        require(isRegistered[_userAddress], "User not registered");
        require(_userAddress != msg.sender, "Cannot deactivate yourself");

        UserProfile storage user = users[_userAddress];
        require(user.isActive, "User already deactivated");

        user.isActive = false;
        user.updatedAt = block.timestamp;

        emit UserDeactivated(_userAddress, block.timestamp);
    }

    /**
     * @dev Reactivate a user
     */
    function reactivateUser(address _userAddress) external nonReentrant whenNotPaused onlyRole(ADMIN_ROLE) {
        require(isRegistered[_userAddress], "User not registered");

        UserProfile storage user = users[_userAddress];
        require(!user.isActive, "User already active");

        user.isActive = true;
        user.updatedAt = block.timestamp;

        emit UserReactivated(_userAddress, block.timestamp);
    }

    /**
     * @dev Get user profile
     */
    function getUserProfile(address _userAddress) external view returns (UserProfile memory) {
        require(isRegistered[_userAddress], "User not registered");
        return users[_userAddress];
    }

    /**
     * @dev Get user role
     */
    function getUserRole(address _userAddress) external view returns (UserRole) {
        if (!isRegistered[_userAddress]) {
            return UserRole.NONE;
        }
        return users[_userAddress].role;
    }

    /**
     * @dev Check if user is registered and active
     */
    function isActiveUser(address _userAddress) external view returns (bool) {
        return isRegistered[_userAddress] && users[_userAddress].isActive;
    }

    /**
     * @dev Check if user has specific role
     */
    function hasRole(address _userAddress, UserRole _role) external view returns (bool) {
        return isRegistered[_userAddress] && users[_userAddress].role == _role && users[_userAddress].isActive;
    }

    /**
     * @dev Get all users (admin only)
     */
    function getAllUsers() external view onlyRole(ADMIN_ROLE) returns (address[] memory) {
        return allUsers;
    }

    /**
     * @dev Get users by role (admin only)
     */
    function getUsersByRole(UserRole _role) external view onlyRole(ADMIN_ROLE) returns (address[] memory) {
        return usersByRole[_role];
    }

    /**
     * @dev Get all students (public - for institutions/certifiers/employers/organizers to see students)
     */
    function getAllStudents() external view returns (address[] memory) {
        return usersByRole[UserRole.STUDENT];
    }

    /**
     * @dev Get total user count
     */
    function getTotalUsers() external view returns (uint256) {
        return allUsers.length;
    }

    /**
     * @dev Get role name as string
     */
    function getRoleName(UserRole _role) external pure returns (string memory) {
        if (_role == UserRole.NONE) return "None";
        if (_role == UserRole.ADMIN) return "Admin";
        if (_role == UserRole.STUDENT) return "Student";
        if (_role == UserRole.INSTITUTION) return "Institution";
        if (_role == UserRole.CERTIFIER) return "Certifier";
        if (_role == UserRole.EMPLOYER) return "Employer";
        if (_role == UserRole.ORGANIZER) return "Organizer";
        return "Unknown";
    }

    /**
     * @dev Internal function to remove address from role array
     */
    function _removeFromRoleArray(UserRole _role, address _userAddress) private {
        address[] storage roleArray = usersByRole[_role];
        for (uint256 i = 0; i < roleArray.length; i++) {
            if (roleArray[i] == _userAddress) {
                roleArray[i] = roleArray[roleArray.length - 1];
                roleArray.pop();
                break;
            }
        }
    }

    /**
     * @dev Pause contract (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}