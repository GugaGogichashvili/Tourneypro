FROM node:20-alpine

WORKDIR /app

# პირველი პაკეტების კოპირება
COPY package*.json ./

# ყველა dependency დაყენება
RUN npm install

# კოდის კოპირება
COPY . .

# Prisma generate აუცილებლად უნდა იყოს build-ის წინ
RUN npx prisma generate

# ახლა უკვე Next.js build
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
