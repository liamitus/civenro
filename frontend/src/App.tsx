import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BillDetailPage from './pages/BillDetailPage';
import NavBar from './components/NavBar';
import GoogleMapsLoader from './components/GoogleMapsLoader';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { UserProvider } from './context/UserContext';
import { LoadScript } from '@react-google-maps/api';
import AccountPage from './pages/AccountPage';

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <ModalProvider>
          {/* <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY"> */}
          {/* <GoogleMapsLoader> */}
          <Router>
            <NavBar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/account/:userId" element={<AccountPage />} />
              <Route path="/bills/:id" element={<BillDetailPage />} />
            </Routes>
          </Router>
          {/* </GoogleMapsLoader> */}
          {/* </LoadScript> */}
        </ModalProvider>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
