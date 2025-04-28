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
    libgstcodecparsers-1.0.so.0 \
    # Dépendances supplémentaires pour le mode sans tête Chromium
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf-2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends

# Créer et définir le répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances du projet
RUN npm install

# Copier le reste des fichiers de l'application
COPY . .

# Installer Playwright avec les dépendances nécessaires
RUN npx playwright install --with-deps

# Exposer le port de l'application
EXPOSE 8080

# Commande pour démarrer l'application
CMD ["node", "index.js"]
