import { useEffect, useCallback, useState } from "react"
import { useMoralis } from "react-moralis"
import truncateAddress from "../helpers/truncateAddress"
// ${str.slice(0, n)}...${str.slice(str.length - n)}

// Top navbar
export default function Navbar() {
  const { enableWeb3, isWeb3Enabled, isWeb3EnableLoading, account, Moralis, deactivateWeb3 } =
    useMoralis()
  const [connected, setIsConnected] = useState(false)

  useEffect(() => {
    console.log(`New Account is ${account}`)
    if (account == null) {
      deactivateWeb3()
      setIsConnected(false)
    } else if (connected) {
      enableWeb3()
    } else if (isWeb3Enabled) {
    }
  }, [account, isWeb3Enabled])

  // useEffect(() => {
  //   const checkConnected = async () => {
  //     if (typeof (window as any).ethereum !== "undefined") {
  //       console.log("wtf")
  //     }
  //   }
  //   if (isWeb3Enabled) {
  //     enableWeb3()
  //   }
  // }, [account])

  // Moralis.onAccountChanged((account) => {
  //   console.log(`Account changed to ${account}`)
  //   if (account == null) {
  //     console.log("Null")
  //   }
  // })

  return (
    <nav className="p-5 border-b-2">
      <ul className="">
        <li className="flex flex-row">
          {account ? (
            <div className="ml-auto py-2 px-4">
              Connected to {account.slice(0, 6)}...{account.slice(account.length - 4)}
            </div>
          ) : (
            <button
              onClick={async () => await enableWeb3()}
              disabled={isWeb3EnableLoading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-auto"
            >
              Connect
            </button>
          )}
        </li>
      </ul>
    </nav>
  )
}
