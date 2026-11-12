// Names the LIB text (modules/basics.mjs) defines inside the page before pageProbe and restProbe run: those functions
// are shipped with toString() after a "/* LIB */" replace, so tsc cannot see where these come from.
declare global {
  const sel: any, squash: any, doc: any, drawn: any, nameOf: any, shown: any, rgba: any, view: any, over: any;
  const ratio: any, groundOf: any;
  // the scroll-driven animations API, not yet in TypeScript's DOM lib
  const ViewTimeline: any;
}
export {};
