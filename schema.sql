-- The league state is stored as JSON documents in D1: the live game under key
-- 'game', the completed-season archive under key 'archive'. Photos live in R2.
CREATE TABLE IF NOT EXISTS state (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
