import { AgentPage } from './agent/AgentPage'

/**
 * Bond demo entry — the agent playground IS the app on this branch.
 *
 * The 3-column layout (dashboard | chat | scene) lives inside AgentPage.
 * The original mobile-first Editor + PhoneFrame is preserved on `main`;
 * here we mount the agent and wire the right column to `IsometricScene`.
 */

export default function App() {
  return <AgentPage />
}
