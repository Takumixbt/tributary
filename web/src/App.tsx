/*
 * Composition root.
 *
 * Provider order is load bearing, outside in:
 *   WagmiProvider        chain clients (unused in demo mode, always mounted)
 *   QueryClientProvider  wagmi's cache
 *   MotionProvider       the single rAF conductor and the motion budget
 *   EventStreamProvider  the one event stream, demo or chain
 *   GraphAnchorProvider  DOM anchor registry the graph terminates edges on
 *   BrowserRouter        routes
 *
 * One stream feeds everything: the hero graph, the landing page's live figures
 * and every panel on the terminal read the same snapshot from the same provider,
 * so one payment is one movement everywhere on screen.
 *
 * The graph is no longer a page-wide fixed stage. It lives inside the hero as a
 * contained canvas, which is what keeps the rest of the page still.
 */

import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { GraphAnchorProvider, GraphCameraProvider } from "./graph";
import { MotionProvider } from "./kinetic";
import { EventStreamProvider, wagmiConfig } from "./data";
import { DashboardPage } from "./dashboard";
import Landing from "./pages/Landing";
import ErrorBoundary from "./shell/ErrorBoundary";
import NotFound from "./shell/NotFound";
import RouteFrame from "./shell/RouteFrame";
import ShellFooter from "./shell/ShellFooter";
import TopBar from "./shell/TopBar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The stream owns liveness. Query is only here for one-shot chain reads.
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10_000,
    },
  },
});

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MotionProvider>
          <EventStreamProvider>
            <GraphAnchorProvider>
              <GraphCameraProvider>
                <BrowserRouter
                  future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
                >
                  <div className="shell">
                    <a className="skip" href="#main">
                      Skip to content
                    </a>
                    <TopBar />
                    <div className="shell-body">
                      <main className="shell-main" id="main">
                        <RouteFrame>
                          <ErrorBoundary>
                            <Routes>
                              <Route path="/" element={<Landing />} />
                              <Route path="/app" element={<DashboardPage />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </ErrorBoundary>
                        </RouteFrame>
                        <ShellFooter />
                      </main>
                    </div>
                  </div>
                </BrowserRouter>
              </GraphCameraProvider>
            </GraphAnchorProvider>
          </EventStreamProvider>
        </MotionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
