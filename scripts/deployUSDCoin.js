const {
    getRole,
    verify,
    ex,
    printAddress,
    deploySC,
    deploySCNoUp,
} = require("../utils");

// npx hardhat --network goerli run scripts/deployUSDCoin.js
async function deployGoerli() {
    var usdc = "USDCoin";
    var contractUSDCoin = await deploySCNoUp(usdc);
    console.log("USDCoin: ", await contractUSDCoin.getAddress());
    await verify(await contractUSDCoin.getAddress(), usdc)
}
//USDCoin:  0xb457B2AaDb605d5AdF542e34F3c89BD0765570Aa
//https://goerli.etherscan.io/address/0xb457B2AaDb605d5AdF542e34F3c89BD0765570Aa#code
deployGoerli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});