import { Box, Grid, Paper, Stack, Typography } from '@mui/material';

export default function PollQuestion({ question, isPublic }: { question: string, isPublic: boolean }) {
    return (
        <Grid container>
            <Grid item xs={12}>
                <Typography variant="h4">{question}</Typography>
            </Grid>
            <Grid item>
                <Box mt={1} mb={2} >
                    <Paper sx={{
                        backgroundColor: isPublic ? '#1B5E20' : '#311B92',
                    }}>
                        <Typography px={1}>{isPublic ? 'Public' : 'Invite only'}</Typography>
                    </Paper>
                </Box>
            </Grid>
        </Grid>
    );
}
