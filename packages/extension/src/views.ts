export type ViewRegistration = {
  registerSidebar(id: string): void;
  registerCommand(id: string, callback: () => void | Promise<void>): void;
  openEditor(id: string): void | Promise<void>;
};

/** REQ-012: サイドバーとエディタの表示面を同じ拡張から登録する。 */
export function registerViews(registration: ViewRegistration): void {
  registration.registerSidebar("glitchboard.events");
  registration.registerCommand("glitchboard.open", () =>
    registration.openEditor("glitchboard.board"),
  );
}
