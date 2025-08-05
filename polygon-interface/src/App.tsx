
import { useState, useRef, useEffect } from 'react';
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
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { ToastContainer, toast } from 'react-toastify';


const POLYGONS_API_BASE = 'http://localhost:5000/api';


type Polygon = {  
  id: number;
  name: string;
  points: number[][] 
}; 


function App() {
  const notify = () => toast.success("Wow so easy!");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [currentPolygon, setCurrentPolygon] = useState<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newPolygonName, setNewPolygonName] = useState('');
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);

  // Sample image (you can replace with your own image)
  const imageUrl = '../public/traffic-junction-urban.jpg'; // Ensure this path is correct

  // API functions
  const fetchPolygons = async () => {
    try {
      const response = await fetch(`${POLYGONS_API_BASE}/polygons`);
      if (response.ok) {
        const data = await response.json();
        setPolygons(data);
      } else {
        toast.error('Failed to fetch polygons');
      }
    } catch (error) {
      console.error('Error fetching polygons:', error);
      toast.error(`Failed to fetch polygons: ${error}`);
    }
  };

  const createPolygon = async (name: string, points: number[][]) => {
    try {
      const response = await fetch(`${POLYGONS_API_BASE}/polygons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, points }),
      });
      
      if (response.ok) {
        await fetchPolygons();
        toast.success('Polygon created successfully!');
      } else {
        toast.error('Error creating polygon');
      }
    } catch (error) {
      console.error('Error creating polygon:', error);
      toast.error(`Error creating polygon: ${error}`);
    }
  };

  const deletePolygon = async (id: number) => {
    try {
      const response = await fetch(`${POLYGONS_API_BASE}/polygons/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchPolygons();
        toast.success('Polygon deleted successfully!');
      } else {
        toast.error('Error deleting polygon');
      }
    } catch (error) {
      console.error('Error deleting polygon:', error);
      toast.error(`Error deleting polygon: ${error}`);
    }
  };

  // Fetch polygons on mount
  useEffect(() => {
    fetchPolygons();
  }, []);

  // Redraw canvas on mount and whenever polygons or currentPolygon changes
  useEffect(() => {
    drawCanvas();
  }, [polygons, currentPolygon]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    
    const img = new Image();
    
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw existing polygons
      polygons.forEach((polygon, index) => {
        if (polygon.points && polygon.points.length > 2) {
          ctx.beginPath();
          ctx.moveTo(polygon.points[0][0], polygon.points[0][1]);
          
          for (let i = 1; i < polygon.points.length; i++) {
            ctx.lineTo(polygon.points[i][0], polygon.points[i][1]);
          }
          
          ctx.closePath();
          ctx.fillStyle = `hsla(${index * 60}, 70%, 50%, 0.3)`;
          ctx.fill();
          ctx.strokeStyle = `hsl(${index * 60}, 70%, 40%)`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw polygon name
          if (polygon.points.length > 0) {
            const centerX = polygon.points.reduce((sum, p) => sum + p[0], 0) / polygon.points.length;
            const centerY = polygon.points.reduce((sum, p) => sum + p[1], 0) / polygon.points.length;
            ctx.fillStyle = '#000';
            ctx.font = '14px Arial';
            ctx.fillText(polygon.name, centerX - 20, centerY);
          }
        }
      });
      
      // Draw current polygon being drawn
      if (currentPolygon.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPolygon[0][0], currentPolygon[0][1]);
        
        for (let i = 1; i < currentPolygon.length; i++) {
          ctx.lineTo(currentPolygon[i][0], currentPolygon[i][1]);
        }
        
        if (currentPolygon.length > 2) {
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          ctx.fill();
        }
        
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw points
        currentPolygon.forEach(point => {
          ctx.beginPath();
          ctx.arc(point[0], point[1], 4, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
        });
      }
    };
    
    img.src = imageUrl;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentPolygon.length > 1) {
      setShowSaveButton(true)
    }

    setCurrentPolygon(prev => [...prev, [x, y]]);
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPolygon([]);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPolygon([]);
  };

  const handleSavePolygon = async () => {
    if (newPolygonName.trim() && currentPolygon.length > 2) {
      await createPolygon(newPolygonName.trim(), currentPolygon);
      setCurrentPolygon([]);
      setIsDrawing(false);
      setNewPolygonName('');
      setShowNameDialog(false);
    }
  };

  const handleDeletePolygon = async (id: number) => {
    await deletePolygon(id);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', gap: 2 }}>
      {/* Left Panel - Polygon List */}
      <ToastContainer />
      <Paper sx={{  overflowY: 'auto', padding: '0 16px 0 16px', flex: 1 }}>
        <Typography variant="h6" gutterBottom marginTop={2}>
          Polygons
        </Typography>
        
        <Box sx={{ mb: 2, width: 'max-content' }}>
          {!isDrawing ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={startDrawing}
              fullWidth
            >
              Draw New Polygon
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={cancelDrawing}
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
          {polygons.map((polygon) => (
            <ListItem
              key={polygon.id}
              divider
              secondaryAction={
                <IconButton
                  edge="end"
                  onClick={() => handleDeletePolygon(polygon.id)}
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
      <Paper sx={{ display: 'flex', padding: '0 16px 0 16px', flexDirection: 'column', flex: 2 }}>
        <Typography variant="h6" gutterBottom marginTop={2}>
          Image Canvas
        </Typography>
        
        <Box sx={{  display: 'flex', flexDirection: 'column', gap: 2 }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            onClick={handleCanvasClick}
            style={{
              border: '1px solid #ccc',
              cursor: isDrawing ? 'crosshair' : 'default',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
          {showSaveButton && (
          // <Box >
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowNameDialog(true)}
              disabled={!isDrawing || currentPolygon.length < 3}
            >
              Save Polygon
            </Button>
          // </Box>
       )}
        </Box>
      </Paper>

      
      {/* Name Dialog */}
      <Dialog open={showNameDialog} onClose={() => setShowNameDialog(false)}>
        <DialogTitle>Name Your Polygon</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Polygon Name"
            fullWidth
            variant="outlined"
            value={newPolygonName}
            onChange={(e) => setNewPolygonName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNameDialog(false)}>Cancel</Button>
          <Button onClick={handleSavePolygon} variant="contained">
            Save Polygon
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App
