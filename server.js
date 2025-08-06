const express = require('express');
const QRCode = require('qrcode');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const logoPath = path.join(__dirname, 'uploads/logo.png');

app.get('/', (req, res) => {
  const hasLogo = fs.existsSync(logoPath);
  res.render('index', { qr: null, url: '', hasLogo });
});

app.post('/generate', async (req, res) => {
  const { url, useLogo } = req.body;
  const hasLogo = fs.existsSync(logoPath);

  if (!url) return res.redirect('/');

  try {
    if (useLogo === 'on' && hasLogo) {
      const qrBuffer = await QRCode.toBuffer(url, { width: 400 });
      const qrImg = await Jimp.read(qrBuffer);
      const logoImg = await Jimp.read(logoPath);

      logoImg.resize(qrImg.bitmap.width / 5, Jimp.AUTO);

      const x = (qrImg.bitmap.width - logoImg.bitmap.width) / 2;
      const y = (qrImg.bitmap.height - logoImg.bitmap.height) / 2;

      qrImg.composite(logoImg, x, y);
      const qrWithLogo = await qrImg.getBase64Async(Jimp.MIME_PNG);

      return res.render('index', { qr: qrWithLogo, url, hasLogo });
    } else {
      const qr = await QRCode.toDataURL(url, { width: 900 });
      return res.render('index', { qr, url, hasLogo });
    }
  } catch (err) {
    console.error(err);
    res.send('Error generating QR code');
  }
});

app.post('/upload-logo', upload.single('logo'), (req, res) => {
  if (!req.file) return res.redirect('/');

  const newPath = path.join(__dirname, 'uploads/logo.png');
  fs.renameSync(req.file.path, newPath);
  res.redirect('/');
});

app.post('/delete-logo', (req, res) => {
  if (fs.existsSync(logoPath)) {
    fs.unlinkSync(logoPath);
  }
  res.redirect('/');
});

app.get('/download', async (req, res) => {
  const { url } = req.query;
  const useLogo = req.query.useLogo === 'true';
  const hasLogo = fs.existsSync(logoPath);

  try {
    if (useLogo && hasLogo) {
      const qrBuffer = await QRCode.toBuffer(url, { width: 400 });
      const qrImg = await Jimp.read(qrBuffer);
      const logoImg = await Jimp.read(logoPath);

      logoImg.resize(qrImg.bitmap.width / 5, Jimp.AUTO);
      const x = (qrImg.bitmap.width - logoImg.bitmap.width) / 2;
      const y = (qrImg.bitmap.height - logoImg.bitmap.height) / 2;

      qrImg.composite(logoImg, x, y);
      res.setHeader('Content-disposition', 'attachment; filename="qr-code.png"');
      res.setHeader('Content-type', 'image/png');
      qrImg.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
        if (err) return res.send('Error generating QR');
        res.end(buffer);
      });
    } else {
      res.setHeader('Content-disposition', 'attachment; filename="qr-code.png"');
      res.setHeader('Content-type', 'image/png');
      QRCode.toFileStream(res, url, { width: 400 });
    }
  } catch (err) {
    res.send('Error downloading QR');
  }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
