import { AnchorProvider, Program, Wallet, web3, BN } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { PublicKey } from "@solana/web3.js";

import escrowIdl from "./escrow.json";
import { Escrow } from "./idlType";
import { config } from "./config";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { randomBytes } from "crypto";

export class EscrowProgram {
  protected program: Program<Escrow>;
  protected connection: web3.Connection;
  protected wallet: NodeWallet;

  constructor(connection: web3.Connection, wallet: Wallet) {
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    this.program = new Program<Escrow>(escrowIdl as Escrow, provider);
    this.wallet = wallet;
    this.connection = connection;
  }

  createOfferId = (offerId: BN) => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("offer"),
        this.wallet.publicKey.toBuffer(),
        offerId.toArrayLike(Buffer, "le", 8),
      ],
      new PublicKey(config.contractAddress)
    )[0];
  };

  async makeOffer(
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    tokenAmountA: number,
    tokenAmountB: number
  ) {
    try {
      console.log(tokenMintA, tokenMintB, tokenAmountA, tokenAmountB);
      const offerId = new BN(randomBytes(8));
      const offerAddress = this.createOfferId(offerId);
  
      // Determine token program IDs
      const [mintAInfo, mintBInfo] = await Promise.all([
        this.connection.getAccountInfo(tokenMintA),
        this.connection.getAccountInfo(tokenMintB),
      ]);
  
      const programIdA = mintAInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;
  
      const programIdB = mintBInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;
  
      // Compute token accounts with correct program
      const vault = getAssociatedTokenAddressSync(
        tokenMintA,
        offerAddress,
        true,
        programIdA,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const makerTokenAccountA = getAssociatedTokenAddressSync(
        tokenMintA,
        this.wallet.publicKey,
        true,
        programIdA,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const makerTokenAccountB = getAssociatedTokenAddressSync(
        tokenMintB,
        this.wallet.publicKey,
        true,
        programIdB,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
  
      const accounts = {
        maker: this.wallet.publicKey,
        tokenMintA: tokenMintA,
        makerTokenAccountA,
        tokenMintB: tokenMintB,
        makerTokenAccountB,
        vault,
        offer: offerAddress,
        tokenProgram: programIdA, // Assuming your on-chain program uses only one token program per tx
      };
  
      const txInstruction = await this.program.methods
        .makeOffer(offerId, new BN(tokenAmountA), new BN(tokenAmountB))
        .accounts(accounts)
        .instruction();
  
      const messageV0 = new web3.TransactionMessage({
        payerKey: this.wallet.publicKey,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
        instructions: [txInstruction],
      }).compileToV0Message();
  
      const versionedTransaction = new web3.VersionedTransaction(messageV0);
  
      if (!this.program.provider.sendAndConfirm) return;
  
      const response = await this.program.provider.sendAndConfirm(
        versionedTransaction
      );
  
      return response;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  async takeOffer(
    maker: PublicKey,
    offer: PublicKey,
    tokenMintA: PublicKey,
    tokenMintB: PublicKey
  ) {
    try {
      console.log(maker, offer, tokenMintA, tokenMintB);
  
      // Fetch mint account info to determine which token program to use
      const [mintAInfo, mintBInfo] = await Promise.all([
        this.connection.getAccountInfo(tokenMintA),
        this.connection.getAccountInfo(tokenMintB),
      ]);
  
      const programIdA = mintAInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;
  
      const programIdB = mintBInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;
  
      const takerTokenAccountA = getAssociatedTokenAddressSync(
        tokenMintA,
        this.wallet.publicKey,
        true,
        programIdA,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const takerTokenAccountB = getAssociatedTokenAddressSync(
        tokenMintB,
        this.wallet.publicKey,
        true,
        programIdB,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const makerTokenAccountB = getAssociatedTokenAddressSync(
        tokenMintB,
        maker,
        true,
        programIdB,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const vault = getAssociatedTokenAddressSync(
        tokenMintA,
        offer,
        true,
        programIdA,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
  
      const accounts = {
        maker,
        offer,
        taker: this.wallet.publicKey,
        takerTokenAccountA,
        takerTokenAccountB,
        vault,
        makerTokenAccountB,
        tokenProgram: programIdA, // You might need both if your program uses A and B
      };
  
      const txInstruction = await this.program.methods
        .takeOffer()
        .accounts(accounts)
        .instruction();
  
      const messageV0 = new web3.TransactionMessage({
        payerKey: this.wallet.publicKey,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
        instructions: [txInstruction],
      }).compileToV0Message();
  
      const versionedTransaction = new web3.VersionedTransaction(messageV0);
  
      if (!this.program.provider.sendAndConfirm) return;
  
      const response = await this.program.provider.sendAndConfirm(
        versionedTransaction
      );
  
      return response;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}
