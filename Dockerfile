FROM node:20-alpine

# Créer le répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers de package
COPY package.json package-lock.json* ./

# Installer les dépendances
RUN npm ci || npm install --production

# Copier le reste du code
COPY . .

# Définir la variable d'environnement pour que l'app sache qu'elle tourne en prod (optionnel)
ENV NODE_ENV=production

# Démarrer le bot
CMD ["npm", "start"]