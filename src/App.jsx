import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import './App.css'; // Import the CSS file

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [lastApiCall, setLastApiCall] = useState(0);

  const loadModel = async () => {
    const loadedModel = await blazeface.load();
    setModel(loadedModel);
  };

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error('Error accessing the camera:', err));
  };

  const detectFaces = async () => {
    if (videoRef.current && model) {
      const predictions = await model.estimateFaces(videoRef.current, false);

      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (predictions.length > 0) {
        predictions.forEach((prediction) => {
          const [x, y, width, height] = prediction.topLeft.concat(
            prediction.bottomRight.map((val, i) => val - prediction.topLeft[i])
          );

          ctx.beginPath();
          ctx.rect(x, y, width, height);
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'red';
          ctx.stroke();

          // Draw intruder detected text on the canvas
          ctx.font = '16px Arial';
          ctx.fillStyle = 'red';
          ctx.fillText('Intruder Detected', x, y - 10);
        });

        const currentTime = Date.now();
        if (currentTime - lastApiCall >= 10000) {
          callCustomApi();
          setLastApiCall(currentTime); 
        }
      }
    }
  };

  const callCustomApi = () => {
    console.log('Calling custom API...');
    // fetch('/your-custom-api', { method: 'POST' })
    //   .then((response) => response.json())
    //   .then((data) => console.log('API response:', data))
    //   .catch((error) => console.error('API error:', error));
  };

  useEffect(() => {
    loadModel();
    startVideo();

    const interval = setInterval(() => {
      detectFaces();
    }, 100);

    return () => clearInterval(interval); 
  }, [model]);

  return (
    <div className="App">
      <h1>Real-Time Face Detection</h1>
      <div className="video-container">
        <video ref={videoRef} autoPlay muted />
        <canvas
          ref={canvasRef}
          width="720"
          height="560"
        />
      </div>
    </div>
  );
}

export default App;
