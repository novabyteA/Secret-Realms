import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { SecretRealmsGame } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("SecretRealmsGameSepolia", function () {
  let signers: Signers;
  let secretRealms: SecretRealmsGame;
  let secretRealmsAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn("This hardhat test suite can only run on Sepolia Testnet");
      this.skip();
    }

    try {
      const deployment = await deployments.get("SecretRealmsGame");
      secretRealmsAddress = deployment.address;
      secretRealms = (await ethers.getContractAt("SecretRealmsGame", deployment.address)) as SecretRealmsGame;
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const [alice] = await ethers.getSigners();
    signers = { alice };
  });

  beforeEach(async function () {
    step = 0;
    steps = 8;
  });

  it("updates and decrypts player coordinates on Sepolia", async function () {
    this.timeout(4 * 40000);

    progress("Encrypting coordinates (4,7)...");
    const encryptedCoordinates = await fhevm
      .createEncryptedInput(secretRealmsAddress, signers.alice.address)
      .add32(4)
      .add32(7)
      .encrypt();

    progress("Submitting joinGame transaction...");
    const tx = await secretRealms
      .connect(signers.alice)
      .joinGame(encryptedCoordinates.handles[0], encryptedCoordinates.handles[1], encryptedCoordinates.inputProof);
    await tx.wait();

    progress("Fetching encrypted player position...");
    const [encryptedX, encryptedY] = await secretRealms.getPlayerPosition(signers.alice.address);
    expect(encryptedX).to.not.eq(ethers.ZeroHash);
    expect(encryptedY).to.not.eq(ethers.ZeroHash);

    progress("Decrypting stored coordinates...");
    const clearX = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedX,
      secretRealmsAddress,
      signers.alice,
    );
    const clearY = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedY,
      secretRealmsAddress,
      signers.alice,
    );

    progress(`Clear coordinates (${clearX}, ${clearY}) retrieved.`);
    expect(clearX).to.equal(4);
    expect(clearY).to.equal(7);
  });
});
