import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
 
import {   ADDRESS_ZERO } from "../helper-hardhat-config"
import { ethers } from "hardhat"

const setupContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // @ts-ignore
  const { getNamedAccounts, deployments  } = hre
  const { log } = deployments
  const { deployer } = await getNamedAccounts()
   
  const timeLock = await ethers.getContract("TimeLock", deployer)
  const governor = await ethers.getContract("GovernorContract", deployer)

  log("----------------------------------------------------")
  log("Setting up contracts for roles...")
  // would be great to use multicall here...
  const proposerRole = process.env.PROPOSER;

  // const executorRole = await Timelock.EXECUTOR_ROLE();
  const executorRole = process.env.EXECUTOR;
  const cancellerRole = process.env.CANCELLER;

  // .address becomes .target for deployed function
  //  to use function you need getFunction with this structure : getFunction("fnName")([args]) 
  const proposerTx = await timeLock.getFunction("grantRole")(proposerRole, governor.target)
  await proposerTx.wait(1)
  const executorTx = await timeLock.getFunction("grantRole")(executorRole, ADDRESS_ZERO)
  await executorTx.wait(1)
  const revokeTx = await timeLock.getFunction("revokeRole")(cancellerRole, deployer)
  await revokeTx.wait(1)
  // Guess what? Now, anything the timelock wants to do has to go through the governance process!
}

export default setupContracts
setupContracts.tags = ["all", "setup"]
