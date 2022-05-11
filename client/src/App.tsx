import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { HashRouter as Router, Routes } from 'react-router-dom';
import theme from './theme';
import routes from './routes';
import NavBar from './components/NavBar';

function App() {
  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        <Router>
          <Routes>
            {routes}
          </Routes>
        </Router>

      </ThemeProvider>
    </>
  );
}

export default App;
