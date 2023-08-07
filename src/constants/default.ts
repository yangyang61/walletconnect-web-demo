import { getAppMetadata } from "@walletconnect/utils";

if (!process.env.NEXT_PUBLIC_PROJECT_ID)
  throw new Error("`NEXT_PUBLIC_PROJECT_ID` env variable is missing.");

export const DEFAULT_MAIN_CHAINS = [
  // mainnets
  "eip155:1",
  // "eip155:10",
  // "eip155:100",
  // "eip155:137",
  // "eip155:324",
  // "eip155:42161",
  // "eip155:42220",
  // "cosmos:cosmoshub-4",
  // "solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ",
  // "polkadot:91b171bb158e2d3848fa23a9f1c25182",
  // "mvx:1",
  // "tron:0x2b6653dc",
  // "tezos:mainnet",
  // "kadena:mainnet01",
];

export const DEFAULT_TEST_CHAINS = [
  // testnets
  "eip155:5",
  // "eip155:280",
  // "eip155:420",
  // "eip155:80001",
  // "eip155:421611",
  // "eip155:44787",
  // "solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K",
  // "polkadot:e143f23803ac50e8f6f8e62695d1ce9e",
  // "near:testnet",
  // "mvx:D",
  // "tron:0xcd8690dc",
  // "tezos:testnet",
  // "kadena:testnet04",
];

export const DEFAULT_CHAINS = [...DEFAULT_MAIN_CHAINS, ...DEFAULT_TEST_CHAINS];

export const DEFAULT_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;
export const DEFAULT_RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL;

export const DEFAULT_LOGGER = "debug";

export const DEFAULT_APP_METADATA = {
  name: "React App",
  description: "React App for WalletConnect",
  url: "https://walletconnect.com/",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
  verifyUrl: "https://verify.walletconnect.com",
};

/**
 * EIP155
 */
export enum DEFAULT_EIP155_METHODS {
  ETH_SEND_TRANSACTION = "eth_sendTransaction",
  PERSONAL_SIGN = "personal_sign",
}

export enum DEFAULT_EIP155_OPTIONAL_METHODS {
  ETH_SIGN_TRANSACTION = "eth_signTransaction",
  ETH_SIGN = "eth_sign",
  ETH_SIGN_TYPED_DATA = "eth_signTypedData",
  ETH_SIGN_TYPED_DATA_V4 = "eth_signTypedData_v4",
}

export enum DEFAULT_EIP_155_EVENTS {
  ETH_CHAIN_CHANGED = "chainChanged",
  ETH_ACCOUNTS_CHANGED = "accountsChanged",
}
