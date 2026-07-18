/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/inplay.json`.
 */
export type Inplay = {
  "address": "DYpHFBX8yk77JAwEKkv53e8Ks7fJjB6wMChDm51oQvUB",
  "metadata": {
    "name": "inplay",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "InPlay — a perp DEX for live football win-probability, oracle-priced by TxODDS TxLINE"
  },
  "instructions": [
    {
      "name": "closePosition",
      "docs": [
        "Close a position at the current mark (live, or final if settled). Pays out",
        "collateral +/- PnL (minus fee) from the vault, then closes the position account."
      ],
      "discriminator": [
        123,
        134,
        81,
        0,
        49,
        68,
        98,
        98
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "depositLiquidity",
      "docs": [
        "Deposit USDC liquidity into the vault (LP / admin seeding)."
      ],
      "discriminator": [
        245,
        99,
        59,
        25,
        151,
        71,
        233,
        249
      ],
      "accounts": [
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "depositorTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initMarket",
      "docs": [
        "Create a market for a fixture outcome with an initial implied probability.",
        "Restricted to the oracle authority (the keeper) or admin."
      ],
      "discriminator": [
        33,
        253,
        15,
        116,
        89,
        25,
        127,
        236
      ],
      "accounts": [
        {
          "name": "oracle",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fixtureId",
          "type": "u64"
        },
        {
          "name": "outcome",
          "type": "u8"
        },
        {
          "name": "initialProbBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "Initialize global config + the collateral vault. Admin/payer becomes `admin`."
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "oracleAuthority",
          "type": "pubkey"
        },
        {
          "name": "feeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "openPosition",
      "docs": [
        "Open a 1x position. Collateral == size, transferred from user into the vault.",
        "Entry price is the market's current live probability."
      ],
      "discriminator": [
        135,
        128,
        47,
        77,
        15,
        152,
        240,
        49
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": "u8"
        },
        {
          "name": "size",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleMarket",
      "docs": [
        "Settle a market to its final result. MVP: keeper-attested (`result` true = outcome",
        "happened). Production: verify `result` against TxLINE's on-chain Merkle root before",
        "accepting (CPI to TxLINE `validateStat`); see module docs."
      ],
      "discriminator": [
        193,
        153,
        95,
        216,
        166,
        6,
        144,
        217
      ],
      "accounts": [
        {
          "name": "oracle",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "result",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updatePrice",
      "docs": [
        "Keeper pushes the latest live implied probability for the market."
      ],
      "discriminator": [
        61,
        34,
        117,
        155,
        75,
        34,
        123,
        208
      ],
      "accounts": [
        {
          "name": "oracle",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "probBps",
          "type": "u16"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "marketSettled",
      "msg": "Market already settled"
    },
    {
      "code": 6001,
      "name": "marketNotSettled",
      "msg": "Market is not settled yet"
    },
    {
      "code": 6002,
      "name": "invalidProb",
      "msg": "Probability must be within 0..=10000 bps"
    },
    {
      "code": 6003,
      "name": "invalidSide",
      "msg": "Invalid position side"
    },
    {
      "code": 6004,
      "name": "positionClosed",
      "msg": "Position is already closed"
    },
    {
      "code": 6005,
      "name": "unauthorizedOracle",
      "msg": "Signer is not the authorized oracle/keeper"
    },
    {
      "code": 6006,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6007,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6008,
      "name": "insufficientLiquidity",
      "msg": "Insufficient vault liquidity to cover payout"
    }
  ],
  "types": [
    {
      "name": "config",
      "docs": [
        "Global protocol config + vault accounting. PDA: [\"config\"]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Admin authority (can seed liquidity, create markets)."
            ],
            "type": "pubkey"
          },
          {
            "name": "oracleAuthority",
            "docs": [
              "Keeper pubkey allowed to push prices and settle results from TxLINE."
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "docs": [
              "The (mock, on devnet) USDC mint used as collateral."
            ],
            "type": "pubkey"
          },
          {
            "name": "vaultTokenAccount",
            "docs": [
              "The vault's token account holding all collateral + liquidity."
            ],
            "type": "pubkey"
          },
          {
            "name": "feeBps",
            "docs": [
              "Protocol fee taken from notional on close, in bps."
            ],
            "type": "u16"
          },
          {
            "name": "totalLiquidity",
            "docs": [
              "LP liquidity deposited (accounting only; vault token balance is source of truth)."
            ],
            "type": "u64"
          },
          {
            "name": "vaultAuthBump",
            "docs": [
              "Bump for the vault authority PDA ([\"vault_auth\"])."
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "docs": [
              "Bump for this config PDA."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "market",
      "docs": [
        "A tradeable market: one outcome of one fixture, priced by its live implied probability.",
        "PDA: [\"market\", fixture_id_le, outcome]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fixtureId",
            "docs": [
              "TxLINE fixture id."
            ],
            "type": "u64"
          },
          {
            "name": "outcome",
            "docs": [
              "Outcome index. MVP: 0 = participant 1 wins."
            ],
            "type": "u8"
          },
          {
            "name": "probBps",
            "docs": [
              "Current implied probability in bps (the live mark price), 0..=10000."
            ],
            "type": "u16"
          },
          {
            "name": "lastUpdateTs",
            "docs": [
              "Unix ts of the last oracle price update."
            ],
            "type": "i64"
          },
          {
            "name": "isSettled",
            "docs": [
              "Whether the fixture has been settled (final result anchored)."
            ],
            "type": "bool"
          },
          {
            "name": "resultBps",
            "docs": [
              "Final result in bps once settled: 10000 (outcome happened) or 0 (did not)."
            ],
            "type": "u16"
          },
          {
            "name": "totalLong",
            "docs": [
              "Open long notional (sum of open long sizes), for skew/risk monitoring."
            ],
            "type": "u64"
          },
          {
            "name": "totalShort",
            "docs": [
              "Open short notional."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "position",
      "docs": [
        "A user's open position on a market. PDA: [\"position\", market, owner].",
        "MVP: one position per user per market, 1x (collateral == size)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "side",
            "docs": [
              "SIDE_LONG or SIDE_SHORT."
            ],
            "type": "u8"
          },
          {
            "name": "size",
            "docs": [
              "Notional size in USDC base units (6 decimals). == collateral at 1x."
            ],
            "type": "u64"
          },
          {
            "name": "entryProbBps",
            "docs": [
              "Probability (bps) at which the position was opened."
            ],
            "type": "u16"
          },
          {
            "name": "isOpen",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
