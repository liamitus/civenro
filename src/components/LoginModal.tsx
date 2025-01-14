// src/components/LoginModal.tsx

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
  initialTab?: number;
}

const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  onAuthSuccess,
  initialTab = 0,
}) => {
  const { login, register } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Shared states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab); // Reset activeTab when modal opens
    } else {
      // Reset form fields when the modal is closed
      setEmail('');
      setPassword('');
      setUsername('');
      setErrorMessage('');
    }
  }, [open, initialTab]);

  function handleTabChange(_event: React.SyntheticEvent, newValue: number) {
    setActiveTab(newValue);
    setErrorMessage('');
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      if (onAuthSuccess) {
        onAuthSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage('Invalid email or password.');
      }
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
    } catch (error: any) {
      console.error('Registration failed:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage('Registration failed. Please try again.');
      }
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
              data-testid="login-email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              sx={{ mt: 1 }}
            />
            <TextField
              data-testid="login-password"
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
            <Button
              data-testid="login-submit"
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
            >
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
              data-testid="register-username"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
              sx={{ mt: 1 }}
            />
            <TextField
              data-testid="register-email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              sx={{ mt: 1 }}
            />
            <TextField
              data-testid="register-password"
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
            <Button
              data-testid="register-submit"
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
            >
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
