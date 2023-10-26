const { ethers, upgrades } = require("hardhat");
const {
  getRole,
  verify,
  ex,
  printAddress,
  deploySC,
  deploySCNoUp,
} = require("../utils");

// Publicar NFT en Mumbai
// npx hardhat --network mumbai run scripts/deploy.js
async function deployCuyCollectionNFT() {
  var CuyCollectionNFT = "CuyCollectionNFT";
  var contractCuyCollectionNFT = await deploySC(CuyCollectionNFT);
  console.log("CuyCollectionNFT: ", await contractCuyCollectionNFT.getAddress());
  var implementationAddress = await printAddress(CuyCollectionNFT, await contractCuyCollectionNFT.getAddress());
  console.log("implementationAddress: ", implementationAddress);
  await verify(implementationAddress, CuyCollectionNFT);
}

// Publicar Public Sale en Goerli
// npx hardhat clean
// npx hardhat --network goerli run scripts/deploy.js
// npx hardhat verify --network goerli 0xC6382f59707417eD40619aBd9de0420E642C38eC 
async function deployPublicSale() {
  var PublicSale = "PublicSale";
  var contractPublicSale = await deploySC(PublicSale);
  console.log("PublicSale: ", await contractPublicSale.getAddress());
  var implementationAddress = await printAddress(PublicSale, await contractPublicSale.getAddress());
  console.log("implementationAddress: ", implementationAddress);
  await verify(implementationAddress, PublicSale);
}

async function updatePublicSale() {
  const ProxyAddress = "0x21c4934018aC2437c05d07b69bC36F057f3C318d";
  var publicSaleNew = "PublicSaleV3";
  const ContractPublicSaleV2 = await ethers.getContractFactory(publicSaleNew);
  const contractPublicSaleV2 = await upgrades.upgradeProxy(
    ProxyAddress,
    ContractPublicSaleV2
  );

  // esperar unas confirmaciones
  await contractPublicSaleV2.waitForDeployment();
  for (let index = 0; index < 1000; index++) {}

  var implV2 = await upgrades.erc1967.getImplementationAddress(ProxyAddress);
  console.log(`Address Proxy: ${ProxyAddress}`);
  console.log(`Address Impl V2: ${implV2}`);

  await hre.run("verify:verify", {
    address: implV2,
    constructorArguments: [],
  });

}

/*deployCuyCollectionNFT()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });*/

deployPublicSale()
.catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/*updatePublicSale()
.catch((error) => {
  console.error(error);
  process.exitCode = 1;
});*/

// CuyCollectionNFT
// CuyCollectionNFT Proxy Address: 0x49625B0Be305587566A4D8b4d99627A27c4A9AB9
// CuyCollectionNFT Impl Address: 0xeA2F3527AA79f847dF40B9d08E7Bb582E12d8F1f
// https://mumbai.polygonscan.com/address/0xeA2F3527AA79f847dF40B9d08E7Bb582E12d8F1f#code
// https://mumbai.polygonscan.com/address/0x49625B0Be305587566A4D8b4d99627A27c4A9AB9#readProxyContract



// PublicSale
// https://goerli.etherscan.io/address/0x48f0Fbcb5547c720C6108c5d01536b093BB647b9#readProxyContract