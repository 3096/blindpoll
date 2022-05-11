import React, { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import Home from './pages/Home';
import NewPoll from './pages/NewPoll';
import ViewPoll from './pages/ViewPoll';
import Vote from './pages/Vote';
import ErrorMessage from './components/ErrorMessage';
import { Container } from '@mui/material';
import Header from './components/Header';
import NavBar from './components/NavBar';
import Browse from './pages/Browse';

export const routes: {
  [key: string]: { navName?: string, path: string, component: ReactNode }
} = {
  home: { navName: "Home", path: '/', component: <Home /> },
  new: { navName: "New Poll", path: '/new', component: <NewPoll /> },
  browse: { navName: "View Polls", path: '/existing_polls', component: <Browse /> },
  view: { path: '/view/:id', component: <ViewPoll /> },
  vote: { path: '/vote/:id', component: <Vote /> },
  notFound: { path: '*', component: <ErrorMessage statusCode={404} /> }
}

function getRoute(key: string, path: string, component: ReactNode) {
  return <Route key={key} path={path} element={
    key === 'home'
      ? <>
        <Header />
        <Container maxWidth='sm' sx={{
          marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 12
        }} >
          {component}
        </Container>
      </>
      : <>
        <NavBar />
        <Container maxWidth='sm' sx={{
          marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 12
        }} >
          {component}
        </Container>
      </>
  } />
}

export default Object.entries(routes).map(
  ([key, value]) => getRoute(key, value.path, value.component)
);
