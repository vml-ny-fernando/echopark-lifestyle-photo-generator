import './styles/platform-tokens.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/parkinsans/600.css';
import '@fontsource/parkinsans/700.css';
import '@fontsource/parkinsans/800.css';
import './styles/tokens.css';
import './styles/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { bayTrpcLink } from './trpcLink.ts';
import { trpc } from './trpc.ts';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  // Queries as GET, so a signed-out visitor of a public app sees its data.
  links: [bayTrpcLink({ url: '/trpc' })],
});

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <ErrorBoundary>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </ErrorBoundary>
);
