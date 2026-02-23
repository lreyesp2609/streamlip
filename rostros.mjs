import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";

const s3 = new S3Client({ region: "us-east-1" });
const rekognition = new RekognitionClient({ region: "us-east-1" });

const BUCKET_NAME = "detector-emociones-fotos";
const REGION = "us-east-1";

const emocionEnEspanol = {
  HAPPY: "Feliz",
  SAD: "Triste",
  ANGRY: "Enojado",
  CONFUSED: "Confundido",
  DISGUSTED: "Enojado",
  SURPRISED: "Sorprendido",
  CALM: "Calmado",
  FEAR: "Miedo",
};

const emojiMap = {
  HAPPY: "😄",
  SAD: "😢",
  ANGRY: "😠",
  CONFUSED: "😕",
  DISGUSTED: "🤢",
  SURPRISED: "😲",
  CALM: "😌",
  FEAR: "😨",
};

export const handler = async (event) => {
  try {
    const body = Buffer.from(event.body, "base64");
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 15);
    const imageId = `image-${timestamp}.jpg`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageId,
        Body: body,
        ContentType: "image/jpeg",
      })
    );

    const rekognitionResponse = await rekognition.send(
      new DetectFacesCommand({
        Image: { S3Object: { Bucket: BUCKET_NAME, Name: imageId } },
        Attributes: ["ALL"],
      })
    );

    const emociones = rekognitionResponse.FaceDetails[0].Emotions;
    const maxEmocion = emociones.reduce((a, b) =>
      a.Confidence > b.Confidence ? a : b
    );

    const imageUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${imageId}`;

    const result = {
      image_url: imageUrl,
      emocion: emocionEnEspanol[maxEmocion.Type] ?? maxEmocion.Type,
      porcentaje: Math.round(maxEmocion.Confidence * 100) / 100,
      emoji: emojiMap[maxEmocion.Type] ?? "❓",
    };

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
};