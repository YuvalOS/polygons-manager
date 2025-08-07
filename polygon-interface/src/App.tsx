
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { IMAGE_URL, POLYGONS_API_BASE } from './App.consts';
import type { Polygon } from './App.types';
import AppView from './App.view';
import { delay } from './App.utils';


const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [currentPolygon, setCurrentPolygon] = useState<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newPolygonName, setNewPolygonName] = useState('');
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // API functions
  const fetchPolygons = async () => {
    try {
      setLoading(true);
      await delay(5000);
      const response = await fetch(`${POLYGONS_API_BASE}/polygons`);
      if (response.ok) {
        const data = await response.json();
        setPolygons(data);
      } else {
        toast.error('Failed to fetch polygons');
      }
      
      setLoading(false);
      return response; // no need to read it with .json() here, as it already been done above

    } catch (error) {
      console.error('Error fetching polygons:', error);
      toast.error(`Failed to fetch polygons: ${error}`);
      setLoading(false);

      return null;
    }
  };

  const createPolygon = async (name: string, points: number[][]) => {
    try {
      setLoading(true);
      await delay(5000);
      const response = await fetch(`${POLYGONS_API_BASE}/polygons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, points }),
      });
      
      if (response.ok) {
        toast.success('Polygon created successfully!');
        await fetchPolygons();
      } else {
        toast.error('Error creating polygon');  
      }

      setLoading(false);
      return response.json();

    } catch (error) {
      console.error('Error creating polygon:', error);
      toast.error(`Error creating polygon: ${error}`);
      setLoading(false);
      
      return null;
    }
  };

  const deletePolygon = async (id: number) => {
    try {
      setLoading(true);
      await delay(5000);
      const response = await fetch(`${POLYGONS_API_BASE}/polygons/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Polygon deleted successfully!');
        await fetchPolygons();
      } else {
        toast.error('Error deleting polygon');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error deleting polygon:', error);
      toast.error(`Error deleting polygon: ${error}`);
      setLoading(false);
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
    
    img.src = IMAGE_URL;
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

  const handleCreatePolygon = async () => {
    if (newPolygonName.trim() && currentPolygon.length > 2) {
      const res = await createPolygon(newPolygonName.trim(), currentPolygon);
      
      // don't reset current polygon state if the polygon already exists with this name, letting the user edit it
      if (res?.error === 'Polygon with this name already exists') {
        return;
      }

      setIsDrawing(false);
      setCurrentPolygon([]);
      setNewPolygonName('');
      setShowNameDialog(false);
    }
  };

  const handleDeletePolygon = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this polygon?')) {
      await deletePolygon(id);;
    }

    
  };

  return (
    <AppView
      canvasRef={canvasRef}
      polygons={polygons}
      currentPolygon={currentPolygon}
      isDrawing={isDrawing}
      showSaveButton={showSaveButton}
      startDrawing={startDrawing}
      cancelDrawing={cancelDrawing}
      handleDeletePolygon={handleDeletePolygon}
      handleCanvasClick={handleCanvasClick}
      setShowNameDialog={setShowNameDialog}
      loading={loading}
      showNameDialog={showNameDialog}
      newPolygonName={newPolygonName}
      setNewPolygonName={setNewPolygonName}
      handleCreatePolygon={handleCreatePolygon}
    />
  );
}

export default App;
