const dropboxV2Api = require("dropbox-v2-api");

if(process.argv.length < 4) {
  console.error("Please provide a token as the first argument, a path as the second argument");
  process.exit();
}

const TOKEN = process.argv[2];
const FOLDER = process.argv[3];
const DAYS_LIMIT = process.argv[4] || 60;

if(process.argv.length === 4) {
  console.log("The third argument is is missing, defaulting to 60 days");
}

const limitDate = new Date();
limitDate.setDate(limitDate.getDate() - DAYS_LIMIT);
limitDate.setHours(0, 0, 0, 0);

console.log(`The limit is: ${limitDate.toISOString()}`);
let dropbox;
const start = async () => {
  try {
    dropbox = dropboxV2Api.authenticate({
      token: TOKEN,
    });
    const folders = await listFolders();
    const foldersToRemove = filterFolders(folders);
    if(foldersToRemove.length) {
      console.log("Folders above the limit");
      console.log(foldersToRemove.map(folder => ' - '+folder.name).join('\n'));
      removeFolders(foldersToRemove);
      console.log("These have been deleted");
    }else{
      console.log("No folders above the limit");
    }
  } catch (error) {
    console.error(error);
    process.exit();
  }
};

const listFolders = async () =>
  new Promise((resolve) => {
    dropbox(
      {
        resource: "files/list_folder",
        parameters: {
          path: FOLDER,
          recursive: false,
          include_media_info: true,
          include_deleted: false,
          include_has_explicit_shared_members: false,
        },
      },
      (err, result, response) => {
        if (err) {
          return console.log(err);
        }
        resolve(result.entries);
      }
    );
  });

const filterFolders = (folders) => {
  const foldersToRemove = [];
  folders.forEach((folder) => {
    if (folder[".tag"] === "folder") {
      const name = folder.name;
      const folderDate = new Date(
        parseInt(name.substr(0, 4)),
        parseInt(name.substr(4, 2) - 1),
        parseInt(name.substr(6, 2)) + 1
      );
      folderDate;
      if (!isNaN(folderDate.getTime())) {
        folderDate.setHours(0, 0, 0, 0);
        if (folderDate <= limitDate) {
          foldersToRemove.push(folder);
        }
      }
    }
  });
  return foldersToRemove;
};

const removeFolders = (folders) => {
  const entries = folders.map((folder) => ({ path: folder.path_display }));
  dropbox(
    {
      resource: "files/delete_batch",
      parameters: {
        entries,
      },
    },
    (err) => {
      if (err) {
        return console.log(err);
      }
    }
  );
};

start();
