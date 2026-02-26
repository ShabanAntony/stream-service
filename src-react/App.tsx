import { MultiviewWorkbench } from './features/multiview/MultiviewWorkbench';

export function App() {
  return (
    <main className="app-shell">
      <header className="app-shell__header">
        <p className="app-shell__eyebrow">React migration sandbox</p>
        <h1 className="app-shell__title">Multiview Refactor</h1>
        <p className="app-shell__hint">
          First slice: isolate slot rendering and preserve iframe mounts between UI interactions.
        </p>
      </header>
      <MultiviewWorkbench />
    </main>
  );
}
