-- Drop existing objects
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS get_category_path(UUID);

DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS banks CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS account_type;

-- Enums
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'credit', 'investment', 'retirement', 'cash');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Banks
CREATE TABLE banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  initial_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account_type account_type NOT NULL DEFAULT 'checking',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories (hierarchical via parent_category_id)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payees
CREATE TABLE payees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES payees(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transfers
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Account Year Balances (start-of-year balance snapshots)
CREATE TABLE account_year_balances
(
    id         UUID PRIMARY KEY        DEFAULT gen_random_uuid(),
    account_id UUID           NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    year       INTEGER        NOT NULL,
    balance    NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ    NOT NULL DEFAULT now(),
    UNIQUE (account_id, year)
);

-- Indexes
CREATE INDEX idx_account_year_balances_account ON account_year_balances (account_id);
CREATE INDEX idx_accounts_bank_id ON accounts(bank_id);
CREATE INDEX idx_payees_name ON payees(name);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_payee_id ON transactions(payee_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_categories_parent_id ON categories(parent_category_id);
CREATE INDEX idx_transfers_from_account ON transfers(from_account_id);
CREATE INDEX idx_transfers_to_account ON transfers(to_account_id);
CREATE INDEX idx_transfers_date ON transfers(date);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Recursive category path function
CREATE OR REPLACE FUNCTION get_category_path(cat_id UUID)
RETURNS TEXT AS $$
  WITH RECURSIVE path AS (
    SELECT id, name, parent_category_id, name::TEXT AS full_path
    FROM categories WHERE id = cat_id
    UNION ALL
    SELECT c.id, c.name, c.parent_category_id, c.name || ' > ' || p.full_path
    FROM categories c
    JOIN path p ON c.id = p.parent_category_id
  )
  SELECT full_path FROM path WHERE parent_category_id IS NULL;
$$ LANGUAGE sql STABLE;

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_year_balances ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Banks: all authenticated users have full access
CREATE POLICY "banks_select" ON banks FOR SELECT TO authenticated USING (true);
CREATE POLICY "banks_insert" ON banks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "banks_update" ON banks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "banks_delete" ON banks FOR DELETE TO authenticated USING (true);

-- Accounts: all authenticated users have full access
CREATE POLICY "accounts_select" ON accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "accounts_insert" ON accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "accounts_update" ON accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "accounts_delete" ON accounts FOR DELETE TO authenticated USING (true);

-- Categories: all authenticated users have full access
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "categories_update" ON categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "categories_delete" ON categories FOR DELETE TO authenticated USING (true);

-- Payees: all authenticated users have full access
CREATE POLICY "payees_select" ON payees FOR SELECT TO authenticated USING (true);
CREATE POLICY "payees_insert" ON payees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "payees_update" ON payees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "payees_delete" ON payees FOR DELETE TO authenticated USING (true);

-- Transactions: all authenticated users have full access
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated USING (true);

-- Transfers: all authenticated users have full access
CREATE POLICY "transfers_select" ON transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "transfers_insert" ON transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transfers_update" ON transfers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "transfers_delete" ON transfers FOR DELETE TO authenticated USING (true);

-- Account Year Balances: all authenticated users have full access
CREATE
POLICY "account_year_balances_select" ON account_year_balances FOR
SELECT TO authenticated USING (true);
CREATE
POLICY "account_year_balances_insert" ON account_year_balances FOR INSERT TO authenticated WITH CHECK (true);
CREATE
POLICY "account_year_balances_update" ON account_year_balances FOR
UPDATE TO authenticated USING (true);
CREATE
POLICY "account_year_balances_delete" ON account_year_balances FOR DELETE
TO authenticated USING (true);
