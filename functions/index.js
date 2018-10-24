'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');
const Base64 = require('js-base64').Base64;
const Busboy = require('busboy');

const functions = require('firebase-functions');
const BUCKET_NAME = functions.config().carcollections.bucket['name'];
const TEMP_DIR = functions.config().carcollections.bucket['temp'] || 'tmp';
const PUBLIC_DIR = functions.config().carcollections.bucket['public'] || 'images';
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpg', 'image/jpeg'];
const CACHE_CONTROL = 'public, max-age=300';
const ALLOWED_TAGS = ['car', 'vehicle'];
const BORDER_LINE = 50;
const FILE_CONFIG = {
  action: 'read',
  expires: '12-31-2999'
};
const FIRE_STORE_SETTINGS = {
  timestampsInSnapshots: true
};

const admin = require('firebase-admin');
const serviceAccount = require('./service.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://car-collections.firebaseio.com",
  storageBucket: "car-collections.appspot.com"
});

const bucket = admin.storage().bucket(BUCKET_NAME);
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();
const db = admin.firestore();
db.settings(FIRE_STORE_SETTINGS);


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
      const destination = `${TEMP_DIR}/${path.parse(filePath).base}`;
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


exports.moveImage = functions.storage.object().onFinalize((object) => {
  console.log(object);
  const contentType = object.contentType;

  if (!ALLOWED_MIME_TYPES.includes(contentType.toLocaleLowerCase())) {
    console.warn(`Not allowed MIME type: ${mimeType}`);
    return true;
  }

  const filePath = object.name;

  if (!filePath.startsWith(`${TEMP_DIR}/`)) {
    console.log(`${filePath} is not a target file.`);
    return true;
  }

  const fileName = path.basename(filePath);
  const file = bucket.file(filePath);
  const destination = `${PUBLIC_DIR}/${fileName}`;
  console.log(`Detecting ${BUCKET_NAME}/${filePath}`);

  client.labelDetection(`${BUCKET_NAME}/${filePath}`)
    .then(results => {
      const labels = results[0].labelAnnotations;
      console.log(labels)
      let isCar = false;
      labels.some(label => {
        isCar = judge(label);
        return isCar;
      });
      return isCar;
    })
    .then(isCar => {
      if (!isCar) {
        throw new Error('This image file was not recognized as a car or vehicle.');
      }
      return file.move(destination);
    })
    .then(() => console.log(`Moved to ${BUCKET_NAME}/${destination}`))
    .catch(err => console.error(err));

  return true;
});


exports.saveImage = functions.storage.object().onFinalize((object) => {
  console.log(object);
  const contentType = object.contentType;
  const filePath = object.name;

  if (!filePath.startsWith(`${PUBLIC_DIR}/`)) {
    console.log(`${filePath} is not a target file.`);
    return true;
  }

  const file = bucket.file(filePath);

  file.getSignedUrl(FILE_CONFIG)
    .then(signedUrl => {
      console.log(signedUrl);
      const fileName = path.basename(filePath);
      const key = Base64.encode(fileName);
      const docRef = db.collection('cars').doc(key);
      return docRef.set({
        path: filePath,
        name: fileName,
        url: signedUrl[0],
        timestamp: new Date()
      });
    })
    .then(docRef => {
      console.log(docRef);
      console.log(`Saved a file.`);
      return true;
    })
    .catch(err => console.error(err));

  return true;
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

function judge(label) {
  const description = label.description.toLocaleLowerCase();
  const score = parseInt(label.score * 100);
  if (!ALLOWED_TAGS.includes(description) || score < BORDER_LINE) {
    return false;
  }
  return true;
}
