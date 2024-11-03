import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

const PersonDetectionCamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionRef = useRef(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detector, setDetector] = useState(null);
  const [detectionType, setDetectionType] = useState(null);

  // Initialize detectors
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        if ('FaceDetector' in window) {
          setDetector(new FaceDetector());
          setDetectionType('native');
        } else {
          await tf.ready();
          const model = await blazeface.load();
          setDetector(model);
          setDetectionType('blazeface');
        }
        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize detection');
        setIsLoading(false);
      }
    };
    initializeDetector();
  }, []);

  // Setup webcam
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Failed to access webcam');
      }
    };
    startWebcam();

    return () => {
      const stream = videoRef.current?.srcObject;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const detectFaces = async () => {
    if (!detector || !videoRef.current || !canvasRef.current) return;

    try {
      let faces;
      if (detectionType === 'native') {
        faces = await detector.detect(videoRef.current);
        faces = faces.map(face => ({
          box: face.boundingBox
        }));
      } else {
        const predictions = await detector.estimateFaces(videoRef.current, false);
        faces = predictions.map(pred => ({
          box: {
            x: pred.topLeft[0],
            y: pred.topLeft[1],
            width: pred.bottomRight[0] - pred.topLeft[0],
            height: pred.bottomRight[1] - pred.topLeft[1]
          }
        }));
      }

      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      faces.forEach(face => {
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          face.box.x,
          face.box.y,
          face.box.width,
          face.box.height
        );
      });

      if (isDetecting) {
        detectionRef.current = requestAnimationFrame(detectFaces);
      }
    } catch (err) {
      setError('Detection failed');
      setIsDetecting(false);
    }
  };

  const toggleDetection = () => {
    setIsDetecting(prev => {
      if (!prev) {
        detectFaces();
      } else {
        cancelAnimationFrame(detectionRef.current);
      }
      return !prev;
    });
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="text-center py-4">
          Loading detection model...
        </div>
      )}
      
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full"
          width="640"
          height="480"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          width="640"
          height="480"
        />
      </div>

      <button
        onClick={toggleDetection}
        disabled={isLoading || !detector}
        className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400"
      >
        {isDetecting ? 'Stop Detection' : 'Start Detection'}
      </button>
    </div>
  );
};

export default PersonDetectionCamera;