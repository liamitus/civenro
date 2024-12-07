// frontend/src/components/LoginModal.tsx

import React, { useState, useContext, useEffect } from 'react';
import {
  Modal,
  Box,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  onAuthSuccess,
}) => {
  const { login, register } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(0); // 0 for Login, 1 for Register

  // Shared states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) {
      // Reset form fields when the modal is closed
      setEmail('');
      setPassword('');
      setActiveTab(0); // Optionally reset to the Login tab
      setErrorMessage('');
    }
  }, [open]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setErrorMessage('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      if (onAuthSuccess) {
        onAuthSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Login failed:', error);
      setErrorMessage('Invalid email or password.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(username, email, password);
      if (onAuthSuccess) {
        onAuthSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Registration failed:', error);
      setErrorMessage('Registration failed. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          width: 400,
          bgcolor: 'background.paper',
          p: 4,
          mx: 'auto',
          mt: '10%',
          borderRadius: 2,
          boxShadow: 24,
        }}
      >
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Login" />
          <Tab label="Register" />
        </Tabs>
        {activeTab === 0 && (
          <Box component="form" onSubmit={handleLoginSubmit} sx={{ mt: 2 }}>
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              sx={{ mt: 1 }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              sx={{ mt: 2 }}
            />
            {errorMessage && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {errorMessage}
              </Typography>
            )}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
              Login
            </Button>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Don't have an account?{' '}
              <Button variant="text" onClick={() => setActiveTab(1)}>
                Register here
              </Button>
            </Typography>
          </Box>
        )}
        {activeTab === 1 && (
          <Box component="form" onSubmit={handleRegisterSubmit} sx={{ mt: 2 }}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
              sx={{ mt: 1 }}
            />
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              sx={{ mt: 1 }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              sx={{ mt: 2 }}
            />
            {errorMessage && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {errorMessage}
              </Typography>
            )}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
              Register
            </Button>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Already have an account?{' '}
              <Button variant="text" onClick={() => setActiveTab(0)}>
                Login here
              </Button>
            </Typography>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default LoginModal;
