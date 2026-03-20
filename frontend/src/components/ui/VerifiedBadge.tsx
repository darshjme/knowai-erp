// Verified badge shown next to user names when their identity is verified
// Shows a blue checkmark circle (like Twitter/X verified)

export default function VerifiedBadge({ verified, size = 16, style = {} }) {
  if (!verified) return null;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, ...style }} title="Verified Identity">
      <circle cx="12" cy="12" r="12" fill="#3B82F6" />
      <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
