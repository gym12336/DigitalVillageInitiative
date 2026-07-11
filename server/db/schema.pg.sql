-- PostgreSQL 迁移 DDL。从 SQLite 迁移，JSON 文本列改用 JSONB，新增全文搜索索引。
-- 运行：psql -U <user> -d <db> -f schema.pg.sql
-- 幂等：全部 CREATE ... IF NOT EXISTS。

-- 扩展：全文搜索与模糊匹配
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================
-- 用户（不再持单一 team_id，成员关系搬到 memberships）
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL
);

-- ============================================================
-- 队伍（created_by 审计 + 队员列表标记；invite_code 随机生成）
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  invite_code  TEXT NOT NULL UNIQUE,
  created_by   INTEGER REFERENCES users(id),
  created_at   TEXT NOT NULL
);

-- ============================================================
-- 成员关系（user ↔ team 多对多）
-- ============================================================
CREATE TABLE IF NOT EXISTS memberships (
  user_id    INTEGER NOT NULL REFERENCES users(id),
  team_id    INTEGER NOT NULL REFERENCES teams(id),
  role       TEXT NOT NULL DEFAULT 'member',
  joined_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_team ON memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);

-- ============================================================
-- 实践档案（每份靠 team_id 归属某个队）
-- ============================================================
CREATE TABLE IF NOT EXISTS dossiers (
  id          TEXT PRIMARY KEY,
  team_id     INTEGER NOT NULL REFERENCES teams(id),
  created_by  INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL DEFAULT '',
  stage       TEXT NOT NULL DEFAULT 'plan',
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dossiers_team_updated ON dossiers(team_id, updated_at);

-- ============================================================
-- 乡村百科：村庄数据库
-- 标量列（可查询/排序）+ JSONB 列（详情/模块内容）
-- ============================================================
CREATE TABLE IF NOT EXISTS villages (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  full_name    TEXT NOT NULL DEFAULT '',
  province     TEXT NOT NULL DEFAULT '',
  city         TEXT NOT NULL DEFAULT '',
  district     TEXT NOT NULL DEFAULT '',
  town         TEXT NOT NULL DEFAULT '',
  summary      TEXT NOT NULL DEFAULT '',
  intro        TEXT NOT NULL DEFAULT '',
  cover        TEXT NOT NULL DEFAULT '',
  cert_level   TEXT NOT NULL DEFAULT 'township',
  cert_label   TEXT NOT NULL DEFAULT '',
  coord_lat    DOUBLE PRECISION NOT NULL DEFAULT 0,
  coord_lng    DOUBLE PRECISION NOT NULL DEFAULT 0,
  views        INTEGER NOT NULL DEFAULT 0,
  favorites    INTEGER NOT NULL DEFAULT 0,
  practices    INTEGER NOT NULL DEFAULT 0,
  -- JSONB 列（内容可变、支持索引查询）
  honors       JSONB NOT NULL DEFAULT '[]',
  tags         JSONB NOT NULL DEFAULT '{}',
  gallery      JSONB NOT NULL DEFAULT '[]',
  guide        JSONB NOT NULL DEFAULT '[]',
  socials      JSONB NOT NULL DEFAULT '{}',
  manager      JSONB NOT NULL DEFAULT '{}',
  facts        JSONB NOT NULL DEFAULT '{}',
  timeline     JSONB NOT NULL DEFAULT '[]',
  specialties  JSONB NOT NULL DEFAULT '[]',
  festivals    JSONB NOT NULL DEFAULT '[]',
  sections     JSONB NOT NULL DEFAULT '{}',
  field_sources JSONB NOT NULL DEFAULT '{}',    -- 字段来源追踪：{"fieldName":"manual"|"practice"|"auto"}
  -- 全文搜索向量（自动由触发器维护）
  search_vector tsvector,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- 常规索引
CREATE INDEX IF NOT EXISTS idx_villages_province ON villages(province);
CREATE INDEX IF NOT EXISTS idx_villages_city ON villages(city);
CREATE INDEX IF NOT EXISTS idx_villages_district ON villages(district);
CREATE INDEX IF NOT EXISTS idx_villages_name ON villages(name);
CREATE INDEX IF NOT EXISTS idx_villages_cert_level ON villages(cert_level);

-- pg_trgm 索引：支持 LIKE/ILIKE 模糊搜索加速
CREATE INDEX IF NOT EXISTS idx_villages_name_trgm ON villages USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_villages_fullname_trgm ON villages USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_villages_summary_trgm ON villages USING gin (summary gin_trgm_ops);

-- 全文搜索 GIN 索引
CREATE INDEX IF NOT EXISTS idx_villages_search ON villages USING gin (search_vector);

-- JSONB 索引：加速 honors 数组查询
CREATE INDEX IF NOT EXISTS idx_villages_honors ON villages USING gin (honors);

-- ============================================================
-- 触发器：自动维护 search_vector（name + full_name + summary + intro）
-- ============================================================
CREATE OR REPLACE FUNCTION villages_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.full_name, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.summary, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.intro, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 如果触发器已存在则跳过（幂等）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_villages_search') THEN
    CREATE TRIGGER trg_villages_search
      BEFORE INSERT OR UPDATE ON villages
      FOR EACH ROW EXECUTE FUNCTION villages_search_update();
  END IF;
END;
$$;

