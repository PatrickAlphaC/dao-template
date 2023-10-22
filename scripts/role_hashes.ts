import { ethers } from "ethers";

async function printRoleHashes() {
  const proposerRole = ethers.id("PROPOSER_ROLE");
  const executorRole = ethers.id("EXECUTOR_ROLE");
  const adminRole = ethers.id("CANCELLER_ROLE");

  console.log(`Proposer Role Hash: ${proposerRole}`);
  console.log(`Executor Role Hash: ${executorRole}`);
  console.log(`Admin Role Hash: ${adminRole}`);
}

printRoleHashes().catch((error) => {
  console.error("An error occurred:", error);
});
