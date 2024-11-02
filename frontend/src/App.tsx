import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BillDetailPage from './pages/BillDetailPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bills/:id" element={<BillDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;
