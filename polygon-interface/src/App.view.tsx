
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { ToastContainer } from 'react-toastify';
import type { Polygon } from './App.types';

type Props = {
  readonly polygons: Polygon[];
  readonly isDrawing: boolean;
  readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
  readonly currentPolygon: number[][];
  readonly showSaveButton: boolean;
  readonly startDrawing: VoidFunction;
  readonly cancelDrawing: VoidFunction;
  readonly handleDeletePolygon: (id: number) => Promise<void>;
  readonly handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  readonly setShowNameDialog: (value: React.SetStateAction<boolean>) => void;
  readonly loading: boolean;
  readonly showNameDialog: boolean;
  readonly newPolygonName: string;
  readonly setNewPolygonName: (value: React.SetStateAction<string>) => void;
  readonly handleCreatePolygon: () => Promise<void>
}

const AppView = (props: Props) =>{
  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', gap: 2 }}>
      
      {/* Left Panel - Polygon List */}
      <ToastContainer />
      <Paper sx={{  overflowY: 'auto', width: 360, padding: '0 16px 0 16px'}}>
        <Typography variant="h6" gutterBottom marginTop={2}>
          Polygons
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          {!props.isDrawing ? (
            <Button
              variant="contained"
              onClick={props.startDrawing}
              fullWidth
              sx={{ width: 'max-content' }}
            >
              Draw New Polygon
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={props.cancelDrawing}
                size="small"
              >
                Cancel
              </Button>
              <Typography variant="body2" sx={{ flexGrow: 1, alignSelf: 'center' }}>
                Click to add points, click first point to close
              </Typography>
            </Box>
          )}
        </Box>

        <List>
          {props.polygons.map((polygon) => (
            <ListItem
              key={polygon.id}
              divider
              secondaryAction={
                <IconButton
                  edge="end"
                  onClick={() => props.handleDeletePolygon(polygon.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              }>
              <ListItemText
                primary={polygon.name}
                secondary={`${polygon.points?.length || 0} points`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Right Panel - Canvas */}
      <Paper sx={{ display: 'flex', padding: '0 16px 0 16px', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom marginTop={2}>
          Image Canvas
        </Typography>
        
        <Box sx={{  display: 'flex', flexDirection: 'column', gap: 2 }}>
          <canvas
            ref={props.canvasRef}
            width={600}
            height={400}
            onClick={props.handleCanvasClick}
            style={{
              border: '1px solid #ccc',
              cursor: props.isDrawing ? 'crosshair' : 'default',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
          {props.showSaveButton && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => props.setShowNameDialog(true)}
              disabled={props.loading || !props.isDrawing || props.currentPolygon.length < 3}
            >
              Save Polygon
            </Button>
       )}
        </Box>
      </Paper>

      
      {/* Name Dialog */}
      <Dialog open={props.showNameDialog} onClose={() => props.setShowNameDialog(false)}>
        <DialogTitle>Name Your Polygon</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Polygon Name"
            fullWidth
            variant="outlined"
            value={props.newPolygonName}
            onChange={(e) => props.setNewPolygonName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={props.loading} onClick={() => props.setShowNameDialog(false)}>Cancel</Button>
          <Button disabled={props.loading} onClick={props.handleCreatePolygon} variant="contained">
            Save Polygon
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AppView;
