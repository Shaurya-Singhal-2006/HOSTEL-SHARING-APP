export function formatFloor(floor: number | null | undefined): string {
  return floor === 0 ? 'Basement' : floor === null || floor === undefined ? 'Floor not set' : `Floor ${floor}`
}

export function formatLocation(floor: number | null | undefined, room: string | null | undefined): string {
  return [formatFloor(floor), room ? `Room ${room}` : 'Room not set'].join(', ')
}

export function formatCommunityLocation(member: { level1Value: string | null; level2Value: string | null } | null | undefined, community: { level1Label: string; level2Label: string } | null | undefined): string {
  if (!member || !community) return ''
  return [
    community.level1Label && member.level1Value ? `${community.level1Label} ${member.level1Value}` : '',
    community.level2Label && member.level2Value ? `${community.level2Label} ${member.level2Value}` : '',
  ].filter(Boolean).join(', ')
}
