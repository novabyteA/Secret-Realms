import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Secret Realms',
  projectId: '51d6b7425a0240cf9b219c2f503d1c56',
  chains: [sepolia],
  ssr: false,
});
