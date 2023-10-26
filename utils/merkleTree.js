const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { ethers } = require("hardhat");
const walletAndIds = require("../wallets/walletList.js");

var merkleTree, root;
function hashToken(tokenId, account) {
  return Buffer.from(
    ethers
      .solidityPackedKeccak256(["uint256", "address"], [tokenId, account])
      .slice(2),
    "hex"
  );
}

//console.log(walletAndIds)

function construyendoMerkleTree() {
  var elementosHasheados = walletAndIds.map(({ id, address }) => {
    return hashToken(id, address);
  });
  merkleTree = new MerkleTree(elementosHasheados, keccak256, {
    sortPairs: true,
  });

  root = merkleTree.getHexRoot();
  //console.log(root);
}

var hasheandoElemento, pruebas;
function construyendoPruebas() {
  var tokenId = 1000;
  var address = "0xC840F562D9F69b46b4227003E01525CB99344B72";
  hasheandoElemento = hashToken(tokenId, address);
  pruebas = merkleTree.getHexProof(hasheandoElemento);
  //console.log(pruebas);

  // verificacion off-chain
  var pertenece = merkleTree.verify(pruebas, hasheandoElemento, root);
  //console.log(pertenece);
}

construyendoMerkleTree();
construyendoPruebas();

function getRootFromMT() {
  return root;
}

module.exports = { getRootFromMT, merkleTree, hashToken };

//root = 0x2a1e36609eaef943f74318bdadae71c9de4597fd85fdb1e40c4602aa3ef8d5b6
