-- 創建themes表來存儲書籍主題數據
-- 執行時間: 2025-01-15
-- 注意：此文件僅作為參考，實際表結構以Supabase上的為準

-- 實際的themes表結構（基於Supabase查詢結果）：
-- CREATE TABLE themes (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   bookId uuid NOT NULL REFERENCES books(bookId),
--   themeText text NOT NULL,
--   createdAt time NOT NULL DEFAULT now()
-- );

-- 以下是原始設計的表結構（未使用）：
CREATE TABLE IF NOT EXISTS themes_original_design (
  "themeId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookId" uuid NOT NULL REFERENCES books("bookId") ON DELETE CASCADE,
  "theme" text NOT NULL,
  "description" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_themes_book_id ON themes_original_design("bookId");
CREATE INDEX IF NOT EXISTS idx_themes_active ON themes_original_design("isActive");

-- 創建更新時間觸發器
CREATE OR REPLACE FUNCTION handle_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER themes_updated_at
  BEFORE UPDATE ON themes_original_design
  FOR EACH ROW
  EXECUTE FUNCTION handle_themes_updated_at();

-- 為現有書籍添加一些示例主題數據到實際的themes表
INSERT INTO themes (bookId, themeText) 
SELECT 
  "bookId",
  '人類進化與認知革命'
FROM books 
WHERE title LIKE '%人類簡史%' 
AND NOT EXISTS (
  SELECT 1 FROM themes WHERE themes."bookId" = books."bookId" AND themeText = '人類進化與認知革命'
);

INSERT INTO themes (bookId, themeText) 
SELECT 
  "bookId",
  '農業革命的雙面性'
FROM books 
WHERE title LIKE '%人類簡史%' 
AND NOT EXISTS (
  SELECT 1 FROM themes WHERE themes."bookId" = books."bookId" AND themeText = '農業革命的雙面性'
);

INSERT INTO themes (bookId, themeText) 
SELECT 
  "bookId",
  '虛構故事的力量'
FROM books 
WHERE title LIKE '%人類簡史%' 
AND NOT EXISTS (
  SELECT 1 FROM themes WHERE themes."bookId" = books."bookId" AND themeText = '虛構故事的力量'
);