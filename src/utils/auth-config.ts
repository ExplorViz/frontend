/** The container can enable authentication without rebuilding the Vite bundle. */
export function isLoginSkipped(): boolean {
  return (
    window.explorvizConfig?.skipLogin ??
    import.meta.env.VITE_ENABLE_SKIP_LOGIN === 'true'
  );
}
