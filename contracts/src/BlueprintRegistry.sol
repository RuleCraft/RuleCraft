// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Rules, RuleBounds} from "./RuleTypes.sol";

/// @notice Published rule sets. Anyone can publish; a blueprint is immutable once published.
/// Pools that launch with a blueprint pay its author a royalty out of add-on revenue.
/// The protocol share and treasury are fixed at deployment; there is no owner.
contract BlueprintRegistry {
    struct Blueprint {
        address author;
        uint16 royaltyBps;
        uint64 publishedAt;
        bytes32 rulesHash;
        string name;
        Rules rules;
    }

    uint16 public constant MAX_ROYALTY_BPS = 2500;
    uint16 public constant MAX_PROTOCOL_BPS = 3000;

    address public immutable treasury;
    uint16 public immutable protocolBps;

    Blueprint[] private _blueprints;

    event BlueprintPublished(uint256 indexed id, address indexed author, bytes32 rulesHash, uint16 royaltyBps, string name, Rules rules);

    error BadTreasury();
    error BadShare();
    error BadName();
    error UnknownBlueprint();

    constructor(address treasury_, uint16 protocolBps_) {
        if (treasury_ == address(0)) revert BadTreasury();
        if (protocolBps_ > MAX_PROTOCOL_BPS) revert BadShare();
        treasury = treasury_;
        protocolBps = protocolBps_;
        // Id 0 means "no blueprint", so the list starts with an empty entry.
        _blueprints.push();
    }

    function publish(string calldata name, Rules calldata rules, uint16 royaltyBps) external returns (uint256 id) {
        if (bytes(name).length == 0 || bytes(name).length > 40) revert BadName();
        if (royaltyBps > MAX_ROYALTY_BPS || uint256(royaltyBps) + protocolBps > 10_000) revert BadShare();
        RuleBounds.validate(rules);
        bytes32 h = RuleBounds.hash(rules);
        id = _blueprints.length;
        _blueprints.push(Blueprint(msg.sender, royaltyBps, uint64(block.timestamp), h, name, rules));
        emit BlueprintPublished(id, msg.sender, h, royaltyBps, name, rules);
    }

    function count() external view returns (uint256) {
        return _blueprints.length - 1;
    }

    function get(uint256 id) external view returns (Blueprint memory) {
        if (id == 0 || id >= _blueprints.length) revert UnknownBlueprint();
        return _blueprints[id];
    }
}
