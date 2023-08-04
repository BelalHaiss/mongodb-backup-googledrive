require('dotenv').config();
const { exec } = require('child_process');

const {
  GDRIVE_BACKUP_FOLDER_ID,
  DB_NAMES,
  SERVICE_ACCOUNT_FILE,
  REMOVE_OLD_FILES_LOCALY
} = process.env;
const fs = require('fs');
const { google } = require('googleapis');
const filesNames = [];
const client = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({
  version: 'v3',
  auth: client
});

const dbNames = DB_NAMES.split(',');
const fromatedDate = (() => {
  const date = new Date().toLocaleDateString('fr').replace(/\//g, '-');
  const hour = new Date()
    .toLocaleString('fr', { timeStyle: 'short' })
    .replace(':', '-');
  return date + '-' + hour;
})();
const deletedRegExp = new RegExp(`^(?!.*${fromatedDate}).*\\.gz.*$`);

const uploadFile = async (fileName) => {
  try {
    const fileMetadata = { name: fileName, parents: [GDRIVE_BACKUP_FOLDER_ID] };
    // File data
    const media = {
      body: fs.createReadStream(fileName)
    };

    // Upload file to Google Drive
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media
    });

    console.log('File uploaded successfully. File ID:', response.data.id);
  } catch (err) {
    console.error('Error uploading file:', err);
  }
};

function delete_old_backup_files() {
  fs.readdir(__dirname, (err, files) => {
    if (err) {
      console.error(err);
      return;
    }

    files.forEach((file) => {
      if (deletedRegExp.test(file)) {
        const filePath = `${__dirname}/${file}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(err);
            return;
          }
          console.log(`Deleted file: ${filePath}`);
        });
      }
    });
  });
}

async function processFiles() {
  const promises = dbNames.map(async (name) => {
    const fileName = name + '-' + fromatedDate + '.gz';
    filesNames.push(fileName);

    await new Promise((resolve, reject) => {
      exec(
        `mongodump --archive=${fileName} --gzip --db=${name}`,
        { maxBuffer: 1024 * 1000000 },
        (e, re) => {
          if (e) {
            console.log('mongodump error- ', e);
            reject(e);
          } else {
            resolve();
          }
        }
      );
    });

    await uploadFile(fileName);
  });

  await Promise.all(promises);
  REMOVE_OLD_FILES_LOCALY === 'true' && delete_old_backup_files();
}

processFiles();
