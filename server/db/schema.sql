-- 「我的实践」后端建表 DDL。幂等：全部 CREATE ... IF NOT EXISTS。
-- 4 张表：users / teams / memberships / dossiers。档案主体整存一列 payload（JSON 文本）。
-- 成员关系（user↔team 多对多）由 memberships 表达；用户可同时属于多个队。

-- 用户（不再持单一 team_id，成员关系搬到 memberships）
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL UNIQUE,          -- 登录名
  password     TEXT NOT NULL,                 -- bcrypt 哈希，绝不存明文
  display_name TEXT NOT NULL DEFAULT '',      -- 昵称（可选）
  created_at   TEXT NOT NULL
);

-- 队伍（created_by = 建队人，审计 + 队员列表标记；invite_code 随机生成）
CREATE TABLE IF NOT EXISTS teams (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,                 -- 队名
  invite_code  TEXT NOT NULL UNIQUE,          -- 入队邀请码（系统随机生成）
  created_by   INTEGER REFERENCES users(id),  -- 建队人；seed 队伍可空
  created_at   TEXT NOT NULL
);

-- 成员关系（user ↔ team 多对多）
CREATE TABLE IF NOT EXISTS memberships (
  user_id    INTEGER NOT NULL REFERENCES users(id),
  team_id    INTEGER NOT NULL REFERENCES teams(id),
  role       TEXT NOT NULL DEFAULT 'member',  -- 'owner'（建队人）| 'member'
  joined_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, team_id)              -- 同队不重复加入
);
CREATE INDEX IF NOT EXISTS idx_memberships_team ON memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);

-- 实践档案（每份靠 team_id 归属某个队；team_id 由建档时显式指定的「当前队」）
CREATE TABLE IF NOT EXISTS dossiers (
  id          TEXT PRIMARY KEY,                        -- 沿用前端 genId 生成的字符串 id
  team_id     INTEGER NOT NULL REFERENCES teams(id),   -- 归属队（团队共享）
  created_by  INTEGER NOT NULL REFERENCES users(id),   -- 建档人（审计 + 删除授权）
  title       TEXT NOT NULL DEFAULT '',                -- 从 payload 冗余提升，供列表展示
  stage       TEXT NOT NULL DEFAULT 'plan',            -- 'plan'|'track'|'result'
  payload     TEXT NOT NULL,                           -- 完整 dossier JSON
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- 列表页按本队 + updated_at 倒序取，复合索引更顺。
CREATE INDEX IF NOT EXISTS idx_dossiers_team_updated ON dossiers(team_id, updated_at);
