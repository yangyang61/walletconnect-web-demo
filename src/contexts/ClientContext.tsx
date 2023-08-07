import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Web3Modal } from "@web3modal/standalone";
import { apiGetChainNamespace, ChainsMap } from "caip-api";
import UniversalProvider from "@walletconnect/universal-provider";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
import Client from "@walletconnect/sign-client";
import * as encoding from "@walletconnect/encoding";

import {
  DEFAULT_LOGGER,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
} from "../constants";
import {
  ChainNamespaces,
  getAllChainNamespaces,
  hashPersonalMessage,
  verifySignature,
} from "../helpers";
import { BigNumberish, ethers } from "ethers";
import { useWalletContext } from "./WalletDataContext";
import { Button, Modal } from "antd-mobile";
/**
 * Types
 */
interface IContext {
  client: Client | undefined;
  session: SessionTypes.Struct | undefined;
  connectWalletConnect: (
    caipChainId: string,
    pairing?: { topic: string }
  ) => Promise<void>;
  disconnectWalletConnect: () => Promise<void>;
  isInitializing: boolean;
  // chain: string;
  pairings: PairingTypes.Struct[];
  // accounts: string[];
  // balances: AccountBalances;
  isFetchingBalances: boolean;
  chainData: ChainNamespaces;
  web3Provider?: ethers.BrowserProvider;
  walletSendTransaction: (value: string) => Promise<void>;
}

/**
 * Context
 */
export const ClientContext = createContext<IContext>({} as IContext);

/**
 * Provider
 */
/**
 * Provider
 */
export function ClientContextProvider({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const { wallet, setWallet, resetWallet } = useWalletContext();
  const [client, setClient] = useState<Client>();
  const [pairings, setPairings] = useState<PairingTypes.Struct[]>([]);
  const [session, setSession] = useState<SessionTypes.Struct>();

  const [ethereumProvider, setEthereumProvider] = useState<UniversalProvider>();
  const [web3Provider, setWeb3Provider] = useState<ethers.BrowserProvider>();

  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  // 初始化session中...
  const [hasCheckedPersistedSession, setHasCheckedPersistedSession] =
    useState(false);

  const [chainData, setChainData] = useState<ChainNamespaces>({});
  const [web3Modal, setWeb3Modal] = useState<Web3Modal>();

  const resetApp = () => {
    setPairings([]);
    setSession(undefined);
    resetWallet();
  };

  const loadChainData = async () => {
    const namespaces = getAllChainNamespaces();
    const chainData: ChainNamespaces = {};

    await Promise.all(
      namespaces.map(async (namespace) => {
        let chains: ChainsMap | undefined;
        try {
          chains = await apiGetChainNamespace(namespace);
        } catch (e) {
          // ignore error
        }
        if (typeof chains !== "undefined") {
          chainData[namespace] = chains;
        }
      })
    );
    setChainData(chainData);
  };

  const disconnectWalletConnect = useCallback(async () => {
    if (typeof ethereumProvider === "undefined") {
      throw new Error("ethereumProvider is not initialized");
    }
    await ethereumProvider.disconnect();
    resetApp();
  }, [ethereumProvider]);

  // 订阅提供者(Provider)事件
  const _subscribeToProviderEvents = useCallback(
    async (_client: UniversalProvider) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      _client.on("display_uri", async (uri: string) => {
        console.log("EVENT", "QR Code Modal open");
        console.log("uri", uri);

        web3Modal?.openModal({ uri });
      });

      // Subscribe to session ping
      _client.on(
        "session_ping",
        ({ id, topic }: { id: number; topic: string }) => {
          console.log("EVENT", "session_ping");
          console.log(id, topic);
        }
      );

      // Subscribe to session event
      _client.on(
        "session_event",
        ({ event, chainId }: { event: any; chainId: string }) => {
          console.log("EVENT", "session_event");
          console.log(event, chainId);
        }
      );

      // Subscribe to session update
      _client.on(
        "session_update",
        ({
          topic,
          session,
        }: {
          topic: string;
          session: SessionTypes.Struct;
        }) => {
          console.log("EVENT", "session_updated");
          setSession(session);
        }
      );

      // Subscribe to session delete
      _client.on(
        "session_delete",
        ({ id, topic }: { id: number; topic: string }) => {
          console.log("EVENT", "session_deleted");
          console.log(id, topic);
          resetApp();
        }
      );
    },
    [web3Modal]
  );

  // 初始化一个以太坊或钱包连接的配置对象
  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);

      if (!DEFAULT_PROJECT_ID) return;

      const provider = await UniversalProvider.init({
        projectId: DEFAULT_PROJECT_ID,
        logger: DEFAULT_LOGGER,
        relayUrl: DEFAULT_RELAY_URL,
      });

      const web3Modal = new Web3Modal({
        projectId: DEFAULT_PROJECT_ID,
        walletConnectVersion: 2,
      });

      setEthereumProvider(provider);
      setClient(provider.client);
      setWeb3Modal(web3Modal);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // 创键 provider，提供了与以太坊网络通信的功能。
  const createWeb3Provider = useCallback(
    (ethereumProvider: UniversalProvider) => {
      const web3Provider = new ethers.BrowserProvider(ethereumProvider);
      setWeb3Provider(web3Provider);
    },
    []
  );

  const connectWalletConnect = useCallback(
    async (caipChainId: string, pairing?: { topic: string }) => {
      if (!ethereumProvider) {
        throw new ReferenceError("WalletConnect Client is not initialized.");
      }
      const chainId = caipChainId.split(":").pop();

      console.log("Enabling EthereumProvider for chainId: ", chainId);

      const session = await ethereumProvider.connect({
        namespaces: {
          eip155: {
            methods: [
              "eth_sendTransaction",
              "eth_signTransaction",
              "eth_sign",
              "personal_sign",
              "eth_signTypedData",
            ],
            chains: [`eip155:${chainId}`],
            events: ["chainChanged", "accountsChanged"],
            rpcMap: {
              chainId: `https://rpc.walletconnect.com?chainId=eip155:${chainId}&projectId=${DEFAULT_PROJECT_ID}`,
            },
          },
        },
        pairingTopic: pairing?.topic,
      });

      createWeb3Provider(ethereumProvider);

      const _accounts = await ethereumProvider.enable();
      setSession(session);
      setWallet((data) => ({
        ...data,
        accounts: _accounts,
        chains: caipChainId,
        isConnected: true,
      }));
      localStorage.setItem("wallet", "walletConnect");
      web3Modal?.closeModal();
      signModal();
    },
    [ethereumProvider, chainData.eip155, createWeb3Provider, web3Modal]
  );

  // 会话已连接
  const onSessionConnected = useCallback(
    async (_session: SessionTypes.Struct) => {
      if (!ethereumProvider) {
        throw new ReferenceError("EthereumProvider is not initialized.");
      }
      const allNamespaceAccounts = Object.values(_session.namespaces)
        .map((namespace) => namespace.accounts)
        .flat();
      const allNamespaceChains = Object.keys(_session.namespaces);
      const chainData = allNamespaceAccounts[0].split(":");
      const caipChainId = `${chainData[0]}:${chainData[1]}`;
      console.log("restored caipChainId", caipChainId);
      setSession(_session);
      localStorage.setItem("wallet", "walletConnect");
      setWallet((data) => ({
        ...data,
        accounts: allNamespaceAccounts.map((account) => account.split(":")[2]),
        chains: caipChainId,
        isConnected: true,
      }));

      createWeb3Provider(ethereumProvider);
    },
    [ethereumProvider, createWeb3Provider]
  );

  // 检查 session
  const _checkForPersistedSession = useCallback(
    async (provider: UniversalProvider) => {
      if (typeof provider === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      const pairings = provider.client.pairing.getAll({ active: true });
      // populates existing pairings to state
      setPairings(pairings);
      console.log("RESTORED PAIRINGS: ", pairings);
      if (typeof session !== "undefined") return;
      // populates (the last) existing session to state
      if (ethereumProvider?.session) {
        const _session = ethereumProvider?.session;
        console.log("RESTORED SESSION:", _session);
        await onSessionConnected(_session);
        return _session;
      }
    },
    [session, ethereumProvider, onSessionConnected]
  );

  // 签名
  const signMessage = useCallback(async () => {
    if (!web3Provider) return;
    try {
      const msg = "hello world";
      const hexMsg = encoding.utf8ToHex(msg, true);
      // 获取签名者数组
      const signers = await web3Provider.listAccounts();
      // 遍历签名者数组，并获取每个签名者的地址
      const addresses = signers.map((signer) => signer.getAddress());
      // 等待所有地址获取完成
      const resolvedAddresses = await Promise.all(addresses);
      const address = resolvedAddresses[0];
      console.log("Signer addresses:", address);
      const signature = await web3Provider.send("personal_sign", [
        hexMsg,
        address,
      ]);
      console.log("-------signature", signature);
      Modal.clear();
      const hashMsg = hashPersonalMessage(msg);
      const valid = await verifySignature(
        address,
        signature,
        hashMsg,
        web3Provider
      );
      console.table({
        method: "personal_sign",
        address,
        valid,
        result: signature,
      });
    } catch (error) {
      console.error("RPC request failed:", error);
    } finally {
      // setIsRpcRequestPending(false);
    }
  }, [web3Provider]);

  const signModal = () => {
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
                signMessage();
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
  };

  // 发送交易
  const walletSendTransaction = useCallback(
    async (value: string) => {
      if (!web3Provider) {
        throw new Error("web3Provider not connected");
      }
      const signer = await web3Provider.getSigner();
      const recipientAddress = "0x35955ef357d8f4787eFaD5237C290F2cB8B0B1d6"; // 替换为接收方地址
      const amount = ethers.parseEther("0.00001"); // 替换为你想发送的金额
      console.table({ signer, amount, recipientAddress });

      const transaction = {
        to: recipientAddress,
        value: amount,
      };
      // 签名并发送交易
      const transactionResponse = await signer.sendTransaction(transaction);
      console.log("transactionResponse:", transactionResponse);
      if (transactionResponse) {
        // 监听交易状态
        transactionResponse
          .wait()
          .then((receipt) => {
            console.log("Transaction mined:", receipt);
            // 交易成功处理逻辑
          })
          .catch((error) => {
            console.error("Transaction failed:", error);
            // 交易失败处理逻辑
          });
      }
    },
    [web3Provider]
  );

  useEffect(() => {
    loadChainData();
  }, []);

  useEffect(() => {
    if (!client) {
      createClient();
    }
  }, [client, createClient]);

  useEffect(() => {
    if (ethereumProvider && web3Modal)
      _subscribeToProviderEvents(ethereumProvider);
  }, [_subscribeToProviderEvents, ethereumProvider, web3Modal]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!web3Provider || !wallet.accounts) return;
      try {
        setIsFetchingBalances(true);
        const _balances = await Promise.all(
          wallet.accounts.map(async (account) => {
            const balance = await web3Provider.getBalance(account);
            setWallet((data) => ({
              ...data,
              balance: ethers.formatEther(balance),
            }));
            return {
              account,
              symbol: "ETH",
              balance: ethers.formatEther(balance),
              contractAddress: "",
            };
          })
        );
      } catch (error: any) {
        throw new Error(error);
      } finally {
        setIsFetchingBalances(false);
      }
    };
    fetchBalances();
  }, [web3Provider, wallet.accounts]);

  useEffect(() => {
    // 获取session
    const getPersistedSession = async () => {
      if (!ethereumProvider) return;
      await _checkForPersistedSession(ethereumProvider);
      setHasCheckedPersistedSession(true);
    };

    if (ethereumProvider && chainData && !hasCheckedPersistedSession) {
      getPersistedSession();
    }
  }, [
    ethereumProvider,
    chainData,
    _checkForPersistedSession,
    hasCheckedPersistedSession,
  ]);

  const value = useMemo(
    () => ({
      pairings,
      isInitializing,
      isFetchingBalances,
      client,
      session,
      disconnectWalletConnect,
      connectWalletConnect,
      chainData,
      web3Provider,
      walletSendTransaction,
    }),
    [
      pairings,
      isInitializing,
      isFetchingBalances,
      client,
      session,
      disconnectWalletConnect,
      connectWalletConnect,
      chainData,
      web3Provider,
      walletSendTransaction,
    ]
  );

  return (
    <ClientContext.Provider
      value={{
        ...value,
      }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useWalletConnectClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error(
      "useWalletConnectClient must be used within a ClientContextProvider"
    );
  }
  return context;
}
