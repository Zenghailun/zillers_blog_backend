const express = require("express")

const app = express()

// 导入 cors 中间件
const cors = require('cors')
// 将 cors 注册为全局中间件
app.use(cors())
app.use(express.urlencoded({
  extended: false
}))

// 响应数据的中间件
app.use(function (req, res, next) {
  // status = 0 为成功； status = 1 为失败； 默认将 status 的值设置为 1，方便处理失败的情况
  res.cc = function (err, code = 404) {
    res.send({
      // 状态
      code,
      // 状态描述，判断 err 是 错误对象 还是 字符串
      message: err instanceof Error ? err.message : err,
    })
  }
  next()
})

const authorizedRouter = require('./router/authorized')

app.use('/my', authorizedRouter)

app.listen(3008, () => {
  console.log('http://localhost:3008')
})