import { ClientContextProvider } from "@/contexts/ClientContext";
import { MetaMaskContextProvider } from "@/contexts/MetaMaskContext";
import { WalletDataContextProvider } from "@/contexts/WalletDataContext";
import "@/styles/globals.css";
import { StyleProvider } from "@ant-design/cssinjs";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StyleProvider hashPriority="high">
      <WalletDataContextProvider>
        <ClientContextProvider>
          <MetaMaskContextProvider>
            <Component {...pageProps} />
          </MetaMaskContextProvider>
        </ClientContextProvider>
      </WalletDataContextProvider>
    </StyleProvider>
  );
}
