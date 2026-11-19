export function formatFloor(floor: number | null | undefined): string {
  return floor === 0 ? 'Basement' : floor === null || floor === undefined ? 'Floor not set' : `Floor ${floor}`
}

export function formatLocation(floor: number | null | undefined, room: string | null | undefined): string {
  return [formatFloor(floor), room ? `Room ${room}` : 'Room not set'].join(', ')
}
