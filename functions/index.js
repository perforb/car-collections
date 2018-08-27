'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');

const functions = require('firebase-functions');
const storage = require('@google-cloud/storage')();
const Busboy = require('busboy');

// firebase functions:config:set carcollections.bucket.name="gs://car-collections.appspot.com"
const bucketName = functions.config().carcollections.bucket.name;
const bucket = storage.bucket(bucketName);

exports.status = functions.https.onRequest((req, res) => {
  const numberWithCommas = function(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const calculator = function(bytes) {
    if (bytes <= 0) {
      return `0 Bytes`;
    }
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
    const i = parseInt(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i), 2)} ${units[i]} (${numberWithCommas(bytes)} Bytes)`;
  };
  const status = `
platform: ${os.platform()}
release:  ${os.release()}
uptime:   ${os.uptime()}
process:  ${process.title}
cwd:      ${process.cwd()}
freemem:  ${calculator(os.freemem())}
totalmem: ${calculator(os.totalmem())}
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

  // Exit if this is triggered on a file that is not an image.
  if (!contentType.startsWith('image/')) {
    console.log('This is not an image.');
    return true;
  }

  const filePath = object.name;

  if (!filePath.startsWith('tmp/')) {
    console.log('Not move.');
    return true;
  }

  const fileName = path.basename(filePath);
  const file = bucket.file(filePath);
  const destination = `images/${fileName}`;

  // If you pass in a string for the destination, the file is moved to its
  // current bucket, under the new name provided.
  file.move(destination).then(() => {
    console.log(`Moved to ${bucketName}/${destination}`);
    return;
  }).catch(err => {
    console.error('An error occurred when moving a image file.', err);
    return;
  });
});

exports.uploadImage = functions.https.onRequest((req, res) => {

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const busboy = new Busboy({ headers: req.headers });
  // This object will accumulate all the uploaded files, keyed by their name.
  const uploads = {};
  const allowMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];

  // This callback will be invoked for each file uploaded.
  busboy.on('file', (fieldName, file, fileName, encoding, mimeType) => {
    if (!allowMimeTypes.includes(mimeType.toLocaleLowerCase())) {
      console.warn('disallow mimeType: ' + mimeType);
      return;
    }
    // Note that os.tmpdir() is an in-memory file system, so should
    // only be used for files small enough to fit in memory.
    const tmpdir = os.tmpdir();
    const filePath = path.join(tmpdir, fileName);
    file.pipe(fs.createWriteStream(filePath));

    file.on('end', () => {
      console.log('uploaded file: ' + filePath + ' metadata: ' + mimeType);
      uploads[fieldName] = { filePath, mimeType };
      bucket.upload(filePath, { destination: `tmp/${path.parse(filePath).base}`, metadata: { contentType: mimeType } })
        .then(() => {
          console.log('Success: ' + filePath);
          return new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
        })
        .catch(err => {
          console.error(err);
          // TODO error handling
        });
    });
  });

  // This callback will be invoked after all uploaded files are saved.
  busboy.on('finish', () => {
    if (Object.keys(uploads).length === 0) {
      res.status(200).send('Success: 0 file upload');
      return;
    }
    console.log('finish : ' + JSON.stringify(uploads));
    res.status(200).send(JSON.stringify(uploads));
  });

  // The raw bytes of the upload will be in req.rawBody. Send it to
  // busboy, and get a callback when it's finished.
  busboy.end(req.rawBody);
});
