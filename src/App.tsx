// src/App.tsx

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BillDetailPage from './pages/BillDetailPage';
import NavBar from './components/NavBar';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { UserProvider } from './context/UserContext';
import AccountPage from './pages/AccountPage';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0A1F44',
    },
    background: {
      default: '#F5F5F5',
    },
    text: {
      primary: '#333333',
    },
    secondary: {
      main: '#A3895E',
    },
    success: {
      main: '#1B8062',
    },
    error: {
      main: '#B23A48',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <UserProvider>
          <ModalProvider>
            <Router>
              <NavBar />
              <div style={{ marginBottom: '20px' }} />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/user/:userId" element={<AccountPage />} />
                <Route path="/bill/:id" element={<BillDetailPage />} />
              </Routes>
            </Router>
          </ModalProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
