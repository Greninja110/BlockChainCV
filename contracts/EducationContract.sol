// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract EducationContract is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant INSTITUTION_ROLE = keccak256("INSTITUTION_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum EducationLevel {
        KINDERGARTEN,
        PRIMARY,
        SECONDARY,
        HIGH_SCHOOL,
        UNDERGRADUATE,
        GRADUATE,
        MASTERS,
        PHD,
        POSTDOC,
        OTHER
    }

    enum EducationStatus {
        IN_PROGRESS,
        COMPLETED,
        DROPPED,
        TRANSFERRED
    }

    struct EducationRecord {
        uint256 id;
        address student;
        address institution;
        string institutionName;
        string degree;
        string fieldOfStudy;
        EducationLevel level;
        EducationStatus status;
        uint256 startDate;
        uint256 endDate;
        string grade;
        string credentialHash;
        string documentHash;
        bool isVerified;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Institution {
        address institutionAddress;
        string name;
        string registrationNumber;
        string country;
        bool isAccredited;
        bool isActive;
        uint256 registeredAt;
    }

    mapping(uint256 => EducationRecord) public educationRecords;
    mapping(address => uint256[]) public studentRecords;
    mapping(address => Institution) public institutions;
    mapping(address => bool) public isRegisteredInstitution;
    mapping(bytes32 => bool) public usedCredentialHashes;
    mapping(uint256 => bool) public verificationRequested;
    mapping(address => uint256[]) public institutionPendingVerifications;

    uint256 private nextRecordId = 1;
    address[] public allInstitutions;

    event InstitutionRegistered(address indexed institution, string name, uint256 timestamp);
    event EducationRecordAdded(uint256 indexed recordId, address indexed student, address indexed institution);
    event EducationRecordUpdated(uint256 indexed recordId, EducationStatus newStatus);
    event EducationRecordVerified(uint256 indexed recordId, address indexed verifier);
    event GradeUpdated(uint256 indexed recordId, string newGrade);
    event VerificationRequested(uint256 indexed recordId, address indexed student, address indexed institution);
    event VerificationApproved(uint256 indexed recordId, address indexed institution);
    event VerificationRejected(uint256 indexed recordId, address indexed institution, string reason);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    modifier onlyStudent(uint256 _recordId) {
        require(educationRecords[_recordId].student == msg.sender, "Only student can perform this action");
        _;
    }

    modifier onlyInstitution(uint256 _recordId) {
        require(educationRecords[_recordId].institution == msg.sender, "Only issuing institution can perform this action");
        _;
    }

    modifier recordExists(uint256 _recordId) {
        require(educationRecords[_recordId].id != 0, "Education record does not exist");
        _;
    }

    function registerInstitution(
        string memory _name,
        string memory _registrationNumber,
        string memory _country
    ) external nonReentrant whenNotPaused {
        require(!isRegisteredInstitution[msg.sender], "Institution already registered");
        require(bytes(_name).length > 0, "Institution name cannot be empty");
        require(bytes(_registrationNumber).length > 0, "Registration number cannot be empty");

        institutions[msg.sender] = Institution({
            institutionAddress: msg.sender,
            name: _name,
            registrationNumber: _registrationNumber,
            country: _country,
            isAccredited: false,
            isActive: true,
            registeredAt: block.timestamp
        });

        isRegisteredInstitution[msg.sender] = true;
        allInstitutions.push(msg.sender);

        _grantRole(INSTITUTION_ROLE, msg.sender);

        emit InstitutionRegistered(msg.sender, _name, block.timestamp);
    }

    function addEducationRecord(
        address _student,
        string memory _degree,
        string memory _fieldOfStudy,
        EducationLevel _level,
        uint256 _startDate,
        uint256 _endDate,
        string memory _credentialHash,
        string memory _documentHash
    ) external nonReentrant whenNotPaused onlyRole(INSTITUTION_ROLE) {
        require(_student != address(0), "Invalid student address");
        require(isRegisteredInstitution[msg.sender], "Institution not registered");
        require(bytes(_degree).length > 0, "Degree cannot be empty");
        require(_startDate > 0 && _startDate <= block.timestamp, "Invalid start date");
        require(_endDate >= _startDate, "End date must be after start date");
        require(bytes(_credentialHash).length > 0, "Credential hash cannot be empty");

        bytes32 credentialHashBytes = keccak256(abi.encodePacked(_credentialHash));
        require(!usedCredentialHashes[credentialHashBytes], "Credential hash already used");

        uint256 recordId = nextRecordId++;

        educationRecords[recordId] = EducationRecord({
            id: recordId,
            student: _student,
            institution: msg.sender,
            institutionName: institutions[msg.sender].name,
            degree: _degree,
            fieldOfStudy: _fieldOfStudy,
            level: _level,
            status: _endDate <= block.timestamp ? EducationStatus.COMPLETED : EducationStatus.IN_PROGRESS,
            startDate: _startDate,
            endDate: _endDate,
            grade: "",
            credentialHash: _credentialHash,
            documentHash: _documentHash,
            isVerified: false,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        studentRecords[_student].push(recordId);
        usedCredentialHashes[credentialHashBytes] = true;

        emit EducationRecordAdded(recordId, _student, msg.sender);
    }

    function updateEducationStatus(
        uint256 _recordId,
        EducationStatus _newStatus
    ) external nonReentrant whenNotPaused recordExists(_recordId) onlyInstitution(_recordId) {
        EducationRecord storage record = educationRecords[_recordId];
        require(record.status != _newStatus, "Status is already set to this value");

        record.status = _newStatus;
        record.updatedAt = block.timestamp;

        if (_newStatus == EducationStatus.COMPLETED && record.endDate > block.timestamp) {
            record.endDate = block.timestamp;
        }

        emit EducationRecordUpdated(_recordId, _newStatus);
    }

    function updateGrade(
        uint256 _recordId,
        string memory _grade
    ) external nonReentrant whenNotPaused recordExists(_recordId) onlyInstitution(_recordId) {
        require(bytes(_grade).length > 0, "Grade cannot be empty");

        EducationRecord storage record = educationRecords[_recordId];
        record.grade = _grade;
        record.updatedAt = block.timestamp;

        emit GradeUpdated(_recordId, _grade);
    }

    function verifyEducationRecord(uint256 _recordId)
        external
        nonReentrant
        whenNotPaused
        recordExists(_recordId)
        onlyRole(VERIFIER_ROLE)
    {
        EducationRecord storage record = educationRecords[_recordId];
        require(!record.isVerified, "Record already verified");
        require(isRegisteredInstitution[record.institution], "Institution not registered");

        record.isVerified = true;
        record.updatedAt = block.timestamp;

        emit EducationRecordVerified(_recordId, msg.sender);
    }

    function accreditInstitution(address _institution)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(isRegisteredInstitution[_institution], "Institution not registered");
        institutions[_institution].isAccredited = true;
    }

    function deactivateInstitution(address _institution)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(isRegisteredInstitution[_institution], "Institution not registered");
        institutions[_institution].isActive = false;
    }

    function getEducationRecord(uint256 _recordId)
        external
        view
        recordExists(_recordId)
        returns (EducationRecord memory)
    {
        EducationRecord memory record = educationRecords[_recordId];
        require(
            record.student == msg.sender ||
            record.institution == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view this record"
        );

        return record;
    }

    function getStudentRecords(address _student)
        external
        view
        returns (uint256[] memory)
    {
        require(
            _student == msg.sender ||
            hasRole(INSTITUTION_ROLE, msg.sender) ||
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view student records"
        );

        return studentRecords[_student];
    }

    function getInstitutionInfo(address _institution)
        external
        view
        returns (Institution memory)
    {
        require(isRegisteredInstitution[_institution], "Institution not registered");
        return institutions[_institution];
    }

    function getAllInstitutions()
        external
        view
        returns (address[] memory)
    {
        return allInstitutions;
    }

    function getEducationLevelString(EducationLevel _level)
        external
        pure
        returns (string memory)
    {
        if (_level == EducationLevel.KINDERGARTEN) return "Kindergarten";
        if (_level == EducationLevel.PRIMARY) return "Primary";
        if (_level == EducationLevel.SECONDARY) return "Secondary";
        if (_level == EducationLevel.HIGH_SCHOOL) return "High School";
        if (_level == EducationLevel.UNDERGRADUATE) return "Undergraduate";
        if (_level == EducationLevel.GRADUATE) return "Graduate";
        if (_level == EducationLevel.MASTERS) return "Masters";
        if (_level == EducationLevel.PHD) return "PhD";
        if (_level == EducationLevel.POSTDOC) return "Postdoc";
        return "Other";
    }

    function getEducationStatusString(EducationStatus _status)
        external
        pure
        returns (string memory)
    {
        if (_status == EducationStatus.IN_PROGRESS) return "In Progress";
        if (_status == EducationStatus.COMPLETED) return "Completed";
        if (_status == EducationStatus.DROPPED) return "Dropped";
        if (_status == EducationStatus.TRANSFERRED) return "Transferred";
        return "Unknown";
    }

    function requestRecordVerification(uint256 _recordId)
        external
        nonReentrant
        whenNotPaused
        recordExists(_recordId)
        onlyStudent(_recordId)
    {
        require(!educationRecords[_recordId].isVerified, "Record already verified");
        require(!verificationRequested[_recordId], "Verification already requested");

        verificationRequested[_recordId] = true;
        address institution = educationRecords[_recordId].institution;
        institutionPendingVerifications[institution].push(_recordId);

        emit VerificationRequested(_recordId, msg.sender, institution);
    }

    function approveRecordVerification(uint256 _recordId)
        external
        nonReentrant
        whenNotPaused
        recordExists(_recordId)
        onlyInstitution(_recordId)
    {
        require(verificationRequested[_recordId], "Verification not requested");
        require(!educationRecords[_recordId].isVerified, "Record already verified");

        educationRecords[_recordId].isVerified = true;
        educationRecords[_recordId].updatedAt = block.timestamp;
        verificationRequested[_recordId] = false;

        _removeFromPendingVerifications(msg.sender, _recordId);

        emit VerificationApproved(_recordId, msg.sender);
        emit EducationRecordVerified(_recordId, msg.sender);
    }

    function rejectRecordVerification(uint256 _recordId, string memory _reason)
        external
        nonReentrant
        whenNotPaused
        recordExists(_recordId)
        onlyInstitution(_recordId)
    {
        require(verificationRequested[_recordId], "Verification not requested");

        verificationRequested[_recordId] = false;
        _removeFromPendingVerifications(msg.sender, _recordId);

        emit VerificationRejected(_recordId, msg.sender, _reason);
    }

    function _removeFromPendingVerifications(address _institution, uint256 _recordId) private {
        uint256[] storage pending = institutionPendingVerifications[_institution];
        for (uint i = 0; i < pending.length; i++) {
            if (pending[i] == _recordId) {
                pending[i] = pending[pending.length - 1];
                pending.pop();
                break;
            }
        }
    }

    function getInstitutionPendingVerifications(address _institution)
        external
        view
        returns (uint256[] memory)
    {
        require(
            _institution == msg.sender ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view pending verifications"
        );
        return institutionPendingVerifications[_institution];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}