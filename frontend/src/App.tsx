import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BillDetailPage from './pages/BillDetailPage';
import NavBar from './components/NavBar';

function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bills/:id" element={<BillDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;
