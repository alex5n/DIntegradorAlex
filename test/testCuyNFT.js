var { expect } = require("chai");
var { ethers } = require("hardhat");
var { time, impersonateAccount, setBalance } = require("@nomicfoundation/hardhat-network-helpers");

const { getRole, deploySC, deploySCNoUp, ex, pEth } = require("../utils");
const { getRootFromMT, merkleTree, hashToken } = require("../utils/merkleTree.js");

const MINTER_ROLE = getRole("MINTER_ROLE");
const BURNER_ROLE = getRole("BURNER_ROLE");

var startDate = 1696032000;

async function loadCuyNFT() {
    var [owner, alice, bob, carl] = await ethers.getSigners();
    var CuyCollectionNFT = await hre.ethers.getContractFactory("CuyCollectionNFT");
    var cuyCollectionNFT = await hre.upgrades.deployProxy(CuyCollectionNFT, { kind: "uups" });
    var implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(cuyCollectionNFT.target);
    return { cuyCollectionNFT, implementationAddress, owner, alice, bob, carl };
};

// npx hardhat test test/testCuyNFT.js
describe("Testing Cuy collection NFT", () => {
    var cuyCollectionNFT = null;
    var implementationAddress = null;
    var owner, alice, bob, carl;
    var root = getRootFromMT();

    beforeEach(async function () {
        var fixtures = await loadCuyNFT();
        implementationAddress = fixtures.implementationAddress;
        cuyCollectionNFT = fixtures.cuyCollectionNFT;
        [owner, alice, bob, carl] = [fixtures.owner, fixtures.alice, fixtures.bob, fixtures.carl];
    });

    describe("Set Up", () => {
        it("Carga del contrato de implementación", async () => {
            console.log(`El address de Implementation es ${implementationAddress}`);
        });
    });

    describe("Funcion safeMint", () => {
        it("Solo puede ser llamado por un MINTER-ROLE", async () => {
            var id = 23;
            await expect(cuyCollectionNFT.connect(bob).safeMint(alice, id)).to.be.reverted;
        });
        it("Solo se permite ids desde 0-999", async () => {
            var wrongId = 1000;
            await expect(cuyCollectionNFT.safeMint(alice, wrongId))
                .to.be.revertedWithCustomError(cuyCollectionNFT, "idDelTokenInvalido");
        });
        it("El id debe estar disponible", async () => {
            //hago el mint de un NFT
            var idMinted = 20;
            await cuyCollectionNFT.safeMint(alice, idMinted);
            //vuelvo a hacer el mint del mismo id
            await expect(cuyCollectionNFT.safeMint(bob, idMinted)).to.be.reverted;
            await expect(cuyCollectionNFT.safeMint(bob, idMinted)).to.be.revertedWith("Este NFT ya ha sido adquirido");
        });
        it("Mapping de la lista cambiado a true luego del mint", async () => {
            var idMinted = 50;
            await cuyCollectionNFT.safeMint(alice, idMinted);
            expect(await cuyCollectionNFT.listaNFT(idMinted)).to.equal(true);
        });
        it("Llamar cuando no esta pausado", async () => {
            var id = 1;
            await cuyCollectionNFT.pause();
            await expect(cuyCollectionNFT.safeMint(alice, id)).to.be.reverted;
        });
    });

    describe("Actualizar root", () => {
        it("Solo el admin puede cambiar el root", async () => {
            await expect(cuyCollectionNFT.connect(alice).actualizarRaiz(root)).to.be.reverted;
        });

        it("El root es cambiado por el admin", async () => {
            await cuyCollectionNFT.actualizarRaiz(root);
            expect(await cuyCollectionNFT.root()).to.equal(root);
        });
    });

    describe("Function safeMintWhiteList", () => {
        it("Verificar que el que llama sea parte de la lista", async () => {
            var tokenId = 1001;
            var account = "0xC840F562D9F69b46b4227003E01525CB99344B72";
            var elementosHasheados = hashToken(tokenId, account);
            var pruebas = merkleTree.getHexProof(elementosHasheados);
            await expect(cuyCollectionNFT.safeMintWhiteList(account, tokenId, pruebas)).to.be.reverted;
            await expect(cuyCollectionNFT.safeMintWhiteList(account, tokenId, pruebas)).to.be.revertedWith("No eres parte de la lista");
        });
        it("Mapping de la lista cambiado a true luego del mint", async () => {
            await cuyCollectionNFT.actualizarRaiz(root);
            var tokenId = 1000;
            var account = "0xC840F562D9F69b46b4227003E01525CB99344B72";
            var elementosHasheados = hashToken(tokenId, account);
            var pruebas = merkleTree.getHexProof(elementosHasheados);
            await cuyCollectionNFT.safeMintWhiteList(account, tokenId, pruebas);
            expect(await cuyCollectionNFT.listaNFT(tokenId)).to.equal(true);
        });
        it("Llamar cuando no esta pausado", async () => {
            await cuyCollectionNFT.pause();
            var tokenId = 1000;
            var account = "0xC840F562D9F69b46b4227003E01525CB99344B72";
            var elementosHasheados = hashToken(tokenId, account);
            var pruebas = merkleTree.getHexProof(elementosHasheados);
            await expect(cuyCollectionNFT.safeMintWhiteList(account, tokenId, pruebas)).to.be.reverted;
        });
    });

    describe("Function buyBack", () => {
        it("Solo se permite ids desde 1000-1999", async () => {
            var tokenId = 1;
            await cuyCollectionNFT.safeMint(alice, tokenId);
            await expect(cuyCollectionNFT.connect(alice).buyBack(tokenId)).to.be.reverted;
            await expect(cuyCollectionNFT.connect(alice).buyBack(tokenId))
                .to.be.revertedWithCustomError(cuyCollectionNFT, "idDelTokenInvalido");
        });
        it("Se realiza la quema del token", async () => {
            await cuyCollectionNFT.actualizarRaiz(root);
            var tokenId = 1000;
            var account = "0xC840F562D9F69b46b4227003E01525CB99344B72";
            var elementosHasheados = hashToken(tokenId, account);
            var pruebas = merkleTree.getHexProof(elementosHasheados);
            await cuyCollectionNFT.safeMintWhiteList(account, tokenId, pruebas);
            //me conecto con el account
            await impersonateAccount(account);
            await setBalance(account, ethers.toBigInt("10000000000000000000"));
            var signer = await ethers.provider.getSigner(account);
            await cuyCollectionNFT.connect(signer).buyBack(tokenId);
            await expect(cuyCollectionNFT.ownerOf(tokenId)).to.be.reverted;
        });
        it("Se emite el evento Burn", async () => {
            await cuyCollectionNFT.actualizarRaiz(root);
            var tokenId = 1000;
            var account = "0xC840F562D9F69b46b4227003E01525CB99344B72";
            var elementosHasheados = hashToken(tokenId, account);
            var pruebas = merkleTree.getHexProof(elementosHasheados);
            await cuyCollectionNFT.safeMintWhiteList(account, tokenId, pruebas);
            await impersonateAccount(account);
            await setBalance(account, ethers.toBigInt("10000000000000000000"));
            var signer = await ethers.provider.getSigner(account);
            var tx = await cuyCollectionNFT.connect(signer).buyBack(tokenId);
            await expect(tx).to.emit(cuyCollectionNFT, "Burn");
            await expect(tx).to.emit(cuyCollectionNFT, "Burn").withArgs(await signer.getAddress(), tokenId);
        });
    });
});
