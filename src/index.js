import { Contract, ethers } from "ethers";

import usdcTknAbi from "../artifacts/contracts/USDCoin.sol/USDCoin.json";
import bbitesTokenAbi from "../artifacts/contracts/BBitesToken.sol/BBitesToken.json";
import publicSaleAbi from "../artifacts/contracts/PublicSale.sol/PublicSale.json";
import nftTknAbi from "../artifacts/contracts/CuyCollectionNft.sol/CuyCollectionNFT.json";

// SUGERENCIA: vuelve a armar el MerkleTree en frontend
// Utiliza la libreria buffer

import buffer from "buffer/";
import walletAndIds from "../wallets/walletList";
import { MerkleTree } from "merkletreejs";
var Buffer = buffer.Buffer;
var merkleTree;

function hashToken(tokenId, account) {
  return Buffer.from(
    ethers
      .solidityPackedKeccak256(["uint256", "address"], [tokenId, account])
      .slice(2),
    "hex"
  );
}
function buildMerkleTree() {
  var elementosHasheados = walletAndIds.map(({ id, address }) => {
    return hashToken(id, address);
  });
  merkleTree = new MerkleTree(elementosHasheados, ethers.keccak256, {
    sortPairs: true,
  });
}

var provider, signer, account;
var providerGoerli, providerMumbai;
providerGoerli = new ethers.BrowserProvider(window.ethereum, 'goerli');
providerMumbai = new ethers.BrowserProvider(window.ethereum, 'matic-mumbai');
var usdcTkContract, bbitesTknContract, pubSContract, nftContract;
var nftContractEvents, usdcTkContractE, bbitesTknContractE, pubSContractE;
var usdcAddress, bbitesTknAdd, pubSContractAdd, nftAddress;

function setUpMetamask() {
  // Connect to Metamask
  var bttn = document.getElementById("connect");
  var walletIdEl = document.getElementById("walletId");
  bttn.addEventListener("click", async function () {
    if (window.ethereum) {
      [account] = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Billetera metamask", account);
      walletIdEl.innerHTML = account;
      signer = await provider.getSigner(account);
      console.log(await provider.getNetwork());
    }
    /*await pubSContract.emit("PurchaseNftWithId","0x413f559B9B7632A9F36CaB8a6164e254596b64C2",5);
    await nftContract.emit("Transfer","0x413f559B9B7632A9F36CaB8a6164e254596b64C2", "0x413f559B9B7632A9F36CaB8a6164e254596b64C2", 15);
    await nftContract.emit("Burn", "0x413f559B9B7632A9F36CaB8a6164e254596b64C2", 15);
    console.log(pubSContract.getEvent("Transfer").name);
    console.log(await pubSContract.listenerCount());
    console.log(await nftContractEvents.listenerCount());*/

  });

}

function initSCsGoerli() {
  //provider = new ethers.BrowserProvider(window.ethereum, "goerli");
  provider = new ethers.BrowserProvider(window.ethereum);

  usdcAddress = "0xb457B2AaDb605d5AdF542e34F3c89BD0765570Aa";
  bbitesTknAdd = "0x815cCE856d584A026A26A10DB21250F15c127D91";
  pubSContractAdd = "0x48f0Fbcb5547c720C6108c5d01536b093BB647b9";

  usdcTkContract = new Contract(usdcAddress, usdcTknAbi.abi, provider);
  bbitesTknContract = new Contract(bbitesTknAdd, bbitesTokenAbi.abi, provider);
  pubSContract = new Contract(pubSContractAdd, publicSaleAbi.abi, provider);
}

function initSCsMumbai() {
  //providerMumbai = new ethers.BrowserProvider(window.ethereum);
  provider = new ethers.BrowserProvider(window.ethereum);
  nftAddress = "0x49625B0Be305587566A4D8b4d99627A27c4A9AB9";
  nftContract = new Contract(nftAddress, nftTknAbi.abi, provider);
}

function setUpListeners() {

  // USDC Balance - balanceOf
  var bttn = document.getElementById("usdcUpdate");
  bttn.addEventListener("click", async function () {
    try {
      var balance = await usdcTkContract.balanceOf(account);
      var balanceEl = document.getElementById("usdcBalance");
      balanceEl.innerHTML = ethers.formatUnits(balance, 6);
    } catch (error) {
      console.log(error);
    }
  });

  // Bbites token Balance - balanceOf
  var btnbb = document.getElementById("bbitesTknUpdate");
  btnbb.addEventListener("click", async () => {
    try {
      var balancebb = await bbitesTknContract.balanceOf(account);
      var balancebbup = document.getElementById("bbitesTknBalance");
      balancebbup.innerHTML = ethers.formatEther(balancebb, 18);
    } catch (error) {
      console.log(error);
    }
  })

  // APPROVE BBTKN
  // bbitesTknContract.approve
  var bttn = document.getElementById("approveButtonBBTkn");
  bttn.addEventListener("click", async () => {
    var amountBB = document.getElementById("approveInput").value;
    var errors = document.getElementById("approveError");
    let amount = ethers.parseUnits(amountBB, 18);
    var allowance = await bbitesTknContract.allowance(account, pubSContractAdd);
    try {
      if (allowance == 0) {
        await bbitesTknContract.connect(signer).approve(pubSContractAdd, amount);
      } else {
        await bbitesTknContract.connect(signer).increaseAllowance(pubSContractAdd, amount);
      }
    } catch (error) {
      console.log(error);
      errors.innerHTML = error.code;
    }
  });

  // APPROVE USDC
  // usdcTkContract.approve
  var bttn = document.getElementById("approveButtonUSDC");
  bttn.addEventListener("click", async () => {
    var amountBB = document.getElementById("approveInputUSDC").value;
    var errors = document.getElementById("approveErrorUSDC");
    let amount = ethers.parseUnits(amountBB, 6);
    var allowance = await usdcTkContract.allowance(account, pubSContractAdd);
    try {
      if (allowance == 0) {
        await usdcTkContract.connect(signer).approve(pubSContractAdd, amount);
      } else {
        await usdcTkContract.connect(signer).increaseAllowance(pubSContractAdd, amount);
      }
    } catch (error) {
      console.log(error);
      errors.innerHTML = error.code;
    }
  });
  // purchaseWithTokens
  var bttn = document.getElementById("purchaseButton");
  bttn.addEventListener("click", async () => {
    var tokenId = document.getElementById("purchaseInput").value;
    var errors = document.getElementById("purchaseError");
    try {
      var tx = await pubSContract.connect(signer).purchaseWithTokens(tokenId);
      var res = await tx.wait();
      console.log("Transaction hash: ", res.hash);
    } catch (error) {
      console.log(error);
      errors.innerHTML = error.reason;
    }
  });
  // purchaseWithUSDC
  var bttn = document.getElementById("purchaseButtonUSDC");
  bttn.addEventListener("click", async () => {
    var tokenId = document.getElementById("purchaseInputUSDC").value;
    var amountUSDC = document.getElementById("amountInUSDCInput").value;
    let amount = ethers.parseUnits(amountUSDC, 6);
    console.log(amount);
    var errors = document.getElementById("purchaseErrorUSDC");
    try {
      var tx = await pubSContract.connect(signer).purchaseWithUSDC(tokenId, amount);
      var res = await tx.wait();
      console.log("Transaction hash: ", res.hash);
    } catch (error) {
      console.log(error);
      errors.innerHTML = error.reason;
    }
  });
  // purchaseWithEtherAndId
  var bttn = document.getElementById("purchaseButtonEtherId");
  bttn.addEventListener("click", async () => {
    var tokenId = document.getElementById("purchaseInputEtherId").value;
    var errors = document.getElementById("purchaseEtherIdError");
    var amount = ethers.parseEther("0.01");
    try {
      var tx = await pubSContract.connect(signer).purchaseWithEtherAndId(tokenId, { value: amount });
      var res = await tx.wait();
      console.log("Transaction hash: ", res.hash);
    } catch (error) {
      console.log(error);
      errors.innerHTML = error.reason;
    }
  });
  // send Ether
  var bttn = document.getElementById("sendEtherButton");
  bttn.addEventListener("click", async () => {
    var amount = ethers.parseEther("0.01");
    var errors = document.getElementById("sendEtherError");
    try {
      var tx = await signer.sendTransaction({ to: pubSContractAdd, value: amount });
      var res = await tx.wait();
      console.log("Transaction hash: ", res.hash);
    } catch (error) {
      console.log(error);
      errors.innerHTML = error.reason;
    }
  });
  // getPriceForId
  var bttn = document.getElementById("getPriceNftByIdBttn");
  bttn.addEventListener("click", async () => {
    var tokenId = document.getElementById("priceNftIdInput").value;
    var precioNFT = document.getElementById("priceNftByIdText");
    var errors = document.getElementById("getPriceNftError");
    if (tokenId < 200) {
      precioNFT.innerHTML = "1000 BBites Token";
    } else if (tokenId < 500) {
      precioNFT.innerHTML = (tokenId * 20).toString() + " BBites Token";
    } else if (tokenId < 700) {
      let startDate = 1696032000;
      let tiempoActual = Math.floor(new Date().getTime() / 1000.0);
      let dias = Math.trunc((tiempoActual - startDate) / (60 * 60 * 24));
      let precio = 10000 + 2000 * dias;
      precio = precio > 90000 ? 90000 : precio;
      precioNFT.innerHTML = (precio).toString() + " BBites Token";
    } else if (tokenId < 1000) {
      precioNFT.innerHTML = "0.01 ether";
    } else {
      errors.innerHTML = "TokenId no disponible";
    }
  });
  // getProofs
  var bttn = document.getElementById("getProofsButtonId");
  bttn.addEventListener("click", async () => {
    var id = document.getElementById("inputIdProofId").value;
    var address = document.getElementById("inputAccountProofId").value;
    var proofs = merkleTree.getHexProof(hashToken(id, address));
    navigator.clipboard.writeText(JSON.stringify(proofs));
  });

  // safeMintWhiteList
  var bttn = document.getElementById("safeMintWhiteListBttnId");
  bttn.addEventListener("click", async () => {
    var account = document.getElementById("whiteListToInputId").value;
    var tokenId = document.getElementById("whiteListToInputTokenId").value;
    var proofs = document.getElementById("whiteListToInputProofsId").value;
    var errors = document.getElementById("whiteListErrorId");
    proofs = JSON.parse(proofs).map(ethers.hexlify);
    try {
      var tx = await nftContract.connect(signer).safeMintWhiteList(account, tokenId, proofs);
      var res = await tx.wait();
      console.log("Transaction hash: ", res.hash);
    } catch (error) {
      console.log(error);
      errors.innerHTML = error.reason;
    }
  });

  // buyBack
  var bttn = document.getElementById("buyBackBttn");
  bttn.addEventListener("click", async () => {
    var tokenId = document.getElementById("buyBackInputId").value;
    var errors = document.getElementById("buyBackErrorId");
    try {
      var tx = await nftContract.connect(signer).buyBack(tokenId);
      var res = await tx.wait();
      console.log("Transaction hash: ", res.hash);
    } catch (error) {
      console.log(error);
      errors.innerHTML = error.reason;
    }
  });
}

function setUpEventsContracts() {
  var pubSList = document.getElementById("pubSList");
  pubSContract.on("PurchaseNftWithId", (account, id) => {
    let eventDetail = "PurchaseNftWithId from " + account + " with token id(" + id + ") Goerli";
    console.log(eventDetail);
    pubSList.innerHTML = eventDetail;
  });
  // pubSContract - "PurchaseNftWithId"

  var bbitesListEl = document.getElementById("bbitesTList");
  bbitesTknContract.on("Transfer", (from, to, amount) => {
    let eventDetail = "Transfer from " + from + " to " + to + " with amount(" + amount + ") Goerli";
    console.log(eventDetail);
    bbitesListEl.innerHTML = eventDetail;
  });
  // bbitesCListener - "Transfer"

  var nftList = document.getElementById("nftList");
  //await nftContract.addListener("Transfer",(from, to, tokenId));
  let nftc = new Contract("0x49625B0Be305587566A4D8b4d99627A27c4A9AB9", nftTknAbi.abi, ethers.BrowserProvider(window.ethereum));
  nftc.on("Transfer", (from, to, tokenId) => {
    let eventDetail = "NFT Transfer from " + from + " to " + to + " with tokenId(" + tokenId + ") Mumbai";
    console.log(eventDetail);
    nftList.innerHTML = eventDetail;
  });
  nftContractEvents.on("Transfer", (from, to, tokenId) => {
    let eventDetail = "NFT Transfer from " + from + " to " + to + " with tokenId(" + tokenId + ") Mumbai";
    console.log(eventDetail);
    nftList.innerHTML = eventDetail;
  });
  // nftCListener - "Transfer"

  var burnList = document.getElementById("burnList");
  nftContractEvents.on("Burn", (account, id) => {
    let eventDetail = "NFT burn from " + account + " with tokenId(" + id + ") Mumbai";
    console.log(eventDetail);
    burnList.innerHTML = eventDetail;
  });
  // nftCListener - "Burn"
}

async function setUp() {
  window.ethereum.on("chainChanged", (chainId) => {
    window.location.reload();

  });
  setUpMetamask();

  initSCsGoerli();

  initSCsMumbai();

  setUpListeners();

  await setUpEventsContracts();

  buildMerkleTree();
}

setUp()
  .then()
  .catch((e) => console.log(e));
