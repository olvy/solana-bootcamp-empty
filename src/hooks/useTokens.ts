

import { useQuery } from "@tanstack/react-query";
import { Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

type ParsedToken = {
  pubkey: string;
  mint: string;
  amount: number;
  decimals: number;
  programId: string;
};

async function fetchTokens(
  connection: Connection,
  publicKey: PublicKey | null,
): Promise<ParsedToken[] | null> {
  if (!publicKey) {
    console.log("No publicKey")
    return null;
  }
  try {
    const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID }),
    ]);

    const allAccounts = [
        ...tokenAccounts.value.map(({ pubkey, account }) => ({
            pubkey: pubkey.toBase58(),
            account,
            programId: TOKEN_PROGRAM_ID.toBase58(),
        })),
        ...token2022Accounts.value.map(({ pubkey, account }) => ({
            pubkey: pubkey.toBase58(),
            account,
            programId: TOKEN_2022_PROGRAM_ID.toBase58(),
        })),
    ];

    const parsedTokens: ParsedToken[] = allAccounts
        .map(({ pubkey, account, programId }) => {
            const parsed = account.data as ParsedAccountData;
            const info = parsed.parsed.info;

            return {
                pubkey,
                mint: info.mint,
                amount: info.tokenAmount.uiAmount,
                decimals: info.tokenAmount.decimals,
                programId,
            };
        })
    return parsedTokens;
  } catch (error) {
    console.error("Error fetching:", error);
    throw error;
  }
}

export function useTokens(connection: Connection, publicKey: PublicKey | null) {
  return useQuery({
    queryKey: ["tokens", publicKey],
    queryFn: async () => {
      return fetchTokens(connection, publicKey);
    },
    enabled: !!publicKey,
    gcTime: 30 * 60 * 1000, // Keep data in cache for 30 minutes
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}