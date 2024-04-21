// 导入 express
const express = require('express')
// 创建路由对象
const fse = require("fs-extra")
const multiparty = require("multiparty")
const path = require("path")
const router = express.Router()


const UPLOAD_DIR = path.resolve(__dirname, "..", "album");


// 获取用户的基本信息
router.post('/upload', (req, res) => {
  const form = new multiparty.Form()
  form.parse(req, async(err, fields, files) => {
    if (err) {
      res.status(500).send(`An error occurred: ${err.message}`);
      return;
    }
    const [chunk] = files.chunk
    const [hash] = fields.hash
    const [fileName] = fields.fileName
    const chunkDir = path.resolve(UPLOAD_DIR, 'chunkDir' + fileName)
    if(!fse.existsSync(chunkDir)) {
      await fse.mkdirs(chunkDir)
    }
    await fse.move(chunk.path, `${chunkDir}/${hash}`)
    res.send(`Upload completed! Here's the info of uploaded files: ${JSON.stringify(files)}`);
  });
  
})

function resolvePost(req){
  return new Promise(resolve => {
    let chunk = ""
    req.on("data", data => {
      chunk += data;
    })
    req.on("end", () => {
      resolve(JSON.parse(chunk));
    })
  })
}

const pipeStream = (path, writeStream) => new Promise(resolve => {
  const readStream = fse.createReadStream(path)
  readStream.on("end", () => {
    fse.unlinkSync(path)
    resolve()
  })
  readStream.pipe(writeStream)
})

const mergeFileChunk = async (filePath, fileName, size) => {
  const chunkDir = path.resolve(UPLOAD_DIR, 'chunkDir' + fileName);
  const chunkPaths = await fse.readdir(chunkDir)
  chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1])
  console.log(chunkPaths)
  Promise.all(chunkPaths.map((chunkPath, index) => pipeStream(
    path.resolve(chunkDir, chunkPath),
    fse.createWriteStream(filePath, {
      start: index * size
    })
  ))).then((value) => {
    fse.rmdirSync(chunkDir)
  })
}

router.post('/merge', async (req, res) => {
  const data = await resolvePost(req);
  const { fileName, size} = data
  console.log(fileName)
  const filePath = path.resolve(UPLOAD_DIR, `${fileName}`);
  await mergeFileChunk(filePath, fileName, size)
  res.end(JSON.stringify({
    code: 200,
    message: "file merged success"
  }))
})

// 向外共享路由对象
module.exports = router