import "../styles/globals.css"
import type { AppProps } from "next/app"
import { MoralisProvider } from "react-moralis"

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MoralisProvider initializeOnMount={false}>
      <Component {...pageProps} />
    </MoralisProvider>
  )
}

export default MyApp
