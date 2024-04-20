# 使用 Node.js 官方镜像作为基础镜像
FROM node:latest

# 在容器中创建一个工作目录
WORKDIR /usr/src/app

# 将当前目录下的所有文件复制到工作目录中
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 对外暴露的端口号
EXPOSE 3008

# 运行 Express 服务器
CMD ["node", "server.js"]
