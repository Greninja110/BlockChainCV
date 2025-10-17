// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract AchievementContract is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum AchievementType {
        PROJECT,
        COMPETITION,
        HACKATHON,
        PUBLICATION,
        PATENT,
        AWARD,
        SCHOLARSHIP,
        RESEARCH,
        VOLUNTEER_WORK,
        LEADERSHIP,
        PRESENTATION,
        OTHER
    }

    enum ParticipationType {
        INDIVIDUAL,
        TEAM_MEMBER,
        TEAM_LEADER,
        ORGANIZER,
        MENTOR,
        JUDGE
    }

    enum AchievementLevel {
        LOCAL,
        REGIONAL,
        NATIONAL,
        INTERNATIONAL,
        INSTITUTIONAL,
        CORPORATE
    }

    struct Achievement {
        uint256 id;
        address participant;
        address organizer;
        string organizerName;
        string title;
        string description;
        AchievementType achType;
        ParticipationType partType;
        AchievementLevel level;
        string category;
        uint256 eventDate;
        string result;
        string[] skills;
        string[] technologies;
        string projectUrl;
        string certificateHash;
        string documentHash;
        bool isVerified;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Organizer {
        address organizerAddress;
        string name;
        string organizationType;
        string website;
        string registrationNumber;
        bool isVerified;
        bool isActive;
        uint256 registeredAt;
    }

    struct TeamMember {
        uint256 achievementId;
        address memberAddress;
        string memberName;
        string role;
        uint256 addedDate;
    }

    struct Project {
        uint256 achievementId;
        string projectName;
        string repository;
        string liveUrl;
        string[] collaborators;
        string[] technologies;
        string impact;
        uint256 completionDate;
    }

    mapping(uint256 => Achievement) public achievements;
    mapping(address => uint256[]) public participantAchievements;
    mapping(address => Organizer) public organizers;
    mapping(address => bool) public isRegisteredOrganizer;
    mapping(uint256 => TeamMember[]) public teamMembers;
    mapping(uint256 => Project) public projects;
    mapping(string => uint256[]) public categoryAchievements;
    mapping(bytes32 => bool) public usedCertificateHashes;
    mapping(uint256 => bool) public verificationRequested;
    mapping(address => uint256[]) public organizerPendingVerifications;

    uint256 private nextAchievementId = 1;
    address[] public allOrganizers;

    event OrganizerRegistered(address indexed organizer, string name, uint256 timestamp);
    event AchievementAdded(uint256 indexed achievementId, address indexed participant, address indexed organizer);
    event AchievementVerified(uint256 indexed achievementId, address indexed verifier);
    event TeamMemberAdded(uint256 indexed achievementId, address indexed member);
    event ProjectDetailsAdded(uint256 indexed achievementId);
    event VerificationRequested(uint256 indexed achievementId, address indexed participant, address indexed organizer);
    event VerificationApproved(uint256 indexed achievementId, address indexed organizer);
    event VerificationRejected(uint256 indexed achievementId, address indexed organizer, string reason);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    modifier onlyParticipant(uint256 _achievementId) {
        require(achievements[_achievementId].participant == msg.sender, "Only participant can perform this action");
        _;
    }

    modifier onlyOrganizer(uint256 _achievementId) {
        require(achievements[_achievementId].organizer == msg.sender, "Only organizer can perform this action");
        _;
    }

    modifier achievementExists(uint256 _achievementId) {
        require(achievements[_achievementId].id != 0, "Achievement does not exist");
        _;
    }

    function registerOrganizer(
        string memory _name,
        string memory _organizationType,
        string memory _website,
        string memory _registrationNumber
    ) external nonReentrant whenNotPaused {
        require(!isRegisteredOrganizer[msg.sender], "Organizer already registered");
        require(bytes(_name).length > 0, "Organizer name cannot be empty");
        require(bytes(_organizationType).length > 0, "Organization type cannot be empty");

        organizers[msg.sender] = Organizer({
            organizerAddress: msg.sender,
            name: _name,
            organizationType: _organizationType,
            website: _website,
            registrationNumber: _registrationNumber,
            isVerified: false,
            isActive: true,
            registeredAt: block.timestamp
        });

        isRegisteredOrganizer[msg.sender] = true;
        allOrganizers.push(msg.sender);

        _grantRole(ORGANIZER_ROLE, msg.sender);

        emit OrganizerRegistered(msg.sender, _name, block.timestamp);
    }

    function addAchievement(
        address _participant,
        string memory _title,
        string memory _description,
        AchievementType _achType,
        ParticipationType _partType,
        AchievementLevel _level,
        string memory _category,
        uint256 _eventDate,
        string memory _result,
        string[] memory _skills,
        string[] memory _technologies,
        string memory _projectUrl,
        string memory _certificateHash,
        string memory _documentHash
    ) external nonReentrant whenNotPaused onlyRole(ORGANIZER_ROLE) {
        require(_participant != address(0), "Invalid participant address");
        require(isRegisteredOrganizer[msg.sender], "Organizer not registered");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_eventDate > 0 && _eventDate <= block.timestamp, "Invalid event date");

        bytes32 certificateHashBytes = keccak256(abi.encodePacked(_certificateHash));
        if (bytes(_certificateHash).length > 0) {
            require(!usedCertificateHashes[certificateHashBytes], "Certificate hash already used");
            usedCertificateHashes[certificateHashBytes] = true;
        }

        uint256 achievementId = nextAchievementId++;

        achievements[achievementId] = Achievement({
            id: achievementId,
            participant: _participant,
            organizer: msg.sender,
            organizerName: organizers[msg.sender].name,
            title: _title,
            description: _description,
            achType: _achType,
            partType: _partType,
            level: _level,
            category: _category,
            eventDate: _eventDate,
            result: _result,
            skills: _skills,
            technologies: _technologies,
            projectUrl: _projectUrl,
            certificateHash: _certificateHash,
            documentHash: _documentHash,
            isVerified: false,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        participantAchievements[_participant].push(achievementId);
        categoryAchievements[_category].push(achievementId);

        emit AchievementAdded(achievementId, _participant, msg.sender);
    }

    function addTeamMembers(
        uint256 _achievementId,
        address[] memory _memberAddresses,
        string[] memory _memberNames,
        string[] memory _roles
    ) external nonReentrant whenNotPaused achievementExists(_achievementId) onlyOrganizer(_achievementId) {
        require(_memberAddresses.length == _memberNames.length, "Arrays length mismatch");
        require(_memberAddresses.length == _roles.length, "Arrays length mismatch");

        for (uint i = 0; i < _memberAddresses.length; i++) {
            require(_memberAddresses[i] != address(0), "Invalid member address");
            require(bytes(_memberNames[i]).length > 0, "Member name cannot be empty");

            teamMembers[_achievementId].push(TeamMember({
                achievementId: _achievementId,
                memberAddress: _memberAddresses[i],
                memberName: _memberNames[i],
                role: _roles[i],
                addedDate: block.timestamp
            }));

            participantAchievements[_memberAddresses[i]].push(_achievementId);

            emit TeamMemberAdded(_achievementId, _memberAddresses[i]);
        }
    }

    function addProjectDetails(
        uint256 _achievementId,
        string memory _projectName,
        string memory _repository,
        string memory _liveUrl,
        string[] memory _collaborators,
        string[] memory _technologies,
        string memory _impact,
        uint256 _completionDate
    ) external nonReentrant whenNotPaused achievementExists(_achievementId) {
        Achievement memory achievement = achievements[_achievementId];
        require(
            achievement.participant == msg.sender ||
            achievement.organizer == msg.sender,
            "Only participant or organizer can add project details"
        );
        require(bytes(_projectName).length > 0, "Project name cannot be empty");
        require(_completionDate > 0, "Invalid completion date");

        projects[_achievementId] = Project({
            achievementId: _achievementId,
            projectName: _projectName,
            repository: _repository,
            liveUrl: _liveUrl,
            collaborators: _collaborators,
            technologies: _technologies,
            impact: _impact,
            completionDate: _completionDate
        });

        emit ProjectDetailsAdded(_achievementId);
    }

    function verifyAchievement(uint256 _achievementId)
        external
        nonReentrant
        whenNotPaused
        achievementExists(_achievementId)
        onlyRole(VERIFIER_ROLE)
    {
        Achievement storage achievement = achievements[_achievementId];
        require(!achievement.isVerified, "Achievement already verified");
        require(isRegisteredOrganizer[achievement.organizer], "Organizer not registered");

        achievement.isVerified = true;
        achievement.updatedAt = block.timestamp;

        emit AchievementVerified(_achievementId, msg.sender);
    }

    function verifyOrganizer(address _organizer)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(isRegisteredOrganizer[_organizer], "Organizer not registered");
        organizers[_organizer].isVerified = true;
    }

    function deactivateOrganizer(address _organizer)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(isRegisteredOrganizer[_organizer], "Organizer not registered");
        organizers[_organizer].isActive = false;
    }

    function getAchievement(uint256 _achievementId)
        external
        view
        achievementExists(_achievementId)
        returns (Achievement memory)
    {
        Achievement memory achievement = achievements[_achievementId];
        require(
            achievement.participant == msg.sender ||
            achievement.organizer == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view this achievement"
        );

        return achievement;
    }

    function getParticipantAchievements(address _participant)
        external
        view
        returns (uint256[] memory)
    {
        require(
            _participant == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view participant achievements"
        );

        return participantAchievements[_participant];
    }

    function getTeamMembers(uint256 _achievementId)
        external
        view
        achievementExists(_achievementId)
        returns (TeamMember[] memory)
    {
        Achievement memory achievement = achievements[_achievementId];
        require(
            achievement.participant == msg.sender ||
            achievement.organizer == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender),
            "Not authorized to view team members"
        );

        return teamMembers[_achievementId];
    }

    function getProjectDetails(uint256 _achievementId)
        external
        view
        achievementExists(_achievementId)
        returns (Project memory)
    {
        Achievement memory achievement = achievements[_achievementId];
        require(
            achievement.participant == msg.sender ||
            achievement.organizer == msg.sender ||
            hasRole(VERIFIER_ROLE, msg.sender),
            "Not authorized to view project details"
        );

        return projects[_achievementId];
    }

    function getCategoryAchievements(string memory _category)
        external
        view
        returns (uint256[] memory)
    {
        return categoryAchievements[_category];
    }

    function getOrganizerInfo(address _organizer)
        external
        view
        returns (Organizer memory)
    {
        require(isRegisteredOrganizer[_organizer], "Organizer not registered");
        return organizers[_organizer];
    }

    function getAllOrganizers()
        external
        view
        returns (address[] memory)
    {
        return allOrganizers;
    }

    function getAchievementTypeString(AchievementType _type)
        external
        pure
        returns (string memory)
    {
        if (_type == AchievementType.PROJECT) return "Project";
        if (_type == AchievementType.COMPETITION) return "Competition";
        if (_type == AchievementType.HACKATHON) return "Hackathon";
        if (_type == AchievementType.PUBLICATION) return "Publication";
        if (_type == AchievementType.PATENT) return "Patent";
        if (_type == AchievementType.AWARD) return "Award";
        if (_type == AchievementType.SCHOLARSHIP) return "Scholarship";
        if (_type == AchievementType.RESEARCH) return "Research";
        if (_type == AchievementType.VOLUNTEER_WORK) return "Volunteer Work";
        if (_type == AchievementType.LEADERSHIP) return "Leadership";
        if (_type == AchievementType.PRESENTATION) return "Presentation";
        return "Other";
    }

    function getParticipationTypeString(ParticipationType _type)
        external
        pure
        returns (string memory)
    {
        if (_type == ParticipationType.INDIVIDUAL) return "Individual";
        if (_type == ParticipationType.TEAM_MEMBER) return "Team Member";
        if (_type == ParticipationType.TEAM_LEADER) return "Team Leader";
        if (_type == ParticipationType.ORGANIZER) return "Organizer";
        if (_type == ParticipationType.MENTOR) return "Mentor";
        if (_type == ParticipationType.JUDGE) return "Judge";
        return "Unknown";
    }

    function getAchievementLevelString(AchievementLevel _level)
        external
        pure
        returns (string memory)
    {
        if (_level == AchievementLevel.LOCAL) return "Local";
        if (_level == AchievementLevel.REGIONAL) return "Regional";
        if (_level == AchievementLevel.NATIONAL) return "National";
        if (_level == AchievementLevel.INTERNATIONAL) return "International";
        if (_level == AchievementLevel.INSTITUTIONAL) return "Institutional";
        if (_level == AchievementLevel.CORPORATE) return "Corporate";
        return "Unknown";
    }

    function requestRecordVerification(uint256 _achievementId)
        external
        nonReentrant
        whenNotPaused
        achievementExists(_achievementId)
        onlyParticipant(_achievementId)
    {
        require(!achievements[_achievementId].isVerified, "Record already verified");
        require(!verificationRequested[_achievementId], "Verification already requested");

        verificationRequested[_achievementId] = true;
        address organizer = achievements[_achievementId].organizer;
        organizerPendingVerifications[organizer].push(_achievementId);

        emit VerificationRequested(_achievementId, msg.sender, organizer);
    }

    function approveRecordVerification(uint256 _achievementId)
        external
        nonReentrant
        whenNotPaused
        achievementExists(_achievementId)
        onlyOrganizer(_achievementId)
    {
        require(verificationRequested[_achievementId], "Verification not requested");
        require(!achievements[_achievementId].isVerified, "Record already verified");

        achievements[_achievementId].isVerified = true;
        achievements[_achievementId].updatedAt = block.timestamp;
        verificationRequested[_achievementId] = false;

        _removeFromPendingVerifications(msg.sender, _achievementId);

        emit VerificationApproved(_achievementId, msg.sender);
        emit AchievementVerified(_achievementId, msg.sender);
    }

    function rejectRecordVerification(uint256 _achievementId, string memory _reason)
        external
        nonReentrant
        whenNotPaused
        achievementExists(_achievementId)
        onlyOrganizer(_achievementId)
    {
        require(verificationRequested[_achievementId], "Verification not requested");

        verificationRequested[_achievementId] = false;
        _removeFromPendingVerifications(msg.sender, _achievementId);

        emit VerificationRejected(_achievementId, msg.sender, _reason);
    }

    function _removeFromPendingVerifications(address _organizer, uint256 _achievementId) private {
        uint256[] storage pending = organizerPendingVerifications[_organizer];
        for (uint i = 0; i < pending.length; i++) {
            if (pending[i] == _achievementId) {
                pending[i] = pending[pending.length - 1];
                pending.pop();
                break;
            }
        }
    }

    function getOrganizerPendingVerifications(address _organizer)
        external
        view
        returns (uint256[] memory)
    {
        require(
            _organizer == msg.sender ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to view pending verifications"
        );
        return organizerPendingVerifications[_organizer];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}