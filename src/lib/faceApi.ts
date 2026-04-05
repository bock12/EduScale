import * as faceapi from 'face-api.js';

const MODEL_URLS = [
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights',
  'https://vladmandic.github.io/face-api/model/'
];

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;
  
  if (!faceapi || !faceapi.nets) {
    throw new Error('face-api.js is not correctly loaded. Please check your dependencies.');
  }
  
  let lastError = null;
  
  for (const url of MODEL_URLS) {
    console.log('Attempting to load face-api models from:', url);
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(url),
        faceapi.nets.faceLandmark68Net.loadFromUri(url),
        faceapi.nets.faceRecognitionNet.loadFromUri(url),
        faceapi.nets.ssdMobilenetv1.loadFromUri(url),
      ]);
      console.log('All face-api models loaded successfully from:', url);
      modelsLoaded = true;
      return; // Success!
    } catch (error) {
      console.warn(`Failed to load models from ${url}:`, error);
      lastError = error;
    }
  }
  
  throw new Error(`Face recognition models could not be loaded from any source. Details: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
};

export const getFaceEmbedding = async (imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
  const detection = await faceapi
    .detectSingleFace(imageElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  return detection ? Array.from(detection.descriptor) : null;
};

export const compareFaces = (embedding1: number[], embedding2: number[]) => {
  const distance = faceapi.euclideanDistance(embedding1, embedding2);
  return distance < 0.6; // Threshold for matching
};
