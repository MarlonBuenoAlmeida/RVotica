import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001'); 

export default function ControlePC() {
  const [distortion, setDistortion] = useState(1.0);
  const [activePreset, setActivePreset] = useState('maior');
  const [showGuide, setShowGuide] = useState(true);
  const [flipRightEye, setFlipRightEye] = useState(true);
  const [playing, setPlaying] = useState(false);

  const presets = [
    { id: 'maior', label: 'Maior distorção', value: 1.4 },
    { id: 'medio-maior', label: 'Médio para maior', value: 0.9 },
    { id: 'medio-menor', label: 'Médio para menor', value: 0.5 },
    { id: 'quase-nada', label: 'Quase nada', value: 0.1 },
  ];

  useEffect(() => {
    socket.emit('mudar-configuracao', {
      distortion,
      activePreset,
      showGuide,
      flipRightEye,
      playing
    });
  }, [distortion, activePreset, showGuide, flipRightEye, playing]);

  return (
    <div style={{ padding: '40px', background: '#111', color: '#fff', height: '100vh', fontFamily: 'sans-serif' }}>
      <h2>Controle Remoto VR (Painel do PC)</h2>
      
      <button onClick={() => setPlaying(!playing)} style={{ padding: '15px 30px', fontSize: '16px', background: playing ? '#dc3545' : '#28a745', color: '#fff', border: 'none', borderRadius: '5px', marginBottom: '20px' }}>
        {playing ? 'PAUSAR VÍDEO NO CELULAR' : 'INICIAR VÍDEO NO CELULAR'}
      </button>

      <hr />

      <h3>Simetria</h3>
      <button onClick={() => setFlipRightEye(true)} style={{ background: flipRightEye ? '#007bff' : '#333', color: '#fff', padding: '10px' }}>Espelhado</button>
      <button onClick={() => setFlipRightEye(false)} style={{ background: !flipRightEye ? '#007bff' : '#333', color: '#fff', padding: '10px', marginLeft: '10px' }}>Igual</button>

      <h3>Guias</h3>
      <button onClick={() => setShowGuide(true)} style={{ background: showGuide ? '#fff' : '#333', color: showGuide ? '#00' : '#fff', padding: '10px' }}>Mostrar</button>
      <button onClick={() => setShowGuide(false)} style={{ background: !showGuide ? '#fff' : '#333', color: !showGuide ? '#00' : '#fff', padding: '10px', marginLeft: '10px' }}>Esconder</button>

      <h3>Presets de Distorção</h3>
      {presets.map(p => (
        <button key={p.id} onClick={() => { setActivePreset(p.id); setDistortion(p.value); }} style={{ display: 'block', margin: '10px 0', padding: '10px', width: '200px', background: activePreset === p.id ? '#007bff' : '#222', color: '#fff' }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}