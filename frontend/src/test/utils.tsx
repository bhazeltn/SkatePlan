import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";

/** Configure window.matchMedia so `useIsMobile` resolves deterministically. */
export function mockViewport(isMobile: boolean) {
  window.matchMedia = ((query: string) => {
    const matches = query.includes("max-width") ? isMobile : !isMobile;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {}
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}
