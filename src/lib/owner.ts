// The casino owner's username. The comparison is case-insensitive so the
// account works no matter how it was capitalised at registration time.
export const OWNER_USERNAME = "ditol21";

export function isOwner(username: string | null | undefined): boolean {
  return !!username && username.toLowerCase() === OWNER_USERNAME;
}
