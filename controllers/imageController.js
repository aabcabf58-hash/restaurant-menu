const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function imageFormat(bytes) {
  if (bytes.length < PNG_HEADER.length) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.subarray(0, PNG_HEADER.length).equals(PNG_HEADER)) return 'png';
  return null;
}

exports.MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;
exports.uploadImage = async (req, res) => {
  if (!req.is('application/octet-stream') || !Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).json({ success: false, message: 'اختار صورة للرفع.' });
  }

  const format = imageFormat(req.body);
  if (!format) {
    return res.status(415).json({ success: false, message: 'اختار صورة JPG أو PNG.' });
  }

  const clientId = process.env.IMGUR_CLIENT_ID?.trim();
  if (!clientId) {
    return res.status(503).json({ success: false, message: 'ضيف IMGUR_CLIENT_ID بإعدادات السيرفر.' });
  }

  try {
    const payload = new FormData();
    payload.append('image', new Blob([req.body], { type: `image/${format}` }), `image.${format}`);

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: { Authorization: `Client-ID ${clientId}` },
      body: payload,
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error('Imgur image upload failed', { status: response.status });
      if (response.status === 429) {
        return res.status(429).json({ success: false, message: 'وصلنا لحدّ الرفع على Imgur. جرّب بعد شوي.' });
      }
      return res.status(502).json({ success: false, message: 'Imgur رفض رفع الصورة.' });
    }

    const result = await response.json();
    if (result?.success !== true || typeof result.data?.link !== 'string') {
      throw new Error('Imgur did not return an image link');
    }

    const imageUrl = new URL(result.data.link);
    if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'i.imgur.com') {
      throw new Error('Imgur returned an invalid image link');
    }

    return res.status(201).json({ success: true, image_url: imageUrl.href });
  } catch (error) {
    console.error('Imgur image upload failed', { type: error.name });
    return res.status(502).json({ success: false, message: 'تعذّر رفع الصورة على Imgur. جرّب مرة تانية.' });
  }
};
