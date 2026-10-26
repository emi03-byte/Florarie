# Florărie — POS web (SQL + parolă)

Aplicație pentru vânzător: catalog, coș, factură, „De făcut” + materiale, admin catalog.  
Datele stau într-o **bază SQL** (comună pentru magazin). Accesul e cu **o parolă** (fără multi-user).

## Rulare locală

### 1. API (port 4000)

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

Implicit folosește **SQLite** în `server/data/florarie.db` (se creează automat + seed).  
Parola se stochează ca **hash bcrypt** (`APP_PASSWORD_HASH` în `server/.env`):

```bash
cd server
npm run hash-password
# copiază linia APP_PASSWORD_HASH=... în .env; nu lăsa parola în clar în git
```

### 2. Frontend (port 5173)

```bash
npm install
copy .env.example .env
npm run dev
```

Deschide `http://localhost:5173`, introdu parola, folosește aplicația.

## Azure — publicare (un magazin)

### Resurse
1. **Resource Group** (ex. `rg-florarie`)
2. **Azure SQL Database** (Basic / Serverless)
3. **App Service** (Node 20) pentru API
4. **Static Web Apps** pentru frontend

### Azure SQL
1. Creează server SQL + database `florarie`
2. În firewall: Allow Azure services + IP-ul tău (pt. test)
3. Rulează [`server/schema.sql`](server/schema.sql) în Query editor (sau lasă API-ul să creeze tabelele la primul start)
4. Connection string tip ADO.NET → pune-l în App Service ca `SQL_CONNECTION_STRING`

### App Service (API)
- Deploy folderul `server/` (build: `npm install && npm run build`, start: `npm start`)
- Application settings:
  - `APP_PASSWORD_HASH` = hash bcrypt (generează local cu `npm run hash-password`; **nu** pune parola în clar)
  - `JWT_SECRET` = string lung aleator
  - `SQL_CONNECTION_STRING` = connection string Azure SQL
  - `CORS_ORIGIN` = URL-ul Static Web Apps (ex. `https://xxx.azurestaticapps.net`)
  - `PORT` = setat de Azure automat

### Static Web Apps (frontend)
- Build: `npm run build`, output: `dist`
- App setting / GitHub secret pentru build:
  - `VITE_API_URL` = URL App Service (ex. `https://florarie-api.azurewebsites.net`)
- Fișierul [`staticwebapp.config.json`](staticwebapp.config.json) e deja în proiect

### Acces
- Site-ul cere parola la deschidere
- Trimiți **link + parolă** doar la cine vrei
- Toți văd **aceleași date** (un magazin)

## Structură

- `src/` — React (UI)
- `server/` — Express API + SQL
- `server/schema.sql` — schema Azure SQL
