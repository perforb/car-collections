'use strict';

const functions = require('firebase-functions');
const storage = require('@google-cloud/storage')();
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

exports.uploadImage = functions.https.onRequest((req, res) => {

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const busboy = new Busboy({ headers: req.headers });
  // This object will accumulate all the uploaded files, keyed by their name.
  const uploads = {};
  const allowMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
  // file upload bucket
  // firebase functions:config:set uploadimage.bucket.name="gs://car-collections.appspot.com"
  const bucket = storage.bucket(functions.config().uploadimage.bucket.name);

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
