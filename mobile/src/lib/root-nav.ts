/**
 * C-3: a screen opened from outside the current flow (a tapped expiry reminder) must not be
 * pushed on top of a presented modal (Invite, Upgrade), where iOS shows it inside that modal.
 * Every screen lives in the root stack, so returning to its first screen (Rooms) dismisses any
 * modal; the target is then pushed from the root. Pure (takes the router) so it can be tested.
 */
export type RootRouter<Href> = {
  canDismiss(): boolean;
  dismissAll(): void;
  push(href: Href): void;
};

export function pushFromRoot<Href>(router: RootRouter<Href>, href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.push(href);
}
