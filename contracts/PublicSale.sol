// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./Interfaces.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PublicSale is
    Initializable,
    ERC20Upgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    address constant routerAddress02 =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    IUniSwapV2Router02 router;
    address USDCoin;
    address BBites;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant EXECUTER_ROLE = keccak256("EXECUTER_ROLE");

    mapping(uint256 => bool) public listaNFT;
    uint256 constant precio200 = 1_000 * 10 ** 18;
    uint256 constant precio700init = 10_000 * 10 ** 18;
    uint private precio;
    uint256[] public listaNFT700to999;
    mapping(uint256 NFT => uint256 index) indexesNFT;
    uint256 public contador;
    address[] path;

    // 00 horas del 30 de septiembre del 2023 GMT
    uint256 constant startDate = 1696032000;

    // Maximo price NFT
    uint256 constant MAX_PRICE_NFT = 90_000 * 10 ** 18;

    error idDelTokenInvalido();

    event PurchaseNftWithId(address account, uint256 id);
    event SwapAmounts(uint[] amounts);

    modifier nftDisponible(uint256 _id) {
        require(!listaNFT[_id], "Este NFT ya tiene duenio");
        _;
        listaNFT[_id] = true;
    }
    modifier correctAmount(uint256 tokenId) {
        require(
            msg.value >= getPriceNFT(tokenId),
            "Cantidad de tokens insuficiente"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC20Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        guardarNFT();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        router = IUniSwapV2Router02(routerAddress02);
        USDCoin = 0xb457B2AaDb605d5AdF542e34F3c89BD0765570Aa;
        BBites = 0x815cCE856d584A026A26A10DB21250F15c127D91;
    }

    function purchaseWithTokens(
        uint256 _tokenId
    ) public nftDisponible(_tokenId) {
        if (_tokenId >= 0 && _tokenId <= 699) {
            require(
                IERC20(BBites).transferFrom(
                    msg.sender,
                    address(this),
                    getPriceNFT(_tokenId)
                )
            );
            emit PurchaseNftWithId(msg.sender, _tokenId);
        } else {
            revert idDelTokenInvalido();
        }
    }

    function purchaseWithUSDC(
        uint256 _tokenId,
        uint256 _amountIn
    ) external nftDisponible(_tokenId) {
        if (_tokenId >= 0 && _tokenId <= 699) {
            require(
                IERC20(USDCoin).transferFrom(
                    msg.sender,
                    address(this),
                    _amountIn
                )
            );
            IERC20(USDCoin).approve(routerAddress02, _amountIn);
            uint256 priceNFT = getPriceNFT(_tokenId);
            path.push(USDCoin);
            path.push(BBites);
            router.swapTokensForExactTokens(
                priceNFT,
                _amountIn,
                path,
                address(this),
                block.timestamp + 1200
            );
            emit PurchaseNftWithId(msg.sender, _tokenId);
        } else {
            revert idDelTokenInvalido();
        }
    }

    function purchaseWithEtherAndId(
        uint256 _tokenId
    ) public payable nftDisponible(_tokenId) {
        if (_tokenId >= 700 && _tokenId <= 999) {
            require(msg.value >= 0.01 ether, "Cantidad incorrecta");
            emit PurchaseNftWithId(msg.sender, _tokenId);
            eliminarNFT(_tokenId);
        } else {
            revert idDelTokenInvalido();
        }
    }

    function depositEthForARandomNft() public payable {
        require(msg.value >= 0.01 ether, "Cantidad incorrecta");
        require(listaNFT700to999.length > 0, "NFTs agotados");
        uint256 _id = listaNFT700to999[listaNFT700to999.length - 1];
        emit PurchaseNftWithId(msg.sender, _id);
        eliminarNFT(_id);
    }

    receive() external payable {
        depositEthForARandomNft();
    }

    ////////////////////////////////////////////////////////////////////////
    /////////                    Helper Methods                    /////////
    ////////////////////////////////////////////////////////////////////////

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function guardarNFT() internal {
        for (uint i = 700; i < 1000; i++) {
            listaNFT700to999.push(i);
            indexesNFT[i] = contador;
            contador++;
        }
    }

    function eliminarNFT(uint256 _NFT) internal {
        uint256 ix = indexesNFT[_NFT];
        delete indexesNFT[_NFT];
        uint256 lastEl = listaNFT700to999[listaNFT700to999.length - 1];
        listaNFT700to999[ix] = lastEl;
        listaNFT700to999.pop();
        indexesNFT[lastEl] = ix;
        contador--;
    }

    function getPriceNFT(uint _id) public returns (uint) {
        if (_id < 200) {
            return precio200;
        } else if (_id < 500) {
            return _id * 20 * 10 ** 18;
        } else if (_id < 700) {
            uint dias;
            uint resto;
            resto = block.timestamp - startDate;
            dias = resto / uint(1 days);
            precio = precio700init + (2_000 * 10 ** 18 * dias);
            if (precio > MAX_PRICE_NFT) {
                precio = MAX_PRICE_NFT;
            }
            return precio;
        } else {
            revert("NFT no disponible");
        }
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    )
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}

