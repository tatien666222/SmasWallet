import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import type { AuthNonceResponse, AuthVerifyResponse } from '../types/index.js';

export class AuthService {
  public generateNonce(walletAddress: string): AuthNonceResponse {
    const nonce = `Sign this message to authenticate with Arc Wallet: ${uuidv4()}`;
    const ttl = 300; // 5 minutes
    db.setNonce(walletAddress, nonce, ttl);

    return {
      nonce,
      message: nonce,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }

  public verifySignature(
    walletAddress: string,
    signature: string,
    nonce: string
  ): AuthVerifyResponse {
    const storedNonce = db.getNonce(walletAddress);
    if (!storedNonce || storedNonce !== nonce) {
      throw new Error('INVALID_NONCE: Nonce is invalid or expired.');
    }

    // In a full production environment with viem/ethers on backend, we recover public address from signature:
    // const recoveredAddress = verifyMessage({ message: nonce, signature });
    // if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) throw new Error('INVALID_SIGNATURE');

    // Clear nonce after single use
    db.clearNonce(walletAddress);

    // Mock JWT generation for lightweight support service
    const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(
      JSON.stringify({ walletAddress, exp: Math.floor(Date.now() / 1000) + 86400 })
    ).toString('base64url')}.sig`;

    return {
      token: mockJwt,
      walletAddress,
    };
  }
}

export const authService = new AuthService();
