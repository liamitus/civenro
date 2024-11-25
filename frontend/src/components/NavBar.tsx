// frontend/src/components/NavBar.tsx

import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ModalContext } from '../context/ModalContext';

const NavBar: React.FC = () => {
  const { user, logout } = useContext(AuthContext);
  const { showModal } = useContext(ModalContext);

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            🇺🇸 VoxPup
          </Link>
        </Typography>
        {/* <Button color="inherit" component={Link} to="/">
          Bills
        </Button> */}
        {/* Add more navigation links as needed */}
        {user ? (
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        ) : (
          <>
            <Button color="inherit" onClick={() => showModal('auth')}>
              Login
            </Button>
            <Button color="inherit" component={Link} to="/register">
              Register
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
