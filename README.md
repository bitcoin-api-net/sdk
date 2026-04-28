# Bitcoin API

## Pgvector Extension

### Install

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install postgresql-14-pgvector
```

### Activate

```bash
sudo -u postgres psql # run as postgres user
```

```sql
CREATE EXTENSION vector;
```
