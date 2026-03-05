import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Stack,
  TextField,
  Typography,
  Chip,
  Divider,
  ColorSchemeToggle,
} from '@wso2/oxygen-ui'

function App() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        px: 3,
        py: 6,
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h3" fontWeight={700}>
          Oxygen UI
        </Typography>
        <Chip label="Acrylic Orange" color="primary" size="small" />
        <ColorSchemeToggle />
      </Stack>

      <Typography variant="body1" color="text.secondary">
        React project powered by WSO2 Oxygen UI with the Acrylic Orange theme.
      </Typography>

      <Divider sx={{ width: '100%', maxWidth: 600, alignSelf: 'center' }} />

      {/* Demo card */}
      <Card
        sx={{
          width: '100%',
          maxWidth: 500,
          backdropFilter: 'blur(var(--oxygen-blur-medium, 8px))',
        }}
        variant="outlined"
      >
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Get started
          </Typography>
          <Stack spacing={2} mt={1}>
            <TextField label="Name" fullWidth />
            <TextField label="Email" type="email" fullWidth />
          </Stack>
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" fullWidth>
            Submit
          </Button>
        </CardActions>
      </Card>

      {/* Button showcase */}
      <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
        <Button variant="contained">Contained</Button>
        <Button variant="outlined">Outlined</Button>
        <Button variant="text">Text</Button>
        <Button variant="contained" color="secondary">Secondary</Button>
        <Button variant="contained" disabled>Disabled</Button>
      </Stack>
    </Box>
  )
}

export default App
