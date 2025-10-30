import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div>
            <h1 className="header-title">Secret Realms</h1>
            <p className="header-subtitle">
              Commit and decrypt battlefield coordinates secured by Zama FHE.
            </p>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
