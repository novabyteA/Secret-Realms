import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedSecretRealms = await deploy("SecretRealmsGame", {
    from: deployer,
    log: true,
  });

  console.log("SecretRealmsGame contract:", deployedSecretRealms.address);
};
export default func;
func.id = "deploy_secretRealmsGame"; // id required to prevent reexecution
func.tags = ["SecretRealmsGame"];
