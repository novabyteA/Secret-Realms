import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the SecretRealmsGame address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const deployment = await deployments.get("SecretRealmsGame");
  console.log("SecretRealmsGame address is " + deployment.address);
});

task("task:list-players", "Lists all registered players")
  .addOptionalParam("address", "Optionally specify the SecretRealmsGame contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers } = hre;

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("SecretRealmsGame");
    const contract = await ethers.getContractAt("SecretRealmsGame", deployment.address);

    const players = await contract.listPlayers();
    if (players.length === 0) {
      console.log("No players have joined yet.");
      return;
    }

    console.log("Registered players:");
    players.forEach((player: string, index: number) => {
      console.log(`${index + 1}. ${player}`);
    });
  });

task("task:join", "Commits encrypted coordinates to the SecretRealmsGame contract")
  .addParam("x", "X coordinate between 1 and 10")
  .addParam("y", "Y coordinate between 1 and 10")
  .addOptionalParam("address", "Optionally specify the SecretRealmsGame contract address")
  .addOptionalParam("signer", "Index of the signer to use", "0")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    const x = parseInt(taskArguments.x, 10);
    const y = parseInt(taskArguments.y, 10);

    if (!Number.isInteger(x) || x < 1 || x > 10) {
      throw new Error("Argument --x must be an integer between 1 and 10");
    }

    if (!Number.isInteger(y) || y < 1 || y > 10) {
      throw new Error("Argument --y must be an integer between 1 and 10");
    }

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("SecretRealmsGame");
    console.log(`SecretRealmsGame: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const signerIndex = parseInt(taskArguments.signer ?? "0", 10);

    if (signerIndex < 0 || signerIndex >= signers.length) {
      throw new Error(`Invalid signer index: ${signerIndex}`);
    }

    const actor = signers[signerIndex];
    console.log(`Using signer ${actor.address}`);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, actor.address)
      .add32(x)
      .add32(y)
      .encrypt();

    const contract = await ethers.getContractAt("SecretRealmsGame", deployment.address);

    const tx = await contract
      .connect(actor)
      .joinGame(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Encrypted coordinates committed for ${actor.address}`);
  });

task("task:decrypt-position", "Decrypts the stored coordinates for a player")
  .addOptionalParam("address", "Optionally specify the SecretRealmsGame contract address")
  .addOptionalParam("player", "Player address whose coordinates should be decrypted")
  .addOptionalParam("signer", "Index of the signer to use for decryption", "0")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("SecretRealmsGame");
    const signers = await ethers.getSigners();
    const signerIndex = parseInt(taskArguments.signer ?? "0", 10);

    if (signerIndex < 0 || signerIndex >= signers.length) {
      throw new Error(`Invalid signer index: ${signerIndex}`);
    }

    const actor = signers[signerIndex];
    const targetPlayer = (taskArguments.player as string | undefined) ?? actor.address;

    console.log(`SecretRealmsGame: ${deployment.address}`);
    console.log(`Decrypting coordinates for ${targetPlayer} using signer ${actor.address}`);

    const contract = await ethers.getContractAt("SecretRealmsGame", deployment.address);

    const [encryptedX, encryptedY] = await contract.getPlayerPosition(targetPlayer);

    const clearX = await fhevm.userDecryptEuint(FhevmType.euint32, encryptedX, deployment.address, actor);
    const clearY = await fhevm.userDecryptEuint(FhevmType.euint32, encryptedY, deployment.address, actor);

    console.log(`Encrypted X: ${encryptedX}`);
    console.log(`Encrypted Y: ${encryptedY}`);
    console.log(`Clear X     : ${clearX}`);
    console.log(`Clear Y     : ${clearY}`);
  });

task("task:grant-access", "Grants another address access to decrypt your coordinates")
  .addParam("viewer", "Address that should gain decryption rights")
  .addOptionalParam("address", "Optionally specify the SecretRealmsGame contract address")
  .addOptionalParam("signer", "Index of the signer granting access", "0")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers } = hre;

    const viewer = taskArguments.viewer as string;
    if (!ethers.isAddress(viewer)) {
      throw new Error(`Invalid viewer address: ${viewer}`);
    }

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("SecretRealmsGame");
    const signers = await ethers.getSigners();
    const signerIndex = parseInt(taskArguments.signer ?? "0", 10);

    if (signerIndex < 0 || signerIndex >= signers.length) {
      throw new Error(`Invalid signer index: ${signerIndex}`);
    }

    const actor = signers[signerIndex];
    console.log(`SecretRealmsGame: ${deployment.address}`);
    console.log(`Granting access from ${actor.address} to ${viewer}`);

    const contract = await ethers.getContractAt("SecretRealmsGame", deployment.address);
    const tx = await contract.connect(actor).grantPositionAccess(viewer);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });
