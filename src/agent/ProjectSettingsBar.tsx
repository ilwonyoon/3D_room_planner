/**
 * The chat-bottom entry point to Project settings.
 *
 * Replaces the always-visible left-column dashboard. A single chip with a
 * red dot when there are new agent-inferred slots since the user last
 * opened the sheet. Tap target ≥ 48px and label text ≥ 16px for 40-60yr
 * shoppers (icon-only would be a guessing game).
 *
 * State (unread count, open flag) lives in AgentPage; this component is
 * presentation-only.
 */

type Props = {
  readonly unreadCount: number
  readonly onOpen: () => void
}

export function ProjectSettingsBar({ unreadCount, onOpen }: Props) {
  const hasUnread = unreadCount > 0
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        hasUnread
          ? `Project settings — ${unreadCount} new from Mylow`
          : 'Project settings'
      }
      className="relative flex min-h-[48px] items-center gap-2 rounded-[var(--radius-sm)] border-2 border-[var(--color-lowes-blue)] bg-[var(--color-surface)] px-4 text-base font-semibold text-[var(--color-lowes-blue)] hover:bg-[color-mix(in_srgb,var(--color-lowes-blue)_8%,var(--color-surface))]"
    >
      <SettingsIcon />
      <span>Project settings</span>
      {hasUnread ? (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-red-600 ring-2 ring-[var(--color-surface)]"
        />
      ) : null}
    </button>
  )
}

function SettingsIcon() {
  // Inline SVG so we don't add a UI-icon dep just for this. 18px is the
  // sweet spot next to 16px body text — visible without being childlike.
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
