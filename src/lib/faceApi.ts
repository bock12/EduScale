import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export const loadModels = async () => {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
  ]);
};

export const getFaceEmbedding = async (imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
  const detection = await faceapi
    .detectSingleFace(imageElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  return detection ? Array.from(detection.descriptor) : null;
};

export const compareFaces = (embedding1: number[], embedding2: number[]) => {
  const distance = faceapi.euclideanDistance(embedding1, embedding2);
  return distance < 0.6; // Threshold for matching
};
