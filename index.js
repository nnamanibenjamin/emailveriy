const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'unstoppableman11@gmail.com',
    pass: 'mexvlkglpfydeaky',
  },
});

// MongoDB configuration
const mongoURI = 'mongodb+srv://agisite016:Benjamindev@emailverify.94yyyrq.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'emailverify';
const collectionName = 'verification_codes';

// Mongoose schema
const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  code: {
    type: Number,
    required: true,
  },
});

const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

// Endpoint to handle the verification request
app.post('/verify', (req, res) => {
  const email = req.body.email;

  // Check if there is an existing verification code for the email
  VerificationCode.findOne({ email })
    .then((result) => {
      if (result) {
        // Verification code exists for the email
        // Resend the verification code
        sendVerificationCode(email, result.code, res);
      } else {
        // Generate a new verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000);

        // Create a new VerificationCode instance
        const newVerificationCode = new VerificationCode({ email, code: verificationCode });

        // Save the verification code to MongoDB
        newVerificationCode.save()
          .then(() => {
            // Send the verification code via email
            sendVerificationCode(email, verificationCode, res);
          })
          .catch((err) => {
            console.error('Error saving verification code to MongoDB:', err);
            res.status(500).send('Error sending verification code');
          });
      }
    })
    .catch((err) => {
      console.error('Error retrieving verification code from MongoDB:', err);
      res.status(500).send('Error sending verification code');
    });
});

// Function to send the verification code via email
function sendVerificationCode(email, code, res) {
  // Email verification options
  const mailOptions = {
    from: 'SENDER_EMAIL_ADDRESS',
    to: email,
    subject: 'Email Verification',
    text: `Your verification code is: ${code}`,
  };

  // Send the verification code via email
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.error('Error sending verification code:', error);
      res.status(500).send('Error sending verification code');
    } else {
      // Verification code sent successfully
      res.status(200).send('Verification code sent');
    }
  });
}

// Example endpoint for verifying the code
app.post('/verify/code', (req, res) => {
  const email = req.body.email;
  const userCode = req.body.code;

  // Retrieve the stored verification code from MongoDB
  VerificationCode.findOne({ email })
    .then((result) => {
      if (result && result.code === parseInt(userCode)) {
        // Verification successful
        res.status(200).send('Verification successful');
      } else if (result && result.code !== userCode) {
        // Verification code incorrect
        res.status(400).send('Verification code incorrect');
      } else {
        // Verification code not found (email not verified)
        res.status(400).send('Email not verified');
      }
    })
    .catch((err) => {
      console.error('Error retrieving verification code from MongoDB:', err);
      res.status(500).send('Error verifying code');
    }
    );
});

// Endpoint to resend the verification code
app.post('/resend', (req, res) => {
  const email = req.body.email;

  // Generate a new verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000);

  // Update the verification code in MongoDB
  VerificationCode.updateOne({ email }, { code: verificationCode }, { upsert: true })
    .then(() => {
      // Send the new verification code via email
      sendVerificationCode(email, verificationCode, res);
    })
    .catch((err) => {
      console.error('Error updating verification code in MongoDB:', err);
      res.status(500).send('Error resending verification code');
    });
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});