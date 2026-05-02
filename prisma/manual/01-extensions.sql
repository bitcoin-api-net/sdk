-- Run BEFORE `prisma db push`. Required so push can create columns of type vector(768).
CREATE EXTENSION IF NOT EXISTS vector;
