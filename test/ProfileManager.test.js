const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProfileManager", function () {
  let ProfileManager;
  let profileManager;
  let owner;
  let user1;
  let user2;
  let verifier;

  beforeEach(async function () {
    [owner, user1, user2, verifier] = await ethers.getSigners();

    ProfileManager = await ethers.getContractFactory("ProfileManager");
    profileManager = await ProfileManager.deploy();
    await profileManager.waitForDeployment();
  });

  describe("Profile Creation", function () {
    it("Should create a profile successfully", async function () {
      const profileHash = JSON.stringify({
        fullName: "John Doe",
        title: "Software Engineer",
        bio: "Experienced developer"
      });

      await profileManager.connect(user1).createProfile(profileHash);

      const hasProfile = await profileManager.hasProfile(user1.address);
      expect(hasProfile).to.be.true;

      const profile = await profileManager.connect(user1).getProfile(user1.address);
      expect(profile.userAddress).to.equal(user1.address);
      expect(profile.profileHash).to.equal(profileHash);
      expect(profile.isActive).to.be.true;
      expect(profile.isVerified).to.be.false;
    });

    it("Should not allow duplicate profiles", async function () {
      const profileHash = "test-hash";

      await profileManager.connect(user1).createProfile(profileHash);

      await expect(
        profileManager.connect(user1).createProfile(profileHash)
      ).to.be.revertedWith("Profile already exists");
    });

    it("Should not allow empty profile hash", async function () {
      await expect(
        profileManager.connect(user1).createProfile("")
      ).to.be.revertedWith("Profile hash cannot be empty");
    });
  });

  describe("Profile Updates", function () {
    beforeEach(async function () {
      const profileHash = "initial-hash";
      await profileManager.connect(user1).createProfile(profileHash);
    });

    it("Should update profile successfully", async function () {
      const newProfileHash = JSON.stringify({
        fullName: "John Doe Updated",
        title: "Senior Software Engineer"
      });

      await profileManager.connect(user1).updateProfile(newProfileHash);

      const profile = await profileManager.connect(user1).getProfile(user1.address);
      expect(profile.profileHash).to.equal(newProfileHash);
      expect(profile.isVerified).to.be.false; // Should reset verification
    });

    it("Should only allow profile owner to update", async function () {
      const newProfileHash = "updated-hash";

      await expect(
        profileManager.connect(user2).updateProfile(newProfileHash)
      ).to.be.revertedWith("Profile does not exist");
    });
  });

  describe("Profile Access Control", function () {
    beforeEach(async function () {
      const profileHash = "test-hash";
      await profileManager.connect(user1).createProfile(profileHash);
    });

    it("Should allow profile owner to view their profile", async function () {
      const profile = await profileManager.connect(user1).getProfile(user1.address);
      expect(profile.userAddress).to.equal(user1.address);
    });

    it("Should not allow unauthorized users to view profile", async function () {
      await expect(
        profileManager.connect(user2).getProfile(user1.address)
      ).to.be.revertedWith("Not authorized to view this profile");
    });

    it("Should allow verifier to view any profile", async function () {
      await profileManager.connect(owner).addVerifier(verifier.address);

      const profile = await profileManager.connect(verifier).getProfile(user1.address);
      expect(profile.userAddress).to.equal(user1.address);
    });
  });

  describe("Verification System", function () {
    beforeEach(async function () {
      const profileHash = "test-hash";
      await profileManager.connect(user1).createProfile(profileHash);
      await profileManager.connect(owner).addVerifier(verifier.address);
    });

    it("Should allow verification request", async function () {
      const dataHash = "verification-data-hash";

      await profileManager.connect(user1).requestVerification(verifier.address, dataHash);

      // Check that verification request was created
      const userRequests = await profileManager.connect(user1).getUserVerificationRequests(user1.address);
      expect(userRequests.length).to.equal(1);
    });

    it("Should allow verifier to approve verification", async function () {
      const dataHash = "verification-data-hash";

      const tx = await profileManager.connect(user1).requestVerification(verifier.address, dataHash);
      const receipt = await tx.wait();

      // Get the request ID from the event
      const event = receipt.logs.find(log => {
        try {
          const decoded = profileManager.interface.parseLog(log);
          return decoded.name === 'VerificationRequested';
        } catch {
          return false;
        }
      });

      const requestId = event.args.requestId;
      const comments = "Profile verified successfully";

      await profileManager.connect(verifier).approveVerification(requestId, comments);

      const profile = await profileManager.connect(user1).getProfile(user1.address);
      expect(profile.isVerified).to.be.true;
    });
  });

  describe("Viewer Authorization", function () {
    beforeEach(async function () {
      const profileHash = "test-hash";
      await profileManager.connect(user1).createProfile(profileHash);
    });

    it("Should allow profile owner to authorize viewers", async function () {
      await profileManager.connect(user1).authorizeViewer(user2.address);

      const isAuthorized = await profileManager.isAuthorizedViewer(user1.address, user2.address);
      expect(isAuthorized).to.be.true;

      // Authorized viewer should be able to view profile
      const profile = await profileManager.connect(user2).getProfile(user1.address);
      expect(profile.userAddress).to.equal(user1.address);
    });

    it("Should allow profile owner to revoke viewer access", async function () {
      await profileManager.connect(user1).authorizeViewer(user2.address);
      await profileManager.connect(user1).revokeViewer(user2.address);

      const isAuthorized = await profileManager.isAuthorizedViewer(user1.address, user2.address);
      expect(isAuthorized).to.be.false;

      // Revoked viewer should not be able to view profile
      await expect(
        profileManager.connect(user2).getProfile(user1.address)
      ).to.be.revertedWith("Not authorized to view this profile");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to add verifiers", async function () {
      await profileManager.connect(owner).addVerifier(verifier.address);

      const hasVerifierRole = await profileManager.hasRole(
        await profileManager.VERIFIER_ROLE(),
        verifier.address
      );
      expect(hasVerifierRole).to.be.true;
    });

    it("Should allow admin to pause contract", async function () {
      await profileManager.connect(owner).pause();

      await expect(
        profileManager.connect(user1).createProfile("test-hash")
      ).to.be.revertedWithCustomError(profileManager, "EnforcedPause");
    });

    it("Should not allow non-admin to pause contract", async function () {
      await expect(
        profileManager.connect(user1).pause()
      ).to.be.reverted;
    });
  });
});