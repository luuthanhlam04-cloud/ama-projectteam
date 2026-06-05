FROM node:20-alpine

WORKDIR /app

# Sao chép package.json và cài đặt dependencies
COPY package.json .
RUN npm install

# Sao chép mã nguồn frontend
COPY . .

# Mở cổng 3000 cho Vite
EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host"]