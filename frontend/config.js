export const TOKEN_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const CROWDFUNDING_ADDR = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function transferFrom(address, address, uint256) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

export const CROWDFUNDING_ABI = [
  "function campaignCount() view returns (uint256)",
  "function campaigns(uint256) view returns (uint256, string, uint256, uint256, address, uint256, bool)",
  "function createCampaign(string, uint256, uint256)",
  "function contribute(uint256) payable",
  "function finalizeCampaign(uint256)",
  "function getCampaign(uint256) view returns (uint256, string, uint256, uint256, address, uint256, bool)",
  "function contributions(uint256, address) view returns (uint256)",
  "event CampaignCreated(uint256 id, string title, uint256 goal, uint256 deadline, address creator)",
  "event ContributionMade(uint256 campaignId, address contributor, uint256 amount)",
  "event CampaignFinalized(uint256 campaignId, uint256 totalRaised)"
];