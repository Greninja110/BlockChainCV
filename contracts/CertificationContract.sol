// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CertificationContract is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant CERTIFIER_ROLE = keccak256("CERTIFIER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum CertificationType {
        TECHNICAL_SKILL,
        PROFESSIONAL_CERTIFICATION,
        COURSE_COMPLETION,
        WORKSHOP,
        BOOTCAMP,
        ONLINE_COURSE,
        LANGUAGE_PROFICIENCY,
        SAFETY_CERTIFICATION,
        OTHER
    }

    enum CertificationStatus {
        ACTIVE,
        EXPIRED,
        REVOKED,
        SUSPENDED
    }

    struct Certification {
        uint256 id;
        address holder;
        address certifier;
        string certifierName;
        string certificationName;
        string skillDomain;
        CertificationType certType;
        CertificationStatus status;
        uint256 issueDate;
        uint256 expiryDate;
        string credentialHash;
        string metadataHash;
        string documentHash;
        bool isVerified;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Certifier {
        address certifierAddress;
        string name;
        string website;
        string registrationNumber;
        bool isAccredited;
        bool isActive;
        uint256 registeredAt;
    }

    struct SkillEndorsement {
        uint256 certificationId;
        address endorser;
        string endorserName;
        string comments;
        uint256 endorsementDate;
    }

    mapping(uint256 => Certification) public certifications;
    mapping(address => uint256[]) public holderCertifications;
    mapping(address => Certifier) public certifiers;
    mapping(address => bool) public isRegisteredCertifier;
    mapping(bytes32 => bool) public usedCredentialHashes;
    mapping(uint256 => SkillEndorsement[]) public certificationEndorsements;
    mapping(string => uint256[]) public skillDomainCertifications;
    mapping(uint256 => bool) public verificationRequested;
    mapping(address => uint256[]) public certifierPendingVerifications;

    uint256 private nextCertificationId = 1;
    address[] public allCertifiers;

    event CertifierRegistered(address indexed certifier, string name, uint256 timestamp);
    event CertificationIssued(uint256 indexed certificationId, address indexed holder, address indexed certifier);
    event CertificationVerified(uint256 indexed certificationId, address indexed verifier);
    event CertificationRevoked(uint256 indexed certificationId, string reason);
    event CertificationRenewed(uint256 indexed certificationId, uint256 newExpiryDate);
    event SkillEndorsed(uint256 indexed certificationId, address indexed endorser);
    event VerificationRequested(uint256 indexed certificationId, address indexed holder, address indexed certifier);
    event VerificationApproved(uint256 indexed certificationId, address indexed certifier);
    event VerificationRejected(uint256 indexed certificationId, address indexed certifier, string reason);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    modifier onlyHolder(uint256 _certificationId) {
        require(certifications[_certificationId].holder == msg.sender, "Only certification holder can perform this action");
        _;
    }

    modifier onlyCertifier(uint256 _certificationId) {
        require(certifications[_certificationId].certifier == msg.sender, "Only issuing certifier can perform this action");
        _;
    }

    modifier certificationExists(uint256 _certificationId) {
        require(certifications[_certificationId].id != 0, "Certification does not exist");
        _;
    }

    function registerCertifier(
        string memory _name,
        string memory _website,
        string memory _registrationNumber
    ) external nonReentrant whenNotPaused {
        require(!isRegisteredCertifier[msg.sender], "Certifier already registered");
        require(bytes(_name).length > 0, "Certifier name cannot be empty");

        certifiers[msg.sender] = Certifier({
            certifierAddress: msg.sender,
            name: _name,
            website: _website,
            registrationNumber: _registrationNumber,
            isAccredited: false,
            isActive: true,
            registeredAt: block.timestamp
        });

        isRegisteredCertifier[msg.sender] = true;
        allCertifiers.push(msg.sender);

        _grantRole(CERTIFIER_ROLE, msg.sender);

        emit CertifierRegistered(msg.sender, _name, block.timestamp);
    }

    function issueCertification(
        address _holder,
        string memory _certificationName,
        string memory _skillDomain,
        CertificationType _certType,
        uint256 _expiryDate,
        string memory _credentialHash,
        string memory _metadataHash,
        string memory _documentHash
    ) external nonReentrant whenNotPaused onlyRole(CERTIFIER_ROLE) {
        require(_holder != address(0), "Invalid holder address");
        require(isRegisteredCertifier[msg.sender], "Certifier not registered");
        require(bytes(_certificationName).length > 0, "Certification name cannot be empty");
        require(bytes(_skillDomain).length > 0, "Skill domain cannot be empty");
        require(_expiryDate > block.timestamp, "Expiry date must be in the future");
        require(bytes(_credentialHash).length > 0, "Credential hash cannot be empty");

        bytes32 credentialHashBytes = keccak256(abi.encodePacked(_credentialHash));
        require(!usedCredentialHashes[credentialHashBytes], "Credential hash already used");

        uint256 certificationId = nextCertificationId++;

        certifications[certificationId] = Certification({
            id: certificationId,
            holder: _holder,
            certifier: msg.sender,
            certifierName: certifiers[msg.sender].name,
            certificationName: _certificationName,
            skillDomain: _skillDomain,
            certType: _certType,
            status: CertificationStatus.ACTIVE,
            issueDate: block.timestamp,
            expiryDate: _expiryDate,
            credentialHash: _credentialHash,
            metadataHash: _metadataHash,
            documentHash: _documentHash,
            isVerified: false,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        holderCertifications[_holder].push(certificationId);
        skillDomainCertifications[_skillDomain].push(certificationId);
        usedCredentialHashes[credentialHashBytes] = true;

        emit CertificationIssued(certificationId, _holder, msg.sender);
    }

    function verifyCertification(uint256 _certificationId)
        external
        nonReentrant
        whenNotPaused
        certificationExists(_certificationId)
        onlyRole(VERIFIER_ROLE)
    {
        Certification storage cert = certifications[_certificationId];
        require(!cert.isVerified, "Certification already verified");
        require(isRegisteredCertifier[cert.certifier], "Certifier not registered");

        cert.isVerified = true;
        cert.updatedAt = block.timestamp;

        emit CertificationVerified(_certificationId, msg.sender);
    }

    function revokeCertification(uint256 _certificationId, string memory _reason)
        external
        nonReentrant
        whenNotPaused
        certificationExists(_certificationId)
        onlyCertifier(_certificationId)
    {
        Certification storage cert = certifications[_certificationId];
        require(cert.status != CertificationStatus.REVOKED, "Certification already revoked");

        cert.status = CertificationStatus.REVOKED;
        cert.updatedAt = block.timestamp;

        emit CertificationRevoked(_certificationId, _reason);
    }

    function renewCertification(uint256 _certificationId, uint256 _newExpiryDate)
        external
        nonReentrant
        whenNotPaused
        certificationExists(_certificationId)
        onlyCertifier(_certificationId)
    {
        require(_newExpiryDate > block.timestamp, "New expiry date must be in the future");

        Certification storage cert = certifications[_certificationId];
        require(cert.status == CertificationStatus.ACTIVE || cert.status == CertificationStatus.EXPIRED, "Cannot renew revoked or suspended certification");

        cert.expiryDate = _newExpiryDate;
        cert.status = CertificationStatus.ACTIVE;
        cert.updatedAt = block.timestamp;

        emit CertificationRenewed(_certificationId, _newExpiryDate);
    }

    function endorseSkill(uint256 _certificationId, string memory _comments)
        external
        nonReentrant
        whenNotPaused
        certificationExists(_certificationId)
    {
        Certification memory cert = certifications[_certificationId];
        require(cert.holder != msg.sender, "Cannot endorse your own certification");
        require(cert.status == CertificationStatus.ACTIVE, "Can only endorse active certifications");

        SkillEndorsement[] storage endorsements = certificationEndorsements[_certificationId];

        for (uint i = 0; i < endorsements.length; i++) {
            require(endorsements[i].endorser != msg.sender, "Already endorsed this certification");
        }

        endorsements.push(SkillEndorsement({
            certificationId: _certificationId,
            endorser: msg.sender,
            endorserName: "",
            comments: _comments,
            endorsementDate: block.timestamp
        }));

        emit SkillEndorsed(_certificationId, msg.sender);
    }

    function updateCertificationStatus() external nonReentrant {
        uint256[] memory userCerts = holderCertifications[msg.sender];

        for (uint i = 0; i < userCerts.length; i++) {
            Certification storage cert = certifications[userCerts[i]];
            if (cert.status == CertificationStatus.ACTIVE && cert.expiryDate <= block.timestamp) {
                cert.status = CertificationStatus.EXPIRED;
                cert.updatedAt = block.timestamp;
            }
        }
    }

    function accreditCertifier(address _certifier)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(isRegisteredCertifier[_certifier], "Certifier not registered");
        certifiers[_certifier].isAccredited = true;
    }

    function getCertification(uint256 _certificationId)
        external
        view
        certificationExists(_certificationId)
        returns (Certification memory)
    {
        Certification memory cert = certifications[_certificationId];
        require(
            cert.holder == msg.sender ||
            cert.certifier == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view this certification"
        );

        return cert;
    }

    function getHolderCertifications(address _holder)
        external
        view
        returns (uint256[] memory)
    {
        require(
            _holder == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view holder certifications"
        );

        return holderCertifications[_holder];
    }

    function getCertificationEndorsements(uint256 _certificationId)
        external
        view
        certificationExists(_certificationId)
        returns (SkillEndorsement[] memory)
    {
        return certificationEndorsements[_certificationId];
    }

    function getCertificationsBySkillDomain(string memory _skillDomain)
        external
        view
        returns (uint256[] memory)
    {
        return skillDomainCertifications[_skillDomain];
    }

    function getCertifierInfo(address _certifier)
        external
        view
        returns (Certifier memory)
    {
        require(isRegisteredCertifier[_certifier], "Certifier not registered");
        return certifiers[_certifier];
    }

    function getAllCertifiers()
        external
        view
        returns (address[] memory)
    {
        return allCertifiers;
    }

    function getCertificationTypeString(CertificationType _type)
        external
        pure
        returns (string memory)
    {
        if (_type == CertificationType.TECHNICAL_SKILL) return "Technical Skill";
        if (_type == CertificationType.PROFESSIONAL_CERTIFICATION) return "Professional Certification";
        if (_type == CertificationType.COURSE_COMPLETION) return "Course Completion";
        if (_type == CertificationType.WORKSHOP) return "Workshop";
        if (_type == CertificationType.BOOTCAMP) return "Bootcamp";
        if (_type == CertificationType.ONLINE_COURSE) return "Online Course";
        if (_type == CertificationType.LANGUAGE_PROFICIENCY) return "Language Proficiency";
        if (_type == CertificationType.SAFETY_CERTIFICATION) return "Safety Certification";
        return "Other";
    }

    function requestRecordVerification(uint256 _certificationId)
        external
        nonReentrant
        whenNotPaused
        certificationExists(_certificationId)
        onlyHolder(_certificationId)
    {
        require(!certifications[_certificationId].isVerified, "Record already verified");
        require(!verificationRequested[_certificationId], "Verification already requested");

        verificationRequested[_certificationId] = true;
        address certifier = certifications[_certificationId].certifier;
        certifierPendingVerifications[certifier].push(_certificationId);

        emit VerificationRequested(_certificationId, msg.sender, certifier);
    }

    function approveRecordVerification(uint256 _certificationId)
        external
        nonReentrant
        whenNotPaused
        certificationExists(_certificationId)
        onlyCertifier(_certificationId)
    {
        require(verificationRequested[_certificationId], "Verification not requested");
        require(!certifications[_certificationId].isVerified, "Record already verified");

        certifications[_certificationId].isVerified = true;
        certifications[_certificationId].updatedAt = block.timestamp;
        verificationRequested[_certificationId] = false;

        _removeFromPendingVerifications(msg.sender, _certificationId);

        emit VerificationApproved(_certificationId, msg.sender);
        emit CertificationVerified(_certificationId, msg.sender);
    }

    function rejectRecordVerification(uint256 _certificationId, string memory _reason)
        external
        nonReentrant
        whenNotPaused
        certificationExists(_certificationId)
        onlyCertifier(_certificationId)
    {
        require(verificationRequested[_certificationId], "Verification not requested");

        verificationRequested[_certificationId] = false;
        _removeFromPendingVerifications(msg.sender, _certificationId);

        emit VerificationRejected(_certificationId, msg.sender, _reason);
    }

    function _removeFromPendingVerifications(address _certifier, uint256 _certificationId) private {
        uint256[] storage pending = certifierPendingVerifications[_certifier];
        for (uint i = 0; i < pending.length; i++) {
            if (pending[i] == _certificationId) {
                pending[i] = pending[pending.length - 1];
                pending.pop();
                break;
            }
        }
    }

    function getCertifierPendingVerifications(address _certifier)
        external
        view
        returns (uint256[] memory)
    {
        require(
            _certifier == msg.sender ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view pending verifications"
        );
        return certifierPendingVerifications[_certifier];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}