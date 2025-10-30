import { useCallback, useEffect, useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/GameApp.css';

type Coordinate = {
  x: number;
  y: number;
};

type EncryptedPosition = [string, string];

const GRID_SIZE = 10;
// const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function generateGrid() {
  return Array.from({ length: GRID_SIZE }, (_, rowIndex) =>
    Array.from({ length: GRID_SIZE }, (_, columnIndex) => ({
      x: columnIndex + 1,
      y: GRID_SIZE - rowIndex,
    }))
  );
}

const coordinateGrid = generateGrid();

export function SecretRealmsApp() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [selectedCell, setSelectedCell] = useState<Coordinate | null>(null);
  const [encryptedPosition, setEncryptedPosition] = useState<EncryptedPosition | null>(null);
  const [decryptedPosition, setDecryptedPosition] = useState<Coordinate | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [shareAddress, setShareAddress] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isContractConfigured = true;

  const {
    data: hasJoinedData,
    refetch: refetchHasJoined,
    isFetching: isLoadingJoinStatus,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'hasJoined',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address) && isContractConfigured,
    },
  });

  const hasJoined = Boolean(hasJoinedData);

  const { data: joinTimestampData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getJoinTimestamp',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address) && hasJoined && isContractConfigured,
    },
  });

  const {
    data: players,
    refetch: refetchPlayers,
    isFetching: isLoadingPlayers,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'listPlayers',
    query: {
      enabled: isContractConfigured,
    },
  });

  useEffect(() => {
    if (!publicClient || !address || !hasJoined || !isContractConfigured) {
      setEncryptedPosition(null);
      return;
    }

    let cancelled = false;

    publicClient
      .readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getPlayerPosition',
        args: [address],
      })
      .then((value) => {
        if (cancelled) {
          return;
        }

        const position = value as EncryptedPosition;
        setEncryptedPosition(position);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to read encrypted position', error);
          setEncryptedPosition(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [publicClient, address, hasJoined, isContractConfigured, refreshKey]);

  const formattedJoinTime = useMemo(() => {
    if (!joinTimestampData) {
      return null;
    }

    try {
      const timestamp = Number(joinTimestampData);
      if (Number.isNaN(timestamp) || timestamp === 0) {
        return null;
      }
      return new Date(timestamp * 1000).toLocaleString();
    } catch {
      return null;
    }
  }, [joinTimestampData]);

  const handleSelect = useCallback((coordinate: Coordinate) => {
    setSelectedCell(coordinate);
    setStatusMessage(`Selected cell (${coordinate.x}, ${coordinate.y})`);
    setErrorMessage(null);
  }, []);

  const handleJoin = useCallback(async () => {
    if (!isContractConfigured) {
      setErrorMessage('Secret Realms contract address is not configured.');
      return;
    }

    if (!isConnected || !address) {
      setErrorMessage('Connect your wallet to join the realm.');
      return;
    }

    if (!instance) {
      setErrorMessage('Encryption service is not ready yet.');
      return;
    }

    if (!signerPromise) {
      setErrorMessage('Wallet signer is not available.');
      return;
    }

    if (!selectedCell) {
      setErrorMessage('Select a location on the map before joining.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add32(selectedCell.x);
      input.add32(selectedCell.y);
      const encryptedInput = await input.encrypt();

      const signer = await signerPromise;
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.joinGame(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof
      );

      await tx.wait();

      setStatusMessage(`Location submitted at (${selectedCell.x}, ${selectedCell.y}).`);
      setDecryptedPosition(null);
      setRefreshKey((value) => value + 1);
      await Promise.all([refetchHasJoined(), refetchPlayers()]);
    } catch (error) {
      console.error('Failed to join game:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to submit your encrypted location.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    address,
    isConnected,
    instance,
    isContractConfigured,
    refetchHasJoined,
    refetchPlayers,
    selectedCell,
    signerPromise,
  ]);

  const handleDecrypt = useCallback(async () => {
    if (!isContractConfigured) {
      setErrorMessage('Secret Realms contract address is not configured.');
      return;
    }

    if (!instance) {
      setErrorMessage('Encryption service is not ready yet.');
      return;
    }

    if (!address) {
      setErrorMessage('Connect your wallet to decrypt your location.');
      return;
    }

    if (!encryptedPosition) {
      setErrorMessage('No encrypted position found. Join the realm first.');
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setErrorMessage('Wallet signer is not available.');
      return;
    }

    setIsDecrypting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const keypair = instance.generateKeypair();

      const handleContractPairs = [
        { handle: encryptedPosition[0], contractAddress: CONTRACT_ADDRESS },
        { handle: encryptedPosition[1], contractAddress: CONTRACT_ADDRESS },
      ];

      const contractAddresses = [CONTRACT_ADDRESS];
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );

      const decrypted = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimestamp,
        durationDays
      );

      const clearX = Number(decrypted[encryptedPosition[0]]);
      const clearY = Number(decrypted[encryptedPosition[1]]);

      if (Number.isNaN(clearX) || Number.isNaN(clearY)) {
        throw new Error('Received invalid decrypted coordinates.');
      }

      setDecryptedPosition({ x: clearX, y: clearY });
      setStatusMessage(`Decrypted location: (${clearX}, ${clearY}).`);
    } catch (error) {
      console.error('Failed to decrypt position:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to decrypt position.');
    } finally {
      setIsDecrypting(false);
    }
  }, [instance, address, encryptedPosition, signerPromise, isContractConfigured]);

  const handleGrantAccess = useCallback(async () => {
    if (!isContractConfigured) {
      setErrorMessage('Secret Realms contract address is not configured.');
      return;
    }

    if (!shareAddress) {
      setErrorMessage('Enter an address to grant access.');
      return;
    }

    if (!instance) {
      setErrorMessage('Encryption service is not ready yet.');
      return;
    }

    if (!address) {
      setErrorMessage('Connect your wallet to manage permissions.');
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setErrorMessage('Wallet signer is not available.');
      return;
    }

    setIsGranting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.grantPositionAccess(shareAddress);
      await tx.wait();

      setStatusMessage(`Decryption permissions granted to ${shareAddress}.`);
      setShareAddress('');
    } catch (error) {
      console.error('Failed to grant access:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to grant access.');
    } finally {
      setIsGranting(false);
    }
  }, [instance, address, shareAddress, signerPromise, isContractConfigured]);

  const playerCount = Array.isArray(players) ? players.length : 0;

  if (!isContractConfigured) {
    return (
      <div className="game-app">
        <section className="map-section">
          <div className="panel-header">
            <h2 className="panel-title">Secret Realms contract not configured</h2>
            <p className="panel-subtitle">
              Deploy the SecretRealmsGame contract and update <code>CONTRACT_ADDRESS</code> in
              <code>app/src/config/contracts.ts</code> with the deployed Sepolia address.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="game-app">
      <section className="map-section">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Encrypted Battlefield</h2>
            <p className="panel-subtitle">
              Select a coordinate within the 10×10 map (rows and columns numbered 1-10).
            </p>
          </div>
          <div className="panel-meta">
            <span className="meta-item">
              Grid size:
              <strong>{GRID_SIZE} × {GRID_SIZE}</strong>
            </span>
            <span className="meta-item">
              Adventurers:
              <strong>{playerCount}</strong>
            </span>
          </div>
        </div>

        <div className="grid-wrapper">
          <div className="axis-label axis-label-y">Y</div>
          <div className="grid">
            {coordinateGrid.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid-row">
                <div className="row-label">{GRID_SIZE - rowIndex}</div>
                {row.map((cell) => {
                  const isSelected =
                    selectedCell?.x === cell.x && selectedCell?.y === cell.y;
                  const isDecrypted =
                    decryptedPosition?.x === cell.x && decryptedPosition?.y === cell.y;

                  const cellClassNames = [
                    'grid-cell',
                    isSelected ? 'selected-cell' : '',
                    isDecrypted ? 'decrypted-cell' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <button
                      key={`${cell.x}-${cell.y}`}
                      type="button"
                      className={cellClassNames}
                      onClick={() => handleSelect(cell)}
                    >
                      {cell.x},{cell.y}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="column-labels">
              <span className="corner-spacer" />
              {Array.from({ length: GRID_SIZE }, (_, index) => (
                <span key={`col-${index}`} className="column-label">
                  {index + 1}
                </span>
              ))}
            </div>
          </div>
          <div className="axis-label axis-label-x">X</div>
        </div>
      </section>

      <section className="action-section">
        <div className="action-card">
          <h3 className="section-title">Commit Position</h3>
          <p className="section-description">
            Your coordinates are encrypted locally with Zama FHE before being sent on-chain.
            Choose a tile, then commit it to reveal your presence in the realm.
          </p>

          <div className="action-buttons">
            <button
              type="button"
              className="primary-button"
              onClick={handleJoin}
              disabled={
                !isConnected ||
                !selectedCell ||
                isSubmitting ||
                zamaLoading ||
                isLoadingJoinStatus
              }
            >
              {zamaLoading && 'Initializing encryption...'}
              {!zamaLoading && isSubmitting && 'Submitting coordinates...'}
              {!zamaLoading && !isSubmitting && !selectedCell && 'Select a coordinate'}
              {!zamaLoading && !isSubmitting && selectedCell && 'Commit encrypted position'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleDecrypt}
              disabled={
                !hasJoined ||
                isDecrypting ||
                !encryptedPosition ||
                zamaLoading ||
                !isConnected
              }
            >
              {isDecrypting ? 'Decrypting...' : 'Decrypt my location'}
            </button>
          </div>

          <div className="status-banner">
            {statusMessage && <div className="status-message success">{statusMessage}</div>}
            {errorMessage && <div className="status-message error">{errorMessage}</div>}
            {zamaError && <div className="status-message error">{zamaError}</div>}
          </div>

          <div className="info-grid">
            <div className="info-card">
              <span className="info-label">Wallet</span>
              <span className="info-value">{address ?? 'Not connected'}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Joined</span>
              <span className="info-value">{hasJoined ? 'Yes' : 'No'}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Join timestamp</span>
              <span className="info-value">
                {formattedJoinTime ?? 'Pending'}
              </span>
            </div>
            <div className="info-card">
              <span className="info-label">Decrypted location</span>
              <span className="info-value">
                {decryptedPosition
                  ? `(${decryptedPosition.x}, ${decryptedPosition.y})`
                  : 'Encrypted'}
              </span>
            </div>
          </div>
        </div>

        <div className="action-card">
          <h3 className="section-title">Share Access</h3>
          <p className="section-description">
            Grant another explorer permission to decrypt your coordinates directly from the contract.
          </p>

          <div className="share-form">
            <input
              type="text"
              className="share-input"
              placeholder="0x shared address"
              value={shareAddress}
              onChange={(event) => setShareAddress(event.target.value)}
              disabled={isGranting}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={handleGrantAccess}
              disabled={!hasJoined || isGranting || !shareAddress || zamaLoading}
            >
              {isGranting ? 'Granting access...' : 'Grant access'}
            </button>
          </div>
        </div>
      </section>

      <section className="players-section">
        <div className="players-card">
          <h3 className="section-title">Active Explorers</h3>
          <p className="section-description">
            Every address listed here has committed an encrypted position within the realm.
          </p>

          {isLoadingPlayers ? (
            <p className="placeholder-text">Loading player roster...</p>
          ) : playerCount === 0 ? (
            <p className="placeholder-text">No explorers have joined yet.</p>
          ) : (
            <ul className="player-list">
              {Array.isArray(players) &&
                players.map((playerAddress, index) => (
                  <li key={`${playerAddress}-${index}`} className="player-item">
                    <div className="player-index">{index + 1}</div>
                    <div className="player-address">{playerAddress}</div>
                    {address === playerAddress && <span className="player-tag">You</span>}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
