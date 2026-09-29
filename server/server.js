import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 🎙️ IMPORTS REFINADOS (Removemos a biblioteca "sound-play" que não será mais usada)
import googleTTS from "google-tts-api";

// Configuração para resolver caminhos de arquivos no formato ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 🔊 FUNÇÃO ATUALIZADA: Transforma o áudio em texto Base64 e injeta direto no celular
async function enviarVozDoGoogle(texto) {
  try {
    // Pega a URL oficial gerada pelos servidores do Google Tradutor
    const url = googleTTS.getAudioUrl(texto, {
      lang: "pt-BR",
      slow: false,
      host: "https://translate.google.com",
    });

    // Faz o download dos bytes do áudio direto na memória do servidor (sem salvar arquivo no HD)
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Converte o áudio bruto em uma string estável Base64
    const audioBase64 = buffer.toString("base64");

    console.log(`📡 Enviando áudio convertido em Base64 para os dispositivos...`);
    // Envia os dados direto pelo Socket
    io.emit("tocar-audio-cliente", { audioData: audioBase64 });
  } catch (err) {
    console.error("❌ Erro ao processar e converter áudio do Google TTS:", err);
  }
}

// --- FUNÇÃO AVANÇADA DE VALIDAÇÃO DE LICENÇA (Mantida Intacta) ---
async function verificarAcesso() {
  try {
    const caminhoLicenca = path.join(__dirname, "licenca.json");

    if (!fs.existsSync(caminhoLicenca)) {
      console.log("Arquivo de licença ausente. Bloqueando...");
      return { liberado: false, motivo: "Licença inválida ou ausente." };
    }

    const dadosLicenca = JSON.parse(fs.readFileSync(caminhoLicenca, "utf8"));
    const dataInicio = new Date(dadosLicenca.dataInicio);
    const dataFim = new Date(dadosLicenca.dataFim);

    // Tenta pegar a hora real da internet para evitar fraudes no relógio do PC
    let agora = new Date();
    try {
      const response = await fetch(
        "https://worldtimeapi.org/api/timezone/America/Sao_Paulo",
        { signal: AbortSignal.timeout(2000) },
      );
      if (response.ok) {
        const dataJson = await response.json();
        agora = new Date(dataJson.datetime);
      }
    } catch (e) {
      console.log(
        "ℹ Servidor offline ou sem resposta da API de hora. Usando hora local. Detalhe:",
        e.message,
      );
      agora = new Date();
    }

    if (agora >= dataInicio && agora <= dataFim) {
      return { liberado: true };
    } else {
      return {
        liberado: false,
        motivo: "Assinatura expirada. Renove seu acesso.",
      };
    }
  } catch (error) {
    console.error("Erro na validação:", error);
    return { liberado: false, motivo: "Erro interno de validação." };
  }
}

// Interceptador de Conexões (Middleware do Socket.io)
io.use(async (socket, next) => {
  const checagem = await verificarAcesso();
  if (checagem.liberado) {
    next();
  } else {
    next(new Error(checagem.motivo));
  }
});

io.on("connection", (socket) => {
  console.log("Dispositivo conectado:", socket.id);

  socket.on("mudar-configuracao", async (dados) => {
    // Validação extra a cada comando enviado para evitar burla com o app já aberto
    const checagem = await verificarAcesso();
    if (!checagem.liberado) {
      socket.emit("erro-licenca", { mensagem: checagem.motivo });
      socket.disconnect();
      return;
    }
    socket.broadcast.emit("aplicar-configuracao", dados);
  });

  // 🗣️ EVENTO CORRIGIDO: Agora envia o áudio em vez de tocar na placa mãe do PC
  socket.on("falar-no-servidor", async (dados) => {
    const checagem = await verificarAcesso();
    if (!checagem.liberado) return;

    console.log(`📢 Enfileirando texto para reprodução remota: "${dados.texto}"`);
    enviarVozDoGoogle(dados.texto); // 👈 Dispara direto pro app.jsx rodar
  });

  socket.on("disconnect", () => {
    console.log("Dispositivo desconectado:", socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor de controle VR rodando com sucesso na porta ${PORT}`);
});