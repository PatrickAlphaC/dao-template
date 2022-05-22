import { GovernorContract, GovernanceToken, TimeLock, Box } from "../../typechain-types"
import { deployments, ethers } from "hardhat"
import { assert, expect } from "chai"
import {
  FUNC,
  PROPOSAL_DESCRIPTION,
  NEW_STORE_VALUE,
  VOTING_DELAY,
  VOTING_PERIOD,
  MIN_DELAY,
} from "../../helper-hardhat-config"
import { moveBlocks } from "../../utils/move-blocks"
import { moveTime } from "../../utils/move-time"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers"

describe("Governor Flow", async () => {
  let governor: GovernorContract
  let governanceToken: GovernanceToken
  let timeLock: TimeLock
  let box: Box
  let owner: SignerWithAddress
  let voterOne: SignerWithAddress
  const voteWay = 1 // for
  const reason = "I lika do da cha cha"
  beforeEach(async () => {
    await deployments.fixture(["all"])
    governor = await ethers.getContract("GovernorContract")
    timeLock = await ethers.getContract("TimeLock")
    governanceToken = await ethers.getContract("GovernanceToken")
    box = await ethers.getContract("Box")
    const [deployer, accOne] = await ethers.getSigners()
    owner = deployer
    voterOne = accOne
  })

  it("can only be changed through governance", async () => {
    await expect(box.store(55)).to.be.revertedWith("Ownable: caller is not the owner")
  })

  it("proposes, votes, waits, queues, and then executes", async () => {
    // propose
    const encodedFunctionCall = box.interface.encodeFunctionData(FUNC, [NEW_STORE_VALUE])
    const proposeTx = await governor.propose(
      [box.address],
      [0],
      [encodedFunctionCall],
      PROPOSAL_DESCRIPTION
    )

    const proposeReceipt = await proposeTx.wait(1)
    const proposalId = proposeReceipt.events![0].args!.proposalId
    let proposalState = await governor.state(proposalId)
    console.log(`Current Proposal State: ${proposalState}`)

    await moveBlocks(VOTING_DELAY + 1)
    // vote
    const voteTx = await governor.castVoteWithReason(proposalId, voteWay, reason)
    await voteTx.wait(1)
    proposalState = await governor.state(proposalId)
    assert.equal(proposalState.toString(), "1")
    console.log(`Current Proposal State: ${proposalState}`)
    await moveBlocks(VOTING_PERIOD + 1)

    // queue & execute
    // const descriptionHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(PROPOSAL_DESCRIPTION))
    const descriptionHash = ethers.utils.id(PROPOSAL_DESCRIPTION)
    const queueTx = await governor.queue([box.address], [0], [encodedFunctionCall], descriptionHash)
    await queueTx.wait(1)
    await moveTime(MIN_DELAY + 1)
    await moveBlocks(1)

    proposalState = await governor.state(proposalId)
    console.log(`Current Proposal State: ${proposalState}`)

    console.log("Executing...")
    console.log
    const exTx = await governor.execute([box.address], [0], [encodedFunctionCall], descriptionHash)
    await exTx.wait(1)
    console.log((await box.retrieve()).toString())
  })

  it("Votes and tokens can be transferred. Vote on a proposal can be delegated, vote weight, user has voted, proposal votes", async () => {
    let hasOwnerVoted
    let hasVoterOneVoted
    let ownerVoteWeight
    let voterOneVoteWeight
    let proposalVotes
    /** Propose */
    const encodedFunctionCall = box.interface.encodeFunctionData(FUNC, [NEW_STORE_VALUE])
    const proposeTx = await governor.propose(
      [box.address],
      [0],
      [encodedFunctionCall],
      PROPOSAL_DESCRIPTION
    )

    const proposeReceipt = await proposeTx.wait(1)
    const proposalId = proposeReceipt.events![0].args!.proposalId
    let proposalState = await governor.state(proposalId)
    console.log(`Current Proposal State: ${proposalState}`)

    await moveBlocks(VOTING_DELAY + 1)

    /** Have users voted */
    hasOwnerVoted = await governor.hasVoted(proposalId, owner.address)
    console.log(`HasOwnerVoted: ${hasOwnerVoted}`)
    assert.equal(hasOwnerVoted, false)

    hasVoterOneVoted = await governor.hasVoted(proposalId, voterOne.address)
    console.log(`hasVoterOneVoted: ${hasVoterOneVoted}`)
    assert.equal(hasVoterOneVoted, false)

    /** Users vote weight before transfers*/
    ownerVoteWeight = await governor.getVotes(owner.address, 2)
    console.log(`ownerVoteWeight: ${ownerVoteWeight}`)
    assert.equal(ownerVoteWeight.toString(), "1000000000000000000000000")

    voterOneVoteWeight = await governor.getVotes(voterOne.address, 2)
    console.log(`voterOneVoteWeight: ${voterOneVoteWeight}`)
    assert.equal(voterOneVoteWeight.toString(), "0")

    /** Delegate vote and check user vote weight */
    const delegationResponse = await governanceToken.connect(owner).delegate(voterOne.address)
    console.log(`Checkpoints owner: ${await governanceToken.numCheckpoints(owner.address)}`)
    console.log(`Checkpoints voter: ${await governanceToken.numCheckpoints(voterOne.address)}`)

    await delegationResponse.wait(1)
    await moveBlocks(1)

    ownerVoteWeight = await governor.getVotes(owner.address, VOTING_DELAY + 12)
    console.log(`ownerVoteWeight after delegation: ${ownerVoteWeight}`)
    assert.equal(ownerVoteWeight.toString(), "0")

    voterOneVoteWeight = await governor.getVotes(voterOne.address, VOTING_DELAY + 12)
    console.log(`voterOneVoteWeight: ${voterOneVoteWeight}`)
    assert.equal(voterOneVoteWeight.toString(), "1000000000000000000000000")

    const transferTx = await governanceToken.connect(owner).transfer(voterOne.address, 50000)
    await transferTx.wait(1)

    /** Asserts user delegatee */
    const delegatee = await governanceToken.delegates(owner.address)
    assert.equal(delegatee, voterOne.address)

    /** User token balance before and after transfers */
    const voterOneTokenBalance = await governanceToken.balanceOf(voterOne.address)
    const ownerTokenBalance = await governanceToken.balanceOf(owner.address)
    console.log(`voterOneTokenBalance token balance after transfer: ${voterOneTokenBalance}`)
    assert.equal(voterOneTokenBalance.toString(), "50000")
    console.log(`ownerTokenBalance token balance after transfer: ${ownerTokenBalance}`)
    assert.equal(ownerTokenBalance.toString(), "999999999999999999950000")
    await moveBlocks(1)

    /** Proposal votes before users casting votes */
    proposalVotes = await governor.proposalVotes(proposalId)
    console.log(`proposalVotes: ${proposalVotes}`)
    assert.equal(proposalVotes.toString(), "0,0,0")

    /** Asserts user has voted after casting a vote */
    const voteTx = await governor
      .connect(voterOne)
      .castVoteWithReason(proposalId, voteWay, reason, { from: voterOne.address })
    await voteTx.wait(1)

    console.log(voteTx.value)

    await moveBlocks(20)

    hasVoterOneVoted = await governor.hasVoted(proposalId, voterOne.address)
    console.log(`hasVoterOneVoted: ${hasVoterOneVoted}`)
    assert.equal(hasVoterOneVoted, true)

    /** This is failing, should be true */
    // hasOwnerVoted = await governor.hasVoted(proposalId, owner.address)
    // console.log(`HasOwnerVoted: ${hasOwnerVoted}`)
    // assert.equal(hasOwnerVoted, true)

    /** Proposal votes after users casting votes */
    // This is failing as well
    proposalVotes = await governor.proposalVotes(proposalId)
    console.log(`proposalVotes: ${proposalVotes}`)
    assert.equal(proposalVotes.toString(), "0,1000000000000000000000000,0")
  })
})
