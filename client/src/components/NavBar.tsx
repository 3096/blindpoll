import { AppBar, Box, Button, Container, IconButton, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { routes } from '../routes';
import { useTheme } from '@mui/system';

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const pages = Object.values(routes).filter(route => route.navName).map(route => {
    return { text: route.navName, path: route.path, isCurrentPage: location.pathname === route.path };
  });

  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };
  const handleNavigate = (path: string) => {
    handleCloseNavMenu();
    if (path === location.pathname) return;
    navigate(path);
  };

  return (
    <>
      <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <Button onClick={() => navigate('/')}
              sx={{ mr: 1, color: 'white', textTransform: 'lowercase', display: { xs: 'none', md: 'flex' } }}>
              <Typography
                variant="h5"
                noWrap
                component="div"
              >
                blindpoll
              </Typography>
            </Button>

            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {pages.filter(page => page.path !== '/').map((page) => (
                <Button
                  key={page.path}
                  onClick={() => handleNavigate(page.path)}
                  sx={{ ...(page.isCurrentPage ? {} : { color: 'white' }), my: 2, display: 'block' }}
                >
                  {page.text}
                </Button>
              ))}
            </Box>


            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: 'block', md: 'none' },
                }}>
                {pages.map((page) => (
                  <MenuItem key={page.path} onClick={() => handleNavigate(page.path)}>
                    <Typography textAlign="center" color={page.isCurrentPage ? theme.palette.primary.main : 'white'}>
                      {page.text}
                    </Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
            <Typography
              variant="h5"
              noWrap
              component="div"
              sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}
            >
              blindpoll
            </Typography>
            <Box sx={{ flexGrow: 'none', display: { xs: 'block', md: 'none' }, opacity: 0 }}>
              <IconButton size="large" disabled>
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
}
