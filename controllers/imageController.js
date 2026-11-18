const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function imageFormat(bytes) {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.subarray(0, 8).equals(PNG_HEADER)) return 'png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  if (bytes.toString('ascii', 4, 8) === 'ftyp') {
    const boxEnd = Math.min(bytes.readUInt32BE(0), bytes.length, 128);
    const brands = [bytes.toString('ascii', 8, 12)];
    for (let offset = 16; offset + 4 <= boxEnd; offset += 4) {
      brands.push(bytes.toString('ascii', offset, offset + 4));
    }
    if (brands.some(brand => ['heic', 'heix', 'hevc', 'hevx'].includes(brand))) return 'heic';
  }
  return null;
}

exports.MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;
exports.uploadImage = async (req, res) => {
  if (!req.is('application/octet-stream') || !Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).json({ success: false, message: 'اختار صورة للرفع.' });
  }

  const format = imageFormat(req.body);
  if (!format) {
    return res.status(415).json({ success: false, message: 'اختار صورة JPG أو PNG أو WebP أو HEIC.' });
  }

  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud || !key || !secret) {
    return res.status(503).json({ success: false, message: 'خدمة رفع الصور بحاجة لإعداد Cloudinary.' });
  }

  try {
    const payload = new FormData();
    payload.append('file', new Blob([req.body], { type: `image/${format}` }), `image.${format}`);
    if (format === 'heic') payload.append('format', 'jpg');

    const authorization = Buffer.from(`${key}:${secret}`).toString('base64');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, {
      method: 'POST',
      headers: { Authorization: `Basic ${authorization}` },
      body: payload,
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error('Cloudinary image upload failed', { status: response.status });
      return res.status(502).json({ success: false, message: 'تعذّر رفع الصورة. جرّب مرة تانية.' });
    }

    const { secure_url: secureUrl } = await response.json();
    if (typeof secureUrl !== 'string' || new URL(secureUrl).protocol !== 'https:') {
      throw new Error('Cloudinary returned an invalid delivery URL');
    }

    return res.status(201).json({ success: true, image_url: secureUrl });
  } catch (error) {
    console.error('Cloudinary image upload failed', { type: error.name });
    return res.status(502).json({ success: false, message: 'تعذّر رفع الصورة. جرّب مرة تانية.' });
  }
};
