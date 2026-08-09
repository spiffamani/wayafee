/**
 * Minimal ABIs, transcribed from @flarenetwork/flare-periphery-contracts (coston2)
 * and from Wayafee's own SplitRemit contract. Only what the app calls.
 */

export const assetManagerAbi = [
  {
    type: "function",
    name: "fAsset",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "lotSize",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "_lotSizeUBA", type: "uint256" }],
  },
  {
    type: "function",
    name: "collateralReservationFee",
    stateMutability: "view",
    inputs: [{ name: "_lots", type: "uint256" }],
    outputs: [{ name: "_reservationFeeNATWei", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAvailableAgentsDetailedList",
    stateMutability: "view",
    inputs: [
      { name: "_start", type: "uint256" },
      { name: "_end", type: "uint256" },
    ],
    outputs: [
      {
        name: "_agents",
        type: "tuple[]",
        components: [
          { name: "agentVault", type: "address" },
          { name: "ownerManagementAddress", type: "address" },
          { name: "feeBIPS", type: "uint256" },
          { name: "mintingVaultCollateralRatioBIPS", type: "uint256" },
          { name: "mintingPoolCollateralRatioBIPS", type: "uint256" },
          { name: "freeCollateralLots", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
      { name: "_totalLength", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "reserveCollateral",
    stateMutability: "payable",
    inputs: [
      { name: "_agentVault", type: "address" },
      { name: "_lots", type: "uint256" },
      { name: "_maxMintingFeeBIPS", type: "uint256" },
      { name: "_executor", type: "address" },
    ],
    outputs: [{ name: "_collateralReservationId", type: "uint256" }],
  },
  {
    type: "function",
    name: "executeMinting",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_payment",
        type: "tuple",
        components: [
          { name: "merkleProof", type: "bytes32[]" },
          {
            name: "data",
            type: "tuple",
            components: [
              { name: "attestationType", type: "bytes32" },
              { name: "sourceId", type: "bytes32" },
              { name: "votingRound", type: "uint64" },
              { name: "lowestUsedTimestamp", type: "uint64" },
              {
                name: "requestBody",
                type: "tuple",
                components: [
                  { name: "transactionId", type: "bytes32" },
                  { name: "inUtxo", type: "uint256" },
                  { name: "utxo", type: "uint256" },
                ],
              },
              {
                name: "responseBody",
                type: "tuple",
                components: [
                  { name: "blockNumber", type: "uint64" },
                  { name: "blockTimestamp", type: "uint64" },
                  { name: "sourceAddressHash", type: "bytes32" },
                  { name: "sourceAddressesRoot", type: "bytes32" },
                  { name: "receivingAddressHash", type: "bytes32" },
                  { name: "intendedReceivingAddressHash", type: "bytes32" },
                  { name: "spentAmount", type: "int256" },
                  { name: "intendedSpentAmount", type: "int256" },
                  { name: "receivedAmount", type: "int256" },
                  { name: "intendedReceivedAmount", type: "int256" },
                  { name: "standardPaymentReference", type: "bytes32" },
                  { name: "oneToOne", type: "bool" },
                  { name: "status", type: "uint8" },
                ],
              },
            ],
          },
        ],
      },
      { name: "_collateralReservationId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "CollateralReserved",
    inputs: [
      { name: "agentVault", type: "address", indexed: true },
      { name: "minter", type: "address", indexed: true },
      { name: "collateralReservationId", type: "uint256", indexed: true },
      { name: "valueUBA", type: "uint256", indexed: false },
      { name: "feeUBA", type: "uint256", indexed: false },
      { name: "firstUnderlyingBlock", type: "uint256", indexed: false },
      { name: "lastUnderlyingBlock", type: "uint256", indexed: false },
      { name: "lastUnderlyingTimestamp", type: "uint256", indexed: false },
      { name: "paymentAddress", type: "string", indexed: false },
      { name: "paymentReference", type: "bytes32", indexed: false },
      { name: "executor", type: "address", indexed: false },
      { name: "executorFeeNatWei", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MintingExecuted",
    inputs: [
      { name: "agentVault", type: "address", indexed: true },
      { name: "collateralReservationId", type: "uint256", indexed: true },
      { name: "mintedAmountUBA", type: "uint256", indexed: false },
      { name: "agentFeeUBA", type: "uint256", indexed: false },
      { name: "poolFeeUBA", type: "uint256", indexed: false },
    ],
  },
] as const;

export const fdcHubAbi = [
  {
    type: "function",
    name: "requestAttestation",
    stateMutability: "payable",
    inputs: [{ name: "_data", type: "bytes" }],
    outputs: [],
  },
] as const;

export const fdcRequestFeeConfigurationsAbi = [
  {
    type: "function",
    name: "getRequestFee",
    stateMutability: "view",
    inputs: [{ name: "_data", type: "bytes" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const relayAbi = [
  {
    type: "function",
    name: "isFinalized",
    stateMutability: "view",
    inputs: [
      { name: "_protocolId", type: "uint256" },
      { name: "_votingRoundId", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "getVotingRoundId",
    stateMutability: "view",
    inputs: [{ name: "_timestamp", type: "uint256" }],
    outputs: [{ name: "_votingRoundId", type: "uint256" }],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

export const splitRemitAbi = [
  {
    type: "function",
    name: "createPlan",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "recipients", type: "address[]" },
      { name: "sharesBps", type: "uint16[]" },
    ],
    outputs: [{ name: "planId", type: "uint256" }],
  },
  {
    type: "function",
    name: "deactivatePlan",
    stateMutability: "nonpayable",
    inputs: [{ name: "planId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "executePlan",
    stateMutability: "nonpayable",
    inputs: [
      { name: "planId", type: "uint256" },
      { name: "token", type: "address" },
      { name: "totalAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "splitNow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "totalAmount", type: "uint256" },
      { name: "recipients", type: "address[]" },
      { name: "sharesBps", type: "uint16[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "planCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getPlan",
    stateMutability: "view",
    inputs: [{ name: "planId", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "active", type: "bool" },
      { name: "name", type: "string" },
      { name: "recipients", type: "address[]" },
      { name: "sharesBps", type: "uint16[]" },
    ],
  },
  {
    type: "function",
    name: "plansOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256[]" }],
  },
  {
    type: "function",
    name: "previewSplit",
    stateMutability: "pure",
    inputs: [
      { name: "totalAmount", type: "uint256" },
      { name: "sharesBps", type: "uint16[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;
