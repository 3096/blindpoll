import { useCallback, useState } from 'react';
import { TextField, Button, Switch, Grid, FormControlLabel, Backdrop, CircularProgress, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { routes } from '../routes';
import { ApiErrorInfo, createPoll } from '../common/api';
import datastore from '../common/localstorage';
import ErrorSnackBar from '../components/ErrorSnackBar';
import { useCheckedInput } from '../hooks/byohooks';

const getHelperText = (checks: { helperText: string, check: boolean }[]) =>
  checks.filter(({ check }) => !check).map(({ helperText }) => helperText).join('; ') || undefined;

const getCustomAccessTokens = (customAccessTokeInput: string) => customAccessTokeInput.split(/\s*,\s*/).filter(Boolean);

export default function NewPoll() {
  const [isShowingHelperText, setIsShowingHelperText] = useState(false);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [useCustomAccessTokens, setUseCustomAccessTokens] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [question, setQuestion, questionHelperText] = useCheckedInput<string>(
    '',
    useCallback(value => getHelperText(
      [{ helperText: "Question can't be empty", check: value.length > 0 }]
    ), [])
  );

  const [options, setOptions, optionsHelperText] = useCheckedInput<string[]>(
    ['', ''],
    useCallback(value => getHelperText([
      { helperText: "At least two options are required", check: value.filter(Boolean).length > 1 },
      {
        helperText: "Options can't have reapeating values",
        check: value.length === new Set(value).size,
      },
    ]), [])
  );

  const [accessTokenCount, setAccessTokenCount, accessTokenCountHelperText] = useCheckedInput<number>(
    2,
    useCallback(value => getHelperText([
      { helperText: "Participant count must be greater than 1", check: value > 1 },
    ]), [])
  );

  const [customAccessTokenInput, setCustomAccessTokenInput, customAccessTokenInputHelperText]
    = useCheckedInput<string>(
      '',
      useCallback(value => getHelperText([
        { helperText: "Custom access token can't be empty", check: value.length > 0, },
        {
          helperText: "Please add at least 2 custom access tokens",
          check: getCustomAccessTokens(value).length > 1,
        },
        {
          helperText: "Custom access tokens must be unique",
          check: (() => {
            const customAccessTokens = getCustomAccessTokens(value);
            return customAccessTokens.length === new Set(customAccessTokens).size;
          })(),
        },
      ]), [])
    );

  const [errorInfo, setErrorInfo] = useState<ApiErrorInfo | null>(null);

  const navigate = useNavigate();

  const hasInputErrors = !!(questionHelperText || optionsHelperText
    || useCustomAccessTokens ? customAccessTokenInputHelperText : accessTokenCountHelperText);

  const createPollCb = () => {
    if (!isShowingHelperText) {
      setIsShowingHelperText(true);
    }

    if (hasInputErrors) {
      return;
    }

    if (isLoading) {
      return;
    }
    setIsLoading(true);

    createPoll({
      question,
      options,
      isMultipleChoice,
      isSigned,
      accessTokenCount: !isSigned || useCustomAccessTokens ? undefined : accessTokenCount,
      accessTokens: isSigned && useCustomAccessTokens ? getCustomAccessTokens(customAccessTokenInput) : undefined,

    }).then(poll => {
      datastore.hostData.store(poll.id, poll);
      navigate(routes.view.path.replace(':id', poll.id));

    }).catch((err: ApiErrorInfo) => {
      setErrorInfo(err);

    }).finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <>
      <Grid container spacing={2}>

        <Grid item xs={12}>
          <Typography variant='h4' mb={1}>Create a poll</Typography>
        </Grid>

        <Grid item xs={12}>
          <TextField autoComplete='off' fullWidth label="Poll question" value={question}
            error={isShowingHelperText && !!questionHelperText} helperText={isShowingHelperText && questionHelperText}
            onChange={(e) => setQuestion(e.target.value)} />
        </Grid>

        {
          options.concat('').map((option, idx) =>
            <Grid key={idx} item xs={12}>
              <TextField autoComplete='off' fullWidth label={"Option #" + (idx + 1)}
                error={isShowingHelperText && !!optionsHelperText} value={option} onChange={
                  (e) => setOptions(
                    (() => {
                      const curOptions = (idx === options.length
                        ? options.concat(e.target.value)
                        : options.map((option, i) => i === idx ? e.target.value : option)
                      ).filter(Boolean);
                      return curOptions.length < 2
                        ? curOptions.concat(Array(2 - curOptions.length).fill(''))
                        : curOptions;
                    })()
                  )
                } />
            </Grid>
          )
        }

        {isShowingHelperText && !!optionsHelperText && <Grid item xs={12}>
          <Typography variant="caption" color="error">
            {optionsHelperText}
          </Typography>
        </Grid>}

        <Grid item>
          <FormControlLabel label="Allow picking multiple choices" control={
            <Switch value={isMultipleChoice} onChange={(e) => setIsMultipleChoice(e.target.checked)} />
          } />
        </Grid>

        <Grid item>
          <FormControlLabel label="Invite only (prevents double voting)" control={
            <Switch value={isSigned} onChange={(e) => setIsSigned(e.target.checked)} />
          } />
        </Grid>

        {isSigned && (<>

          <Grid item xs={12}>
            <FormControlLabel label="Use custom access tokens" control={
              <Switch value={useCustomAccessTokens} onChange={(e) => setUseCustomAccessTokens(e.target.checked)} />
            } />
          </Grid>

          {useCustomAccessTokens
            ?
            <Grid item xs={12}>
              <TextField label="Custom access tokens (separate with comma)" multiline autoComplete='off' fullWidth
                error={isShowingHelperText && !!customAccessTokenInputHelperText}
                helperText={isShowingHelperText && customAccessTokenInputHelperText}
                value={customAccessTokenInput} onChange={
                  (e) => setCustomAccessTokenInput(e.target.value)
                } />
            </Grid>
            :
            <Grid item xs={12}>
              <TextField label="How many participants" autoComplete='off' fullWidth
                error={isShowingHelperText && !!accessTokenCountHelperText}
                helperText={isShowingHelperText && accessTokenCountHelperText}
                value={accessTokenCount || ''} onChange={
                  (e) => setAccessTokenCount(parseInt(e.target.value))
                } />
            </Grid>
          }

        </>)}

        <Grid item xs={12}>
          <Button variant="contained" color="primary" disabled={isShowingHelperText && hasInputErrors} onClick={() => { createPollCb() }}>Create</Button>
        </Grid>
      </Grid>

      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <ErrorSnackBar errorInfo={errorInfo} />
    </>
  );
}
