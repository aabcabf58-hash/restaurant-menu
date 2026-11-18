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

  const apiKey = process.env.IMGBB_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ success: false, message: 'ضيف IMGBB_API_KEY بإعدادات السيرفر.' });
  }

  try {
    const payload = new FormData();
    payload.append('key', apiKey);
    payload.append('image', new Blob([req.body], { type: `image/${format}` }), `image.${format}`);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: payload,
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error('ImgBB image upload failed', { status: response.status });
      if (response.status === 429) {
        return res.status(429).json({ success: false, message: 'وصلنا لحدّ الرفع على ImgBB. جرّب بعد شوي.' });
      }
      return res.status(502).json({ success: false, message: 'ImgBB رفض رفع الصورة.' });
    }

    const result = await response.json();
    if (result?.success !== true || typeof result.data?.url !== 'string') {
      throw new Error('ImgBB did not return an image link');
    }

    const imageUrl = new URL(result.data.url);
    if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'i.ibb.co') {
      throw new Error('ImgBB returned an invalid image link');
    }

    return res.status(201).json({ success: true, image_url: imageUrl.href });
  } catch (error) {
    console.error('ImgBB image upload failed', { type: error.name });
    return res.status(502).json({ success: false, message: 'تعذّر رفع الصورة على ImgBB. جرّب مرة تانية.' });
  }
};
