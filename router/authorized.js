// 导入 express
const express = require("express");
// 创建路由对象
const fse = require("fs-extra");
const multiparty = require("multiparty");
const path = require("path");
const router = express.Router();

const UPLOAD_DIR = path.resolve(__dirname, "..", "album");

router.post("/upload", (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).send(`An error occurred: ${err.message}`);
      return;
    }
    const [chunk] = files.chunk;
    const [sliceHash] = fields.sliceHash;
    const [fileName] = fields.fileName;
    const [fileHash] = fields.fileHash;
    const chunkDir = path.resolve(UPLOAD_DIR, "chunkDir" + fileHash);
    if (!fse.existsSync(chunkDir)) {
      await fse.mkdirs(chunkDir);
    }
    await fse.move(chunk.path, `${chunkDir}/${sliceHash}`);
    res.send(
      `Upload completed! Here's the info of uploaded files: ${JSON.stringify(
        files
      )}`
    );
  });
});

function resolvePost(req) {
  return new Promise((resolve) => {
    let chunk = "";
    req.on("data", (data) => {
      chunk += data;
    });
    req.on("end", () => {
      resolve(JSON.parse(chunk));
    });
  });
}

const pipeStream = (path, writeStream) =>
  new Promise((resolve) => {
    const readStream = fse.createReadStream(path);
    readStream.on("end", () => {
      fse.unlinkSync(path);
      resolve();
    });
    readStream.pipe(writeStream);
  });

const mergeFileChunk = async (filePath, fileName, fileHash, size) => {
  const chunkDir = path.resolve(UPLOAD_DIR, "chunkDir" + fileHash);
  const chunkPaths = await fse.readdir(chunkDir);
  chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1]);
  Promise.all(
    chunkPaths.map((chunkPath, index) =>
      pipeStream(
        path.resolve(chunkDir, chunkPath),
        fse.createWriteStream(filePath, {
          start: index * size,
        })
      )
    )
  ).then((value) => {
    fse.rmdirSync(chunkDir);
  });
};

//返回已上传的所有切片
const createUploadedList = async fileHash => 
  fse.existsSync(path.resolve(UPLOAD_DIR, "chunkDir"+fileHash)) 
  ? await fse.readdir(path.resolve(UPLOAD_DIR, "chunkDir"+fileHash))
  : []


router.post("/merge", async (req, res) => {
  const data = await resolvePost(req);
  const { fileName, fileHash, size } = data;
  const prefixName = fileName.split('.').slice(0, -1).join('.'), suffixName = fileName.split('.').slice(-1)
  const filePath = path.resolve(UPLOAD_DIR, `${prefixName}${fileHash}.${suffixName}`);
  await mergeFileChunk(filePath, fileName, fileHash, size);
  res.end(
    JSON.stringify({
      code: 200,
      message: "file merged success",
    })
  );
});

const checkFileExistsWithHash = async(directory, hash) => {
  try {
    // 读取目录内容
    const files = await fse.readdir(directory);
    
    // 遍历目录中的每个文件/文件夹
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fse.stat(filePath);
      
      // 确保它是一个文件
      if (stats.isFile()) {
        // 检查文件名是否包含指定的哈希值
        if (file.includes(hash)) {
          return true;  // 找到了包含哈希值的文件
        }
      }
    }
  } catch (error) {
    console.error('Error checking files:', error);
  }
  
  return false;
}

router.post("/verify", async (req, res) => {
  const data = await resolvePost(req);
  const { fileHash } = data;
  const exists = await checkFileExistsWithHash(UPLOAD_DIR, fileHash)
  if(exists){
    res.end(JSON.stringify({
      shouldUpload: false
    }))
  }else{
    const uploadedList = await createUploadedList(fileHash)
    res.end(JSON.stringify({
      shouldUpload: true,
      uploadedList
    }))
  }
});


// 向外共享路由对象
module.exports = router;
