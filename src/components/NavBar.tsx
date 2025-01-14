// src/components/NavBar.tsx

import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ModalContext } from '../context/ModalContext';

const NavBar: React.FC = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const { showModal } = useContext(ModalContext);

  if (loading) {
    return null; // or a loading indicator
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            🇺🇸 Civenro
          </Link>
        </Typography>
        {user ? (
          <Button color="inherit" component={Link} to={`/user/${user.userId}`}>
            My Account
          </Button>
        ) : null}
        {/* <Button color="inherit" component={Link} to="/">
          Bills
        </Button> */}
        {/* Add more navigation links as needed */}
        {user ? (
          <Button data-testid="logout-button" color="inherit" onClick={logout}>
            Logout
          </Button>
        ) : (
          <>
            <Button
              data-testid="login-button"
              color="inherit"
              onClick={() => showModal('auth')}
            >
              Login
            </Button>
            <Button
              data-testid="register-button"
              color="inherit"
              onClick={() => showModal('auth', { initialTab: 1 })}
            >
              Register
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
