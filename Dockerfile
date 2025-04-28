# Utiliser une image de base Node.js
FROM node:16-buster

# Installer les dépendances nécessaires pour Playwright
RUN apt-get update && apt-get install -y \
  libgtk-4.so.1 \
  libgraphene-1.0.so.0 \
  libgstgl-1.0.so.0 \
  libgstcodecparsers-1.0.so.0 \
  libavif.so.15 \
  libenchant-2.so.2 \
  libsecret-1.so.0 \
  libmanette-0.2.so.0 \
  libGLESv2.so.2

# Créer et définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier le fichier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances de l'application
RUN npm install

# Copier tout le code source de l'application
COPY . .

# Installer les dépendances supplémentaires de Playwright
RUN npx playwright install --with-deps

# Exposer le port utilisé par l'application (ici 8080)
EXPOSE 8080

# Démarrer l'application avec Node.js
CMD ["node", "index.js"]
