// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SplitRemit
/// @notice Atomically splits an ERC-20 amount (designed for FXRP on Flare) across
///         a list of recipients — either ad hoc or via a saved, named plan.
///
///         Built for the remittance use case: the moment a family member's FXRP
///         mint lands, one transaction fans it out to saved contacts by
///         percentage shares, instead of N manual transfers.
///
///         Deliberately minimal: holds no funds between transactions, has no
///         admin role, and never touches anything except `transferFrom` on the
///         token the caller chose.
contract SplitRemit is ReentrancyGuard {
    uint16 public constant TOTAL_BPS = 10_000;
    uint256 public constant MAX_RECIPIENTS = 20;

    struct Plan {
        address owner;
        bool active;
        string name;
        address[] recipients;
        uint16[] sharesBps; // parallel to recipients, sums to TOTAL_BPS
    }

    Plan[] private _plans;
    mapping(address => uint256[]) private _plansByOwner;

    event PlanCreated(uint256 indexed planId, address indexed owner, string name, address[] recipients, uint16[] sharesBps);
    event PlanDeactivated(uint256 indexed planId, address indexed owner);
    event SplitExecuted(
        uint256 indexed planId, // type(uint256).max for ad hoc splits
        address indexed sender,
        address indexed token,
        uint256 totalAmount
    );

    error LengthMismatch();
    error NoRecipients();
    error TooManyRecipients();
    error ZeroRecipient();
    error ZeroShare();
    error SharesMustSumTo10000();
    error ZeroAmount();
    error UnknownPlan();
    error PlanNotActive();
    error NotPlanOwner();

    uint256 private constant AD_HOC_PLAN_ID = type(uint256).max;

    // ---------------------------------------------------------------- plans

    /// @notice Save a reusable split plan (e.g. "Family — Lagos": mum 50%, rent 30%, savings 20%).
    function createPlan(
        string calldata name,
        address[] calldata recipients,
        uint16[] calldata sharesBps
    ) external returns (uint256 planId) {
        _validateShares(recipients, sharesBps);

        planId = _plans.length;
        _plans.push(
            Plan({
                owner: msg.sender,
                active: true,
                name: name,
                recipients: recipients,
                sharesBps: sharesBps
            })
        );
        _plansByOwner[msg.sender].push(planId);

        emit PlanCreated(planId, msg.sender, name, recipients, sharesBps);
    }

    /// @notice Deactivate a plan you own. Plans are immutable otherwise —
    ///         create a new one to change recipients or shares.
    function deactivatePlan(uint256 planId) external {
        if (planId >= _plans.length) revert UnknownPlan();
        Plan storage plan = _plans[planId];
        if (plan.owner != msg.sender) revert NotPlanOwner();
        if (!plan.active) revert PlanNotActive();
        plan.active = false;
        emit PlanDeactivated(planId, msg.sender);
    }

    // --------------------------------------------------------------- splits

    /// @notice Pull `totalAmount` of `token` from the caller and distribute it
    ///         according to a saved plan. Anyone may fund any active plan
    ///         (the sender pays, the plan only defines where it goes).
    function executePlan(uint256 planId, IERC20 token, uint256 totalAmount) external nonReentrant {
        if (planId >= _plans.length) revert UnknownPlan();
        Plan storage plan = _plans[planId];
        if (!plan.active) revert PlanNotActive();

        _distribute(token, totalAmount, plan.recipients, plan.sharesBps, planId);
    }

    /// @notice One-off split without saving a plan.
    function splitNow(
        IERC20 token,
        uint256 totalAmount,
        address[] calldata recipients,
        uint16[] calldata sharesBps
    ) external nonReentrant {
        _validateShares(recipients, sharesBps);
        _distribute(token, totalAmount, recipients, sharesBps, AD_HOC_PLAN_ID);
    }

    // ---------------------------------------------------------------- views

    function planCount() external view returns (uint256) {
        return _plans.length;
    }

    function getPlan(uint256 planId)
        external
        view
        returns (address owner, bool active, string memory name, address[] memory recipients, uint16[] memory sharesBps)
    {
        if (planId >= _plans.length) revert UnknownPlan();
        Plan storage plan = _plans[planId];
        return (plan.owner, plan.active, plan.name, plan.recipients, plan.sharesBps);
    }

    function plansOf(address owner) external view returns (uint256[] memory) {
        return _plansByOwner[owner];
    }

    /// @notice Preview exact payout amounts for a total, including how
    ///         rounding dust is assigned (always to the first recipient).
    function previewSplit(uint256 totalAmount, uint16[] calldata sharesBps)
        external
        pure
        returns (uint256[] memory amounts)
    {
        amounts = new uint256[](sharesBps.length);
        uint256 assigned = 0;
        for (uint256 i = 1; i < sharesBps.length; i++) {
            amounts[i] = (totalAmount * sharesBps[i]) / TOTAL_BPS;
            assigned += amounts[i];
        }
        // First recipient absorbs the remainder so the split always sums to totalAmount.
        amounts[0] = totalAmount - assigned;
    }

    // ------------------------------------------------------------- internal

    function _validateShares(address[] calldata recipients, uint16[] calldata sharesBps) private pure {
        uint256 len = recipients.length;
        if (len == 0) revert NoRecipients();
        if (len > MAX_RECIPIENTS) revert TooManyRecipients();
        if (len != sharesBps.length) revert LengthMismatch();

        uint256 sum = 0;
        for (uint256 i = 0; i < len; i++) {
            if (recipients[i] == address(0)) revert ZeroRecipient();
            if (sharesBps[i] == 0) revert ZeroShare();
            sum += sharesBps[i];
        }
        if (sum != TOTAL_BPS) revert SharesMustSumTo10000();
    }

    function _distribute(
        IERC20 token,
        uint256 totalAmount,
        address[] memory recipients,
        uint16[] memory sharesBps,
        uint256 planId
    ) private {
        if (totalAmount == 0) revert ZeroAmount();

        uint256 assigned = 0;
        uint256 len = recipients.length;
        for (uint256 i = 1; i < len; i++) {
            uint256 amount = (totalAmount * sharesBps[i]) / TOTAL_BPS;
            assigned += amount;
            if (amount > 0) {
                SafeERC20.safeTransferFrom(token, msg.sender, recipients[i], amount);
            }
        }
        // First recipient absorbs rounding dust; guaranteed > 0 because
        // sharesBps[0] > 0 and floor rounding never over-assigns the rest.
        SafeERC20.safeTransferFrom(token, msg.sender, recipients[0], totalAmount - assigned);

        emit SplitExecuted(planId, msg.sender, address(token), totalAmount);
    }
}
