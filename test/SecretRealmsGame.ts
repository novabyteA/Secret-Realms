import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { SecretRealmsGame, SecretRealmsGame__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  carol: HardhatEthersSigner;
};

describe("SecretRealmsGame", function () {
  let signers: Signers;
  let secretRealms: SecretRealmsGame;
  let contractAddress: string;

  before(async function () {
    const [deployer, alice, bob, carol] = await ethers.getSigners();
    signers = { deployer, alice, bob, carol };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    const factory = (await ethers.getContractFactory("SecretRealmsGame")) as SecretRealmsGame__factory;
    secretRealms = (await factory.deploy()) as SecretRealmsGame;
    contractAddress = await secretRealms.getAddress();
  });

  async function encryptCoordinates(owner: HardhatEthersSigner, x: number, y: number) {
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, owner.address)
      .add32(x)
      .add32(y)
      .encrypt();

    return {
      handleX: encryptedInput.handles[0],
      handleY: encryptedInput.handles[1],
      proof: encryptedInput.inputProof,
    };
  }

  async function decryptCoordinate(
    encryptedValue: string,
    decryptingSigner: HardhatEthersSigner,
  ): Promise<number> {
    return fhevm.userDecryptEuint(FhevmType.euint32, encryptedValue, contractAddress, decryptingSigner);
  }

  it("stores and decrypts player coordinates", async function () {
    const coords = await encryptCoordinates(signers.alice, 7, 3);

    const tx = await secretRealms.connect(signers.alice).joinGame(coords.handleX, coords.handleY, coords.proof);
    await tx.wait();

    const [encryptedX, encryptedY] = await secretRealms.getPlayerPosition(signers.alice.address);
    const clearX = await decryptCoordinate(encryptedX, signers.alice);
    const clearY = await decryptCoordinate(encryptedY, signers.alice);

    expect(clearX).to.equal(7);
    expect(clearY).to.equal(3);
    expect(await secretRealms.hasJoined(signers.alice.address)).to.equal(true);
    expect(await secretRealms.getJoinTimestamp(signers.alice.address)).to.be.gt(0);
  });

  it("updates player position on subsequent joins", async function () {
    const first = await encryptCoordinates(signers.alice, 2, 2);
    await secretRealms.connect(signers.alice).joinGame(first.handleX, first.handleY, first.proof);

    const second = await encryptCoordinates(signers.alice, 9, 10);
    await secretRealms.connect(signers.alice).joinGame(second.handleX, second.handleY, second.proof);

    const [encryptedX, encryptedY] = await secretRealms.getPlayerPosition(signers.alice.address);
    const clearX = await decryptCoordinate(encryptedX, signers.alice);
    const clearY = await decryptCoordinate(encryptedY, signers.alice);

    expect(clearX).to.equal(9);
    expect(clearY).to.equal(10);

    const players = await secretRealms.listPlayers();
    expect(players).to.deep.equal([signers.alice.address]);
  });

  it("grants decryption access to another player", async function () {
    const coords = await encryptCoordinates(signers.alice, 5, 6);
    await secretRealms.connect(signers.alice).joinGame(coords.handleX, coords.handleY, coords.proof);

    await secretRealms.connect(signers.alice).grantPositionAccess(signers.bob.address);

    const [encryptedX, encryptedY] = await secretRealms.getPlayerPosition(signers.alice.address);
    const sharedX = await decryptCoordinate(encryptedX, signers.bob);
    const sharedY = await decryptCoordinate(encryptedY, signers.bob);

    expect(sharedX).to.equal(5);
    expect(sharedY).to.equal(6);
  });

  it("lists unique players once after multiple joins", async function () {
    const aliceCoords = await encryptCoordinates(signers.alice, 1, 4);
    await secretRealms.connect(signers.alice).joinGame(aliceCoords.handleX, aliceCoords.handleY, aliceCoords.proof);

    const bobCoords = await encryptCoordinates(signers.bob, 8, 8);
    await secretRealms.connect(signers.bob).joinGame(bobCoords.handleX, bobCoords.handleY, bobCoords.proof);

    const updatedBob = await encryptCoordinates(signers.bob, 3, 7);
    await secretRealms.connect(signers.bob).joinGame(updatedBob.handleX, updatedBob.handleY, updatedBob.proof);

    const players = await secretRealms.listPlayers();
    expect(players).to.deep.equal([signers.alice.address, signers.bob.address]);
  });

  it("reverts when requesting position for non registered player", async function () {
    await expect(secretRealms.getPlayerPosition(signers.carol.address)).to.be.revertedWithCustomError(
      secretRealms,
      "PlayerNotRegistered",
    );
  });

  it("reverts when granting access to zero address", async function () {
    const coords = await encryptCoordinates(signers.alice, 10, 1);
    await secretRealms.connect(signers.alice).joinGame(coords.handleX, coords.handleY, coords.proof);

    await expect(secretRealms.connect(signers.alice).grantPositionAccess(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      secretRealms,
      "InvalidViewer",
    );
  });
});
