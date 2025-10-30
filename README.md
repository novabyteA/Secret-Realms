# Secret Realms

A decentralized privacy-preserving game built on Ethereum Sepolia testnet that demonstrates the power of Fully Homomorphic Encryption (FHE) in blockchain applications. Players commit encrypted coordinates on a battlefield grid while maintaining complete privacy of their positions on-chain.

## Overview

Secret Realms is an interactive demonstration of privacy-preserving smart contracts using Zama's fhevm (Fully Homomorphic Encryption Virtual Machine). The game allows players to:

- **Commit encrypted positions** on a 10×10 battlefield grid
- **Decrypt their own positions** client-side while data remains encrypted on-chain
- **Share decryption access** with specific players without revealing data to others
- **View active players** while their positions remain confidential

This project showcases how sensitive data can be processed and stored on a public blockchain while maintaining complete privacy through FHE technology.

## Why Secret Realms?

### The Problem

Traditional blockchain applications face a fundamental trade-off between transparency and privacy:

- **Public blockchains** expose all transaction data, making them unsuitable for applications requiring confidentiality
- **Private blockchains** sacrifice decentralization and trustlessness
- **Zero-knowledge proofs** can verify computations but don't enable computation on encrypted data
- **Off-chain solutions** require trust in external parties and reduce transparency

### The Solution

Secret Realms leverages **Fully Homomorphic Encryption (FHE)** to enable:

1. **On-chain privacy**: Sensitive data (player coordinates) is encrypted and stored directly on the blockchain
2. **Computation on encrypted data**: Smart contract logic operates on encrypted values without decryption
3. **Selective disclosure**: Players can grant decryption access to specific addresses without revealing data globally
4. **Zero-knowledge gameplay**: Other players can verify someone has committed a position without learning what it is

### Real-World Applications

The technology demonstrated in Secret Realms can be applied to:

- **Private DeFi**: Trading strategies, portfolio balances, and order books that remain confidential
- **Sealed-bid auctions**: Bids remain private until reveal phase
- **Gaming**: Hidden information games like poker, strategy games, or competitive leaderboards
- **Healthcare**: Patient data that can be processed without exposing personal information
- **Supply chain**: Confidential pricing and inventory management
- **Voting systems**: Private ballots with public verification
- **Identity verification**: Proof of credentials without revealing sensitive details

## Key Features

### 1. Encrypted Position Commitment
Players select coordinates on a 10×10 grid and commit them to the blockchain in encrypted form. The encryption happens client-side using Zama's FHE libraries, ensuring that even during transmission and storage, the coordinates remain protected.

### 2. Client-Side Decryption
Players can decrypt their own positions using their wallet signature. The decryption process uses the Zama relayer to request decryption without exposing private keys or encrypted data to third parties.

### 3. Granular Access Control
Players can explicitly grant decryption permissions to specific Ethereum addresses, enabling collaborative gameplay or information sharing while maintaining privacy from other participants.

### 4. Public Player Registry
The smart contract maintains a public list of participating addresses, allowing transparency about game participation while keeping strategic information (positions) confidential.

### 5. Update Positions
Players can update their committed positions at any time. The smart contract tracks join timestamps while allowing position modifications, simulating movement in the realm.

## Technology Stack

### Smart Contracts

- **Solidity ^0.8.24**: Smart contract programming language
- **fhevm (@fhevm/solidity)**: Zama's Fully Homomorphic Encryption library for Solidity
  - Enables FHE operations (`euint32` encrypted integers)
  - Access control for encrypted data
  - Decryption oracle integration
- **Hardhat ^2.26.0**: Development environment for compilation, testing, and deployment
- **OpenZeppelin Contracts**: Secure, audited smart contract libraries
- **TypeChain**: TypeScript bindings for smart contracts

### Frontend Application

- **React ^19.1.1**: Modern UI library for building interactive interfaces
- **TypeScript ~5.8.3**: Type-safe development
- **Vite ^7.1.6**: Fast build tool and development server
- **Wagmi ^2.17.0**: React hooks for Ethereum wallet integration
- **RainbowKit ^2.2.8**: Beautiful wallet connection UI
- **Zama Relayer SDK (@zama-fhe/relayer-sdk)**: Client-side encryption and decryption
- **Ethers.js ^6.15.0**: Ethereum library for contract interaction
- **TanStack Query ^5.89.0**: Data synchronization and caching

### Development & Testing

- **Mocha & Chai**: Test framework and assertion library
- **Hardhat Network**: Local Ethereum network for testing
- **hardhat-deploy**: Deployment management and contract versioning
- **ESLint & Prettier**: Code quality and formatting
- **Solhint**: Solidity linting
- **TypeScript ESLint**: TypeScript-specific linting

### Blockchain Infrastructure

- **Ethereum Sepolia**: Testnet for deployment
- **Infura**: Ethereum node provider
- **Zama fhevm Network**: FHE-enabled blockchain infrastructure
- **Etherscan**: Contract verification and explorer

## Architecture

### Smart Contract Layer

The `SecretRealmsGame.sol` contract implements the core game logic:

```solidity
struct PlayerPosition {
    euint32 x;        // Encrypted X coordinate
    euint32 y;        // Encrypted Y coordinate
    uint64 joinedAt;  // Public timestamp
    bool active;      // Public registration status
}
```

**Key Functions:**
- `joinGame(encryptedX, encryptedY, inputProof)`: Commit encrypted position with zero-knowledge proof
- `getPlayerPosition(player)`: Retrieve encrypted coordinates (respects access control)
- `grantPositionAccess(viewer)`: Allow another address to decrypt your position
- `listPlayers()`: Get all registered player addresses
- `hasJoined(player)`: Check if address has committed a position

### Frontend Architecture

The application follows a modern React architecture with custom hooks:

**Key Components:**
- `SecretRealmsApp.tsx`: Main game interface with grid visualization
- `Header.tsx`: Navigation and wallet connection
- `useZamaInstance.ts`: FHE instance initialization and management
- `useEthersSigner.ts`: Ethers signer integration with Wagmi

**Data Flow:**
1. User selects coordinates in the UI
2. Frontend encrypts coordinates using Zama FHE instance
3. Encrypted data + proof sent to smart contract
4. Contract stores encrypted values with access control
5. User can later decrypt using signed request via Zama relayer

### Security Model

**Access Control:**
- Each encrypted value has an Access Control List (ACL)
- Only authorized addresses can decrypt values
- Contract owner (the player) automatically has access
- Additional permissions granted explicitly via `grantPositionAccess()`

**Encryption:**
- Client-side encryption using Zama's FHE library
- Input proofs ensure data integrity
- Private keys never leave the client
- Decryption requires wallet signature + Zama relayer

## Prerequisites

Before setting up Secret Realms, ensure you have:

- **Node.js** >= 20.x
- **npm** >= 7.0.0
- **MetaMask** or another Web3 wallet
- **Sepolia testnet ETH** (get from [Sepolia faucet](https://sepoliafaucet.com/))
- **Infura account** (for Sepolia RPC access)
- **Git** for cloning the repository

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Secret-Realms.git
cd Secret-Realms
```

### 2. Install Smart Contract Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd app
npm install
cd ..
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Add your configuration:

```env
PRIVATE_KEY=your_wallet_private_key_here
INFURA_API_KEY=your_infura_api_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**Security Warning:** Never commit your `.env` file or share your private keys!

## Usage

### Compile Smart Contracts

```bash
npm run compile
```

This generates TypeChain types and compiles contracts to `artifacts/` directory.

### Run Tests

**Local testing with Hardhat Network:**
```bash
npm test
```

**Testing on Sepolia testnet:**
```bash
npm run test:sepolia
```

The test suite includes:
- Position encryption and storage
- Decryption access control
- Multi-player scenarios
- Permission management
- Edge cases and error handling

### Deploy to Sepolia

```bash
npm run deploy:sepolia
```

This will:
1. Deploy the `SecretRealmsGame` contract to Sepolia
2. Output the deployed contract address
3. Save deployment info to `deployments/sepolia/`

**After deployment:**
1. Copy the contract address
2. Update `app/src/config/contracts.ts`:
```typescript
export const CONTRACT_ADDRESS = '0xYourDeployedContractAddress';
```

### Verify Contract on Etherscan

```bash
npm run verify:sepolia
```

### Run the Frontend

```bash
cd app
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
cd app
npm run build
```

The optimized build will be in `app/dist/` directory.

## How to Play

### 1. Connect Your Wallet
Click "Connect Wallet" in the header and select your Web3 wallet (MetaMask, Rainbow, etc.).

### 2. Wait for Encryption Initialization
The Zama FHE instance initializes in the background. You'll see a loading indicator.

### 3. Select a Coordinate
Click on any cell in the 10×10 grid to select your position. The coordinates range from (1,1) to (10,10).

### 4. Commit Your Position
Click "Commit encrypted position" to submit your selection. This:
- Encrypts your coordinates locally
- Generates a zero-knowledge proof
- Submits the transaction to the blockchain
- Updates your status to "Joined"

### 5. Decrypt Your Position
After committing, click "Decrypt my location" to:
- Sign an EIP-712 message
- Request decryption from Zama relayer
- Display your clear-text coordinates

The cell with your decrypted position will be highlighted on the grid.

### 6. Share Access (Optional)
Enter another player's Ethereum address and click "Grant access" to allow them to decrypt your position.

### 7. Update Your Position
Select a new coordinate and commit again to update your position. The game tracks your latest commitment.

## Smart Contract API

### Write Functions

#### `joinGame(externalEuint32 encryptedX, externalEuint32 encryptedY, bytes calldata inputProof)`
Commit an encrypted position to the game.

**Parameters:**
- `encryptedX`: Encrypted X coordinate handle
- `encryptedY`: Encrypted Y coordinate handle
- `inputProof`: Zero-knowledge proof of encryption validity

**Events:**
- `PlayerPositionCommitted(address indexed player, uint64 joinedAt)`

#### `grantPositionAccess(address viewer)`
Allow another address to decrypt your position.

**Parameters:**
- `viewer`: Address to grant decryption permissions

**Requires:**
- Caller must have joined the game
- Viewer cannot be zero address

**Events:**
- `PositionAccessGranted(address indexed player, address indexed viewer)`

### Read Functions

#### `getPlayerPosition(address player) → (euint32, euint32)`
Retrieve encrypted coordinates for a player.

**Returns:**
- `euint32`: Encrypted X coordinate
- `euint32`: Encrypted Y coordinate

**Requires:**
- Player must have joined
- Caller must have decryption permission

#### `hasJoined(address player) → bool`
Check if an address has committed a position.

#### `getJoinTimestamp(address player) → uint64`
Get the timestamp when a player last committed a position.

#### `listPlayers() → address[]`
Get array of all registered player addresses.

## Project Structure

```
Secret-Realms/
├── contracts/                  # Solidity smart contracts
│   └── SecretRealmsGame.sol   # Main game contract
├── test/                       # Smart contract tests
│   ├── SecretRealmsGame.ts    # Local tests (Hardhat)
│   └── SecretRealmsGameSepolia.ts  # Sepolia integration tests
├── tasks/                      # Hardhat tasks
│   ├── accounts.ts            # Account management
│   └── SecretRealmsGame.ts    # Game-specific tasks
├── deploy/                     # Deployment scripts
│   └── deploy.ts              # Hardhat deploy script
├── app/                        # Frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── SecretRealmsApp.tsx  # Main game UI
│   │   │   └── Header.tsx     # Navigation header
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useZamaInstance.ts   # FHE instance
│   │   │   └── useEthersSigner.ts   # Ethers signer
│   │   ├── config/            # Configuration
│   │   │   ├── wagmi.ts       # Wagmi setup
│   │   │   └── contracts.ts   # Contract addresses
│   │   ├── styles/            # CSS stylesheets
│   │   └── App.tsx            # Root component
│   ├── public/                # Static assets
│   └── package.json           # Frontend dependencies
├── types/                      # TypeChain generated types
├── artifacts/                  # Compiled contracts
├── deployments/                # Deployment records
├── hardhat.config.ts          # Hardhat configuration
├── package.json               # Root dependencies
└── README.md                  # This file
```

## Development Workflow

### Local Development Loop

1. **Modify contracts** in `contracts/`
2. **Run tests** with `npm test`
3. **Compile** with `npm run compile`
4. **Update frontend types** (auto-generated)
5. **Test UI changes** with `cd app && npm run dev`

### Adding New Features

**Smart Contract:**
1. Edit `contracts/SecretRealmsGame.sol`
2. Add tests to `test/SecretRealmsGame.ts`
3. Update tasks in `tasks/SecretRealmsGame.ts` if needed
4. Run `npm run compile` to generate types

**Frontend:**
1. Update components in `app/src/components/`
2. Update contract ABI in `app/src/config/contracts.ts`
3. Test in local dev server

### Code Quality

**Run linting:**
```bash
npm run lint
```

**Format code:**
```bash
npm run prettier:write
```

**Solidity linting:**
```bash
npm run lint:sol
```

## Testing Strategy

### Unit Tests
Test individual contract functions in isolation using Hardhat's local network with FHE mocking.

### Integration Tests
Test complete user flows from encryption to decryption, simulating real-world usage.

### Access Control Tests
Verify that unauthorized addresses cannot decrypt positions and that permission grants work correctly.

### Edge Cases
- Zero address handling
- Non-existent players
- Re-joining with updated positions
- Multiple permission grants

### Coverage

Run test coverage analysis:
```bash
npm run coverage
```

## Deployment

### Testnet Deployment (Sepolia)

1. **Fund your wallet** with Sepolia ETH
2. **Set environment variables** in `.env`
3. **Deploy:**
   ```bash
   npm run deploy:sepolia
   ```
4. **Verify:**
   ```bash
   npm run verify:sepolia
   ```
5. **Update frontend** with contract address

### Mainnet Considerations

**Before mainnet deployment:**

1. **Security audit**: Have contracts professionally audited
2. **Gas optimization**: Analyze and optimize gas costs
3. **Emergency procedures**: Implement pause mechanisms
4. **Upgrade strategy**: Consider proxy patterns for upgradeability
5. **Monitoring**: Set up event monitoring and alerting
6. **Legal review**: Ensure compliance with regulations
7. **Insurance**: Consider smart contract insurance

## Troubleshooting

### Common Issues

**"Encryption service is not ready yet"**
- Wait for Zama FHE instance to initialize (can take 10-30 seconds)
- Check browser console for WebAssembly errors
- Try refreshing the page

**"Failed to submit your encrypted location"**
- Ensure you have Sepolia ETH for gas
- Check that wallet is connected
- Verify contract address is correct
- Check Sepolia network status

**"Failed to decrypt position"**
- Ensure you've committed a position first
- Try re-connecting your wallet
- Check that you have decryption permissions
- Verify Zama relayer is accessible

**Contract not found**
- Verify `CONTRACT_ADDRESS` in `app/src/config/contracts.ts`
- Ensure contract is deployed to Sepolia
- Check you're connected to the correct network

**TypeScript errors after compiling**
- Run `npm run typechain` to regenerate types
- Delete `types/` and `artifacts/` directories and recompile

### Debug Mode

Enable verbose logging:

**Frontend:**
Open browser DevTools console to see detailed logs.

**Hardhat:**
```bash
DEBUG=hardhat:* npm test
```

## Performance Optimization

### Smart Contract
- Encrypted operations are computationally expensive
- Batch multiple operations when possible
- Consider gas costs for FHE operations
- Use public variables for non-sensitive data

### Frontend
- FHE initialization is cached
- React Query caches contract reads
- Optimistic UI updates for better UX
- Lazy load heavy cryptographic libraries

### Network
- Minimize RPC calls with smart caching
- Use multicall for batch reads
- Implement proper loading states
- Handle network errors gracefully

## Security Considerations

### Smart Contract Security
- **Reentrancy**: Not applicable to current implementation
- **Access control**: Enforced via FHE ACL system
- **Input validation**: All inputs validated and proven
- **Timestamp dependency**: Minimal, only for join tracking

### Frontend Security
- Private keys never leave the client
- Encrypted data never decrypted in frontend without permission
- All sensitive operations require wallet signature
- No centralized backend to compromise

### Privacy Guarantees
- On-chain data is encrypted with FHE
- Only authorized parties can decrypt
- Revocation not supported (design decision)
- Consider position change frequency for privacy

## Gas Costs

Approximate gas costs on Sepolia (May vary):

| Operation | Estimated Gas |
|-----------|---------------|
| Deploy Contract | ~2,500,000 |
| Join Game (first time) | ~450,000 |
| Update Position | ~380,000 |
| Grant Access | ~80,000 |
| Read Position (view) | 0 (read-only) |

**Note:** FHE operations are significantly more expensive than standard operations due to the cryptographic overhead.

## Roadmap

### Phase 1: Foundation (Current)
- [x] Basic position commitment system
- [x] Client-side encryption/decryption
- [x] Access control and sharing
- [x] Frontend grid visualization
- [x] Sepolia testnet deployment

### Phase 2: Enhanced Gameplay
- [ ] Movement mechanics with encrypted paths
- [ ] Multi-dimensional realms (3D coordinates)
- [ ] Resource collection and inventory
- [ ] Player-to-player interactions
- [ ] Territory control mechanisms

### Phase 3: Social Features
- [ ] Guilds and alliances
- [ ] Messaging system with encrypted content
- [ ] Leaderboards and achievements
- [ ] Reputation system
- [ ] Quest and mission system

### Phase 4: Advanced Privacy
- [ ] Encrypted item trading
- [ ] Private battles and combat
- [ ] Hidden stats and attributes
- [ ] Encrypted random number generation
- [ ] Zero-knowledge game state proofs

### Phase 5: Platform Expansion
- [ ] Mobile application (React Native)
- [ ] Multiple game modes
- [ ] Custom realm creation
- [ ] NFT integration for items
- [ ] Cross-chain compatibility

### Phase 6: Ecosystem
- [ ] Developer SDK for building on Secret Realms
- [ ] Plugin system for community extensions
- [ ] Marketplace for in-game items
- [ ] DAO governance for game parameters
- [ ] Mainnet deployment

## Contributing

We welcome contributions from the community! Here's how you can help:

### Reporting Issues
- Use GitHub Issues to report bugs
- Include reproduction steps
- Provide error messages and logs
- Specify environment (OS, Node version, etc.)

### Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Write tests for new features
- Update documentation
- Ensure all tests pass
- Keep commits atomic and well-described

### Areas for Contribution
- Smart contract optimizations
- Frontend UI/UX improvements
- Additional game mechanics
- Documentation and tutorials
- Test coverage expansion
- Security analysis

## Resources

### Official Documentation
- [Zama fhevm Documentation](https://docs.zama.ai/fhevm)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)
- [RainbowKit Documentation](https://www.rainbowkit.com/)

### Learning Resources
- [Fully Homomorphic Encryption Basics](https://fhe.org/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethereum Development Tutorials](https://ethereum.org/en/developers/docs/)

### Community
- GitHub Discussions: For questions and feature requests
- Discord: [Link to Discord if available]
- Twitter: [Link to Twitter if available]

## License

This project is licensed under the BSD-3-Clause-Clear License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Zama** for pioneering FHE technology on blockchain
- **Ethereum Foundation** for the Sepolia testnet
- **OpenZeppelin** for secure smart contract libraries
- **Hardhat** team for the excellent development framework
- **RainbowKit** for beautiful wallet UX
- All contributors and community members

## Contact

For questions, suggestions, or collaboration inquiries:

- GitHub Issues: [Project Issues](https://github.com/your-username/Secret-Realms/issues)
- Email: [your-email@example.com]

---

**Built with privacy, powered by encryption, protected by mathematics.**

*Secret Realms is a demonstration project showcasing FHE technology. Use at your own risk. Always conduct thorough security audits before deploying to mainnet.*
