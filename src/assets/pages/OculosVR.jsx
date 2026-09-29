import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { io } from 'socket.io-client';
import { VideoScene } from './VideoScene'; 

const socket = io('http://IP_DO_SEU_PC:3001'); 

export default function OculosVR() {
  const [videoSrc] = useState('/seu-video.mp4'); 
  const [playing, setPlaying] = useState(false);
  const [distortion, setDistortion] = useState(1.0);
  const [showGuide, setShowGuide] = useState(true);
  const [flipRightEye, setFlipRightEye] = useState(true);

  useEffect(() => {
    socket.on('aplicar-configuracao', (dados) => {
      setPlaying(dados.playing);
      setDistortion(dados.distortion);
      setShowGuide(dados.showGuide);
      setFlipRightEye(dados.flipRightEye);
    });

    return () => socket.off('aplicar-configuracao');
  }, []);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#000', margin: 0, padding: 0, overflow: 'hidden' }}>
      <div style={{ width: '50%', height: '100%', borderRight: '1px solid #111' }}>
        <Canvas camera={{ fov: 65, position: [0, 0, 0] }}>
          <VideoScene videoUrl={videoSrc} playing={playing} distortionLevel={distortion} showGuide={showGuide} flipRightEye={flipRightEye} />
        </Canvas>
      </div>
      <div style={{ width: '50%', height: '100%' }}>
        <Canvas camera={{ fov: 65, position: [0, 0, 0] }}>
          <VideoScene videoUrl={videoSrc} playing={playing} distortionLevel={distortion} showGuide={showGuide} flipRightEye={flipRightEye} />
        </Canvas>
      </div>
    </div>
  );
}