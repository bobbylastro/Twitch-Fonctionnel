FROM node:18

# Installer les dépendances système nécessaires pour Playwright
RUN apt-get update && apt-get install -y \
    libgtk-4.0-0 \
    libenchant-2-2 \
    libsecret-1-0 \
    libgraphene-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libavif.so.15 \
    libgstgl-1.0.so.0 \
    libgstcodecparsers-1.0.so.0

# Définir le chemin pour les navigateurs de Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/.cache/ms-playwright

# Créer et définir le répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances du projet
RUN npm install

# Installer Playwright avec les dépendances nécessaires
RUN npx playwright install --with-deps

# Copier le reste des fichiers de l'application
COPY . .

# Exposer le port de l'application
EXPOSE 8080

# Commande pour démarrer l'application
CMD ["node", "index.js"]
