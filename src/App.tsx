import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { HomeScreen } from './screens/HomeScreen';
import { ProcessingScreen } from './screens/ProcessingScreen';
import { ColoringScreen } from './screens/ColoringScreen';
import { ErrorBoundary } from './ui/ErrorBoundary';

export default function App() {
  const screen = useAppStore((s) => s.screen);
  const lang = useAppStore((s) => s.lang);
  const darkMode = useAppStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div className="flex h-full flex-col">
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
