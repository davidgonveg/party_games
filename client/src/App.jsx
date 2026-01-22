import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import YoNunca from './pages/YoNunca';


import OfflineSetup from './pages/OfflineSetup';

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/offline" element={<OfflineSetup />} />
          <Route path="/lobby/:roomCode" element={<Lobby />} />
          <Route path="/yonunca/:roomCode" element={<YoNunca />} />

        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;
