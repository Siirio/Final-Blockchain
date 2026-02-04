// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RNTtoken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Crowdfunding is Ownable {
    struct Campaign {
        uint256 id;
        string title;
        uint256 goal;
        uint256 deadline;
        address payable creator;
        uint256 totalRaised;
        bool finalized;
    }

    RNTtoken public rewardToken;
    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event CampaignCreated(uint256 id, string title, uint256 goal, uint256 deadline, address creator);
    event ContributionMade(uint256 campaignId, address contributor, uint256 amount);
    event CampaignFinalized(uint256 campaignId, uint256 totalRaised);

    constructor(address _rewardTokenAddress) Ownable(msg.sender) {
        rewardToken = RNTtoken(_rewardTokenAddress);
    }

    function createCampaign(string memory _title, uint256 _goal, uint256 _duration) public {
        require(_goal > 0, "Goal must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");

        campaignCount++;
        campaigns[campaignCount] = Campaign({
            id: campaignCount,
            title: _title,
            goal: _goal,
            deadline: block.timestamp + _duration,
            creator: payable(msg.sender),
            totalRaised: 0,
            finalized: false
        });

        emit CampaignCreated(campaignCount, _title, _goal, block.timestamp + _duration, msg.sender);
    }

    function contribute(uint256 _campaignId) public payable {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(!campaign.finalized, "Campaign already finalized");
        require(msg.value > 0, "Contribution must be greater than 0");

        campaign.totalRaised += msg.value;
        contributions[_campaignId][msg.sender] += msg.value;

        uint256 rewardAmount = msg.value * 100; 
        rewardToken.mint(msg.sender, rewardAmount);

        emit ContributionMade(_campaignId, msg.sender, msg.value);
    }

    function finalizeCampaign(uint256 _campaignId) public {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp >= campaign.deadline || campaign.totalRaised >= campaign.goal, "Campaign conditions not met for finalization");
        require(!campaign.finalized, "Campaign already finalized");

        campaign.finalized = true;
        
        if (campaign.totalRaised > 0) {
            campaign.creator.transfer(campaign.totalRaised);
        }

        emit CampaignFinalized(_campaignId, campaign.totalRaised);
    }

    function getCampaign(uint256 _campaignId) public view returns (
        uint256 id,
        string memory title,
        uint256 goal,
        uint256 deadline,
        address creator,
        uint256 totalRaised,
        bool finalized
    ) {
        Campaign storage c = campaigns[_campaignId];
        return (c.id, c.title, c.goal, c.deadline, c.creator, c.totalRaised, c.finalized);
    }
}
