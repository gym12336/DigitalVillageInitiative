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

-- 成果作品（低代码可视化工作台二产出）。与 dossiers 同构：team_id 归属、
-- created_by 建档人、payload 整存作品 JSON（布局 + 组件 + 数据绑定）。
-- source_dossier 记录作品搭建时选用的数据源档案 id（可空，示例数据源为空）。
CREATE TABLE IF NOT EXISTS works (
  id             TEXT PRIMARY KEY,                       -- 前端 genId 生成的字符串 id
  team_id        INTEGER NOT NULL REFERENCES teams(id),  -- 归属队（团队共享）
  created_by     INTEGER NOT NULL REFERENCES users(id),  -- 建档人（审计 + 删除授权）
  title          TEXT NOT NULL DEFAULT '',               -- 从 payload 冗余，供列表展示
  source_dossier TEXT NOT NULL DEFAULT '',               -- 关联的数据源档案 id（可空）
  payload        TEXT NOT NULL,                          -- 完整作品 JSON
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_works_team_updated ON works(team_id, updated_at);

-- ============================================================
-- 乡村百科：村庄数据库
-- 标量字段（可查询/排序）+ JSON 文本字段（详情/模块内容）
-- ============================================================
CREATE TABLE IF NOT EXISTS villages (
  id           TEXT PRIMARY KEY,                       -- 如 'chenjiapu'
  name         TEXT NOT NULL,                          -- 村名
  full_name    TEXT NOT NULL DEFAULT '',               -- 完整名称（省/市/区/乡/村）
  province     TEXT NOT NULL DEFAULT '',
  city         TEXT NOT NULL DEFAULT '',
  district     TEXT NOT NULL DEFAULT '',
  town         TEXT NOT NULL DEFAULT '',
  summary      TEXT NOT NULL DEFAULT '',               -- 一句话摘要
  intro        TEXT NOT NULL DEFAULT '',               -- 兜底长文介绍
  cover        TEXT NOT NULL DEFAULT '',               -- 封面图 URL
  cert_level   TEXT NOT NULL DEFAULT 'township',       -- 'township'|'county'|'province'
  cert_label   TEXT NOT NULL DEFAULT '',
  coord_lat    REAL NOT NULL DEFAULT 0,                -- 纬度
  coord_lng    REAL NOT NULL DEFAULT 0,                -- 经度
  views        INTEGER NOT NULL DEFAULT 0,
  favorites    INTEGER NOT NULL DEFAULT 0,
  practices    INTEGER NOT NULL DEFAULT 0,
  -- JSON 文本列（内容可变、不需单独建索引）
  honors       TEXT NOT NULL DEFAULT '[]',             -- ["中国传统村落",...]
  tags         TEXT NOT NULL DEFAULT '{}',             -- {"文化类":[...],...}
  gallery      TEXT NOT NULL DEFAULT '[]',             -- [url,...]
  guide        TEXT NOT NULL DEFAULT '[]',             -- [{name,note},...]
  socials      TEXT NOT NULL DEFAULT '{}',             -- {wechat:true,...}
  manager      TEXT NOT NULL DEFAULT '{}',             -- {name,role}
  facts        TEXT NOT NULL DEFAULT '{}',
  timeline     TEXT NOT NULL DEFAULT '[]',
  specialties  TEXT NOT NULL DEFAULT '[]',
  festivals    TEXT NOT NULL DEFAULT '[]',
  sections     TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_villages_province ON villages(province);
CREATE INDEX IF NOT EXISTS idx_villages_name ON villages(name);

-- ============================================================
-- 乡村之声:需求表 + 问答表
-- 本期只读 + 计数落库(浏览/收藏),不做写入表单;majors/answers 存 JSON 文本。
-- ============================================================
CREATE TABLE IF NOT EXISTS demands (
  id           TEXT PRIMARY KEY,                 -- 沿用现有 'v1' 等字符串 id
  title        TEXT NOT NULL,
  town         TEXT NOT NULL DEFAULT '',
  village      TEXT NOT NULL DEFAULT '',
  type         TEXT NOT NULL DEFAULT '',         -- '文化挖掘'|'产业帮扶'|...
  cert_by      TEXT NOT NULL DEFAULT '',         -- 审核发布方(乡镇团委)
  publish_time TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT '待响应',    -- '待响应'|'响应中'|'已完成'
  deadline     TEXT NOT NULL DEFAULT '',
  views        INTEGER NOT NULL DEFAULT 0,
  favorites    INTEGER NOT NULL DEFAULT 0,
  majors       TEXT NOT NULL DEFAULT '[]',       -- JSON 数组 ["设计类","传媒类"]
  descr        TEXT NOT NULL DEFAULT '',         -- 需求详情长文(desc 是 SQL 保留字,列名用 descr)
  expected     TEXT NOT NULL DEFAULT '',         -- 预期成果
  contact      TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_demands_status ON demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_type   ON demands(type);

CREATE TABLE IF NOT EXISTS qa (
  id         TEXT PRIMARY KEY,                   -- 'q1' 等
  question   TEXT NOT NULL,
  asker      TEXT NOT NULL DEFAULT '',
  ask_time   TEXT NOT NULL DEFAULT '',
  answers    TEXT NOT NULL DEFAULT '[]',         -- JSON [{id,author,content,likes}]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
