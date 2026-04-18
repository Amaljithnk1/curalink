import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import FirstRunPage from '@/pages/FirstRunPage';
import ResearchWorkspace from '@/pages/ResearchWorkspace';

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FirstRunPage />} />
          <Route path="/research" element={<ResearchWorkspace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;