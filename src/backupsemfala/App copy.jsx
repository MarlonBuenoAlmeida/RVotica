import { useState, useEffect, useRef } from "react";
import { Canvas, extend } from "@react-three/fiber";
import { useVideoTexture, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { io } from "socket.io-client";
import { MultifocalShader } from "./assets/shaders/MultifocalShader";

const MultifocalMaterial = shaderMaterial(
  {
    tDiffuse: null,
    uDistortion: 1.0,
    uShowGuide: 1.0,
    uFlipRightEye: 1.0,
    uLensColor: new THREE.Vector3(1.0, 1.0, 1.0),
    uFilterIntensity: 0.0,
    uGradientMode: 0.0,
    uAntiReflex: 1.0,
  },
  MultifocalShader.vertexShader,
  MultifocalShader.fragmentShader,
);

extend({ MultifocalMaterial });

const IP_DINAMICO =
  typeof window !== "undefined" ? window.location.hostname : "localhost";
const socket = io(`http://${IP_DINAMICO}:3001`);

const VIDEO_SRC = "/seu-video.mp4";

const CORES_LENTES = {
  cinza: new THREE.Vector3(0.2, 0.2, 0.2),
  marrom: new THREE.Vector3(0.35, 0.2, 0.08),
  g15: new THREE.Vector3(0.12, 0.22, 0.15),
};

function VideoScene({
  videoUrl,
  playing,
  distortionLevel,
  showGuide,
  flipRightEye,
  lensColor,
  filterIntensity,
  gradientMode,
  antiReflex,
}) {
  const materialRef = useRef();
  const texture = useVideoTexture(videoUrl, {
    unsuspend: "canplaythrough",
    crossOrigin: "anonymous",
    loop: true,
    muted: true,
    playsInline: true,
  });

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uDistortion = distortionLevel;
      materialRef.current.uShowGuide = showGuide ? 1.0 : 0.0;
      materialRef.current.uFlipRightEye = flipRightEye ? 1.0 : 0.0;
      materialRef.current.uLensColor =
        CORES_LENTES[lensColor] || new THREE.Vector3(1, 1, 1);
      materialRef.current.uFilterIntensity = filterIntensity;
      materialRef.current.uGradientMode = gradientMode;
      materialRef.current.uAntiReflex = antiReflex ? 1.0 : 0.0;
    }
  }, [
    distortionLevel,
    showGuide,
    flipRightEye,
    lensColor,
    filterIntensity,
    gradientMode,
    antiReflex,
  ]);

  useEffect(() => {
    if (texture.image) {
      if (playing) texture.image.play().catch((err) => console.log(err));
      else texture.image.pause();
    }
  }, [playing, texture]);

  return (
    <mesh position={[0, 0, -2.0]}>
      <planeGeometry args={[4.0, 2.25]} />
      <multifocalMaterial
        ref={materialRef}
        tDiffuse={texture}
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
  );
}

function ControlePC() {
  const [distortion, setDistortion] = useState(1.0);
  const [activePreset, setActivePreset] = useState("maior");
  const [showGuide, setShowGuide] = useState(true);
  const [playing, setPlaying] = useState(false);

  const [lensColor, setLensColor] = useState("cinza");
  const [filterIntensity, setFilterIntensity] = useState(0.0);
  const [gradientMode, setGradientMode] = useState(0.0);
  const [antiReflex, setAntiReflex] = useState(true);
  const [tipoDemonstracao, setTipoDemonstracao] = useState("fotossensivel");

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fotoAtivo, setFotoAtivo] = useState(false);
  const transitionRef = useRef(null);
  
  const nullRef = useRef(null);

  const presets = [
    { id: "maior", label: "Alto", value: 1.4 },
    { id: "medio-maior", label: "Média/Alta", value: 0.9 },
    { id: "medio-menor", label: "Média/Baixa", value: 0.5 },
    { id: "quase-nada", label: "Mínima", value: 0.1 },
  ];

  useEffect(() => {
    socket.emit("mudar-configuracao", {
      distortion,
      activePreset,
      showGuide,
      playing,
      lensColor,
      filterIntensity,
      gradientMode,
      antiReflex,
      flipRightEye: true,
    });
  }, [
    distortion,
    activePreset,
    showGuide,
    playing,
    lensColor,
    filterIntensity,
    gradientMode,
    antiReflex,
  ]);

  const porcentagemExibida = Math.round((filterIntensity / 0.9) * 100);

  const ativarModoSol = () => {
    clearInterval(transitionRef.current);
    setIsTransitioning(false);
    setTipoDemonstracao("sol");
    setFilterIntensity(0.9);
  };

  const ativarModoFotossensivel = () => {
    clearInterval(transitionRef.current);
    setIsTransitioning(false);
    setFotoAtivo(false);
    setTipoDemonstracao("fotossensivel");
    setFilterIntensity(0.0);
  };

  const handleToggleFotossensivel = () => {
    if (isTransitioning) return;
    clearInterval(transitionRef.current);
    setIsTransitioning(true);

    const tempoTotal = 6000;
    const intervaloMs = 30;
    const passosTotais = tempoTotal / intervaloMs;
    const valorInicial = filterIntensity;
    const valorDestino = !fotoAtivo ? 0.9 : 0.0;
    let passoAtual = 0;

    transitionRef.current = setInterval(() => {
      passoAtual++;
      let t = passoAtual / passosTotais;
      let fatorSuave = t * t * (3.0 - 2.0 * t);
      let novoValor = valorInicial + (valorDestino - valorInicial) * fatorSuave;

      setFilterIntensity(novoValor);

      if (passoAtual >= passosTotais) {
        clearInterval(transitionRef.current);
        setIsTransitioning(false);
        setFotoAtivo(!fotoAtivo);
        setFilterIntensity(valorDestino);
      }
    }, intervaloMs);
  };

  const cardStyle = {
    background: "#121214",
    padding: "22px",
    borderRadius: "16px",
    border: "1px solid #202024",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: "700",
    color: "#8d8d99",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  };

  const configCameraPC = {
    fov: 60,
    position: [0, 0, 0],
    aspect: 16 / 9,
  };

  return (
    <div
      style={{
        background: "#09090a",
        color: "#e1e1e6",
        minHeight: "100vh",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .layout-grid { display: grid; grid-template-columns: 1fr; gap: 20px; max-width: 1400px; margin: 0 auto; }
        @media (min-width: 950px) { .layout-grid { grid-template-columns: 1fr 1fr 1fr; } }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "800",
            margin: 0,
            color: "#fff",
            letterSpacing: "-0.5px",
          }}
        >
          Consultor Óptico VR
        </h2>
        <p style={{ fontSize: "14px", color: "#7c7c8a", margin: "6px 0 0 0" }}>
          Painel Inteligente Multitela integrado com simulador 3D
        </p>
      </div>

      <div className="layout-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={cardStyle}>
            <span style={labelStyle}>Status do Vídeo</span>
            <button
              onClick={() => setPlaying(!playing)}
              style={{
                width: "100%",
                padding: "18px",
                fontSize: "15px",
                fontWeight: "bold",
                background: playing ? "#f75a68" : "#00b37e",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {playing ? "⏸ PAUSAR VÍDEO EXIBIDO" : "▶ TRANSMITIR E DAR PLAY"}
            </button>
          </div>

          <div style={cardStyle}>
            <span style={labelStyle}>Tratamento Antirreflexo</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                onClick={() => setAntiReflex(true)}
                style={{
                  background: antiReflex ? "#00875f" : "#29292e",
                  color: "#fff",
                  border: "none",
                  padding: "16px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                }}
              >
                COM AR (NÍTIDO)
              </button>
              <button
                onClick={() => setAntiReflex(false)}
                style={{
                  background: !antiReflex ? "#aa2834" : "#29292e",
                  color: "#fff",
                  border: "none",
                  padding: "16px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                }}
              >
                SEM AR (REFLEXO)
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <span style={labelStyle}>Categoria de Lente Escura</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                onClick={ativarModoFotossensivel}
                style={{
                  background: tipoDemonstracao === "fotossensivel" ? "#482042" : "#29292e",
                  color: tipoDemonstracao === "fotossensivel" ? "#ff85e1" : "#fff",
                  border: "none",
                  padding: "16px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                FOTOSSENSÍVEL
              </button>
              <button
                onClick={ativarModoSol}
                style={{
                  background: tipoDemonstracao === "sol" ? "#7c3a0d" : "#29292e",
                  color: tipoDemonstracao === "sol" ? "#ff9a52" : "#fff",
                  border: "none",
                  padding: "16px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                ÓCULOS DE SOL
              </button>
            </div>

            {tipoDemonstracao === "fotossensivel" && (
              <button
                onClick={handleToggleFotossensivel}
                disabled={isTransitioning}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: isTransitioning ? "#323238" : fotoAtivo ? "#e1b12c" : "#8257e5",
                  color: fotoAtivo ? "#000" : "#fff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: isTransitioning ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  marginTop: "4px",
                  fontSize: "14px",
                }}
              >
                {isTransitioning
                  ? "⏳ ADAPTANDO LENTE (6s)..."
                  : fotoAtivo
                    ? "☀️ REAÇÃO: CLAREAR LENTE"
                    : "⚡ REAÇÃO: SAIR NO SOL (ESCURECER)"}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={cardStyle}>
            <span style={labelStyle}>Tonalidade & Acabamento ({porcentagemExibida}%)</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {["cinza", "marrom", "g15"].map((cor) => (
                <button
                  key={cor}
                  onClick={() => setLensColor(cor)}
                  style={{
                    background: lensColor === cor ? "#007bff" : "#29292e",
                    color: "#fff",
                    border: "none",
                    padding: "12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                >
                  {cor}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0.0"
              max="0.90"
              step="0.01"
              value={filterIntensity}
              onChange={(e) => {
                clearInterval(transitionRef.current);
                setIsTransitioning(false);
                setFilterIntensity(parseFloat(e.target.value));
              }}
              style={{
                width: "100%",
                height: "8px",
                background: "#29292e",
                borderRadius: "4px",
                cursor: "pointer",
                outline: "none",
                margin: "12px 0",
                direction: tipoDemonstracao === "sol" ? "rtl" : "ltr",
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                onClick={() => setGradientMode(0.0)}
                style={{
                  background: gradientMode === 0.0 ? "#fff" : "#202024",
                  color: gradientMode === 0.0 ? "#000" : "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                LENTE TOTAL
              </button>
              <button
                onClick={() => setGradientMode(1.0)}
                style={{
                  background: gradientMode === 1.0 ? "#fff" : "#202024",
                  color: gradientMode === 1.0 ? "#000" : "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                DEGRADÊ MEIO
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <span style={labelStyle}>Geometria do Funil (Alturas)</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                onClick={() => setShowGuide(true)}
                style={{
                  background: showGuide ? "#202024" : "#09090a",
                  color: "#fff",
                  border: "1px solid #323238",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                VER LINHAS GUIA
              </button>
              <button
                onClick={() => setShowGuide(false)}
                style={{
                  background: !showGuide ? "#202024" : "#09090a",
                  color: "#fff",
                  border: "1px solid #323238",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                OCULTAR LINHAS
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginTop: "4px" }}>
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePreset(p.id);
                    setDistortion(p.value);
                  }}
                  style={{
                    padding: "14px 4px",
                    background: activePreset === p.id ? "#007bff" : "#29292e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} ref={nullRef}>
          <div style={{ ...cardStyle, flexGrow: 1 }}>
            <span style={labelStyle}>Visão em Tempo Real do VR</span>
            <div
              style={{
                width: "100%",
                aspectRatio: "16/9",
                background: "#000",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid #414141",
                position: "relative",
                pointerEvents: "none", 
              }}
            >
              <Canvas 
                camera={configCameraPC} 
                resize={{ scroll: false, debounce: 0 }}
                events={() => ({})} 
                eventSource={nullRef} 
              >
                <VideoScene
                  videoUrl={VIDEO_SRC}
                  playing={playing}
                  distortionLevel={distortion}
                  showGuide={showGuide}
                  flipRightEye={false}
                  lensColor={lensColor}
                  filterIntensity={filterIntensity}
                  gradientMode={gradientMode}
                  antiReflex={antiReflex}
                />
              </Canvas>
              {!playing && (
                <div
                  style={{
                    position: "absolute",
                    top: 0, left: 0, width: "100%", height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "#aaa",
                  }}
                >
                  Aguardando Play...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OculosVR() {
  const [playing, setPlaying] = useState(false);
  const [distortion, setDistortion] = useState(1.0);
  const [showGuide, setShowGuide] = useState(true);
  const [flipRightEye, setFlipRightEye] = useState(true);
  const [celularAtivado, setCelularAtivado] = useState(false);

  const [lensColor, setLensColor] = useState("cinza");
  const [filterIntensity, setFilterIntensity] = useState(0.0);
  const [gradientMode, setGradientMode] = useState(0.0);
  const [antiReflex, setAntiReflex] = useState(true);

  useEffect(() => {
    socket.on("aplicar-configuracao", (dados) => {
      if (celularAtivado) {
        setPlaying(dados.playing);
      }
      setDistortion(dados.distortion);
      setShowGuide(dados.showGuide);
      setFlipRightEye(dados.flipRightEye);
      setLensColor(dados.lensColor);
      setFilterIntensity(dados.filterIntensity);
      setGradientMode(dados.gradientMode);
      setAntiReflex(dados.antiReflex);
    });

    socket.on("connect_error", (err) => {
      alert(`Acesso Bloqueado: ${err.message}`);
    });

    socket.on("erro-licenca", (dados) => {
      alert(`Sessão Encerrada: ${dados.mensagem}`);
      window.location.reload();
    });

    return () => {
      socket.off("aplicar-configuracao");
      socket.off("connect_error");
      socket.off("erro-licenca");
    };
  }, [celularAtivado]);

  const handleAtivarVR = () => {
    setCelularAtivado(true);
    const elemento = document.documentElement;
    if (elemento.requestFullscreen) {
      elemento.requestFullscreen().catch((err) => console.log(err));
    } else if (elemento.webkitRequestFullscreen) {
      elemento.webkitRequestFullscreen();
    }
  };

  if (!celularAtivado) {
    return (
      <div
        onClick={handleAtivarVR}
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          cursor: "pointer",
          position: "fixed",
          left: 0,
          top: 0,
        }}
      >
        <span style={{ color: "#141414", fontSize: "32px" }}>👁️</span>
        <p style={{ color: "#262626", fontSize: "11px", fontFamily: "sans-serif", marginTop: "10px", textAlign: "center" }}>
          Toque para iniciar a experiência completa de tratamentos ópticos VR.
        </p>
      </div>
    );
  }

  const configCamera = {
    fov: 60,
    position: [0, 0, 0],
    aspect: window.innerWidth / 2 / window.innerHeight,
  };

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        background: "#000",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 99999,
      }}
    >
      <div style={{ width: "50%", height: "100%", position: "relative", overflow: "hidden" }}>
        <Canvas camera={configCamera} resize={{ scroll: false, debounce: 0 }}>
          <VideoScene
            videoUrl={VIDEO_SRC}
            playing={playing}
            distortionLevel={distortion}
            showGuide={showGuide}
            flipRightEye={false}
            lensColor={lensColor}
            filterIntensity={filterIntensity}
            gradientMode={gradientMode}
            antiReflex={antiReflex}
          />
        </Canvas>
      </div>
      <div style={{ width: "50%", height: "100%", position: "relative", overflow: "hidden" }}>
        <Canvas camera={configCamera} resize={{ scroll: false, debounce: 0 }}>
          <VideoScene
            videoUrl={VIDEO_SRC}
            playing={playing}
            distortionLevel={distortion}
            showGuide={showGuide}
            flipRightEye={flipRightEye}
            lensColor={lensColor}
            filterIntensity={filterIntensity}
            gradientMode={gradientMode}
            antiReflex={antiReflex}
          />
        </Canvas>
      </div>
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const modo = params.get("modo");

  if (modo === "pc") return <ControlePC />;
  return <OculosVR />;
}