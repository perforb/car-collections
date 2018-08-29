'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');

// const Busboy = require('busboy');
// const functions = require('firebase-functions');
// const admin = require('firebase-admin');

// const serviceAccount = require("./service-account-credentials.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://car-collections.firebaseio.com",
//   storageBucket: "car-collections.appspot.com"
// });

// const bucketName = functions.config().carcollections.bucket.name;
// const bucket = admin.storage().bucket(bucketName);
// const vision = require('@google-cloud/vision');


const Busboy = require('busboy');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const bucketName = functions.config().carcollections.bucket.name;
// const gcs = require('@google-cloud/storage')({
//   keyFilename: './service-account-credentials.json',
// });
//const bucket = gcs.bucket(bucketName);
const bucket = admin.storage().bucket(bucketName);
const vision = require('@google-cloud/vision');

const tempDir = functions.config().carcollections.bucket['temp'] || 'tmp';
const publicDir = functions.config().carcollections.bucket['public'] || 'images';
const client = new vision.ImageAnnotatorClient();

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpg', 'image/jpeg'];
const CACHE_CONTROL = 'public, max-age=300';
const ALLOWED_TAGS = ['car', 'vehicle'];
const BORDER_LINE = 50;
const FILE_CONFIG = {
  action: 'read',
  expires: '12-31-2999'
};

const judgment = function (label) {
  const description = label.description.toLocaleLowerCase();
  const score = parseInt(label.score * 100);
  if (!ALLOWED_TAGS.includes(description) || score < BORDER_LINE) {
    return false;
  }
  return true;
};

exports.status = functions.https.onRequest((req, res) => {
  const status = `
platform: ${os.platform()}
release:  ${os.release()}
uptime:   ${os.uptime()}
process:  ${process.title}
cwd:      ${process.cwd()}
freemem:  ${calculate(os.freemem())}
totalmem: ${calculate(os.totalmem())}
cpus:     ${os.cpus().length}
${JSON.stringify(os.cpus(), null, '    ')}
env:
${JSON.stringify(process.env, null, '    ')}
`;

  console.log(status);
  res.status(200).send(status);
});


exports.moveImage = functions.storage.object().onFinalize((object) => {
  console.log(object);
  const contentType = object.contentType;

  if (!ALLOWED_MIME_TYPES.includes(contentType.toLocaleLowerCase())) {
    console.warn(`Not allowed MIME type: ${mimeType}`);
    return true;
  }

  const filePath = object.name;

  if (!filePath.startsWith(`${tempDir}/`)) {
    console.log(`${filePath} is not target file.`);
    return true;
  }

  const fileName = path.basename(filePath);
  const file = bucket.file(filePath);
  const destination = `${publicDir}/${fileName}`;

  console.log(`Detecting ${bucketName}/${filePath}...`);

  // file.getSignedUrl(FILE_CONFIG)
  //   .then(signedUrl => {
  //     console.log(signedUrl);
  //     const db = admin.firestore();
  //     const docRef = db.collection('cars').doc('car');
  //     // promise なので then でやる
  //     const car = docRef.set({
  //       path: filePath,
  //       download_url: signedUrl[0],
  //       timestamp: new Date().toISOString()
  //     });

  //     console.log(car);
  //     return file.move(destination);
  //   })
  //   .then(() => console.log(`Moved to ${bucketName}/${destination}`))
  //   .catch(err => console.log(err));

  client.labelDetection(`${bucketName}/${filePath}`)
    .then(results => {
      const labels = results[0].labelAnnotations;
      console.log(labels)
      let isCar = false;
      labels.some(label => {
        isCar = judgment(label);
        return isCar;
      });
      return isCar;
    })
    .then(isCar => {
      if (!isCar) {
        throw new Error('This image file was not recognized as a car or vehicle.');
      }
      return file.getSignedUrl(FILE_CONFIG);
    })
    .then(signedUrl => {
      console.log(signedUrl);
      const db = admin.firestore();
      const docRef = db.collection('cars').doc('car');
      return docRef.set({
        path: filePath,
        download_url: signedUrl[0],
        timestamp: new Date().toISOString()
      });
    })
    .then(docRef => {
      console.log(docRef);
      return file.move(destination);
    })
    .then(() => console.log(`Moved to ${bucketName}/${destination}`))
    .catch(err => console.error(err));

  return true;
});


exports.uploadImage = functions.https.onRequest((req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const uploads = {};
  const tmpdir = os.tmpdir();
  const busboy = new Busboy({ headers: req.headers });

  busboy.on('file', (fieldName, file, fileName, encoding, mimeType) => {
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLocaleLowerCase())) {
      console.warn(`Not allowed MIME type: ${mimeType}`);
      return;
    }

    const filePath = path.join(tmpdir, fileName)
    uploads[fieldName] = {
      filePath: filePath,
      mimeType: mimeType,
    };

    file.pipe(fs.createWriteStream(filePath));
  });

  busboy.on('finish', () => {
    for (const fieldName in uploads) {
      const f = uploads[fieldName];
      const filePath = f.filePath;
      const mimeType = f.mimeType;
      const destination = `${tempDir}/${path.parse(filePath).base}`;
      const options = {
        destination: destination,
        metadata: {
          contentType: mimeType,
          cacheControl: CACHE_CONTROL,
        }
      };

      bucket.upload(filePath, options)
        .then(() => {
          return new Promise((resolve, reject) => {
            fs.unlink(filePath, err => {
              if (err) {
                reject(err);
              } else {
                resolve(filePath);
              }
            });
          });
        })
        .catch(err => console.error(err));
    }

    res.status(200).send(JSON.stringify(uploads));
  });

  busboy.end(req.rawBody);
});

function commify(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function calculate(bytes) {
  if (bytes <= 0) {
    return `0 Bytes`;
  }
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
  const i = parseInt(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i), 2)} ${units[i]} (${commify(bytes)} Bytes)`;
}
