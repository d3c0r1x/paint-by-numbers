import { useAppStore } from './store/useAppStore';
import { HomeScreen } from './screens/HomeScreen';
import { ProcessingScreen } from './screens/ProcessingScreen';
import { ColoringScreen } from './screens/ColoringScreen';
import { ErrorBoundary } from './ui/ErrorBoundary';

export default function App() {
  const screen = useAppStore((s) => s.screen);
  const lang = useAppStore((s) => s.lang);

  return (
    <div className="flex h-full flex-col bg-paper-warm text-ink">
      <main className="min-h-0 flex-1">
        <ErrorBoundary lang={lang}>
          {screen === 'home' && <HomeScreen />}
          {screen === 'processing' && <ProcessingScreen />}
          {screen === 'coloring' && <ColoringScreen />}
        </ErrorBoundary>
      </main>
    </div>
  );
}
