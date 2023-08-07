import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface WalletState {
  accounts: string[];
  balance: string;
  chains: string;
  isConnected: boolean;
}
interface IContext {
  wallet: WalletState;
  setWallet: Dispatch<SetStateAction<WalletState>>;
  resetWallet: () => void;
}
const disconnectedState: WalletState = {
  accounts: [],
  balance: "",
  chains: "",
  isConnected: false,
};

const WalletDataContext = createContext<IContext>({} as IContext);

export const WalletDataContextProvider = ({ children }: PropsWithChildren) => {
  const [wallet, setWallet] = useState(disconnectedState);
  const resetWallet = () => {
    localStorage.removeItem("wallet");
    setWallet(disconnectedState);
  };
  const value = useMemo(
    () => ({
      wallet,
      setWallet,
      resetWallet,
    }),
    [wallet, setWallet, resetWallet]
  );
  useEffect(() => {
    console.log("----update wallet start----");
    console.table({ ...wallet });

    console.log("----update wallet end----");
  }, [wallet]);

  return (
    <WalletDataContext.Provider
      value={{
        ...value,
      }}>
      {children}
    </WalletDataContext.Provider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletDataContext);
  if (context === undefined) {
    throw new Error(
      'useWalletContext must be used within a "WalletDataContextProvider"'
    );
  }
  return context;
};
