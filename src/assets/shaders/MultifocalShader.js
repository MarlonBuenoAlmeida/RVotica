export const MultifocalShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uDistortion;
    uniform float uShowGuide;
    uniform float uFlipRightEye;
    
    uniform vec3 uLensColor;         
    uniform float uFilterIntensity;  
    uniform float uGradientMode;     o
    uniform float uAntiReflex;       

    varying vec2 vUv;

    void main() {
      vec2 uvCalculo = vUv;

      bool ehOlhoDireito = (vUv.x >= 0.5);
      if (ehOlhoDireito && uFlipRightEye > 0.5) {
        uvCalculo.x = 1.0 - uvCalculo.x; 
      }

      float distCentroX = abs(uvCalculo.x - 0.5);

      float baseDinamica = mix(1.55, 0.55, smoothstep(-2.0, 2.2, uDistortion));
      
      float larguraFunil = mix(fatorAberturaMudar, baseDinamica, smoothstep(0.10, 1.50, uvCalculo.y));

      float fatorFunilLateral = smoothstep(larguraFunil, larguraFunil + 0.08, distCentroX);
      float fatorVertical = smoothstep(1.00, 0.0, uvCalculo.y) * uDistortion;
      float intensidadeEfeito = fatorFunilLateral * fatorVertical;

      vec2 uvVideo = uvCalculo;

      if (intensidadeEfeito > 0.0) {
        uvVideo.x = mix(uvVideo.x, 1.7, 0.05 * intensidadeEfeito);
      }

      uvVideo = clamp(uvVideo, vec2(0.002), vec2(0.998));

      if (ehOlhoDireito && uFlipRightEye > 0.5) {
        uvVideo.x = 1.0 - uvVideo.x;
      }

      vec4 corOriginal = texture2D(tDiffuse, uvVideo);
      vec4 corBorrada = vec4(0.0);
      float tamanhoBlur = 0.003 * intensidadeEfeito;
      corBorrada += texture2D(tDiffuse, uvVideo + vec2(-tamanhoBlur, -tamanhoBlur));
      corBorrada += texture2D(tDiffuse, uvVideo + vec2(tamanhoBlur, -tamanhoBlur));
      corBorrada += texture2D(tDiffuse, uvVideo + vec2(-tamanhoBlur, tamanhoBlur));
      corBorrada += texture2D(tDiffuse, uvVideo + vec2(tamanhoBlur, tamanhoBlur));
      corBorrada /= 4.0;

      vec4 corBase = mix(corOriginal, corBorrada, smoothstep(0.0, 0.9, intensidadeEfeito));

      if (uFilterIntensity > 0.0) {
        float fatorFiltro = uFilterIntensity;
        
        if (uGradientMode > 0.5) {
          fatorFiltro *= smoothstep(0.2, 0.65, uvCalculo.y); 
        }
        
        corBase.rgb = mix(corBase.rgb, corBase.rgb * uLensColor, fatorFiltro);
      }

      if (uAntiReflex < 0.5) {
        float brilhoReflexo = sin(vUv.x * 25.0 + vUv.y * 15.0) * 0.04 + 0.04;
        corBase.rgb += vec3(brilhoReflexo + 0.06); 
      }

      if (uShowGuide > 0.5) {
        float linhaFunil = abs(distCentroX - larguraFunil);
        if (linhaFunil < 0.002) {
          float frequenciaPontos = sin(vUv.y * 12000.0) * sin(vUv.x * 12000.0);
          if (frequenciaPontos > 0.0) {
            corBase = vec4(1.0, 1.0, 1.0, 1.0);
          }
        }
      }

      vec2 centroOlho = vUv - 0.5;
      centroOlho.x *= 1.0; 
      
      float raio = length(centroOlho);
      float mascaraVR = smoothstep(0.46, 0.50, raio);
      
      vec3 corFinalComBordaVR = mix(corBase.rgb, vec3(0.0, 0.0, 0.0), mascaraVR);

      gl_FragColor = vec4(corFinalComBordaVR, 1.0);
    }
  `,
};
