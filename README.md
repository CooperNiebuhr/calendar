# Calendar

A private monthly calendar built with Rails and SQLite. Choose a date and use the **+** button beside it to add an entry. Time and notes are optional. **Upcoming** covers the seven days starting tomorrow in Eastern time.

## Run locally

With Ruby 3.4.12 installed, run from the checkout directory:

```sh
bundle install
bin/rails db:prepare
bin/rails server
```

Open [localhost:3000](http://localhost:3000). A fresh database starts empty. Local entries are saved in `storage/development.sqlite3`. Run `bin/rails test` to check entry editing and date-range queries.

## Deploy to the private server

The Compose file follows the e-reader and Daily setup. Traefik serves Calendar on the existing `proxy` network and `websecure` entrypoint. The service relies on the private network or VPN for access.

1. Place this checkout at `/srv/repos/calendar` and add a private DNS record for `calendar.home.cniebuhr.com` pointing to the Traefik host. If you choose a different hostname, update both `APP_HOSTS` and the Traefik `Host` rule in `docker-compose.yml`.
2. Prepare the deployment directory. The container runs as UID/GID `1000:1000`.

   ```sh
   sudo install -d /srv/compose/calendar
   sudo install -d -o 1000 -g 1000 /srv/compose/calendar/data /srv/compose/calendar/backups
   sudo install -m 644 /srv/repos/calendar/docker-compose.yml /srv/compose/calendar/compose.yml
   cd /srv/compose/calendar
   ```

3. On first deployment, create the private `.env` file and keep it for future upgrades.

   ```sh
   sudo install -m 600 -o "$(id -u)" -g "$(id -g)" /dev/null .env
   printf 'SECRET_KEY_BASE=%s\n' "$(openssl rand -hex 64)" > .env
   ```

4. Build and start the service. It prepares the SQLite database and applies pending migrations before starting Puma.

   ```sh
   docker compose config --quiet
   docker compose up -d --build
   docker compose ps
   ```

   Open [Calendar](https://calendar.home.cniebuhr.com) from the private network. Check startup with `docker compose logs --tail=100 app` or visit `/up` through the same hostname.

### Updates and backups

Update the checkout under `/srv/repos/calendar`, copy the Compose file again if it changed, and run `docker compose up -d --build` from `/srv/compose/calendar`. The database lives at `/srv/compose/calendar/data/calendar.sqlite3`.

To take a consistent SQLite backup while the app is running:

```sh
cd /srv/compose/calendar
docker compose exec -T app sqlite3 /data/calendar.sqlite3 \
  ".backup '/backups/calendar-$(date +%Y%m%d-%H%M%S).sqlite3'"
```

The backup appears under `/srv/compose/calendar/backups`. Keep copies of the database backups and `.env` in your private backup storage.
