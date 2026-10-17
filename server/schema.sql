-- Azure SQL / SQL Server schema for Florarie

IF OBJECT_ID('dbo.order_items', 'U') IS NOT NULL DROP TABLE dbo.order_items;
IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL DROP TABLE dbo.orders;
IF OBJECT_ID('dbo.ingredients', 'U') IS NOT NULL DROP TABLE dbo.ingredients;
IF OBJECT_ID('dbo.bouquets', 'U') IS NOT NULL DROP TABLE dbo.bouquets;

CREATE TABLE dbo.bouquets (
  id NVARCHAR(64) NOT NULL PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image NVARCHAR(500) NOT NULL,
  recipe NVARCHAR(MAX) NOT NULL
);

CREATE TABLE dbo.ingredients (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  bouquet_id NVARCHAR(64) NOT NULL,
  name NVARCHAR(200) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit NVARCHAR(50) NOT NULL,
  CONSTRAINT FK_ingredients_bouquet FOREIGN KEY (bouquet_id) REFERENCES dbo.bouquets(id) ON DELETE CASCADE
);

CREATE TABLE dbo.orders (
  id NVARCHAR(64) NOT NULL PRIMARY KEY,
  created_at DATETIME2 NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status NVARCHAR(20) NOT NULL
);

CREATE TABLE dbo.order_items (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  order_id NVARCHAR(64) NOT NULL,
  bouquet_id NVARCHAR(64) NOT NULL,
  quantity INT NOT NULL,
  made_quantity INT NOT NULL CONSTRAINT DF_made DEFAULT (0),
  CONSTRAINT FK_order_items_order FOREIGN KEY (order_id) REFERENCES dbo.orders(id) ON DELETE CASCADE
);

CREATE INDEX IX_ingredients_bouquet ON dbo.ingredients(bouquet_id);
CREATE INDEX IX_order_items_order ON dbo.order_items(order_id);
CREATE INDEX IX_orders_status ON dbo.orders(status);
