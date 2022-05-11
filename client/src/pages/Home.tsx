import { useNavigate } from 'react-router-dom';
import { Button, Stack } from '@mui/material';

import { routes } from '../routes';

export default function Home() {
  const navigate = useNavigate();
  return (
    <>
      <Stack direction="row" spacing={2}>
        <Button variant='contained' onClick={() => navigate(routes.new.path)}>Create a poll</Button>
        <Button variant='contained' onClick={() => navigate(routes.browse.path)}>View existing polls</Button>
      </Stack>
    </>
  );
}
