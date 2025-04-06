const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors=require('cors')

const app = express();
app.use(cors())
const upload = multer({ dest: 'uploads/' });

const CLOUDCONVERT_API_KEY = 'YOUR_CLOUDCONVERT_API_KEY'; // Replace with your actual API key

// Handle file upload and conversion
app.post('/convert', upload.single('file'), async (req, res) => {
  const mobiFilePath = path.resolve(req.file.path);

  // Prepare CloudConvert request payload
  const formData = new FormData();
  formData.append('file', fs.createReadStream(mobiFilePath));
  formData.append('apikey', CLOUDCONVERT_API_KEY);
  formData.append('outputformat', 'pdf');

  try {
    // Send request to CloudConvert API for conversion
    const cloudConvertResponse = await axios.post('https://api.cloudconvert.com/v2/convert', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Extract the URL for the converted PDF
    const pdfUrl = cloudConvertResponse.data.url;

    // Respond with the PDF URL
    res.json({ pdfUrl });

    // Clean up the uploaded MOBI file
    fs.unlinkSync(mobiFilePath);
  } catch (error) {
    console.error('Error during conversion:', error);
    res.status(500).send('Conversion failed');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
