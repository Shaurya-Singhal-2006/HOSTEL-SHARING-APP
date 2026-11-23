export type CommunityLocationLabels = { level1Label: string; level2Label: string } | null | undefined
export type MemberLocationValues = {
  level1Value?: string | null
  level2Value?: string | null
  floor?: number | null
  room?: string | null
} | null | undefined

/** Format only the location fields this community has chosen to use. */
export function formatLocation(member: MemberLocationValues, community: CommunityLocationLabels): string {
  if (!member || !community) return ''
  const level1 = community.level1Label.trim()
  const level2 = community.level2Label.trim()
  const value1 = member.level1Value ?? (member.floor === null || member.floor === undefined ? '' : String(member.floor))
  const value2 = member.level2Value ?? member.room ?? ''
  return [
    level1 && value1 ? `${level1} ${value1}` : '',
    level2 && value2 ? `${level2} ${value2}` : '',
  ].filter(Boolean).join(', ')
}

export const formatCommunityLocation = formatLocation
