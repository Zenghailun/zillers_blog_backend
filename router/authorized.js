// 导入 express
const express = require('express')
// 创建路由对象
const fse = require("fs-extra")
const multiparty = require("multiparty")
const router = express.Router()


const UPLOAD_DIR = path.resolve(__dirname, "..", "target");

// 获取用户的基本信息
router.post('/upload', (req, res) => {
  res.send({
    code: 200,
    message: '文件片已收到！',
    data: {},
  })
})

router.post('/merge', (req, res) => {
  res.send({
    code: 200,
    message: '文件片已收到！',
    data: {},
  })
})

// 向外共享路由对象
module.exports = router