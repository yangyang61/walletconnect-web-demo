// This will be replaced with content from the tutorial
import {
  useState,
  useEffect,
  createContext,
  PropsWithChildren,
  useContext,
  useCallback,
} from "react";

import detectEthereumProvider from "@metamask/detect-provider";
import { formatBalance } from "@/utils";
import Web3 from "web3";
import { Button, Modal } from "antd-mobile";
import { useWalletContext } from "./WalletDataContext";
import { DEFAULT_EIP_155_EVENTS } from "@/constants";
interface MetaMaskContextData {
  hasProvider: boolean | null;
  isConnecting: boolean;
  connectMetaMask: () => void;
  sendTransactions: (value: string) => void;
  disconnectMetaMask: () => void;
}

const MetaMaskContext = createContext<MetaMaskContextData>(
  {} as MetaMaskContextData
);

export const MetaMaskContextProvider = ({ children }: PropsWithChildren) => {
  const { wallet, setWallet, resetWallet } = useWalletContext();
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const _updateWallet = useCallback(async (providedAccounts?: any) => {
    const _accounts =
      providedAccounts ||
      (await window.ethereum.request({ method: "eth_accounts" }));
    if (_accounts.length === 0) {
      // If there are no accounts, then the user is disconnected
      resetWallet();
      return;
    }
    const balance = formatBalance(
      await window.ethereum.request({
        method: "eth_getBalance",
        params: [_accounts[0], "latest"],
      })
    );
    const _chainId = await window.ethereum.request({
      method: "eth_chainId",
    });
    const decimalChainId = parseInt(_chainId, 16);
    const chains = `eip155:${decimalChainId}`;
    localStorage.setItem("wallet", "metamask");
    setWallet((wallet) => ({
      ...wallet,
      accounts: _accounts,
      balance,
      chains,
      isConnected: true,
    }));
  }, []);

  const updateWalletAndAccounts = useCallback(
    () => _updateWallet(),
    [_updateWallet]
  );

  const updateWallet = useCallback(
    (accounts: any) => _updateWallet(accounts),
    [_updateWallet]
  );

  useEffect(() => {
    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true });
      setHasProvider(Boolean(provider));

      if (provider) {
        updateWalletAndAccounts();
        // 切换账户
        window.ethereum.on(
          DEFAULT_EIP_155_EVENTS.ETH_ACCOUNTS_CHANGED,
          updateWallet
        );
        // 切换网络
        window.ethereum.on(
          DEFAULT_EIP_155_EVENTS.ETH_CHAIN_CHANGED,
          updateWalletAndAccounts
        );
      } else {
        Modal.show({
          title: "Tips",
          content: (
            <div>
              Pleas install metamask
              <Button
                shape="rounded"
                color="primary"
                onClick={() => window.open("https://metamask.io")}>
                Install Metamask
              </Button>
            </div>
          ),
        });
      }
    };
    getProvider();

    return () => {
      window.ethereum?.removeListener(
        DEFAULT_EIP_155_EVENTS.ETH_ACCOUNTS_CHANGED,
        updateWallet
      );
      window.ethereum?.removeListener(
        DEFAULT_EIP_155_EVENTS.ETH_CHAIN_CHANGED,
        updateWalletAndAccounts
      );
    };
  }, [updateWallet, updateWalletAndAccounts]);

  const connectMetaMask = async () => {
    setIsConnecting(true);
    const exampleMessage = "Example `personal_sign` message.";
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      updateWallet(accounts);
      Modal.show({
        title: "Sign",
        content: (
          <div>
            <p className="text-center">this is sign</p>
            <br />
            <br />
            <br />
            <div className="w-full flex items-center justify-between px-10">
              <Button
                block
                color="primary"
                className="mr-3 flex-1"
                onClick={async () => {
                  const from = accounts[0];
                  const msg = `0x${Buffer.from(exampleMessage, "utf8").toString(
                    "hex"
                  )}`;
                  const sign = await window.ethereum.request({
                    method: "personal_sign",
                    params: [msg, from],
                  });
                }}>
                同意
              </Button>
              <Button
                block
                className="flex-1"
                onClick={() => Modal.clear()}>
                取消
              </Button>
            </div>
          </div>
        ),
      });
    } catch (err: any) {
      console.log(err.message);
    }
    setIsConnecting(false);
  };
  const disconnectMetaMask = () => {
    if (window.ethereum && window.ethereum.disconnect) {
      window.ethereum
        .disconnect()
        .then(() => {
          resetWallet();
          console.log("Disconnected from the Ethereum network.");
        })
        .catch((error: any) => {
          console.error("Error while disconnecting:", error);
        });
    }
  };

  const sendTransactions = useCallback(
    async (value: string) => {
      if (wallet.accounts.length > 0) {
        window.ethereum
          .request({
            method: "eth_sendTransaction",
            // The following sends an EIP-1559 transaction. Legacy transactions are also supported.
            params: [
              {
                from: wallet.accounts[0], // The user's active address.
                to: "0x35955ef357d8f4787eFaD5237C290F2cB8B0B1d6", // Required except during contract publications.
                value: Web3.utils.toWei(value, "ether"), // Only required to send ether to the recipient from the initiating external account.
                gasLimit: "0x5028", // Customizable by the user during MetaMask confirmation.
                maxPriorityFeePerGas: "0x3b9aca00", // Customizable by the user during MetaMask confirmation.
                maxFeePerGas: "0x2540be400", // Customizable by the user during MetaMask confirmation.
              },
            ],
          })
          .then((txHash: any) => console.log(txHash))
          .catch((error: any) => console.error(error));
      }
    },
    [wallet]
  );
  return (
    <MetaMaskContext.Provider
      value={{
        hasProvider,
        isConnecting,
        connectMetaMask,
        sendTransactions,
        disconnectMetaMask,
      }}>
      {children}
    </MetaMaskContext.Provider>
  );
};

export const useMetaMask = () => {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error(
      'useMetaMask must be used within a "MetaMaskContextProvider"'
    );
  }
  return context;
};
