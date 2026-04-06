-- Enums
CREATE TYPE money_account_type AS ENUM ('checking', 'savings', 'credit', 'investment', 'retirement', 'cash');

-- Profiles (extends auth.users)
CREATE TABLE money_profiles
(
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Banks
CREATE TABLE money_banks
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts
CREATE TABLE money_accounts
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bank_id      UUID               NOT NULL REFERENCES money_banks (id) ON DELETE CASCADE,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  initial_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account_type money_account_type NOT NULL DEFAULT 'checking',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories (hierarchical via parent_category_id)
CREATE TABLE money_categories
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_category_id UUID REFERENCES money_categories (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payees
CREATE TABLE money_payees
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE money_transactions
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID        NOT NULL REFERENCES money_accounts (id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  category_id UUID        REFERENCES money_categories (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  payee_id    UUID        NOT NULL REFERENCES money_payees (id) ON DELETE SET NULL
);

-- Transfers
CREATE TABLE money_transfers
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_account_id UUID NOT NULL REFERENCES money_accounts (id) ON DELETE CASCADE,
  to_account_id   UUID NOT NULL REFERENCES money_accounts (id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Account Year Balances (start-of-year balance snapshots)
CREATE TABLE money_account_year_balances
(
    id         UUID PRIMARY KEY        DEFAULT gen_random_uuid(),
    account_id UUID           NOT NULL REFERENCES money_accounts (id) ON DELETE CASCADE,
    year       INTEGER        NOT NULL,
    balance    NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ    NOT NULL DEFAULT now(),
    UNIQUE (account_id, year)
);

-- Indexes
CREATE INDEX money_idx_account_year_balances_account ON money_account_year_balances (account_id);
CREATE INDEX money_idx_accounts_bank_id ON money_accounts (bank_id);
CREATE INDEX money_idx_payees_name ON money_payees (name);
CREATE INDEX money_idx_transactions_account_id ON money_transactions (account_id);
CREATE INDEX money_idx_transactions_payee_id ON money_transactions (payee_id);
CREATE INDEX money_idx_transactions_category_id ON money_transactions (category_id);
CREATE INDEX money_idx_transactions_date ON money_transactions (date);
CREATE INDEX money_idx_categories_parent_id ON money_categories (parent_category_id);
CREATE INDEX money_idx_transfers_from_account ON money_transfers (from_account_id);
CREATE INDEX money_idx_transfers_to_account ON money_transfers (to_account_id);
CREATE INDEX money_idx_transfers_date ON money_transfers (date);

-- Auto-create profile on signup
CREATE
OR REPLACE FUNCTION money_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO money_profiles (id)
VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER money_on_auth_user_created
  AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION money_handle_new_user();

-- Recursive category path function
CREATE
OR REPLACE FUNCTION money_get_category_path(cat_id UUID)
RETURNS TEXT AS $$
  WITH RECURSIVE path AS (
    SELECT id, name, parent_category_id, name::TEXT AS full_path
    FROM money_categories WHERE id = cat_id
    UNION ALL
    SELECT c.id, c.name, c.parent_category_id, c.name || ' > ' || p.full_path
    FROM money_categories c
    JOIN path p ON c.id = p.parent_category_id
  )
  SELECT full_path FROM path WHERE parent_category_id IS NULL;
$$ LANGUAGE sql STABLE;

-- RLS Policies
ALTER TABLE money_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_payees ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_account_year_balances ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE
POLICY "money_profiles_select" ON money_profiles FOR
SELECT TO authenticated USING (true);
CREATE
POLICY "money_profiles_update_own" ON money_profiles FOR
UPDATE TO authenticated USING (id = auth.uid());

-- Banks: all authenticated users have full access
CREATE
POLICY "money_banks_select" ON money_banks FOR
SELECT TO authenticated USING (true);
CREATE
POLICY "money_banks_insert" ON money_banks FOR INSERT TO authenticated WITH CHECK (true);
CREATE
POLICY "money_banks_update" ON money_banks FOR
UPDATE TO authenticated USING (true);
CREATE
POLICY "money_banks_delete" ON money_banks FOR DELETE
TO authenticated USING (true);

-- Accounts: all authenticated users have full access
CREATE
POLICY "money_accounts_select" ON money_accounts FOR
SELECT TO authenticated USING (true);
CREATE
POLICY "money_accounts_insert" ON money_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE
POLICY "money_accounts_update" ON money_accounts FOR
UPDATE TO authenticated USING (true);
CREATE
POLICY "money_accounts_delete" ON money_accounts FOR DELETE
TO authenticated USING (true);

-- Categories: all authenticated users have full access
CREATE
POLICY "money_categories_select" ON money_categories FOR
SELECT TO authenticated USING (true);
CREATE
POLICY "money_categories_insert" ON money_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE
POLICY "money_categories_update" ON money_categories FOR
UPDATE TO authenticated USING (true);
CREATE
POLICY "money_categories_delete" ON money_categories FOR DELETE
TO authenticated USING (true);

-- Payees: all authenticated users have full access
CREATE
POLICY "money_payees_select" ON money_payees FOR
SELECT TO authenticated USING (true);
CREATE
POLICY "money_payees_insert" ON money_payees FOR INSERT TO authenticated WITH CHECK (true);
CREATE
POLICY "money_payees_update" ON money_payees FOR
UPDATE TO authenticated USING (true);
CREATE
POLICY "money_payees_delete" ON money_payees FOR DELETE
TO authenticated USING (true);

-- Transactions: all authenticated users have full access
CREATE
POLICY "money_transactions_select" ON money_transactions FOR
SELECT TO authenticated USING (true);
CREATE
POLICY "money_transactions_insert" ON money_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE
POLICY "money_transactions_update" ON money_transactions FOR
UPDATE TO authenticated USING (true);
CREATE
POLICY "money_transactions_delete" ON money_transactions FOR DELETE
TO authenticated USING (true);

-- Transfers: all authenticated users have full access
CREATE
POLICY "money_transfers_select" ON money_transfers FOR
SELECT TO authenticated USING (true);
CREATE
POLICY "money_transfers_insert" ON money_transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE
POLICY "money_transfers_update" ON money_transfers FOR
UPDATE TO authenticated USING (true);
CREATE
POLICY "money_transfers_delete" ON money_transfers FOR DELETE
TO authenticated USING (true);

-- Account Year Balances: all authenticated users have full access
CREATE
POLICY "money_account_year_balances_select" ON money_account_year_balances FOR
SELECT TO authenticated USING (true);
CREATE
POLICY "money_account_year_balances_insert" ON money_account_year_balances FOR INSERT TO authenticated WITH CHECK (true);
CREATE
POLICY "money_account_year_balances_update" ON money_account_year_balances FOR
UPDATE TO authenticated USING (true);
CREATE
POLICY "money_account_year_balances_delete" ON money_account_year_balances FOR DELETE
TO authenticated USING (true);
