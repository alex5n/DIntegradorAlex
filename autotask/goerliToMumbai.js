const { ethers } = require("ethers");
const {
  DefenderRelaySigner,
  DefenderRelayProvider,
} = require("@openzeppelin/defender-relay-client/lib/ethers");

exports.handler = async function (data) {
  const payload = data.request.body.events;
  const provider = new DefenderRelayProvider(data);
  const signer = new DefenderRelaySigner(data, provider, { speed: "fast" });
  
  var onlyEvents = payload[0].matchReasons.filter((e) => e.type === "event");
  if (onlyEvents.length === 0) return;
  
  var event = onlyEvents.filter((ev) =>
    ev.signature.includes("PurchaseNftWithId")
  );
  var { account, id } = event[0].params;

  var addressCuyCollection = "0x49625B0Be305587566A4D8b4d99627A27c4A9AB9";
  var Abi = ["function safeMint(address to, uint256 tokenId)"];
  var ContractNFT = new ethers.Contract(addressCuyCollection, Abi, signer);
  var tx = await ContractNFT.safeMint(account, id);
  var res = await tx.wait();
  return res;
};