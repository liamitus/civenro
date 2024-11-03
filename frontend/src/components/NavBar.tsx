// frontend/src/components/NavBar.tsx

import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const NavBar: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            🇺🇸 VoxPup
          </Link>
        </Typography>
        <Button color="inherit" component={Link} to="/bills">
          Bills
        </Button>
        {/* Add more navigation links as needed */}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
