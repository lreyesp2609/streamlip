import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";

const s3 = new S3Client({ region: "us-east-1" });
const textract = new TextractClient({ region: "us-east-1" });
const rekognition = new RekognitionClient({ region: "us-east-1" });

const BUCKET_NAME = "detector-emociones-fotos";
const REGION = "us-east-1";

// Regex para formatos comunes de placas (ajusta según tu país)
const PLACA_REGEX = /^[A-Z]{2,3}[-\s]?\d{3,4}[A-Z]{0,2}$|^[A-Z]\d{3}[A-Z]{3}$|^\d{3}[A-Z]{3}$/;

function esPlaca(texto) {
  const limpio = texto.toUpperCase().replace(/\s+/g, "").trim();
  return PLACA_REGEX.test(limpio);
}

export const handler = async (event) => {
  try {
    const body = Buffer.from(event.body, "base64");
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 15);
    const imageId = `placa-${timestamp}.jpg`;

    // 1. Subir imagen a S3
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageId,
        Body: body,
        ContentType: "image/jpeg",
      })
    );

    // 2. Verificar con Rekognition que hay un carro en la imagen
    const labelsResponse = await rekognition.send(
      new DetectLabelsCommand({
        Image: { S3Object: { Bucket: BUCKET_NAME, Name: imageId } },
        MinConfidence: 60,
      })
    );

    const etiquetas = labelsResponse.Labels.map((l) => l.Name.toLowerCase());
    const hayVehiculo = etiquetas.some((e) =>
      ["car", "vehicle", "automobile", "truck", "van", "license plate", "number plate"].includes(e)
    );

    if (!hayVehiculo) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No se detectó un vehículo en la imagen." }),
      };
    }

    // 3. Extraer texto con Textract
    const textractResponse = await textract.send(
      new DetectDocumentTextCommand({
        Document: { S3Object: { Bucket: BUCKET_NAME, Name: imageId } },
      })
    );

    const bloques = textractResponse.Blocks.filter((b) => b.BlockType === "LINE");
    const textos = bloques.map((b) => b.Text.trim());

    // 4. Filtrar solo placas
    const placas = textos.filter(esPlaca).map((p) => p.toUpperCase().replace(/\s+/g, ""));

    if (placas.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No se encontró ninguna placa en la imagen.",
          textos_detectados: textos, // útil para debug
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        placas,
        image_url: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${imageId}`,
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
};