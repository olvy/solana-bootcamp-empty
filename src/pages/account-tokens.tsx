import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { TabsContent } from "@/components/ui/tabs";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useTokens } from "@/hooks/useTokens";

export default function AccountTokens({
  loading,
}: {
  isWalletConnected: boolean;
  disconnect: () => void;
  setIsWalletConnected: (isWalletConnected: boolean) => void;
  loading: boolean;
}) {
  const { publicKey } = useWallet();
  console.log('publicKey', publicKey)

  // Set up network and connection
  const network = WalletAdapterNetwork.Devnet;
  const connection = new Connection(clusterApiUrl(network), 'confirmed');
  const { data: tokens, isLoading } = useTokens(connection, publicKey);

  if (loading || isLoading) {
    return (
      <TabsContent value="accountTokens">
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle>Loading Your Tokens...</CardTitle>
        </CardHeader>
      </Card>
    </TabsContent>
    )
  }

  if (!publicKey) {
      return (
        <TabsContent value="accountTokens">
        <Card>
          <CardHeader className="flex flex-row justify-between">
            <div>
              <CardTitle>Your Tokens</CardTitle>
              <CardDescription>Wallet not connected</CardDescription>
              {/* TODO: add a link to the account offers tab */}
              <CardDescription>Open Account Offers and Connect Your Wallet</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </TabsContent>
      )
  }

  if (!tokens?.length) {
    return (
      <TabsContent value="accountTokens">
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <div>
            <CardTitle>No tokens found</CardTitle>
          </div>
        </CardHeader>
      </Card>
    </TabsContent>
    )
  }

  console.log("Tokens in wallet:", tokens);

  const table = (
    <table className="w-full table-auto border border-gray-300">
        <thead>
            <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Mint</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Amount</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Decimals</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Program</th>
            </tr>
        </thead>
        <tbody>
            {tokens.map((token, idx) => (
                <tr key={idx}>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{token.mint}</td>
                    <td className="border border-gray-300 px-4 py-2">{token.amount}</td>
                    <td className="border border-gray-300 px-4 py-2">{token.decimals}</td>
                    <td className="border border-gray-300 px-4 py-2">
                        {token.programId === TOKEN_PROGRAM_ID.toBase58()
                            ? 'SPL Token'
                            : 'Token-2022'}
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
  )

  return (
    <TabsContent value="accountTokens">
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <div className="w-full">
            <CardTitle>Your Tokens</CardTitle>
            {table}
          </div>
        </CardHeader>
      </Card>
    </TabsContent>
  );
}
