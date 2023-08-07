import { Button, Input, Modal } from "antd-mobile";
import { useMetaMask } from "@/contexts/MetaMaskContext";
import { useState } from "react";
import { useWalletContext } from "@/contexts/WalletDataContext";
import { useWalletConnectClient } from "@/contexts/ClientContext";
export default function Home() {
  const { connectMetaMask, sendTransactions, disconnectMetaMask } =
    useMetaMask();
  const {
    client,
    pairings,
    connectWalletConnect,
    disconnectWalletConnect,
    isFetchingBalances,
    walletSendTransaction,
  } = useWalletConnectClient();
  const { wallet } = useWalletContext();

  const [value, setValue] = useState("");

  const onConnect = (walletType: string) => {
    Modal.clear();
    if (walletType === "metamask") {
      connectMetaMask();
      return;
    }
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    // Suggest existing pairings (if any).
    if (pairings.length) {
      // openPairingModal();
      connectWalletConnect("eip155:5");
      console.log("pairings", pairings);
    } else {
      // If no existing pairings are available, trigger `WalletConnectClient.connect`.
      connectWalletConnect("eip155:5");
    }
  };
  const disconnect = () => {
    const wallet = localStorage.getItem("wallet");
    if (wallet === "metamask") {
      return disconnectMetaMask();
    }
    if (wallet === "walletConnect") {
      disconnectWalletConnect();
    }
  };

  const ModalConnect = () => {
    Modal.show({
      title: "Connect Wallet",
      closeOnMaskClick: true,
      content: (
        <div>
          <Button
            block
            color="primary"
            onClick={() => onConnect("metamask")}>
            MetaMask
          </Button>
          <br />
          <Button
            block
            color="success"
            onClick={() => onConnect("walletConnect")}>
            WalletConnect
          </Button>
        </div>
      ),
    });
  };

  const handleDeposit = () => {
    const wallet = localStorage.getItem("wallet");
    if (wallet === "metamask") return sendTransactions(value);
    if (wallet === "walletConnect") return walletSendTransaction(value);
  };

  return (
    <main className={`flex min-h-screen flex-col items-center justify-between`}>
      <div>Home Page</div>

      <div className="text-center">
        {wallet.isConnected ? (
          <Button
            disabled={!wallet.isConnected}
            color="primary"
            onClick={disconnect}>
            disconnect
          </Button>
        ) : (
          <Button
            disabled={wallet.isConnected}
            color="primary"
            onClick={ModalConnect}>
            Connect
          </Button>
        )}
        {wallet.isConnected && <p>{wallet.accounts[0]}</p>}
        {!isFetchingBalances && <p>Balance: {wallet.balance} ETH</p>}
        {wallet.isConnected && (
          <div className="flex items-center h-10 mt-10">
            <Input
              className="px-4 border border-primary h-full"
              value={value}
              onChange={(value: string) => setValue(value)}
            />
            <Button
              color="primary"
              onClick={() => {
                handleDeposit();
              }}>
              Deposit
            </Button>
          </div>
        )}
      </div>
      <div></div>
    </main>
  );
}
