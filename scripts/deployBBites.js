const {
    getRole,
    verify,
    ex,
    printAddress,
    deploySC,
    deploySCNoUp,
} = require("../utils");

// npx hardhat --network goerli run scripts/deployBBites.js
async function deployGoerli() {
    var BBitesToken = "BBitesToken";
    var contractBBitesToken = await deploySC(BBitesToken);
    console.log("BBitesToken: ", await contractBBitesToken.getAddress());
    var implementationAddress = await printAddress(BBitesToken, await contractBBitesToken.getAddress());
    console.log("implementationAddress: ", implementationAddress);
    await verify(implementationAddress, BBitesToken);
}
// BBitesToken Proxy Address: 0x815cCE856d584A026A26A10DB21250F15c127D91
// BBitesToken Impl Address: 0x257b9f31799f16b6787d8eED205686883cEb493b 
// https://goerli.etherscan.io/address/0x257b9f31799f16b6787d8eED205686883cEb493b#code
// https://goerli.etherscan.io/address/0x815cCE856d584A026A26A10DB21250F15c127D91#readProxyContract
deployGoerli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});