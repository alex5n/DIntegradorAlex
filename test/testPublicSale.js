var { expect } = require("chai");
var { ethers } = require("hardhat");
var { time, impersonateAccount, setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { any } = require("hardhat/internal/core/params/argumentTypes");

// 00 horas del 30 de septiembre del 2023 GMT
const startDate = 1696032000;

async function loadPublicSale() {
    // Deploy Public Sale
    var ContractPublicSale = "PublicSaleT";
    var [owner, alice, bob, carl] = await ethers.getSigners();
    var PublicSale = await hre.ethers.getContractFactory(ContractPublicSale);
    var publicSale = await hre.upgrades.deployProxy(PublicSale, { kind: "uups" });
    var implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(publicSale.target);

    // Deploy USDCoin
    var USDCoin = await ethers.getContractFactory("USDCoin");
    var usdcoin = await USDCoin.deploy();

    // Deploy BBites
    var BBites = await hre.ethers.getContractFactory("BBitesToken");
    var bbites = await hre.upgrades.deployProxy(BBites, { kind: "uups" });
    return { usdcoin, bbites, publicSale, implementationAddress, owner, alice, bob, carl };
};

// npx hardhat test test/testPublicSale.js
describe("Test contract PublicSale", () => {
    var usdcoin, bbites, publicSale;
    var implementationAddress = null;
    var owner, alice, bob, carl, signer;

    beforeEach(async function () {
        var fixtures = await loadPublicSale();
        implementationAddress = fixtures.implementationAddress;
        usdcoin = fixtures.usdcoin;
        bbites = fixtures.bbites;
        publicSale = fixtures.publicSale;
        [owner, alice, bob, carl] = [fixtures.owner, fixtures.alice, fixtures.bob, fixtures.carl];
        var account = "0x08Fb288FcC281969A0BBE6773857F99360f2Ca06";
        await impersonateAccount(account);
        await setBalance(account, ethers.toBigInt("1000000000000000000000000")) //10**6*10**18
        signer = await ethers.provider.getSigner(account);
        await publicSale.setBBites(await bbites.getAddress());
        await publicSale.setUSDCoin(await usdcoin.getAddress());
    });

    describe("Set Up", () => {
        it("Carga del contrato de implementación", async () => {
            console.log(`El address de Implementation es ${implementationAddress}`);
        });
    });

    describe("Test function purchaseWithTokens", () => {
        it("Solo se permite ids desde 0-699", async () => {
            var wrongId = 1000;
            //var amount = ethers.toBigInt("100000000000000000000000");
            await expect(publicSale.connect(signer).purchaseWithTokens(wrongId))
                .to.revertedWithCustomError(publicSale, "idDelTokenInvalido");
        });
        it("El tokenId debe estar disponible", async () => {
            var tokenId = 1;
            var amount = ethers.toBigInt("1000000000000000000000"); //1000*10**18
            await bbites.approve(await publicSale.getAddress(), amount);
            await publicSale.purchaseWithTokens(tokenId);
            //Dar balance a alice para llamar al metodo
            await bbites.transfer(await alice.getAddress(), amount);
            await bbites.connect(alice).approve(await publicSale.getAddress(), amount);
            await expect(publicSale.connect(alice).purchaseWithTokens(tokenId))
                .to.be.revertedWith("Este NFT ya tiene duenio");
        });
        describe("El approve debe ser minimamente lo que cuesta el NFT", () => {
            it("NFT(comun) de 0-199", async () => {
                var tokenId = 1;
                var amount = ethers.toBigInt("100000000000000000000"); //100*10**18
                await bbites.approve(await publicSale.getAddress(), amount);
                await expect(publicSale.purchaseWithTokens(tokenId))
                    .to.be.revertedWith("ERC20: insufficient allowance");
            });
            it("NFT(raro) de 200-499", async () => {
                var tokenId = 202;
                var amount = ethers.toBigInt("100000000000000000000"); //100*10**18
                await bbites.approve(await publicSale.getAddress(), amount);
                await expect(publicSale.purchaseWithTokens(tokenId))
                    .to.be.revertedWith("ERC20: insufficient allowance");
            });
            it("NFT(legendario) de 500-699", async () => {
                var tokenId = 550;
                var amount = ethers.toBigInt("100000000000000000000"); //100*10**18
                await bbites.approve(await publicSale.getAddress(), amount);
                await expect(publicSale.purchaseWithTokens(tokenId))
                    .to.be.revertedWith("ERC20: insufficient allowance");
            });
        });
        describe("Emite el evento de compra del NFT", () => {
            it("NFT(comun) de 0-199", async () => {
                var tokenId = 1;
                var amount = ethers.toBigInt("1000000000000000000000"); //1000*10**18
                await bbites.approve(await publicSale.getAddress(), amount);
                var tx = await publicSale.purchaseWithTokens(tokenId);
                await expect(tx).to.emit(publicSale, "PurchaseNftWithId")
                    .withArgs(await owner.getAddress(), tokenId);
            });
            it("NFT(raro) de 200-499", async () => {
                var tokenId = 300;
                var amount = ethers.toBigInt("6000000000000000000000"); //6000*10**18
                await bbites.approve(await publicSale.getAddress(), amount);
                var tx = await publicSale.purchaseWithTokens(tokenId);
                await expect(tx).to.emit(publicSale, "PurchaseNftWithId")
                    .withArgs(await owner.getAddress(), tokenId);
            });
            it("NFT(legendario) de 500-699", async () => {
                var tokenId = 600;
                var amount = ethers.toBigInt("90000000000000000000000"); //90_000*10**18
                await bbites.approve(await publicSale.getAddress(), amount);
                var tx = await publicSale.purchaseWithTokens(tokenId);
                await expect(tx).to.emit(publicSale, "PurchaseNftWithId")
                    .withArgs(await owner.getAddress(), tokenId);
            });

        });
    });

    describe("Test function purchaseWithUSDC", () => {
        //npx hardhat node --fork https://eth-goerli.g.alchemy.com/v2/vUsQgUjRXQHQUmmRU8gV0F25F4UpGRC3
        //npx hardhat node --fork https://eth-goerli.g.alchemy.com/v2/vUsQgUjRXQHQUmmRU8gV0F25F4UpGRC3 --fork-block-number 9884633
        it("Solo se permite ids desde 0-699", async () => {
            var wrongId = 1000;
            var amount = ethers.toBigInt("100000000"); //100*10**6
            await usdcoin.approve(await publicSale.getAddress(), amount);
            await expect(publicSale.purchaseWithUSDC(wrongId, amount))
                .to.be.revertedWithCustomError(publicSale, "idDelTokenInvalido");
        });
        it("El tokenId debe estar disponible", async () => {
            var tokenId = 1;
            var amount = ethers.toBigInt("100000000"); //100*10**6            
            try {
                await publicSale.purchaseWithUSDC(tokenId, amount);
            } catch (error) {
                console.log("Probar el metodo en tesnet");
                //console.log(error);
            }
        });
    });

    describe("Test function purchaseWithEtherAndId", () => {
        it("Solo se permite ids desde 700-999", async () => {
            var wrongId = 1000;
            var amount = ethers.toBigInt("100000000000000000"); // 0.1 ether
            await expect(publicSale.connect(signer).purchaseWithEtherAndId(wrongId, { value: amount }))
                .to.be.revertedWithCustomError(publicSale, "idDelTokenInvalido");
        });
        it("El tokenId debe estar disponible", async () => {
            var tokenId = 800;
            var amount = ethers.toBigInt("100000000000000000"); // 0.1 ether
            await publicSale.connect(signer).purchaseWithEtherAndId(tokenId, { value: amount });
            await expect(publicSale.connect(signer).purchaseWithEtherAndId(tokenId, { value: amount }))
                .to.be.revertedWith("Este NFT ya tiene duenio");
        });
        it("La cantidad enviada debe ser >= 0.1 ether", async () => {
            var tokenId = 800;
            var amount = ethers.toBigInt("1000000000000000"); // 0.001 ether
            await expect(publicSale.connect(signer).purchaseWithEtherAndId(tokenId, { value: amount }))
                .to.be.revertedWith("Cantidad incorrecta");
        });
        it("Emitir el evento PurchaseNftWithId", async () => {
            var tokenId = 800;
            var amount = ethers.toBigInt("10000000000000000"); // 0.01 ether
            var tx = await publicSale.connect(signer).purchaseWithEtherAndId(tokenId, { value: amount });
            await expect(tx).to.emit(publicSale, "PurchaseNftWithId").withArgs(await signer.getAddress(), tokenId);
        });
        it("Eliminar el token del array", async () => {
            var tokenId = 800;
            var amount = ethers.toBigInt("10000000000000000"); // 0.01 ether
            var cantidadNFT = await publicSale.contador();
            await publicSale.connect(signer).purchaseWithEtherAndId(tokenId, { value: amount });
            expect(await publicSale.contador()).to.be.equal(Number(cantidadNFT) - 1);
        });
    });

    describe("Test envio de >= 0.01 ether a receive", () => {
        it("El envio debe ser mayor a 0.01 ether", async () => {
            var amount = ethers.toBigInt("1000000000000000"); // 0.001 ether
            await expect(owner.sendTransaction({ to: await publicSale.getAddress(), value: amount }))
                .to.be.revertedWith("Cantidad incorrecta");
        });
        it("Emite el evento PurchaseNftWithId", async () => {
            var amount = ethers.toBigInt("10000000000000000"); // 0.01 ether
            var tx = await owner.sendTransaction({ to: await publicSale.getAddress(), value: amount });
            await expect(tx).to.emit(publicSale, "PurchaseNftWithId").withArgs(await owner.getAddress(), BigInt);
        });
        it("Eliminar el token del array", async () => {
            var amount = ethers.toBigInt("10000000000000000"); // 0.01 ether
            var cantidadNFT = await publicSale.contador();
            await owner.sendTransaction({ to: await publicSale.getAddress(), value: amount });
            expect(await publicSale.contador()).to.be.equal(Number(cantidadNFT) - 1);
        });
        it("Debe haber NFT en stock", async () => {
            var amount = ethers.toBigInt("10000000000000000"); // 0.01 ether
            for (let index = 0; index < 300; index++) {
                await owner.sendTransaction({ to: await publicSale.getAddress(), value: amount });
            }
            await expect(owner.sendTransaction({ to: await publicSale.getAddress(), value: amount }))
                .to.be.revertedWith("NFTs agotados");
        });
    });
});