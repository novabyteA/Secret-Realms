// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract SecretRealmsGame is SepoliaConfig {
    struct PlayerPosition {
        euint32 x;
        euint32 y;
        uint64 joinedAt;
        bool active;
    }

    mapping(address => PlayerPosition) private _positions;
    address[] private _players;

    error PlayerNotRegistered();
    error InvalidViewer();

    event PlayerPositionCommitted(address indexed player, uint64 joinedAt);
    event PositionAccessGranted(address indexed player, address indexed viewer);

    function joinGame(
        externalEuint32 encryptedX,
        externalEuint32 encryptedY,
        bytes calldata inputProof
    ) external {
        PlayerPosition storage position = _positions[msg.sender];

        euint32 xCoordinate = FHE.fromExternal(encryptedX, inputProof);
        euint32 yCoordinate = FHE.fromExternal(encryptedY, inputProof);

        position.x = xCoordinate;
        position.y = yCoordinate;
        position.joinedAt = uint64(block.timestamp);
        bool isFirstJoin = !position.active;
        position.active = true;

        FHE.allowThis(position.x);
        FHE.allowThis(position.y);
        FHE.allow(position.x, msg.sender);
        FHE.allow(position.y, msg.sender);

        if (isFirstJoin) {
            _players.push(msg.sender);
        }

        emit PlayerPositionCommitted(msg.sender, position.joinedAt);
    }

    function grantPositionAccess(address viewer) external {
        if (viewer == address(0)) {
            revert InvalidViewer();
        }

        PlayerPosition storage position = _positions[msg.sender];
        if (!position.active) {
            revert PlayerNotRegistered();
        }

        FHE.allow(position.x, viewer);
        FHE.allow(position.y, viewer);

        emit PositionAccessGranted(msg.sender, viewer);
    }

    function getPlayerPosition(address player) external view returns (euint32, euint32) {
        PlayerPosition storage position = _positions[player];
        if (!position.active) {
            revert PlayerNotRegistered();
        }

        return (position.x, position.y);
    }

    function getJoinTimestamp(address player) external view returns (uint64) {
        return _positions[player].joinedAt;
    }

    function hasJoined(address player) external view returns (bool) {
        return _positions[player].active;
    }

    function listPlayers() external view returns (address[] memory) {
        return _players;
    }
}
