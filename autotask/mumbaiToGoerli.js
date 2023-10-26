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
    ev.signature.includes("Burn")
  );
  var { account, id } = event[0].params;

  var BBitesToken = "0x815cCE856d584A026A26A10DB21250F15c127D91";
  var Abi = ["function mint(address to, uint256 amount)"];
  var ContractBBites = new ethers.Contract(BBitesToken, Abi, signer);
  var tx = await ContractBBites.mint(account, id);
  var res = await tx.wait();
  return res;
};
