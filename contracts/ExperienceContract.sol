// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract ExperienceContract is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant EMPLOYER_ROLE = keccak256("EMPLOYER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum EmploymentType {
        FULL_TIME,
        PART_TIME,
        CONTRACT,
        FREELANCE,
        INTERNSHIP,
        APPRENTICESHIP,
        VOLUNTEER,
        CONSULTING
    }

    enum EmploymentStatus {
        CURRENT,
        COMPLETED,
        TERMINATED,
        RESIGNED,
        LAID_OFF
    }

    struct WorkExperience {
        uint256 id;
        address employee;
        address employer;
        string companyName;
        string position;
        string department;
        string jobDescription;
        string[] skills;
        string[] responsibilities;
        EmploymentType empType;
        EmploymentStatus status;
        uint256 startDate;
        uint256 endDate;
        string salary;
        string location;
        string documentHash;
        bool isVerified;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Employer {
        address employerAddress;
        string companyName;
        string industry;
        string registrationNumber;
        string website;
        string country;
        bool isVerified;
        bool isActive;
        uint256 registeredAt;
    }

    struct Reference {
        uint256 experienceId;
        address referenceGiver;
        string referenceName;
        string position;
        string email;
        string comments;
        uint8 rating;
        uint256 referenceDate;
    }

    struct PerformanceReview {
        uint256 experienceId;
        address reviewer;
        string reviewPeriod;
        uint8 overallRating;
        string[] strengths;
        string[] improvementAreas;
        string comments;
        uint256 reviewDate;
    }

    mapping(uint256 => WorkExperience) public workExperiences;
    mapping(address => uint256[]) public employeeExperiences;
    mapping(address => Employer) public employers;
    mapping(address => bool) public isRegisteredEmployer;
    mapping(uint256 => Reference[]) public experienceReferences;
    mapping(uint256 => PerformanceReview[]) public performanceReviews;
    mapping(string => uint256[]) public companyExperiences;
    mapping(uint256 => bool) public verificationRequested;
    mapping(address => uint256[]) public employerPendingVerifications;

    uint256 private nextExperienceId = 1;
    address[] public allEmployers;

    event EmployerRegistered(address indexed employer, string companyName, uint256 timestamp);
    event ExperienceAdded(uint256 indexed experienceId, address indexed employee, address indexed employer);
    event ExperienceUpdated(uint256 indexed experienceId, EmploymentStatus newStatus);
    event ExperienceVerified(uint256 indexed experienceId, address indexed verifier);
    event ReferenceAdded(uint256 indexed experienceId, address indexed referenceGiver);
    event PerformanceReviewAdded(uint256 indexed experienceId, address indexed reviewer);
    event VerificationRequested(uint256 indexed experienceId, address indexed employee, address indexed employer);
    event VerificationApproved(uint256 indexed experienceId, address indexed employer);
    event VerificationRejected(uint256 indexed experienceId, address indexed employer, string reason);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    modifier onlyEmployee(uint256 _experienceId) {
        require(workExperiences[_experienceId].employee == msg.sender, "Only employee can perform this action");
        _;
    }

    modifier onlyEmployer(uint256 _experienceId) {
        require(workExperiences[_experienceId].employer == msg.sender, "Only employer can perform this action");
        _;
    }

    modifier experienceExists(uint256 _experienceId) {
        require(workExperiences[_experienceId].id != 0, "Work experience does not exist");
        _;
    }

    function registerEmployer(
        string memory _companyName,
        string memory _industry,
        string memory _registrationNumber,
        string memory _website,
        string memory _country
    ) external nonReentrant whenNotPaused {
        require(!isRegisteredEmployer[msg.sender], "Employer already registered");
        require(bytes(_companyName).length > 0, "Company name cannot be empty");
        require(bytes(_industry).length > 0, "Industry cannot be empty");

        employers[msg.sender] = Employer({
            employerAddress: msg.sender,
            companyName: _companyName,
            industry: _industry,
            registrationNumber: _registrationNumber,
            website: _website,
            country: _country,
            isVerified: false,
            isActive: true,
            registeredAt: block.timestamp
        });

        isRegisteredEmployer[msg.sender] = true;
        allEmployers.push(msg.sender);

        _grantRole(EMPLOYER_ROLE, msg.sender);

        emit EmployerRegistered(msg.sender, _companyName, block.timestamp);
    }

    function addWorkExperience(
        address _employee,
        string memory _position,
        string memory _department,
        string memory _jobDescription,
        string[] memory _skills,
        string[] memory _responsibilities,
        EmploymentType _empType,
        uint256 _startDate,
        uint256 _endDate,
        string memory _salary,
        string memory _location,
        string memory _documentHash
    ) external nonReentrant whenNotPaused onlyRole(EMPLOYER_ROLE) {
        require(_employee != address(0), "Invalid employee address");
        require(isRegisteredEmployer[msg.sender], "Employer not registered");
        require(bytes(_position).length > 0, "Position cannot be empty");
        require(_startDate > 0 && _startDate <= block.timestamp, "Invalid start date");
        require(_endDate >= _startDate, "End date must be after start date");

        uint256 experienceId = nextExperienceId++;

        workExperiences[experienceId] = WorkExperience({
            id: experienceId,
            employee: _employee,
            employer: msg.sender,
            companyName: employers[msg.sender].companyName,
            position: _position,
            department: _department,
            jobDescription: _jobDescription,
            skills: _skills,
            responsibilities: _responsibilities,
            empType: _empType,
            status: _endDate <= block.timestamp ? EmploymentStatus.COMPLETED : EmploymentStatus.CURRENT,
            startDate: _startDate,
            endDate: _endDate,
            salary: _salary,
            location: _location,
            documentHash: _documentHash,
            isVerified: false,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        employeeExperiences[_employee].push(experienceId);
        companyExperiences[employers[msg.sender].companyName].push(experienceId);

        emit ExperienceAdded(experienceId, _employee, msg.sender);
    }

    function updateExperienceStatus(
        uint256 _experienceId,
        EmploymentStatus _newStatus,
        uint256 _endDate
    ) external nonReentrant whenNotPaused experienceExists(_experienceId) onlyEmployer(_experienceId) {
        WorkExperience storage experience = workExperiences[_experienceId];
        require(experience.status != _newStatus, "Status is already set to this value");

        experience.status = _newStatus;
        experience.updatedAt = block.timestamp;

        if (_newStatus != EmploymentStatus.CURRENT && _endDate > 0) {
            require(_endDate >= experience.startDate, "End date must be after start date");
            experience.endDate = _endDate;
        }

        emit ExperienceUpdated(_experienceId, _newStatus);
    }

    function verifyWorkExperience(uint256 _experienceId)
        external
        nonReentrant
        whenNotPaused
        experienceExists(_experienceId)
        onlyRole(VERIFIER_ROLE)
    {
        WorkExperience storage experience = workExperiences[_experienceId];
        require(!experience.isVerified, "Experience already verified");
        require(isRegisteredEmployer[experience.employer], "Employer not registered");

        experience.isVerified = true;
        experience.updatedAt = block.timestamp;

        emit ExperienceVerified(_experienceId, msg.sender);
    }

    function addReference(
        uint256 _experienceId,
        string memory _referenceName,
        string memory _position,
        string memory _email,
        string memory _comments,
        uint8 _rating
    ) external nonReentrant whenNotPaused experienceExists(_experienceId) {
        require(_rating >= 1 && _rating <= 10, "Rating must be between 1 and 10");
        require(bytes(_referenceName).length > 0, "Reference name cannot be empty");

        WorkExperience memory experience = workExperiences[_experienceId];
        require(
            experience.employer == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender),
            "Only employer or verifier can add reference"
        );

        experienceReferences[_experienceId].push(Reference({
            experienceId: _experienceId,
            referenceGiver: msg.sender,
            referenceName: _referenceName,
            position: _position,
            email: _email,
            comments: _comments,
            rating: _rating,
            referenceDate: block.timestamp
        }));

        emit ReferenceAdded(_experienceId, msg.sender);
    }

    function addPerformanceReview(
        uint256 _experienceId,
        string memory _reviewPeriod,
        uint8 _overallRating,
        string[] memory _strengths,
        string[] memory _improvementAreas,
        string memory _comments
    ) external nonReentrant whenNotPaused experienceExists(_experienceId) onlyEmployer(_experienceId) {
        require(_overallRating >= 1 && _overallRating <= 10, "Rating must be between 1 and 10");
        require(bytes(_reviewPeriod).length > 0, "Review period cannot be empty");

        performanceReviews[_experienceId].push(PerformanceReview({
            experienceId: _experienceId,
            reviewer: msg.sender,
            reviewPeriod: _reviewPeriod,
            overallRating: _overallRating,
            strengths: _strengths,
            improvementAreas: _improvementAreas,
            comments: _comments,
            reviewDate: block.timestamp
        }));

        emit PerformanceReviewAdded(_experienceId, msg.sender);
    }

    function verifyEmployer(address _employer)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(isRegisteredEmployer[_employer], "Employer not registered");
        employers[_employer].isVerified = true;
    }

    function deactivateEmployer(address _employer)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(isRegisteredEmployer[_employer], "Employer not registered");
        employers[_employer].isActive = false;
    }

    function getWorkExperience(uint256 _experienceId)
        external
        view
        experienceExists(_experienceId)
        returns (WorkExperience memory)
    {
        WorkExperience memory experience = workExperiences[_experienceId];
        require(
            experience.employee == msg.sender ||
            experience.employer == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view this experience"
        );

        return experience;
    }

    function getEmployeeExperiences(address _employee)
        external
        view
        returns (uint256[] memory)
    {
        require(
            _employee == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view employee experiences"
        );

        return employeeExperiences[_employee];
    }

    function getExperienceReferences(uint256 _experienceId)
        external
        view
        experienceExists(_experienceId)
        returns (Reference[] memory)
    {
        WorkExperience memory experience = workExperiences[_experienceId];
        require(
            experience.employee == msg.sender ||
            experience.employer == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender),
            "Not authorized to view references"
        );

        return experienceReferences[_experienceId];
    }

    function getPerformanceReviews(uint256 _experienceId)
        external
        view
        experienceExists(_experienceId)
        returns (PerformanceReview[] memory)
    {
        WorkExperience memory experience = workExperiences[_experienceId];
        require(
            experience.employee == msg.sender ||
            experience.employer == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender),
            "Not authorized to view performance reviews"
        );

        return performanceReviews[_experienceId];
    }

    function getCompanyExperiences(string memory _companyName)
        external
        view
        returns (uint256[] memory)
    {
        require(
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view company experiences"
        );

        return companyExperiences[_companyName];
    }

    function getEmployerInfo(address _employer)
        external
        view
        returns (Employer memory)
    {
        require(isRegisteredEmployer[_employer], "Employer not registered");
        return employers[_employer];
    }

    function getAllEmployers()
        external
        view
        returns (address[] memory)
    {
        return allEmployers;
    }

    function getEmploymentTypeString(EmploymentType _type)
        external
        pure
        returns (string memory)
    {
        if (_type == EmploymentType.FULL_TIME) return "Full Time";
        if (_type == EmploymentType.PART_TIME) return "Part Time";
        if (_type == EmploymentType.CONTRACT) return "Contract";
        if (_type == EmploymentType.FREELANCE) return "Freelance";
        if (_type == EmploymentType.INTERNSHIP) return "Internship";
        if (_type == EmploymentType.APPRENTICESHIP) return "Apprenticeship";
        if (_type == EmploymentType.VOLUNTEER) return "Volunteer";
        if (_type == EmploymentType.CONSULTING) return "Consulting";
        return "Unknown";
    }

    function getEmploymentStatusString(EmploymentStatus _status)
        external
        pure
        returns (string memory)
    {
        if (_status == EmploymentStatus.CURRENT) return "Current";
        if (_status == EmploymentStatus.COMPLETED) return "Completed";
        if (_status == EmploymentStatus.TERMINATED) return "Terminated";
        if (_status == EmploymentStatus.RESIGNED) return "Resigned";
        if (_status == EmploymentStatus.LAID_OFF) return "Laid Off";
        return "Unknown";
    }

    function requestRecordVerification(uint256 _experienceId)
        external
        nonReentrant
        whenNotPaused
        experienceExists(_experienceId)
        onlyEmployee(_experienceId)
    {
        require(!workExperiences[_experienceId].isVerified, "Record already verified");
        require(!verificationRequested[_experienceId], "Verification already requested");

        verificationRequested[_experienceId] = true;
        address employer = workExperiences[_experienceId].employer;
        employerPendingVerifications[employer].push(_experienceId);

        emit VerificationRequested(_experienceId, msg.sender, employer);
    }

    function approveRecordVerification(uint256 _experienceId)
        external
        nonReentrant
        whenNotPaused
        experienceExists(_experienceId)
        onlyEmployer(_experienceId)
    {
        require(verificationRequested[_experienceId], "Verification not requested");
        require(!workExperiences[_experienceId].isVerified, "Record already verified");

        workExperiences[_experienceId].isVerified = true;
        workExperiences[_experienceId].updatedAt = block.timestamp;
        verificationRequested[_experienceId] = false;

        _removeFromPendingVerifications(msg.sender, _experienceId);

        emit VerificationApproved(_experienceId, msg.sender);
        emit ExperienceVerified(_experienceId, msg.sender);
    }

    function rejectRecordVerification(uint256 _experienceId, string memory _reason)
        external
        nonReentrant
        whenNotPaused
        experienceExists(_experienceId)
        onlyEmployer(_experienceId)
    {
        require(verificationRequested[_experienceId], "Verification not requested");

        verificationRequested[_experienceId] = false;
        _removeFromPendingVerifications(msg.sender, _experienceId);

        emit VerificationRejected(_experienceId, msg.sender, _reason);
    }

    function _removeFromPendingVerifications(address _employer, uint256 _experienceId) private {
        uint256[] storage pending = employerPendingVerifications[_employer];
        for (uint i = 0; i < pending.length; i++) {
            if (pending[i] == _experienceId) {
                pending[i] = pending[pending.length - 1];
                pending.pop();
                break;
            }
        }
    }

    function getEmployerPendingVerifications(address _employer)
        external
        view
        returns (uint256[] memory)
    {
        require(
            _employer == msg.sender ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view pending verifications"
        );
        return employerPendingVerifications[_employer];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}