// Display name and avatar initials, computed in one place so every screen
// shows the same thing.

function emailLocalPart(email: string): string {
  return email.split("@")[0] ?? ""
}

// "jane.doe_92" -> "Jane Doe". Best effort for accounts whose only name is
// their email address.
function nameFromEmail(email: string): string {
  return emailLocalPart(email)
    .replace(/\d+/g, " ")
    .split(/[._\-+\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

// The profile row's display_name is filled from the email prefix when an
// account has no name on record. Treat that the same as "no name": prefer the
// name given at sign-up, then a tidied-up version of the email prefix.
function resolveDisplayName(stored: string, email: string, signUpName: string): string {
  const trimmed = stored.trim()
  const isPlaceholder = !trimmed || (email && trimmed === emailLocalPart(email))
  if (!isPlaceholder) return trimmed
  return signUpName.trim() || nameFromEmail(email) || trimmed
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export { getInitials, resolveDisplayName }
