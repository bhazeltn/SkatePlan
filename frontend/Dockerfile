# This is a multi-stage Dockerfile for the React frontend
# It can build both a 'dev' and 'prod' version.

# --- 1. Development Stage ---
# This stage is used by docker-compose.override.yml
FROM node:18-alpine AS development

WORKDIR /app

# Copy ONLY the package.json file first.
COPY package.json ./

# Run yarn install. This will read package.json, install
# all dependencies (like 'vite'), and create a yarn.lock file.
RUN yarn install

# NOW, copy the rest of the application code
COPY . .

# The default command for the 'development' stage
CMD ["yarn", "dev"]


# --- 2. Build Stage ---
# This stage is used to create the final production files
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json AND the yarn.lock file
COPY package.json* yarn.lock* ./
RUN yarn install --frozen-lockfile

# Copy the rest of the app code
COPY . .

# Build the static production app
RUN yarn build


# --- 3. Production Stage ---
# This stage is used by docker-compose.prod.yml
FROM nginx:1.25-alpine AS production

# This is our final 'frontend' image
# It's a tiny Nginx server to serve the static files

# Copy the built app from the 'build' stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
