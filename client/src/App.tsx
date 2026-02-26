import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import SelectUser from './pages/SelectUser';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import MasterSettings from './pages/MasterSettings';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/select-user" element={<SelectUser />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/master-settings" element={<MasterSettings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;